
"use client";

import React, { useState, useMemo } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useAuth } from '@/hooks/useAuth';
import type { TimeRecord } from '@/lib/types';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { addDays, format, parseISO, startOfMonth } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertCircle, Hourglass } from 'lucide-react';

export default function MyReportPage() {
  const { user } = useAuth();
  const { getRecordsByDateRange } = useTimesheet();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const filteredRecords = useMemo(() => {
    if (!user || !dateRange?.from || !dateRange?.to) return [];
    return getRecordsByDateRange(user.id, dateRange.from, dateRange.to)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [user, dateRange, getRecordsByDateRange]);

  const totalHours = useMemo(() => {
    return filteredRecords.reduce((sum, record) => sum + record.durationHours, 0);
  }, [filteredRecords]);

  const totalProjects = useMemo(() => {
    return new Set(filteredRecords.map(record => record.projectName)).size;
  }, [filteredRecords]);
  
  const totalCompletedTasks = useMemo(() => {
    return filteredRecords.filter(record => record.completedAt).length;
  }, [filteredRecords]);


  if (!user) return <p>Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" /> My Time Report
        </h1>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
            <Hourglass className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground">
              Across {filteredRecords.length} entries
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects Worked On</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted-foreground lucide lucide-briefcase"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
             <p className="text-xs text-muted-foreground">
              Unique projects
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted-foreground lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCompletedTasks}</div>
             <p className="text-xs text-muted-foreground">
              Marked as complete
            </p>
          </CardContent>
        </Card>
      </div>

      {filteredRecords.length > 0 ? (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Detailed Log</CardTitle>
            <CardDescription>
              Showing records from {dateRange?.from ? format(dateRange.from, "PPP") : ''} to {dateRange?.to ? format(dateRange.to, "PPP") : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration (hrs)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{record.projectName}</TableCell>
                      <TableCell><Badge variant="secondary">{record.projectType}</Badge></TableCell>
                      <TableCell>{record.durationHours.toFixed(1)}</TableCell>
                      <TableCell>
                        {record.completedAt ? (
                           <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                        {record.isRevision && <Badge variant="outline" className="ml-2 border-orange-500 text-orange-500">Revision</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
          <CardFooter className="justify-end pt-4">
            <p className="text-sm text-muted-foreground">Total entries in selected range: {filteredRecords.length}</p>
          </CardFooter>
        </Card>
      ) : (
        <Card className="shadow-md text-center py-10">
          <CardContent>
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium">No Records Found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              There are no time records for the selected date range.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
