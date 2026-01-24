'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, getMonth, getYear, isSameDay, parseISO } from 'date-fns';
import type { AttendanceRecord, LeaveRequest } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Clock, Hourglass, AlertTriangle, Plane, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DayContent = ({ date, attendance, leave }: { date: Date, attendance?: AttendanceRecord | null, leave?: LeaveRequest | null }) => {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div className="relative flex flex-col h-full p-2 text-left">
      <time dateTime={date.toISOString()} className={cn("font-semibold", isWeekend && "text-muted-foreground/80")}>
        {format(date, 'd')}
      </time>
      
      {leave ? (
        <div className="flex-grow flex items-center justify-center">
            <Badge variant="outline" className="capitalize border-sky-500 text-sky-500 text-sm text-center p-2">
                <Plane className="mr-1.5 h-4 w-4"/> {leave.leaveType.replace('-', ' ')}
            </Badge>
        </div>
      ) : attendance && attendance.checkIn ? (
        <div className="mt-1 space-y-1.5 text-sm flex-grow">
          <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">{attendance.checkIn} - {attendance.checkOut || '...'}</span>
          </div>
          {attendance.overtime && (
            <div className="flex items-center gap-1.5">
                <Hourglass className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">{attendance.overtime} OT</span>
            </div>
          )}
           {attendance.earlyLeave && (
            <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">{attendance.earlyLeave} Early</span>
            </div>
          )}
        </div>
      ) : !isWeekend && (
         <div className="flex-grow flex items-center justify-center">
            <Badge variant="destructive" className="text-sm p-2">Absent</Badge>
         </div>
      )}
    </div>
  );
};


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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <CalendarIcon className="mr-3 h-8 w-8 text-primary" /> My Attendance Calendar
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>View Your Attendance</CardTitle>
          <CardDescription>Select a year and month to view your attendance and leave records.</CardDescription>
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
            
            <Calendar
                mode="single"
                month={currentDisplayDate}
                onMonthChange={setCurrentDisplayDate}
                className="p-0 [&_td]:p-0 [&_tr]:border-0"
                classNames={{
                    day: 'h-40 w-full align-top border',
                    day_selected: 'bg-accent/50 text-accent-foreground',
                    day_today: 'bg-accent/50 text-accent-foreground',
                    head_cell: 'w-full text-base',
                }}
                components={{
                    DayContent: (props) => {
                        const attendanceForDay = attendanceData?.find(rec => {
                            try {
                                return isSameDay(parseISO(rec.date), props.date);
                            } catch (e) {
                                // Handle cases where rec.date might not be a valid ISO string
                                // This could happen with manually entered data.
                                // A more robust solution would be to validate data on save.
                                return false;
                            }
                        });
                        const leaveForDay = approvedLeaves.find(req => isSameDay(parseISO(req.date), props.date));
                        return <DayContent {...props} attendance={attendanceForDay} leave={leaveForDay} />;
                    }
                }}
            />
        </CardContent>
      </Card>
    </div>
  );
}
