
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { useHolidays } from '@/hooks/useHolidays';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, getMonth, getYear, isSameDay, parseISO } from 'date-fns';
import type { AttendanceRecord } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Clock, Hourglass, AlertTriangle, Plane, Calendar as CalendarIcon, Loader2, BookOpen, NotebookText, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const parseDurationToSeconds = (duration: string): number => {
    if (!duration || duration === '-') return 0;
    
    let totalSeconds = 0;
    const parts = duration.split(' ');
    
    parts.forEach(part => {
        if (part.endsWith('h')) {
            totalSeconds += parseInt(part.replace('h', ''), 10) * 3600;
        } else if (part.endsWith('m')) {
            totalSeconds += parseInt(part.replace('m', ''), 10) * 60;
        }
    });

    return totalSeconds;
};

const formatDurationFromTotalSeconds = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '0m';
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.length > 0 ? parts.join(' ') : '0m';
};


export default function MyAttendancePage() {
  const { user, isAuthLoading } = useAuth();
  const { getAttendanceForMonth } = useAttendance();
  const { leaveRequests, isLoading: isLeaveLoading } = useLeave();
  const { holidays, isLoading: isHolidaysLoading } = useHolidays();

  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date(2025, new Date().getMonth(), 1));
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[] | null>(null);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);

  const selectedYear = getYear(currentDisplayDate);
  const selectedMonth = getMonth(currentDisplayDate);
  
  const isLoading = isAuthLoading || isLeaveLoading || isFetchingAttendance || isHolidaysLoading;

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user) return;
      setIsFetchingAttendance(true);
      const data = await getAttendanceForMonth(user.id, String(selectedYear), String(selectedMonth + 1).padStart(2, '0'));
      setAttendanceData(data);
      setIsFetchingAttendance(false);
    };

    fetchAttendance();
  }, [user, selectedYear, selectedMonth, getAttendanceForMonth]);

  const approvedLeaves = useMemo(() => {
    if (!user) return [];
    return leaveRequests.filter(req => req.userId === user.id && req.status === 'approved');
  }, [leaveRequests, user]);

  const combinedMonthData = useMemo(() => {
    if (!attendanceData) {
      return [];
    }

    const recordsFromData = attendanceData.map(rec => {
        const day = new Date(rec.date);
        const leaveForDay = approvedLeaves.find(req => req.date && isSameDay(parseISO(req.date), day));
        const isSunday = day.getDay() === 0;
        const isSaturday = day.getDay() === 6;
        const publicHoliday = holidays.find(h => !h.isWorkingDay && isSameDay(parseISO(h.date), day));
        
        let status = 'Present';
        if (leaveForDay) {
            status = 'On Leave';
        } else if (publicHoliday) {
            status = 'Holiday';
        } else if (isSunday) {
            status = 'Sunday';
        } else if (isSaturday && !rec.checkIn && !rec.checkOut) {
            status = 'Weekend';
        } else if (!rec.checkIn && !rec.checkOut) {
            status = 'Absent';
        }

        let remark = '';
        if (publicHoliday) {
            remark = publicHoliday.name;
        }

        return {
            dateObj: day,
            date: format(day, 'MMM d, yyyy (EEE)'),
            checkIn: rec.checkIn || '-',
            checkOut: rec.checkOut || '-',
            overtime: rec.overtime || '-',
            earlyLeave: rec.earlyLeave || '-',
            leaveInfo: leaveForDay ? leaveForDay.leaveType.replace('-', ' ') : (rec.leaveInfo || '-'),
            status: status,
            remark: remark,
            isHolidayOrSunday: !!publicHoliday || isSunday
        };
    });

    recordsFromData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    
    return recordsFromData.map(({ dateObj, ...rest }) => rest);

  }, [attendanceData, approvedLeaves, holidays]);
  
  const summaryStats = useMemo(() => {
    let totalOvertimeSeconds = 0;
    let totalEarlyLeaveSeconds = 0;
    let totalLeaves = 0;

    combinedMonthData.forEach(rec => {
        totalOvertimeSeconds += parseDurationToSeconds(rec.overtime);
        totalEarlyLeaveSeconds += parseDurationToSeconds(rec.earlyLeave);
        if (rec.leaveInfo.toLowerCase().includes('full')) {
            totalLeaves += 1;
        } else if (rec.leaveInfo.toLowerCase().includes('half')) {
            totalLeaves += 0.5;
        }
    });

    return {
        totalOvertime: formatDurationFromTotalSeconds(totalOvertimeSeconds),
        totalEarlyLeave: formatDurationFromTotalSeconds(totalEarlyLeaveSeconds),
        totalLeaves: totalLeaves,
    };
  }, [combinedMonthData]);

  const availableYears = useMemo(() => {
      const years = [];
      for (let i = 2030; i >= 2025; i--) {
          years.push(i.toString());
      }
      return years;
  }, []);

  const availableMonths = useMemo(() => {
      return Array.from({ length: 12 }, (_, i) => ({
          value: i.toString(),
          label: format(new Date(2000, i), 'MMMM'),
      }));
  }, []);

  const handleYearChange = (year: string) => {
    setCurrentDisplayDate(new Date(parseInt(year), selectedMonth, 1));
  };

  const handleMonthChange = (month: string) => {
    setCurrentDisplayDate(new Date(selectedYear, parseInt(month), 1));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return <Badge variant="secondary">Present</Badge>;
      case 'On Leave':
        return <Badge variant="outline" className="border-sky-500 text-sky-500">On Leave</Badge>;
      case 'Weekend':
        return <Badge variant="outline">Weekend</Badge>;
      case 'Sunday':
        return <Badge variant="outline">Sunday</Badge>;
      case 'Holiday':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Holiday</Badge>;
      case 'Absent':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <CalendarIcon className="mr-3 h-8 w-8 text-primary" /> My Attendance Log
      </h1>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Overtime</CardTitle>
                <Hourglass className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalOvertime}</div>
                <p className="text-xs text-muted-foreground">For the selected month</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leaves Taken</CardTitle>
                <Plane className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{summaryStats.totalLeaves}</div>
                <p className="text-xs text-muted-foreground">Full & half days</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Early Leave</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-orange-600">{summaryStats.totalEarlyLeave}</div>
                <p className="text-xs text-muted-foreground">For the selected month</p>
            </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>View Your Attendance</CardTitle>
          <CardDescription>Select a year and month to view your attendance and leave records in a table.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="space-y-2">
                    <Select value={String(selectedYear)} onValueChange={handleYearChange} disabled={isLoading}>
                        <SelectTrigger className="w-full sm:w-[180px]">
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
                    <Select value={String(selectedMonth)} onValueChange={handleMonthChange} disabled={isLoading}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {availableMonths.map(month => (
                                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground self-end" />}
            </div>
            
            {isLoading ? (
              <div className="border rounded-md p-4">
                  <div className="h-96 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                  </div>
              </div>
            ) : attendanceData && combinedMonthData.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Check-in</TableHead>
                            <TableHead>Check-out</TableHead>
                            <TableHead>Overtime</TableHead>
                            <TableHead>Early Leave</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Remarks</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {combinedMonthData.map((day, index) => (
                            <TableRow key={index} className={cn(day.isHolidayOrSunday && "bg-muted/50")}>
                                <TableCell className="font-medium">{day.date}</TableCell>
                                <TableCell>{getStatusBadge(day.status)}</TableCell>
                                <TableCell>{day.checkIn}</TableCell>
                                <TableCell>{day.checkOut}</TableCell>
                                <TableCell>{day.overtime}</TableCell>
                                <TableCell className={cn(day.earlyLeave !== '-' && "text-orange-600 font-medium")}>{day.earlyLeave}</TableCell>
                                <TableCell className="capitalize">
                                    {day.leaveInfo && day.leaveInfo !== '-' && <Badge variant="outline" className="border-sky-500 text-sky-500">{day.leaveInfo}</Badge>}
                                </TableCell>
                                <TableCell>
                                    {day.remark && <Badge variant="secondary">{day.remark}</Badge>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </div>
            ) : (
                <div className="border-2 border-dashed rounded-lg p-12 text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-medium">No Records Found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No attendance records have been saved for you for {format(currentDisplayDate, 'MMMM yyyy')}.
                  </p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
