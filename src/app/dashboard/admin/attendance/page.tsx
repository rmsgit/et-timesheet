
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarCheck, Upload, AlertCircle, User, Loader2, Hourglass } from 'lucide-react';
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
  overtime: string;
}

const calculateOvertime = (checkIn: string, checkOut: string, isEligibleForMorningOT?: boolean): string => {
    if (!checkOut || typeof checkOut !== 'string' || !checkOut.includes(':') || !checkIn || typeof checkIn !== 'string' || !checkIn.includes(':')) {
        return '';
    }

    // Normalize check-in time
    const checkInParts = checkIn.split(':');
    let normalizedCheckInTime = checkIn;
    if (checkInParts.length === 2) {
        normalizedCheckInTime = `${checkIn}:00`;
    } else if (checkInParts.length !== 3) {
        return ''; // Invalid check-in format
    }
    
    // Normalize check-out time
    const checkOutParts = checkOut.split(':');
    let normalizedCheckOutTime = checkOut;
    if (checkOutParts.length === 2) {
        normalizedCheckOutTime = `${checkOut}:00`;
    } else if (checkOutParts.length !== 3) {
        return ''; // Invalid check-out format
    }

    const dummyDate = '1970-01-01T';
    try {
        const isEligible = isEligibleForMorningOT === true;
        const startTime = new Date(`${dummyDate}08:15:00`);
        const endTime = new Date(`${dummyDate}17:15:00`);
        const checkInTime = new Date(`${dummyDate}${normalizedCheckInTime}`);
        const checkOutTime = new Date(`${dummyDate}${normalizedCheckOutTime}`);
        
        if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime()) || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            return '';
        }

        // Condition: If check-in time is after company start time, no OT, unless eligible
        if (!isEligible && checkInTime > startTime) {
            return '';
        }

        if (checkOutTime > endTime) {
            const diffSeconds = Math.floor((checkOutTime.getTime() - endTime.getTime()) / 1000);
            const hours = Math.floor(diffSeconds / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);

            const partStrings: string[] = [];
            if (hours > 0) partStrings.push(`${hours}h`);
            if (minutes > 0) partStrings.push(`${minutes}m`);
            return partStrings.join(' ');
        }
    } catch (e) {
        console.error("Error calculating overtime for:", checkIn, checkOut, e);
        return '';
    }

    return '';
};


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

            const dateRangeString = (jsonData[2] && typeof jsonData[2][0] === 'string') ? jsonData[2][0] : '';
            
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

            const dateRowInExcel = jsonData[4] || [];
            const checkInRowFromExcel = jsonData[5] || [];
            const checkOutRowFromExcel = jsonData[6] || [];
            
            const columnDataMap = new Map<number, { checkIn: string, checkOut: string }>();
            for (let i = 1; i < dateRowInExcel.length; i++) {
                const dayHeader = dateRowInExcel[i];
                if (dayHeader !== undefined && dayHeader !== '') {
                    let checkIn = checkInRowFromExcel[i];
                    let checkOut = checkOutRowFromExcel[i];
                    
                    if (typeof checkIn === 'number' && checkIn > 0 && checkIn < 1) {
                        checkIn = XLSX.SSF.format('hh:mm:ss', checkIn);
                    }
                    if (typeof checkOut === 'number' && checkOut > 0 && checkOut < 1) {
                        checkOut = XLSX.SSF.format('hh:mm:ss', checkOut);
                    }

                    if (checkIn === '-') checkIn = '';
                    if (checkOut === '-') checkOut = '';

                    columnDataMap.set(i, { checkIn: String(checkIn || ''), checkOut: String(checkOut || '') });
                }
            }
            
            const daysInRange = eachDayOfInterval({ start: fromDate, end: toDate });
            const newAttendanceData: AttendanceRecord[] = daysInRange.map((day, index) => {
                const colIndex = index + 1;
                const dataForDay = columnDataMap.get(colIndex);
                const checkInValue = dataForDay?.checkIn || '';
                const checkOutValue = dataForDay?.checkOut || '';

                return {
                    date: format(day, 'MMM d, yyyy'),
                    checkIn: checkInValue,
                    checkOut: checkOutValue,
                    overtime: calculateOvertime(checkInValue, checkOutValue, selectedEditor.isEligibleForMorningOT),
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
      const record = updatedData[recordIndex];
      record[field] = value;
      
      if (field === 'checkIn' || field === 'checkOut') {
        record.overtime = calculateOvertime(record.checkIn, record.checkOut, selectedEditor?.isEligibleForMorningOT);
      }
      
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
                              <TableHead className="w-[100px]">
                                <div className="flex items-center">
                                  <Hourglass className="mr-2 h-4 w-4" /> OT
                                </div>
                              </TableHead>
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
                                  <TableCell className="font-mono text-muted-foreground text-sm">
                                      {rec.overtime}
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

    

    
