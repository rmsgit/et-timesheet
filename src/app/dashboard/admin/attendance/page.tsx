
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { CalendarCheck, Upload, User, Loader2, Hourglass, Plane, AlertTriangle, Search, Trash2, NotebookText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useAttendance } from '@/hooks/useAttendance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AttendanceRecord, User as AppUser } from '@/lib/types';
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
import { useHolidays } from '@/hooks/useHolidays';

const getCheckInStyling = (checkIn: string): string => {
    if (!checkIn || typeof checkIn !== 'string' || !checkIn.includes(':')) {
        return '';
    }

    let normalizedTime = checkIn;
    const parts = checkIn.split(':');
    if (parts.length === 2) {
        normalizedTime = `${checkIn}:00`;
    } else if (parts.length !== 3) {
        return '';
    }

    try {
        const dummyDate = '1970-01-01T';
        const checkInTime = new Date(`${dummyDate}${normalizedTime}`);
        if (isNaN(checkInTime.getTime())) return '';

        const companyStart = new Date(`${dummyDate}08:15:00`);
        const gracePeriodEnd = new Date(`${dummyDate}08:16:00`);
        
        if (checkInTime > gracePeriodEnd) { // After 08:16:00
            return 'bg-red-200 text-red-800 dark:bg-red-800/40 dark:text-red-200 focus-visible:ring-red-400';
        } else if (checkInTime > companyStart) { // From 08:15:01 to 08:16:00
            return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-800/40 dark:text-yellow-200 focus-visible:ring-yellow-400';
        }

        return '';
    } catch (e) {
        return '';
    }
};

