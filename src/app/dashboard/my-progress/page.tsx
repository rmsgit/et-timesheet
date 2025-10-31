"use client";

import React, { useState, useMemo } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useAuth } from '@/hooks/useAuth';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { format, parseISO, eachDayOfInterval, startOfDay, endOfDay, subDays, compareAsc } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, BarChart2, AlertCircle, Loader2, Hourglass, CheckCircle2, ListChecks } from 'lucide-react';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';

const formatDurationFromDecimalHours = (totalDecimalHours: number): string => {
  if (isNaN(totalDecimalHours) || totalDecimalHours < 0) return 'N/A';
  const hours = Math.floor(totalDecimalHours);
  const minutes = Math.round((totalDecimalHours % 1) * 60);
  return `${hours}h ${minutes}m`;
};


export default function MyProgressPage() {
  const { user, isAuthLoading } = useAuth();
  const { getRecordsByDateRange, isTimesheetLoading } = useTimesheet();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  
  const isLoading = isAuthLoading || isTimesheetLoading;

  const recordsInRange = useMemo(() => {
    if (isLoading || !user || !dateRange?.from) return [];
    
    const startDate = startOfDay(dateRange.from);
    const endDate = endOfDay(dateRange.to || dateRange.from);
    
    return getRecordsByDateRange(user.id, startDate, endDate);
  }, [user, dateRange, getRecordsByDateRange, isLoading]);

  const completedRecordsInRange = useMemo(() => {
    return recordsInRange.filter(record => record.completedAt);
  }, [recordsInRange]);


  const dailyChartData = useMemo(() => {
    if (!dateRange?.from || completedRecordsInRange.length === 0) return [];
    
    const startDate = startOfDay(dateRange.from);
    const endDate = endOfDay(dateRange.to || dateRange.from);

    const dailyData: { [date: string]: { totalHours: number, completedTasks: number } } = {};
    const allDates = eachDayOfInterval({ start: startDate, end: endDate });
    allDates.forEach(day => {
        dailyData[format(day, 'yyyy-MM-dd')] = { totalHours: 0, completedTasks: 0 };
    });

    completedRecordsInRange.forEach(record => {
      const recordDateStr = format(parseISO(record.date), 'yyyy-MM-dd');
      if (dailyData[recordDateStr]) {
        dailyData[recordDateStr].totalHours += record.durationHours;
        dailyData[recordDateStr].completedTasks += 1;
      }
    });
    
    return Object.entries(dailyData)
        .map(([dateStr, data]) => ({
            date: format(parseISO(dateStr), 'MMM d'),
            fullDate: dateStr,
            totalHours: parseFloat(data.totalHours.toFixed(2)),
            completedTasks: data.completedTasks,
        }))
        .sort((a,b) => compareAsc(parseISO(a.fullDate), parseISO(b.fullDate)));

  }, [completedRecordsInRange, dateRange]);


  const totalHoursInRange = useMemo(() => {
    return completedRecordsInRange.reduce((sum, record) => sum + record.durationHours, 0);
  }, [completedRecordsInRange]);

  const totalCompletedTasksInRange = useMemo(() => {
    return completedRecordsInRange.length;
  }, [completedRecordsInRange]);

  const totalPendingTasksInRange = useMemo(() => {
    return recordsInRange.filter(record => !record.completedAt).length;
  }, [recordsInRange]);
  
  if (isLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
            <div className="grid gap-6 md:grid-cols-3">
              <CardSkeleton className="shadow-md" />
              <CardSkeleton className="shadow-md" />
              <CardSkeleton className="shadow-md" />
            </div>
            <CardSkeleton className="shadow-md h-[400px]" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <TrendingUp className="mr-3 h-8 w-8 text-primary" /> My Progress
          </h1>
           <p className="text-lg text-muted-foreground mt-1">
             Visualize your completed work and track performance over time.
           </p>
        </div>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} disabled={isLoading} />
      </div>

       <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
              <Hourglass className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDurationFromDecimalHours(totalHoursInRange)}</div>
              <p className="text-xs text-muted-foreground">In selected date range</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
               <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCompletedTasksInRange}</div>
              <p className="text-xs text-muted-foreground">In selected date range</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <ListChecks className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPendingTasksInRange}</div>
              <p className="text-xs text-muted-foreground">In selected date range</p>
            </CardContent>
          </Card>
        </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart2 className="mr-2 h-6 w-6 text-primary" /> Daily Performance
          </CardTitle>
          <CardDescription>
            Hours logged and tasks completed per day for the selected period.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] pl-2 pr-6 pt-4 pb-4">
          {dailyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="hsl(var(--primary))" orientation="left" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                <YAxis yAxisId="right" stroke="hsl(var(--accent))" orientation="right" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{fontSize: "12px"}} />
                <Bar yAxisId="left" dataKey="totalHours" fill="hsl(var(--primary))" name="Hours Logged" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="completedTasks" fill="hsl(var(--accent))" name="Tasks Completed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex h-full w-full items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-xl font-medium">No Completed Task Data</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        There are no completed tasks in the selected date range to display.
                    </p>
                </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
