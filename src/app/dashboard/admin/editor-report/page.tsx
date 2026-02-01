
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useMockUsers } from '@/hooks/useMockUsers';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { format, parseISO, eachDayOfInterval, compareAsc } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserCheck, AlertCircle, Hourglass, CheckCircle2, Briefcase, Loader2, BarChart2, Package, RefreshCw, FilePlus2, Film, Clock, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, CheckSquare, Square, Star } from 'lucide-react';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import type { TimeRecord, User } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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

const compareTimestamps = (tsA: string | undefined, tsB: string | undefined): number => {
  if (!tsA && !tsB) return 0;
  if (!tsA) return -1;
  if (!tsB) return 1;
  return new Date(tsA).getTime() - new Date(tsB).getTime();
};

type SortableTimeRecordKeysEditor = keyof Pick<TimeRecord, 'date' | 'projectName' | 'projectType' | 'workType' | 'projectDurationSeconds' | 'durationHours' | 'completedAt' | 'reChecked'>;


export default function AdminEditorReportPage() {
  const { getRecordsByDateRange, isTimesheetLoading } = useTimesheet();
  const { users: allUsers, isUsersLoading } = useMockUsers();

  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedEditor, setSelectedEditor] = useState<User | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [sortConfig, setSortConfig] = useState<{ key: SortableTimeRecordKeysEditor | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

  const isLoading = isUsersLoading || isTimesheetLoading;

  const editorUsers = useMemo(() => {
    if (isUsersLoading || !allUsers) return [];
    return allUsers.filter(u => u.role === 'editor').sort((a,b) => a.username.localeCompare(b.username));
  }, [allUsers, isUsersLoading]);

  useEffect(() => {
    if (selectedUserId) {
      setSelectedEditor(allUsers.find(u => u.id === selectedUserId) || null);
    } else {
      setSelectedEditor(null);
    }
    setCurrentPage(1);
  }, [selectedUserId, allUsers]);


  const allRecordsForEditorInRange = useMemo(() => {
    if (isLoading || !selectedUserId || !dateRange?.from) return [];

    const effectiveStartDate = new Date(dateRange.from);
    effectiveStartDate.setHours(0, 0, 0, 0);

    const effectiveEndDate = dateRange.to || dateRange.from;
    effectiveEndDate.setHours(23, 59, 59, 999);

    return getRecordsByDateRange(selectedUserId, effectiveStartDate, effectiveEndDate);
  }, [selectedUserId, dateRange, getRecordsByDateRange, isLoading]);

  const sortedRecords = useMemo(() => {
    let sortableItems = [...allRecordsForEditorInRange];
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
  }, [allRecordsForEditorInRange, sortConfig]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedRecords, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(sortedRecords.length / rowsPerPage);

  const requestSort = (key: SortableTimeRecordKeysEditor) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: SortableTimeRecordKeysEditor) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const totalHours = useMemo(() => {
    return allRecordsForEditorInRange.reduce((sum, record) => sum + record.durationHours, 0);
  }, [allRecordsForEditorInRange]);

  const totalProjects = useMemo(() => {
    return new Set(allRecordsForEditorInRange.map(record => record.projectName)).size;
  }, [allRecordsForEditorInRange]);

  const totalCompletedTasks = useMemo(() => {
    return allRecordsForEditorInRange.filter(record => record.completedAt).length;
  }, [allRecordsForEditorInRange]);

  const dailyHoursChartData = useMemo(() => {
    if (isLoading || !dateRange?.from || allRecordsForEditorInRange.length === 0) return [];

    const chartStartDate = new Date(dateRange.from);
    chartStartDate.setHours(0,0,0,0);
    const chartEndDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    chartEndDate.setHours(23,59,59,999);

    const dailyData: { [date: string]: { normalHours: number; revisionHours: number } } = {};
    const allDatesInRange = eachDayOfInterval({ start: chartStartDate, end: chartEndDate });

    allDatesInRange.forEach(day => {
      dailyData[format(day, 'yyyy-MM-dd')] = { normalHours: 0, revisionHours: 0 };
    });

    allRecordsForEditorInRange.forEach(record => {
      const recordDateStr = format(parseISO(record.date), 'yyyy-MM-dd');
      if (dailyData[recordDateStr] !== undefined) {
        if (record.workType === 'Revision') {
          dailyData[recordDateStr].revisionHours += record.durationHours;
        } else {
          dailyData[recordDateStr].normalHours += record.durationHours;
        }
      }
    });

    return Object.entries(dailyData)
      .map(([dateStr, hoursData]) => ({
        date: format(parseISO(dateStr), 'MMM d'),
        fullDate: dateStr,
        normalHours: parseFloat(hoursData.normalHours.toFixed(1)),
        revisionHours: parseFloat(hoursData.revisionHours.toFixed(1)),
      }))
      .sort((a,b) => compareAsc(parseISO(a.fullDate), parseISO(b.fullDate)));
  }, [allRecordsForEditorInRange, dateRange, isLoading]);

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

  const renderSortableHeader = (label: string, columnKey: SortableTimeRecordKeysEditor, className?: string) => (
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
          <UserCheck className="mr-3 h-8 w-8 text-primary" /> Editor Specific Report
        </h1>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Select Editor and Date Range</CardTitle>
          <CardDescription>Choose an editor and a time period to view their specific timesheet report.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="editor-select">Editor</Label>
            {isUsersLoading ? (
                <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            ) : editorUsers.length > 0 ? (
                <Select
                    value={selectedUserId}
                    onValueChange={(value) => { setSelectedUserId(value); setCurrentPage(1); }}
                    disabled={isLoading}
                >
                    <SelectTrigger id="editor-select">
                    <SelectValue placeholder="Select an editor" />
                    </SelectTrigger>
                    <SelectContent>
                    {editorUsers.map(editor => (
                        <SelectItem key={editor.id} value={editor.id}>
                        {editor.fullName || editor.username} ({editor.email})
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            ) : (
                <p className="text-sm text-muted-foreground p-2 border rounded-md">No editors found.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Date Range</Label>
            <DateRangePicker dateRange={dateRange} onDateChange={(range) => { setDateRange(range); setCurrentPage(1);}} disabled={isLoading || !selectedUserId} />
          </div>
        </CardContent>
      </Card>

      {!selectedUserId && !isLoading && (
        <Card className="shadow-md text-center py-10">
          <CardContent>
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium">Please Select an Editor</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose an editor from the dropdown above to view their report.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedUserId && (
        <>
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              <CardSkeleton className="shadow-md" />
              <CardSkeleton className="shadow-md" />
              <CardSkeleton className="shadow-md" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Work Hours Logged</CardTitle>
                  <Hourglass className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatDurationFromDecimalHours(totalHours)}</div>
                  <p className="text-xs text-muted-foreground">
                    For {selectedEditor?.fullName || selectedEditor?.username || 'selected editor'}
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Projects Worked On</CardTitle>
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
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
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
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

          {isLoading ? (
            <CardSkeleton className="shadow-md mt-6 h-[350px]" headerHeight="h-8" headerWidth="w-1/2" lineCount={0} />
          ) : dailyHoursChartData && dailyHoursChartData.some(d => d.normalHours > 0 || d.revisionHours > 0) ? (
            <Card className="shadow-lg mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart2 className="mr-2 h-6 w-6 text-primary" /> Daily Work Hours for {selectedEditor?.fullName || selectedEditor?.username || 'Editor'}
                </CardTitle>
                <CardDescription>
                  Total hours logged per day (Normal = New Work + Sample Work), from {dateRange?.from ? format(dateRange.from, "PPP") : ''} to {dateRange?.to ? format(dateRange.to, "PPP") : ''}.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2 pr-6 pt-4 pb-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyHoursChartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        formatter={(value: number, name: string) => {
                            let label = "";
                            if (name === "normalHours") label = "Normal/Sample";
                            else if (name === "revisionHours") label = "Revision";
                            return [`${value.toFixed(1)} hrs`, label];
                        }}
                    />
                    <Legend wrapperStyle={{fontSize: "12px"}} />
                    <Bar dataKey="normalHours" stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Normal/Sample Hours" />
                    <Bar dataKey="revisionHours" stackId="a" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Revision Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : !isLoading && selectedUserId && (
             <Card className="shadow-md text-center py-10 mt-6">
                <CardContent>
                  <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-xl font-medium">No Chart Data</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No daily hours data to display for {selectedEditor?.fullName || selectedEditor?.username || 'the selected editor'} in this period.
                  </p>
                </CardContent>
            </Card>
          )}


          {isLoading ? (
            <TableSkeleton columnCount={8} className="shadow-lg mt-6 h-[480px]" />
          ) : sortedRecords.length > 0 ? (
            <Card className="shadow-lg mt-6">
              <CardHeader>
                <CardTitle>Detailed Log for {selectedEditor?.fullName || selectedEditor?.username || 'Editor'}</CardTitle>
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
               {totalPages <=1 && sortedRecords.length > 0 && (
                 <CardFooter className="justify-end pt-4">
                    <p className="text-sm text-muted-foreground">Total entries for {selectedEditor?.fullName || selectedEditor?.username || 'editor'} in range: {sortedRecords.length}</p>
                 </CardFooter>
               )}
            </Card>
          ) : !isLoading && selectedUserId && (
            <Card className="shadow-md text-center py-10 mt-6">
              <CardContent>
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-medium">No Records Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedEditor?.fullName || selectedEditor?.username || 'The selected editor'} has no time records for the selected date range.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
