
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarCheck, Upload, User, Loader2, Hourglass, Plane, AlertTriangle, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useAttendance } from '@/hooks/useAttendance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AttendanceRecord, User as EditorUser } from '@/lib/types';
import { eachDayOfInterval, format, parseISO, isSameDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { useLeave } from '@/hooks/useLeave';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

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

const calculateEarlyLeave = (checkOut: string, leaveInfo: string): string => {
    if (!checkOut || (leaveInfo && (leaveInfo.toLowerCase().includes('full') || leaveInfo.toLowerCase().includes('half')))) {
        return '';
    }

    const normalizeTime = (time: string): string => {
        if (!time || typeof time !== 'string' || !time.includes(':')) return '';
        const parts = time.split(':');
        if (parts.length === 2) return `${time}:00`;
        if (parts.length === 3) return time;
        return '';
    }
    
    const normalizedCheckOut = normalizeTime(checkOut);
    
    if (!normalizedCheckOut) return '';

    const dummyDate = '1970-01-01T';
    try {
        const companyEndTime = new Date(`${dummyDate}17:15:00`);
        const checkOutTime = new Date(`${dummyDate}${normalizedCheckOut}`);

        if (isNaN(checkOutTime.getTime()) || checkOutTime >= companyEndTime) {
            return '';
        }

        let earlySeconds = Math.floor((companyEndTime.getTime() - checkOutTime.getTime()) / 1000);

        if (leaveInfo.toLowerCase().includes('short')) {
            earlySeconds -= 3600; // 1 hour grace period for short leave
        }

        if (earlySeconds > 0) {
            const hours = Math.floor(earlySeconds / 3600);
            const minutes = Math.floor((earlySeconds % 3600) / 60);

            const partStrings: string[] = [];
            if (hours > 0) partStrings.push(`${hours}h`);
            if (minutes > 0) partStrings.push(`${minutes}m`);
            return partStrings.join(' ');
        }
        
        return '';
    } catch (e) {
        console.error("Error calculating early leave for:", checkOut, leaveInfo, e);
        return '';
    }
};


export default function AttendancePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dateRange, setDateRange] = useState<string>('');
  
  const [selectedEditorId, setSelectedEditorId] = useState<string | undefined>(undefined);
  const [selectedEditor, setSelectedEditor] = useState<EditorUser | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));

  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isProcessingFileRef = useRef(false);
  const { toast } = useToast();
  
  const { users: allUsers, isUsersLoading } = useMockUsers();
  const { leaveRequests, isLoading: isLoadingLeave } = useLeave();
  const { saveAttendanceForMonth, getAttendanceForMonth, deleteAttendanceForMonth } = useAttendance();
  
  const isLoading = isUsersLoading || isLoadingLeave;

  const editorUsers = useMemo(() => {
    if (isUsersLoading || !allUsers) return [];
    return allUsers.filter(u => u.role === 'editor').sort((a, b) => a.username.localeCompare(b.username));
  }, [allUsers, isUsersLoading]);

  const availableYears = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = currentYear; i >= 2020; i--) {
          years.push(i.toString());
      }
      return years;
  }, []);

  const availableMonths = useMemo(() => {
      return Array.from({ length: 12 }, (_, i) => ({
          value: (i + 1).toString().padStart(2, '0'),
          label: format(new Date(2000, i), 'MMMM'),
      }));
  }, []);
  
  useEffect(() => {
    if (selectedEditorId) {
      setSelectedEditor(allUsers.find(u => u.id === selectedEditorId) || null);
    } else {
      setSelectedEditor(null);
    }
  }, [selectedEditorId, allUsers]);

  useEffect(() => {
    const fetchAttendance = async () => {
        if (isProcessingFileRef.current) {
            // When a file is being processed, it sets the attendance data itself.
            // We prevent this effect from re-fetching and overwriting it.
            return;
        }
        if (selectedEditorId && selectedYear && selectedMonth) {
            setFile(null); // Clear any selected file
            const data = await getAttendanceForMonth(selectedEditorId, selectedYear, selectedMonth);
            if (data) {
                setAttendanceData(data);
                const fromDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
                const toDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
                setDateRange(`From: ${format(fromDate, 'yyyy-MM-dd')} To: ${format(toDate, 'yyyy-MM-dd')}`);
            } else {
                setAttendanceData([]);
                setDateRange('');
            }
        } else {
            setAttendanceData([]);
            setDateRange('');
        }
    };
    fetchAttendance();
  }, [selectedEditorId, selectedYear, selectedMonth, getAttendanceForMonth]);

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
        isProcessingFileRef.current = true;
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
            
            const fileYear = fromDate.getFullYear().toString();
            const fileMonth = (fromDate.getMonth() + 1).toString().padStart(2, '0');

            setSelectedYear(fileYear);
            setSelectedMonth(fileMonth);

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
                const earlyLeave = calculateEarlyLeave(checkOutValue, leaveInfo);

                return {
                    date: format(day, 'MMM d, yyyy'),
                    checkIn: checkInValue,
                    checkOut: checkOutValue,
                    overtime: calculateOvertime(checkInValue, checkOutValue, selectedEditor.isEligibleForMorningOT),
                    leaveInfo,
                    earlyLeave,
                };
            });

            setAttendanceData(newAttendanceData);
            toast({ title: 'File Processed', description: 'Review the attendance data extracted from the file.' });

        } catch (error: any) {
            console.error("Error processing file:", error);
            toast({ title: 'File Processing Error', description: error.message || 'Could not read or parse the uploaded file.', variant: 'destructive' });
        } finally {
            isProcessingFileRef.current = false;
            setIsProcessing(false);
        }
    };
    
    reader.onerror = () => {
        toast({ title: 'File Read Error', description: 'There was an error reading the file.', variant: 'destructive' });
        setIsProcessing(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  };
  
  const handleAttendanceChange = (recordIndex: number, field: 'checkIn' | 'checkOut' | 'earlyLeave', value: string) => {
      const updatedData = [...attendanceData];
      const record = updatedData[recordIndex];
      
      record[field] = value;
      
      if (field === 'checkIn' || field === 'checkOut') {
        record.overtime = calculateOvertime(record.checkIn, record.checkOut, selectedEditor?.isEligibleForMorningOT);
        record.earlyLeave = calculateEarlyLeave(record.checkOut, record.leaveInfo);
      }
      
      setAttendanceData(updatedData);
  }
  
  const handleSaveAttendance = async () => {
        if (!selectedEditorId || !selectedYear || !selectedMonth) {
            toast({ title: 'Cannot Save', description: 'Editor, Year, or Month not selected.', variant: 'destructive'});
            return;
        }

        setIsSaving(true);
        const result = await saveAttendanceForMonth(selectedEditorId, selectedYear, selectedMonth, attendanceData);
        if (!result.success) {
            // Error toast is already handled in the context
        }
        setIsSaving(false);
    };

  const handleDeleteSheet = async () => {
    if (!selectedEditorId || !selectedYear || !selectedMonth) {
        toast({ title: 'Cannot Delete', description: 'Editor, Year, or Month not selected.', variant: 'destructive'});
        return;
    }

    setIsDeleting(true);
    const result = await deleteAttendanceForMonth(selectedEditorId, selectedYear, selectedMonth);
    if (result.success) {
        setAttendanceData([]);
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <CalendarCheck className="mr-3 h-8 w-8 text-primary" /> Editor Attendance Sheet
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Select Period to View or Upload</CardTitle>
          <CardDescription>
            Select an editor, year, and month to view saved attendance. If no records exist, you can upload an attendance file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
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
             <div className="space-y-2">
              <Label htmlFor="year-select">Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoading || isProcessing}>
                  <SelectTrigger id="year-select">
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                      {availableYears.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="month-select">Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoading || isProcessing}>
                  <SelectTrigger id="month-select">
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                      {availableMonths.map(month => (
                          <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {selectedEditorId && (
        <Card>
            <CardHeader>
              <CardTitle>Upload New File</CardTitle>
              <CardDescription>
                To create a new record for the selected period, or to overwrite existing data, upload an Excel file. The year and month will be read from the file automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 items-end max-w-md">
                    <div className="flex-grow space-y-2">
                        <Label htmlFor="attendance-file">Attendance File (.xlsx, .xls, .csv)</Label>
                        <Input
                            id="attendance-file"
                            type="file"
                            onChange={handleFileChange}
                            accept=".xlsx, .xls, .csv"
                            className="flex-grow"
                            disabled={isProcessing || !selectedEditorId}
                        />
                    </div>
                    <Button onClick={() => file && handleProcessFile(file)} disabled={!file || !selectedEditorId || isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isProcessing ? 'Processing...' : 'Review File'}
                    </Button>
                </div>
                {file && <p className="text-sm text-muted-foreground mt-2">Selected file: {file.name}</p>}
            </CardContent>
        </Card>
      )}
      
      {selectedEditorId && attendanceData.length > 0 && (
          <Card>
              <CardHeader>
                  <div className="flex justify-between items-start">
                      <div>
                          <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" /> Reviewing Attendance for: <span className="ml-2 font-bold text-primary">{selectedEditor?.username}</span></CardTitle>
                          <CardDescription className="mt-1.5">
                              Review and edit the attendance data for {format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')}.
                          </CardDescription>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSaving || isProcessing || isDeleting}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Sheet
                      </Button>
                  </div>
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
                                  <AlertTriangle className="mr-2 h-4 w-4" /> Early Leave
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
                                  <TableCell className="text-sm">
                                      <span className="font-mono text-muted-foreground">{rec.overtime}</span>
                                  </TableCell>
                                   <TableCell>
                                      <Input 
                                          type="text" 
                                          value={rec.earlyLeave} 
                                          onChange={(e) => handleAttendanceChange(recordIndex, 'earlyLeave', e.target.value)}
                                          placeholder="--h --m"
                                          className="h-9 font-mono text-orange-600"
                                      />
                                  </TableCell>
                                  <TableCell>
                                    {rec.leaveInfo && <Badge variant="outline" className="capitalize border-sky-500 text-sky-500">{rec.leaveInfo}</Badge>}
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
                   <div className="flex justify-end mt-6">
                        <Button onClick={handleSaveAttendance} disabled={isSaving || isProcessing}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Attendance
                        </Button>
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
              Please choose an editor, year, and month to proceed.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedEditorId && attendanceData.length === 0 && !isProcessing && (
          <Card className="shadow-md text-center py-10">
          <CardContent>
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium">No Saved Records</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No attendance records found for {selectedEditor?.username} for {format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')}.
            </p>
             <p className="mt-1 text-sm text-muted-foreground">
              Upload a file to create a new attendance sheet for this period.
            </p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the attendance sheet for <span className="font-semibold">{selectedEditor?.username}</span> for <span className="font-semibold">{format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSheet} disabled={isDeleting} className={cn(buttonVariants({ variant: "destructive" }))}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    