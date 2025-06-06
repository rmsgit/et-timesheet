
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { format, parseISO, startOfMonth, isSameDay } from 'date-fns';
import { AdminTimesheetChart } from '@/components/admin/AdminTimesheetChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, AlertCircle, Users, Clock, Loader2, UsersRound, Package, RefreshCw, FilePlus2, Film } from 'lucide-react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { useAuth } from '@/hooks/useAuth'; 
import type { TimeRecord } from '@/lib/types';

const formatDurationFromDecimalHours = (totalDecimalHours: number): string => {
  if (isNaN(totalDecimalHours) || totalDecimalHours < 0) return 'N/A';
  const hours = Math.floor(totalDecimalHours);
  const minutes = Math.round((totalDecimalHours % 1) * 60);
  return `${hours}h ${minutes}m`;
};

const formatDurationFromTotalMinutes = (totalMinutes: number | undefined | null): string => {
  if (totalMinutes === undefined || totalMinutes === null || isNaN(totalMinutes) || totalMinutes < 0) return 'N/A';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const formatDateDisplay = (range?: DateRange): string => {
  if (!range?.from) return 'the selected period';
  const fromDateFormatted = format(range.from, "PPP");
  if (range.to && !isSameDay(range.from, range.to)) {
    const toDateFormatted = format(range.to, "PPP");
    return `from ${fromDateFormatted} to ${toDateFormatted}`;
  }
  // Handles case where range.to is undefined OR range.to is the same day as range.from
  return `for ${fromDateFormatted}`;
};


export default function AdminReportPage() {
  const { getAllRecordsByDateRange, timeRecords: allTimeRecordsFromContext, isTimesheetLoading } = useTimesheet();
  const { users: mockUsers, isUsersLoading } = useMockUsers();
  const { user: loggedInUser } = useAuth(); 
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  useEffect(() => {
    if (!isTimesheetLoading && allTimeRecordsFromContext) {
      // console.log(`DEBUG_ADMIN_REPORT: AdminReportPage - allTimeRecordsFromContext loaded. Count: ${allTimeRecordsFromContext.length}`);
      if (allTimeRecordsFromContext.length > 0) {
        const uniqueUserIdsInContextData = Array.from(new Set(allTimeRecordsFromContext.map(r => r.userId)));
        // console.log(`DEBUG_ADMIN_REPORT: AdminReportPage - Unique UserIDs in context data:`, uniqueUserIdsInContextData);
        if (loggedInUser) {
          // console.log(`DEBUG_ADMIN_REPORT: AdminReportPage - Logged-in admin UserID: ${loggedInUser.id}`);
        }
      } else {
        // console.log(`DEBUG_ADMIN_REPORT: AdminReportPage - allTimeRecordsFromContext is empty.`);
      }
    } else if (isTimesheetLoading) {
      // console.log(`DEBUG_ADMIN_REPORT: AdminReportPage - Timesheet data is still loading...`);
    } else if (!allTimeRecordsFromContext) {
      // console.log(`DEBUG_ADMIN_REPORT: AdminReportPage - allTimeRecordsFromContext is null/undefined after loading.`);
    }
  }, [allTimeRecordsFromContext, isTimesheetLoading, loggedInUser]);

  const isLoading = isTimesheetLoading || isUsersLoading;

  const filteredRecords = useMemo(() => {
    if (isLoading || !dateRange?.from || !allTimeRecordsFromContext || !mockUsers) return [];
    
    const effectiveEndDate = dateRange.to || dateRange.from; // Use 'from' date if 'to' is not defined

    const recordsToDisplay = getAllRecordsByDateRange(dateRange.from, effectiveEndDate)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // console.log(`DEBUG_ADMIN_REPORT: AdminReportPage - filteredRecords for display (after date filter). Count: ${recordsToDisplay.length}`);
    if (recordsToDisplay.length > 0) {
        const uniqueUserIdsInFilteredData = Array.from(new Set(recordsToDisplay.map(r => r.userId)));
        // console.log(`DEBUG_ADMIN_REPORT: AdminReportPage - Unique UserIDs in filtered data for display:`, uniqueUserIdsInFilteredData);
    }
    return recordsToDisplay;
  }, [dateRange, getAllRecordsByDateRange, isLoading, allTimeRecordsFromContext, mockUsers]);

  const getUsernameById = (userId: string) => {
    if (isLoading || !mockUsers) return 'Loading...';
    return mockUsers.find(u => u.id === userId)?.username || 'Unknown User';
  };
  
  const totalHours = useMemo(() => filteredRecords.reduce((sum, r) => sum + r.durationHours, 0), [filteredRecords]);
  const uniqueActiveEditors = useMemo(() => new Set(filteredRecords.map(r => r.userId)).size, [filteredRecords]);
  const uniqueProjects = useMemo(() => new Set(filteredRecords.map(r => r.projectName)).size, [filteredRecords]);
  
  const totalRegisteredEditors = useMemo(() => {
    if (isLoading || !mockUsers) return 0;
    return mockUsers.filter(u => u.role === 'editor').length;
  }, [mockUsers, isLoading]);

  const getWorkTypeBadge = (workType: TimeRecord['workType']) => {
    switch (workType) {
      case 'New work':
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><FilePlus2 className="mr-1 h-3 w-3" />New</Badge>;
      case 'Revision':
        return <Badge variant="outline" className="border-orange-500 text-orange-500"><RefreshCw className="mr-1 h-3 w-3" />Revision</Badge>;
      case 'Sample work':
        return <Badge variant="outline" className="border-purple-500 text-purple-500"><Package className="mr-1 h-3 w-3" />Sample</Badge>;
      default:
        return <Badge variant="secondary">{workType}</Badge>;
    }
  };

  const dateDisplayString = useMemo(() => formatDateDisplay(dateRange), [dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Admin Time Report
        </h1>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} disabled={isLoading} />
      </div>
      
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton className="shadow-md" />
          <CardSkeleton className="shadow-md" />
          <CardSkeleton className="shadow-md" />
          <CardSkeleton className="shadow-md" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Work Hours (All Editors)</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDurationFromDecimalHours(totalHours)}</div>
              <p className="text-xs text-muted-foreground">{filteredRecords.length} entries {dateDisplayString}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Editors</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueActiveEditors}</div>
              <p className="text-xs text-muted-foreground">Editors with logged time {dateDisplayString}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered Editors</CardTitle>
              <UsersRound className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRegisteredEditors}</div>
              <p className="text-xs text-muted-foreground">Total editor accounts</p>
            </CardContent>
          </Card>
           <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted-foreground lucide lucide-layout-grid"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueProjects}</div>
              <p className="text-xs text-muted-foreground">Unique projects active {dateDisplayString}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <AdminTimesheetChart records={filteredRecords} />

      {isLoading ? (
        <TableSkeleton columnCount={8} className="shadow-lg mt-6 h-[480px]" />
      ) : filteredRecords.length > 0 ? (
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle>All Time Entries</CardTitle>
            <CardDescription>
              Showing all records {dateDisplayString}.
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
                    <TableHead>Category</TableHead>
                    <TableHead>Work Type</TableHead>
                    <TableHead>Proj. Duration</TableHead>
                    <TableHead>Work Time</TableHead>
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
                      <TableCell>{getWorkTypeBadge(record.workType)}</TableCell>
                      <TableCell>
                        <span className="flex items-center">
                            <Film className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
                            {formatDurationFromTotalMinutes(record.projectDurationMinutes)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center">
                            <Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
                            {formatDurationFromDecimalHours(record.durationHours)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {record.completedAt ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">Completed</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
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
              There are no time records {dateDisplayString}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

