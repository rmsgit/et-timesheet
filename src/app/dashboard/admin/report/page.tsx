
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import type { TimeRecord } from '@/lib/types';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { addDays, format, parseISO, startOfMonth } from 'date-fns';
import { AdminTimesheetChart } from '@/components/admin/AdminTimesheetChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, AlertCircle, Users, Clock } from 'lucide-react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AdminReportPage() {
  const { getAllRecordsByDateRange, timeRecords: allTimeRecords } = useTimesheet(); // Use allTimeRecords for notifications
  const { users: mockUsers } = useMockUsers(); // To map userId to username
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const filteredRecords = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return [];
    return getAllRecordsByDateRange(dateRange.from, dateRange.to)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dateRange, getAllRecordsByDateRange]);

  const getUsernameById = (userId: string) => {
    return mockUsers.find(u => u.id === userId)?.username || 'Unknown User';
  };
  
  const totalHours = useMemo(() => filteredRecords.reduce((sum, r) => sum + r.durationHours, 0), [filteredRecords]);
  const uniqueEditors = useMemo(() => new Set(filteredRecords.map(r => r.userId)).size, [filteredRecords]);
  const uniqueProjects = useMemo(() => new Set(filteredRecords.map(r => r.projectName)).size, [filteredRecords]);


  // Simple notification check for new completed tasks
  // This is a basic example; real-time cross-user notifications are complex client-side.
  // This simulates admin being notified if they are currently on this page.
  useEffect(() => {
    // Logic for notifications upon task completion is now in TimesheetContext.
    // This effect could be used for more specific admin-only notifications or polling if needed.
    // For this app, the TimesheetContext handles generic "Task Completed" notification.
  }, [allTimeRecords]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Admin Time Report
        </h1>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours (All Editors)</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground">Across {filteredRecords.length} entries</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Editors</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueEditors}</div>
            <p className="text-xs text-muted-foreground">Editors with logged time</p>
          </CardContent>
        </Card>
         <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted-foreground lucide lucide-layout-grid"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueProjects}</div>
            <p className="text-xs text-muted-foreground">Unique projects worked on</p>
          </CardContent>
        </Card>
      </div>

      <AdminTimesheetChart records={filteredRecords} />

      {filteredRecords.length > 0 ? (
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle>All Time Entries</CardTitle>
            <CardDescription>
              Showing all records from {dateRange?.from ? format(dateRange.from, "PPP") : ''} to {dateRange?.to ? format(dateRange.to, "PPP") : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Editor</TableHead>
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
                      <TableCell>{getUsernameById(record.userId)}</TableCell>
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
        </Card>
      ) : (
         <Card className="shadow-md text-center py-10 mt-6">
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