const calculateOvertime = (checkIn: string, checkOut: string, isEligibleForMorningOT?: boolean, date?: Date): string => {
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
    const isSaturday = date ? date.getDay() === 6 : false;
    const companyStartTime = new Date(`${dummyDate}08:15:00`);

    try {
        const checkInTime = normalizedCheckInTime ? new Date(`${dummyDate}${normalizedCheckInTime}`) : null;
        if (checkInTime && isNaN(checkInTime.getTime())) return ''; // Invalid check-in time format

        let totalOtSeconds = 0;

        if (isSaturday) {
            // Disqualification Rule for Saturday: No OT if late.
            if (checkInTime && checkInTime > companyStartTime) {
                return '';
            }
            
            const saturdayEndTime = new Date(`${dummyDate}14:00:00`); // 2 PM
            const checkOutTime = normalizedCheckOutTime ? new Date(`${dummyDate}${normalizedCheckOutTime}`) : null;
            if (checkOutTime && !isNaN(checkOutTime.getTime()) && checkOutTime > saturdayEndTime) {
                totalOtSeconds = Math.floor((checkOutTime.getTime() - saturdayEndTime.getTime()) / 1000);
            }
        } else {
            const isEligible = isEligibleForMorningOT === true;
            const endTime = new Date(`${dummyDate}17:15:00`);
            
            const checkOutTime = normalizedCheckOutTime ? new Date(`${dummyDate}${normalizedCheckOutTime}`) : null;
            
            if (checkOutTime && isNaN(checkOutTime.getTime())) {
                return '';
            }

            // Disqualification Rule for other days: If user arrives late, they get no OT at all.
            if (checkInTime && checkInTime > companyStartTime) {
                return '';
            }

            let morningOtSeconds = 0;
            let eveningOtSeconds = 0;

            // Calculate morning OT only if eligible and arrived early
            if (checkInTime && isEligible && checkInTime < companyStartTime) {
                morningOtSeconds = Math.floor((companyStartTime.getTime() - checkInTime.getTime()) / 1000);
            }

            // Calculate evening OT if they stayed late
            if (checkOutTime && checkOutTime > endTime) {
                eveningOtSeconds = Math.floor((checkOutTime.getTime() - endTime.getTime()) / 1000);
            }
            
            totalOtSeconds = morningOtSeconds + eveningOtSeconds;
        }

        if (totalOtSeconds <= 0) {
            return '';
        }

        const seconds = totalOtSeconds % 60;
        let totalOtMinutes = Math.floor(totalOtSeconds / 60);

        if (seconds > 30) {
            totalOtMinutes += 1;
        }

        if (totalOtMinutes <= 0) {
            return '';
        }

        const hours = Math.floor(totalOtMinutes / 60);
        const minutes = totalOtMinutes % 60;

        const partStrings: string[] = [];
        if (hours > 0) partStrings.push(`${hours}h`);
        if (minutes > 0) partStrings.push(`${minutes}m`);
        return partStrings.join(' ');

    } catch (e) {
        console.error("Error calculating overtime for:", checkIn, checkOut, e);
        return '';
    }
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

const parseDurationToSeconds = (duration: string): number => {
    if (!duration || typeof duration !== 'string' || duration === '-') return 0;
    
    let totalSeconds = 0;
    const hourMatch = duration.match(/(\d+)\s*h/);
    const minMatch = duration.match(/(\d+)\s*m/);

    if (hourMatch) {
        totalSeconds += parseInt(hourMatch[1], 10) * 3600;
    }
    if (minMatch) {
        totalSeconds += parseInt(minMatch[1], 10) * 60;
    }

    return totalSeconds;
};

const formatSecondsToHoursString = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return '0h 0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};


export default function AttendancePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dateRange, setDateRange] = useState<string>('');
  
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

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
  const { holidays, isLoading: isLoadingHolidays } = useHolidays();
  const { saveAttendanceForMonth, getAttendanceForMonth, deleteAttendanceForMonth } = useAttendance();
  
  const isLoading = isUsersLoading || isLoadingLeave || isLoadingHolidays;

  const totalMonthlyOTSeconds = useMemo(() => {
    return attendanceData.reduce((acc, record) => acc + parseDurationToSeconds(record.overtime), 0);
  }, [attendanceData]);

  const selectableUsers = useMemo(() => {
    if (isUsersLoading || !allUsers) return [];
    return allUsers.filter(u => u.role === 'editor' || u.role === 'admin' || u.role === 'super admin').sort((a, b) => a.username.localeCompare(b.username));
  }, [allUsers, isUsersLoading]);

  const availableYears = useMemo(() => {
      const years = [];
      for (let i = 2030; i >= 2025; i--) {
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
    if (selectedUserId) {
      setSelectedUser(allUsers.find(u => u.id === selectedUserId) || null);
    } else {
      setSelectedUser(null);
    }
  }, [selectedUserId, allUsers]);

  useEffect(() => {
    const fetchAttendance = async () => {
        if (isProcessingFileRef.current) {
            // When a file is being processed, it sets the attendance data itself.
            // We prevent this effect from re-fetching and overwriting it.
            return;
        }
        if (selectedUserId && selectedYear && selectedMonth) {
            setFile(null); // Clear any selected file
            const data = await getAttendanceForMonth(selectedUserId, selectedYear, selectedMonth);
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
  }, [selectedUserId, selectedYear, selectedMonth, getAttendanceForMonth]);

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
    if (!selectedUser) {
        toast({ title: 'No User Selected', description: 'Please select a user before processing a file.', variant: 'destructive' });
        return;
    }
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
        isProcessingFileRef.current = true;
        try {
            const fileData = event.target?.result;
            if (!fileData) {
                throw new Error("Could not read file buffer.");
            }
            
            const workbook = XLSX.read(fileData, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert sheet to JSON, but get raw values to inspect for the date
            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            if (!jsonData || jsonData.length === 0) {
                 throw new Error("The uploaded file appears to be empty or could not be read.");
            }
            
            if(jsonData && jsonData.length > 0 && jsonData[0] && jsonData[0].every(column => !column)){
                jsonData.splice(0, 1)
            }
            console.log("jsonData", jsonData)

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
            
            const userLeaveRequests = leaveRequests.filter(
                req => req.userId === selectedUser.id && (req.status === 'approved')
            );
            
            const newAttendanceData: AttendanceRecord[] = daysInRange.map((day, index) => {
                const colIndex = index + 1;
                const dataForDay = columnDataMap.get(colIndex);
                const checkInValue = dataForDay?.checkIn || '';
                const checkOutValue = dataForDay?.checkOut || '';

                const leaveForDay = userLeaveRequests.find(req => req.date && isSameDay(parseISO(req.date), day));
                let leaveInfo = '';
                if (leaveForDay) {
                    leaveInfo = leaveForDay.leaveType.replace('-', ' ');
                }
                const earlyLeave = calculateEarlyLeave(checkOutValue, leaveInfo);

                return {
                    date: format(day, 'MMM d, yyyy'),
                    checkIn: checkInValue,
                    checkOut: checkOutValue,
                    overtime: calculateOvertime(checkInValue, checkOutValue, selectedUser.isEligibleForMorningOT, day),
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

    reader.readAsBinaryString(selectedFile);
  };
  
  const handleAttendanceChange = (recordIndex: number, field: 'checkIn' | 'checkOut' | 'earlyLeave', value: string) => {
      const updatedData = [...attendanceData];
      const record = updatedData[recordIndex];
      
      record[field] = value;
      
      if (field === 'checkIn' || field === 'checkOut') {
        const recordDate = new Date(record.date);
        record.overtime = calculateOvertime(record.checkIn, record.checkOut, selectedUser?.isEligibleForMorningOT, recordDate);
        record.earlyLeave = calculateEarlyLeave(record.checkOut, record.leaveInfo);
      }
      
      setAttendanceData(updatedData);
  }
  
  const handleSaveAttendance = async () => {
        if (!selectedUserId || !selectedYear || !selectedMonth) {
            toast({ title: 'Cannot Save', description: 'User, Year, or Month not selected.', variant: 'destructive'});
            return;
        }

        setIsSaving(true);
        const result = await saveAttendanceForMonth(selectedUserId, selectedYear, selectedMonth, attendanceData);
        if (!result.success) {
            // Error toast is already handled in the context
        }
        setIsSaving(false);
    };

  const handleDeleteSheet = async () => {
    if (!selectedUserId || !selectedYear || !selectedMonth) {
        toast({ title: 'Cannot Delete', description: 'User, Year, or Month not selected.', variant: 'destructive'});
        return;
    }

    setIsDeleting(true);
    const result = await deleteAttendanceForMonth(selectedUserId, selectedYear, selectedMonth);
    if (result.success) {
        setAttendanceData([]);
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  };

  const handleResyncData = () => {
    if (!selectedUser || !attendanceData.length) {
        toast({ title: 'Cannot Re-sync', description: 'No user or attendance data to re-sync.', variant: 'destructive' });
        return;
    }

    const userLeaveRequests = leaveRequests.filter(
        req => req.userId === selectedUser.id && (req.status === 'approved')
    );

    const updatedData = attendanceData.map(record => {
        const recordDate = new Date(record.date);
        
        const leaveForDay = userLeaveRequests.find(req => req.date && isSameDay(parseISO(req.date), recordDate));
        let leaveInfo = '';
        if (leaveForDay) {
            leaveInfo = leaveForDay.leaveType.replace('-', ' ');
        }

        const newOvertime = calculateOvertime(record.checkIn, record.checkOut, selectedUser.isEligibleForMorningOT, recordDate);
        const newEarlyLeave = calculateEarlyLeave(record.checkOut, leaveInfo);

        return {
            ...record,
            leaveInfo,
            overtime: newOvertime,
            earlyLeave: newEarlyLeave,
        };
    });

    setAttendanceData(updatedData);
    toast({ title: 'Re-sync Complete', description: 'Leave and holiday data has been refreshed.' });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <CalendarCheck className="mr-3 h-8 w-8 text-primary" /> User Attendance Sheet
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Select Period to View or Upload</CardTitle>
          <CardDescription>
            Select a user, year, and month to view saved attendance. If no records exist, you can upload an attendance file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
                <Label htmlFor="user-select">User</Label>
                {isLoading ? (
                    <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Select
                        value={selectedUserId}
                        onValueChange={setSelectedUserId}
                        disabled={isLoading || isProcessing}
                    >
                        <SelectTrigger id="user-select">
                            <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                            {selectableUsers.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.fullName || user.username}
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
      
      {selectedUserId && (
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
                            disabled={isProcessing || !selectedUserId}
                        />
                    </div>
                    <Button onClick={() => file && handleProcessFile(file)} disabled={!file || !selectedUserId || isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isProcessing ? 'Processing...' : 'Review File'}
                    </Button>
                </div>
                {file && <p className="text-sm text-muted-foreground mt-2">Selected file: {file.name}</p>}
            </CardContent>
        </Card>
      )}
      
      {selectedUserId && attendanceData.length > 0 && (
          <Card>
              <CardHeader>
                  <div className="flex justify-between items-start">
                      <div>
                          <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" /> Reviewing Attendance for: <span className="ml-2 font-bold text-primary">{selectedUser?.username}</span></CardTitle>
                          <CardDescription className="mt-1.5">
                              Review and edit the attendance data for {format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')}.
                          </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                          <Button onClick={handleResyncData} variant="outline" size="sm" disabled={isSaving || isProcessing || isDeleting}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Re-sync Data
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)} disabled={isSaving || isProcessing || isDeleting}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Sheet
                          </Button>
                      </div>
                  </div>
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="w-[180px]">Date</TableHead>
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
                              <TableHead className="w-[150px]">
                                <div className="flex items-center">
                                    <NotebookText className="mr-2 h-4 w-4" /> Remarks
                                </div>
                              </TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {attendanceData.map((rec, recordIndex) => {
                                const recordDate = new Date(rec.date);
                                const isSunday = recordDate.getDay() === 0;
                                const publicHoliday = holidays.find(h => !h.isWorkingDay && isSameDay(parseISO(h.date), recordDate));
                                
                                let remark = '';
                                if (publicHoliday) {
                                    remark = publicHoliday.name;
                                } else if (isSunday) {
                                    remark = 'Sunday';
                                }

                                return (
                                <TableRow key={recordIndex} className={cn((isSunday || publicHoliday) && "bg-muted/50")}>
                                    <TableCell className="font-medium">{format(recordDate, 'MMM d, yyyy (EEE)')}</TableCell>
                                    <TableCell>
                                        <Input 
                                            type="text" 
                                            value={rec.checkIn}
                                            onChange={(e) => handleAttendanceChange(recordIndex, 'checkIn', e.target.value)}
                                            placeholder="--:--:--"
                                            className={cn("h-9", getCheckInStyling(rec.checkIn))} 
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
                                    <TableCell>
                                      {remark && <Badge variant="secondary">{remark}</Badge>}
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-bold">Total Monthly Overtime:</TableCell>
                          <TableCell className="font-bold text-lg text-primary">
                            {formatSecondsToHoursString(totalMonthlyOTSeconds)}
                          </TableCell>
                          <TableCell colSpan={3} />
                        </TableRow>
                      </TableFooter>
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

      {!selectedUserId && !isProcessing && (
          <Card className="shadow-md text-center py-10">
          <CardContent>
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium">Select a User</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Please choose a user, year, and month to proceed.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedUserId && attendanceData.length === 0 && !isProcessing && (
          <Card className="shadow-md text-center py-10">
          <CardContent>
            <Search className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium">No Saved Records</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No attendance records found for ${selectedUser?.username} for {format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')}.
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
              This action cannot be undone. This will permanently delete the attendance sheet for <span className="font-semibold">{selectedUser?.username}</span> for <span className="font-semibold">{format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')}</span>.
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
