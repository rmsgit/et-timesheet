
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarCheck, Upload, AlertCircle, User, Loader2, Hourglass, Plane, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMockUsers } from '@/hooks/useMockUsers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { User as EditorUser } from '@/lib/types';
import { eachDayOfInterval, format, parseISO, isSameDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { useLeave } from '@/hooks/useLeave';
import { Badge } from '@/components/ui/badge';

interface AttendanceRecord {
  date: string;
  checkIn: string;
  checkOut: string;
  overtime: string;
  leaveInfo: string;
  overShortLeave: string;
}

const calculateOvertime = (checkIn: string, checkOut: string, isEligibleForMorningOT?: boolean): string => {
    if ((!checkIn || typeof checkIn !== 'string' || !checkIn.includes(':')) && (!checkOut || typeof checkOut !== 'string' || !checkOut.includes(':'))){
        return '';
    }

    let normalizedCheckInTime = '';
    if (checkIn && typeof checkIn === 'string' && checkIn.includes(':')) {
        const checkInParts = checkIn.split(':');
        normalizedCheckInTime = checkIn;
        if (checkInParts.length === 2) {
            normalizedCheckInTime = `${checkIn}:00`;
        } else if (checkInParts.length !== 3) {
            normalizedCheckInTime = ''; 
        }
    }
    
    let normalizedCheckOutTime = '';
     if (checkOut && typeof checkOut === 'string' && checkOut.includes(':')) {
        const checkOutParts = checkOut.split(':');
        normalizedCheckOutTime = checkOut;
        if (checkOutParts.length === 2) {
            normalizedCheckOutTime = `${checkOut}:00`;
        } else if (checkOutParts.length !== 3) {
            normalizedCheckOutTime = ''; 
        }
    }

    const dummyDate = '1970-01-01T';
    try {
        const isEligible = isEligibleForMorningOT === true;
        const startTime = new Date(`${dummyDate}08:15:00`);
        const endTime = new Date(`${dummyDate}17:15:00`);
        
        const checkInTime = normalizedCheckInTime ? new Date(`${dummyDate}${normalizedCheckInTime}`) : null;
        const checkOutTime = normalizedCheckOutTime ? new Date(`${dummyDate}${normalizedCheckOutTime}`) : null;
        
        if ((checkInTime && isNaN(checkInTime.getTime())) || (checkOutTime && isNaN(checkOutTime.getTime()))) {
            return '';
        }

        // Disqualification Rule: If user arrives late, they get no OT at all, regardless of eligibility.
        if (checkInTime && checkInTime > startTime) {
            return '';
        }

        let morningOtSeconds = 0;
        let eveningOtSeconds = 0;

        // Calculate morning OT only if eligible and arrived early
        if (checkInTime && isEligible && checkInTime < startTime) {
            morningOtSeconds = Math.floor((startTime.getTime() - checkInTime.getTime()) / 1000);
        }

        // Calculate evening OT if they stayed late
        if (checkOutTime && checkOutTime > endTime) {
            eveningOtSeconds = Math.floor((checkOutTime.getTime() - endTime.getTime()) / 1000);
        }
        
        const totalOtSeconds = morningOtSeconds + eveningOtSeconds;

        if (totalOtSeconds <= 0) {
            return '';
        }

        const hours = Math.floor(totalOtSeconds / 3600);
        const minutes = Math.floor((totalOtSeconds % 3600) / 60);

        const partStrings: string[] = [];
        if (hours > 0) partStrings.push(`${hours}h`);
        if (minutes > 0) partStrings.push(`${minutes}m`);
        return partStrings.join(' ');

    } catch (e) {
        console.error("Error calculating overtime for:", checkIn, checkOut, e);
        return '';
    }

    return '';
};

const calculateOverShortLeave = (checkIn: string, checkOut: string, leaveInfo: string): string => {
    if (leaveInfo.toLowerCase() !== 'short leave' || !checkIn || !checkOut) {
        return '';
    }

    const normalizeTime = (time: string): string => {
        if (!time || typeof time !== 'string' || !time.includes(':')) return '';
        const parts = time.split(':');
        if (parts.length === 2) return `${time}:00`;
        if (parts.length === 3) return time;
        return '';
    }
    
    const normalizedCheckIn = normalizeTime(checkIn);
    const normalizedCheckOut = normalizeTime(checkOut);
    
    if (!normalizedCheckIn || !normalizedCheckOut) return '';

    const dummyDate = '1970-01-01T';
    try {
        const checkInTime = new Date(`${dummyDate}${normalizedCheckIn}`);
        const checkOutTime = new Date(`${dummyDate}${normalizedCheckOut}`);

        if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) {
            return '';
        }

        const durationSeconds = (checkOutTime.getTime() - checkInTime.getTime()) / 1000;
        const shortLeaveAllowanceSeconds = 3600; // 1 hour

        if (durationSeconds > shortLeaveAllowanceSeconds) {
            const overageSeconds = durationSeconds - shortLeaveAllowanceSeconds;
            
            const hours = Math.floor(overageSeconds / 3600);
            const minutes = Math.floor((overageSeconds % 3600) / 60);

            const partStrings: string[] = [];
            if (hours > 0) partStrings.push(`${hours}h`);
            if (minutes > 0) partStrings.push(`${minutes}m`);
            return partStrings.join(' ');
        }
        
        return '';
    } catch (e) {
        console.error("Error calculating over short leave for:", checkIn, checkOut, e);
        return '';
    }
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
  const { leaveRequests, isLoading: isLoadingLeave } = useLeave();
  const isLoading = isUsersLoading || isLoadingLeave;

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
            
            const editorLeaveRequests = leaveRequests.filter(
                req => req.userId === selectedEditor.id && (req.status === 'approved')
            );
            
            const newAttendanceData: AttendanceRecord[] = daysInRange.map((day, index) => {
                const colIndex = index + 1;
                const dataForDay = columnDataMap.get(colIndex);
                const checkInValue = dataForDay?.checkIn || '';
                const checkOutValue = dataForDay?.checkOut || '';

                const leaveForDay = editorLeaveRequests.find(req => isSameDay(parseISO(req.date), day));
                let leaveInfo = '';
                if (leaveForDay) {
                    leaveInfo = leaveForDay.leaveType.replace('-', ' ');
                }
                const overShortLeave = calculateOverShortLeave(checkInValue, checkOutValue, leaveInfo);

                return {
                    date: format(day, 'MMM d, yyyy'),
                    checkIn: checkInValue,
                    checkOut: checkOutValue,
                    overtime: calculateOvertime(checkInValue, checkOutValue, selectedEditor.isEligibleForMorningOT),
                    leaveInfo,
                    overShortLeave,
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
        record.overShortLeave = calculateOverShortLeave(record.checkIn, record.checkOut, record.leaveInfo);
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
                              <TableHead className="w-[120px]">
                                <div className="flex items-center text-orange-600">
                                  <AlertTriangle className="mr-2 h-4 w-4" /> Over SL
                                </div>
                              </TableHead>
                              <TableHead className="w-[120px]">
                                <div className="flex items-center">
                                    <Plane className="mr-2 h-4 w-4" /> Leave
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
                                   <TableCell className="font-mono text-orange-600 text-sm">
                                      {rec.overShortLeave}
                                  </TableCell>
                                  <TableCell>
                                    {rec.leaveInfo && <Badge variant="outline" className="capitalize border-sky-500 text-sky-500">{rec.leaveInfo}</Badge>}
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
