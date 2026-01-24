
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, getMonth, getYear, isSameDay, parseISO } from 'date-fns';
import type { AttendanceRecord, LeaveRequest } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Clock, Hourglass, AlertTriangle, Plane, Calendar as CalendarIcon, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MyAttendancePage() {
  const { user, isAuthLoading } = useAuth();
  const { getAttendanceForMonth } = useAttendance();
  const { leaveRequests, isLoading: isLeaveLoading } = useLeave();

  const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[] | null>(null);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);

  const selectedYear = getYear(currentDisplayDate);
  const selectedMonth = getMonth(currentDisplayDate);
  
  const isLoading = isAuthLoading || isLeaveLoading || isFetchingAttendance;

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
        const leaveForDay = approvedLeaves.find(req => isSameDay(parseISO(req.date), day));
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        
        let status = 'Present';
         if (leaveForDay) {
            status = 'On Leave';
        } else if (isWeekend && !rec.checkIn && !rec.checkOut) {
            status = 'Weekend';
        } else if (!rec.checkIn && !rec.checkOut) {
            status = 'Absent'
        }

        return {
            dateObj: day, // For sorting
            date: format(day, 'MMM d, yyyy (EEE)'),
            checkIn: rec.checkIn || '-',
            checkOut: rec.checkOut || '-',
            overtime: rec.overtime || '-',
            earlyLeave: rec.earlyLeave || '-',
            leaveInfo: leaveForDay ? leaveForDay.leaveType.replace('-', ' ') : (rec.leaveInfo || '-'),
            status: status,
        };
    });

    recordsFromData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    
    return recordsFromData.map(({ dateObj, ...rest }) => rest);

  }, [attendanceData, approvedLeaves]);
  
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {combinedMonthData.map((day, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{day.date}</TableCell>
                                <TableCell>{getStatusBadge(day.status)}</TableCell>
                                <TableCell>{day.checkIn}</TableCell>
                                <TableCell>{day.checkOut}</TableCell>
                                <TableCell>{day.overtime}</TableCell>
                                <TableCell className={cn(day.earlyLeave !== '-' && "text-orange-600 font-medium")}>{day.earlyLeave}</TableCell>
                                <TableCell className="capitalize">{day.leaveInfo}</TableCell>
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
