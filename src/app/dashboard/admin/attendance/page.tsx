'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarCheck, Upload, AlertCircle, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMockUsers } from '@/hooks/useMockUsers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User as EditorUser } from '@/lib/types';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
}

export default function AttendancePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dateRange, setDateRange] = useState<string>('');
  
  const [selectedEditorId, setSelectedEditorId] = useState<string | undefined>(undefined);
  const [selectedEditor, setSelectedEditor] = useState<EditorUser | null>(null);

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  const { users: allUsers, isUsersLoading } = useMockUsers();
  const isLoading = isUsersLoading;

  const editorUsers = useMemo(() => {
    if (isUsersLoading || !allUsers) return [];
    return allUsers.filter(u => u.role === 'editor').sort((a, b) => a.username.localeCompare(b.username));
  }, [allUsers, isUsersLoading]);

  useEffect(() => {
    if (selectedEditorId) {
      setSelectedEditor(allUsers.find(u => u.id === selectedEditorId) || null);
      // Reset file and data if editor changes
      setFile(null);
      setAttendanceData([]);
    } else {
      setSelectedEditor(null);
    }
  }, [selectedEditorId, allUsers]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type === 'application/vnd.ms-excel' ||
        selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        selectedFile.type === 'text/csv'
      ) {
        setFile(selectedFile);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a valid Excel file (.xls, .xlsx) or a CSV file.',
          variant: 'destructive',
        });
        setFile(null);
      }
    }
  };

  const handleProcessFile = (selectedFile: File) => {
    if (!selectedEditor) {
        toast({ title: 'No Editor Selected', description: 'Please select an editor before processing a file.', variant: 'destructive' });
        return;
    }
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const arrayBuffer = event.target?.result;
            if (!arrayBuffer) {
                throw new Error("Could not read file buffer.");
            }
            
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            // The user specified the date range is in cell A4.
            const dateRangeString = (jsonData[3] && typeof jsonData[3][0] === 'string') ? jsonData[3][0] : '';
            
            if (!dateRangeString || !dateRangeString.includes('From:')) {
                throw new Error('Date range "From: ... To: ..." not found in cell A4.');
            }

            const fromMatch = dateRangeString.match(/From: (\d{4}-\d{2}-\d{2})/);
            const toMatch = dateRangeString.match(/To: (\d{4}-\d{2}-\d{2})/);

            if (!fromMatch || !toMatch) {
                throw new Error('Could not parse start or end date from the date range string in cell A4.');
            }
            
            const fromDate = parseISO(fromMatch[1]);
            const toDate = parseISO(toMatch[1]);
            setDateRange(`From: ${format(fromDate, 'yyyy-MM-dd HH:mm:ss')} To: ${format(toDate, 'yyyy-MM-dd HH:mm:ss')}`);

            // Extract relevant rows
            const dateRowInExcel = jsonData[5] || [];      // e.g., ["Date", 23, 24, 25, ...]
            const checkInRowFromExcel = jsonData[6] || []; // e.g., ["Check-in1", "7:37:58", ...]
            const checkOutRowFromExcel = jsonData[7] || [];// e.g., ["Check-out1", "17:49:30", ...]
            
            // Map columns to data, starting from column B (index 1)
            const columnDataMap = new Map<number, { checkIn: string, checkOut: string }>();
            for (let i = 1; i < dateRowInExcel.length; i++) {
                const dayHeader = dateRowInExcel[i];
                // Process column only if there's a date header for it
                if (dayHeader !== undefined && dayHeader !== '') {
                    let checkIn = checkInRowFromExcel[i];
                    let checkOut = checkOutRowFromExcel[i];
                    
                    // Handle Excel's numeric time format (which is a fraction of a day)
                    if (typeof checkIn === 'number' && checkIn > 0 && checkIn < 1) {
                        checkIn = XLSX.SSF.format('hh:mm:ss', checkIn);
                    }
                    if (typeof checkOut === 'number' && checkOut > 0 && checkOut < 1) {
                        checkOut = XLSX.SSF.format('hh:mm:ss', checkOut);
                    }

                    // Normalize placeholder values like '-' to empty strings
                    if (checkIn === '-') checkIn = '';
                    if (checkOut === '-') checkOut = '';

                    columnDataMap.set(i, { checkIn: String(checkIn || ''), checkOut: String(checkOut || '') });
                }
            }
            
            const daysInRange = eachDayOfInterval({ start: fromDate, end: toDate });
            const newAttendanceData: AttendanceRecord[] = daysInRange.map((day, index) => {
                // Map date index to excel column index (B=1, C=2, etc.)
                const colIndex = index + 1;
                const dataForDay = columnDataMap.get(colIndex);

                return {
                    date: format(day, 'MMM d, yyyy'),
                    checkIn: dataForDay?.checkIn || '',
                    checkOut: dataForDay?.checkOut || ''
                };
            });

            setAttendanceData(newAttendanceData);
            toast({ title: 'File Processed', description: 'Review the attendance data extracted from the file.' });

        } catch (error: any) {
            console.error("Error processing file:", error);
            toast({ title: 'File Processing Error', description: error.message || 'Could not read or parse the uploaded file.', variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    reader.onerror = () => {
        toast({ title: 'File Read Error', description: 'There was an error reading the file.', variant: 'destructive' });
        setIsProcessing(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  };
  
  const handleAttendanceChange = (recordIndex: number, field: 'checkIn' | 'checkOut', value: string) => {
      const updatedData = [...attendanceData];
      updatedData[recordIndex][field] = value;
      setAttendanceData(updatedData);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <CalendarCheck className="mr-3 h-8 w-8 text-primary" /> Editor Attendance Sheet
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Upload Attendance File</CardTitle>
          <CardDescription>
            Select an editor, then upload their Excel (.xlsx, .xls) or CSV attendance file for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
                <Label htmlFor="editor-select">Editor</Label>
                {isLoading ? (
                    <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Select
                        value={selectedEditorId}
                        onValueChange={setSelectedEditorId}
                        disabled={isLoading || isProcessing}
                    >
                        <SelectTrigger id="editor-select">
                            <SelectValue placeholder="Select an editor" />
                        </SelectTrigger>
                        <SelectContent>
                            {editorUsers.map(editor => (
                                <SelectItem key={editor.id} value={editor.id}>
                                    {editor.username} ({editor.email})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            <div>
              <Label htmlFor="attendance-file">Attendance File</Label>
              <div className="flex gap-2 mt-2">
                  <Input
                      id="attendance-file"
                      type="file"
                      onChange={handleFileChange}
                      accept=".xlsx, .xls, .csv"
                      className="flex-grow"
                      disabled={isProcessing || !selectedEditorId}
                  />
                  <Button onClick={() => file && handleProcessFile(file)} disabled={!file || !selectedEditorId || isProcessing}>
                      {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      {isProcessing ? 'Processing...' : 'Review File'}
                  </Button>
              </div>
              {file && <p className="text-sm text-muted-foreground mt-2">Selected file: {file.name}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {selectedEditorId && attendanceData.length > 0 && (
          <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" /> Reviewing Attendance for: <span className="ml-2 font-bold text-primary">{selectedEditor?.username}</span></CardTitle>
                <CardDescription>
                    Review and edit the attendance data extracted from the file. Date Range: <span className="font-semibold">{dateRange}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="w-[150px]">Date</TableHead>
                              <TableHead>Check-in</TableHead>
                              <TableHead>Check-out</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {attendanceData.map((rec, recordIndex) => (
                              <TableRow key={recordIndex}>
                                  <TableCell className="font-medium">{rec.date}</TableCell>
                                  <TableCell>
                                      <Input 
                                          type="text" 
                                          value={rec.checkIn}
                                          onChange={(e) => handleAttendanceChange(recordIndex, 'checkIn', e.target.value)}
                                          placeholder="--:--:--"
                                          className="h-9" 
                                      />
                                  </TableCell>
                                  <TableCell>
                                      <Input 
                                          type="text" 
                                          value={rec.checkOut} 
                                          onChange={(e) => handleAttendanceChange(recordIndex, 'checkOut', e.target.value)}
                                          placeholder="--:--:--"
                                          className="h-9"
                                      />
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                   <div className="flex justify-end mt-6">
                        <Button>Save Attendance</Button>
                    </div>
              </CardContent>
          </Card>
      )}

      {!selectedEditorId && !isProcessing && (
          <Card className="shadow-md text-center py-10">
          <CardContent>
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium">Select an Editor</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Please choose an editor from the list above to proceed.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedEditorId && !file && !isProcessing && attendanceData.length === 0 && (
          <Card className="shadow-md text-center py-10">
          <CardContent>
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium">Awaiting File</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Please upload an attendance sheet for {selectedEditor?.username} to begin the review process.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
