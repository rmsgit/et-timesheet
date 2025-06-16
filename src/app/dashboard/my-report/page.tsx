
"use client";

import React, { useState, useMemo } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useAuth } from '@/hooks/useAuth';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertCircle, Hourglass, Loader2, Package, RefreshCw, FilePlus2, Film, Clock, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import type { TimeRecord } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const formatDurationFromDecimalHours = (totalDecimalHours: number): string => {
  if (isNaN(totalDecimalHours) || totalDecimalHours < 0) return 'N/A';
  const hours = Math.floor(totalDecimalHours);
  const minutes = Math.round((totalDecimalHours % 1) * 60);
  return `${hours}h ${minutes}m`;
};

const formatDurationFromTotalSeconds = (totalSeconds: number | undefined | null): string => {
  if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds) || totalSeconds < 0) return 'N/A';
  if (totalSeconds === 0) return '0s';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (totalSeconds > 0 && (seconds > 0 || parts.length === 0)) {
     parts.push(`${seconds}s`);
  }
  if (parts.length === 0 && totalSeconds === 0) return "0s";
  
  return parts.join(' ') || "0s";
};

type SortableTimeRecordKeysMyReport = keyof Pick<TimeRecord, 'date' | 'projectName' | 'projectType' | 'workType' | 'projectDurationSeconds' | 'durationHours' | 'completedAt' | 'reChecked'>;

const compareTimestamps = (tsA: string | undefined, tsB: string | undefined): number => {
  if (!tsA && !tsB) return 0;
  if (!tsA) return -1;
  if (!tsB) return 1;
  return new Date(tsA).getTime() - new Date(tsB).getTime();
};


export default function MyReportPage() {
  const { user, isAuthLoading } = useAuth();
  const { getRecordsByDateRange, isTimesheetLoading } = useTimesheet();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [sortConfig, setSortConfig] = useState<{ key: SortableTimeRecordKeysMyReport | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });


  const isLoading = isAuthLoading || isTimesheetLoading;

  const allRecordsForUserInRange = useMemo(() => {
    if (isLoading || !user || !dateRange?.from) return [];
    
    const effectiveStartDate = new Date(dateRange.from);
    effectiveStartDate.setHours(0, 0, 0, 0); 

    const effectiveEndDate = dateRange.to || dateRange.from;
    effectiveEndDate.setHours(23, 59, 59, 999);

    return getRecordsByDateRange(user.id, effectiveStartDate, effectiveEndDate);
  }, [user, dateRange, getRecordsByDateRange, isLoading]);

  const sortedRecords = useMemo(() => {
    let sortableItems = [...allRecordsForUserInRange];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];
        
        let comparison = 0;
         if (sortConfig.key === 'date' || sortConfig.key === 'completedAt') {
          comparison = compareTimestamps(valA as string | undefined, valB as string | undefined);
        } else if (sortConfig.key === 'reChecked') {
          const boolA = valA === true;
          const boolB = valB === true;
          comparison = boolA === boolB ? 0 : boolA ? -1 : 1;
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (valA === undefined || valA === null) {
          comparison = -1;
        } else if (valB === undefined || valB === null) {
          comparison = 1;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        } else {
          const strA = String(valA).toLowerCase();
          const strB = String(valB).toLowerCase();
          comparison = strA.localeCompare(strB);
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [allRecordsForUserInRange, sortConfig]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRecords, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedRecords.length / rowsPerPage);

  const requestSort = (key: SortableTimeRecordKeysMyReport) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: SortableTimeRecordKeysMyReport) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };


  const totalHours = useMemo(() => {
    return allRecordsForUserInRange.reduce((sum, record) => sum + record.durationHours, 0);
  }, [allRecordsForUserInRange]);

  const totalProjects = useMemo(() => {
    return new Set(allRecordsForUserInRange.map(record => record.projectName)).size;
  }, [allRecordsForUserInRange]);
  
  const totalCompletedTasks = useMemo(() => {
    return allRecordsForUserInRange.filter(record => record.completedAt).length;
  }, [allRecordsForUserInRange]);

  if (isAuthLoading) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.32))] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && !isAuthLoading) { 
      return <p className="text-center text-muted-foreground p-8">User not found. Redirecting...</p>;
  }

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

  const renderSortableHeader = (label: string, columnKey: SortableTimeRecordKeysMyReport, className?: string) => (
    <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestSort(columnKey)}>
      <div className="flex items-center">
        {label}
        {getSortIcon(columnKey)}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <FileText className="mr-3 h-8 w-8 text-primary" /> My Time Report
        </h1>
        <DateRangePicker dateRange={dateRange} onDateChange={(range) => { setDateRange(range); setCurrentPage(1);}} disabled={isLoading} />
      </div>

      {isLoading && !isAuthLoading ? ( 
        <div className="grid gap-6 md:grid-cols-3">
          <CardSkeleton className="shadow-md" />
          <CardSkeleton className="shadow-md" />
          <CardSkeleton className="shadow-md" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
              <Hourglass className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDurationFromDecimalHours(totalHours)}</div>
              <p className="text-xs text-muted-foreground">
                Across {allRecordsForUserInRange.length} entries
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
      )}

      {isLoading && !isAuthLoading ? (
        <TableSkeleton columnCount={8} className="shadow-lg h-[480px]" />
      ) : sortedRecords.length > 0 ? (
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
                    {renderSortableHeader("Date", "date")}
                    {renderSortableHeader("Project Name", "projectName")}
                    {renderSortableHeader("Category", "projectType")}
                    {renderSortableHeader("Work Type", "workType")}
                    {renderSortableHeader("Proj. Duration", "projectDurationSeconds")}
                    {renderSortableHeader("Work Time", "durationHours")}
                    {renderSortableHeader("Status", "completedAt")}
                    {renderSortableHeader("Re-checked", "reChecked")}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{record.projectName}</TableCell>
                      <TableCell><Badge variant="secondary">{record.projectType}</Badge></TableCell>
                      <TableCell>{getWorkTypeBadge(record.workType)}</TableCell>
                      <TableCell>
                        <span className="flex items-center">
                            <Film className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
                            {formatDurationFromTotalSeconds(record.projectDurationSeconds)}
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
                      <TableCell>
                        {record.reChecked ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <CheckSquare className="mr-1 h-3 w-3" /> Re-checked
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Re-checked</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="justify-between pt-4">
               <span className="text-sm text-muted-foreground">
                Total entries: {sortedRecords.length}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          )}
          {totalPages <= 1 && sortedRecords.length > 0 && (
             <CardFooter className="justify-end pt-4">
                <p className="text-sm text-muted-foreground">Total entries in selected range: {sortedRecords.length}</p>
            </CardFooter>
          )}
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

