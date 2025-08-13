
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { format, parseISO, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, AlertCircle, Clock, Package, RefreshCw, FilePlus2, Film, Hourglass, CheckCircle2, PieChart as PieChartIcon, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, CheckSquare, Square, Search, User, X } from 'lucide-react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import type { TimeRecord, User } from '@/lib/types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

const formatDateDisplay = (range?: DateRange): string => {
  if (!range?.from) return 'the selected period';
  const effectiveStartDate = new Date(range.from);
  effectiveStartDate.setHours(0,0,0,0);

  const fromDateFormatted = format(effectiveStartDate, "PPP");
  if (range.to && !isSameDay(effectiveStartDate, range.to)) {
    const toDateFormatted = format(range.to, "PPP");
    return `from ${fromDateFormatted} to ${toDateFormatted}`;
  }
  return `for ${fromDateFormatted}`;
};

type SortableTimeRecordKeysAdmin = keyof Pick<TimeRecord, 'date' | 'projectName' | 'projectType' | 'workType' | 'projectDurationSeconds' | 'durationHours' | 'completedAt' | 'reChecked'> | 'editorUsername';

const compareTimestamps = (tsA: string | undefined, tsB: string | undefined): number => {
  if (!tsA && !tsB) return 0;
  if (!tsA) return -1;
  if (!tsB) return 1;
  return new Date(tsA).getTime() - new Date(tsB).getTime();
};

export default function AdminReportPage() {
  const { getAllRecordsByDateRange, timeRecords: allTimeRecordsFromContext, isTimesheetLoading } = useTimesheet();
  const { users: allUsers, isUsersLoading } = useMockUsers();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;
  const [sortConfig, setSortConfig] = useState<{ key: SortableTimeRecordKeysAdmin | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

  const [selectedEditorId, setSelectedEditorId] = useState<string>('all');
  const [projectNameQuery, setProjectNameQuery] = useState<string>('');

  const isLoading = isTimesheetLoading || isUsersLoading;

  const editorUsers = useMemo(() => {
    if (isUsersLoading || !allUsers) return [];
    return allUsers.filter(u => u.role === 'editor').sort((a,b) => a.username.localeCompare(b.username));
  }, [allUsers, isUsersLoading]);

  const allRecordsInRange = useMemo(() => {
    if (isLoading || !dateRange?.from || !allTimeRecordsFromContext || !allUsers) return [];

    const effectiveStartDate = new Date(dateRange.from);
    effectiveStartDate.setHours(0, 0, 0, 0);

    const effectiveEndDate = dateRange.to || dateRange.from;
    effectiveEndDate.setHours(23, 59, 59, 999);

    return getAllRecordsByDateRange(effectiveStartDate, effectiveEndDate);
  }, [dateRange, getAllRecordsByDateRange, isLoading, allTimeRecordsFromContext, allUsers]);


  const getUsernameById = useCallback((userId: string): string => {
    if (isUsersLoading || !allUsers) return 'Loading...';
    return allUsers.find(u => u.id === userId)?.username || 'Unknown User';
  }, [allUsers, isUsersLoading]);

  const recordsWithEditorNames = useMemo(() => {
    return allRecordsInRange.map(record => ({
      ...record,
      editorUsername: getUsernameById(record.userId)
    }));
  }, [allRecordsInRange, getUsernameById]);


  const filteredAndSortedRecords = useMemo(() => {
    let filteredItems = [...recordsWithEditorNames];

    if (selectedEditorId !== 'all') {
      filteredItems = filteredItems.filter(record => record.userId === selectedEditorId);
    }

    if (projectNameQuery.trim() !== '') {
      filteredItems = filteredItems.filter(record => 
        record.projectName.toLowerCase().includes(projectNameQuery.trim().toLowerCase())
      );
    }

    if (sortConfig.key !== null) {
      filteredItems.sort((a, b) => {
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
    return filteredItems;
  }, [recordsWithEditorNames, sortConfig, selectedEditorId, projectNameQuery]);


  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredAndSortedRecords.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedRecords, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedRecords.length / rowsPerPage);

  const requestSort = (key: SortableTimeRecordKeysAdmin) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey: SortableTimeRecordKeysAdmin) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };


  const projectMetrics = useMemo(() => {
    if (allRecordsInRange.length === 0) {
      return {
        totalNewWorkProjects: 0,
        totalRevisionWorkProjects: 0,
        completedNewWorkProjects: 0,
        completedRevisionWorkProjects: 0,
        pendingProjects: 0,
      };
    }

    const projectsMap = new Map<string, TimeRecord[]>();
    allRecordsInRange.forEach(record => {
      if (!projectsMap.has(record.projectName)) {
        projectsMap.set(record.projectName, []);
      }
      projectsMap.get(record.projectName)!.push(record);
    });

    let totalNewWorkProjects = 0;
    let totalRevisionWorkProjects = 0;
    let completedNewWorkProjects = 0;
    let completedRevisionWorkProjects = 0;
    let pendingProjects = 0;

    const newWorkProjectNames = new Set<string>();
    const revisionWorkProjectNames = new Set<string>();

    allRecordsInRange.forEach(record => {
      if (record.workType === 'New work' || record.workType === 'Sample work') newWorkProjectNames.add(record.projectName);
      if (record.workType === 'Revision') revisionWorkProjectNames.add(record.projectName);
    });
    totalNewWorkProjects = newWorkProjectNames.size;
    totalRevisionWorkProjects = revisionWorkProjectNames.size;

    projectsMap.forEach((recordsInProject) => {
      const newWorkRecords = recordsInProject.filter(r => r.workType === 'New work' || r.workType === 'Sample work');
      if (newWorkRecords.length > 0 && newWorkRecords.every(r => r.completedAt)) {
        completedNewWorkProjects++;
      }

      const revisionRecords = recordsInProject.filter(r => r.workType === 'Revision');
      if (revisionRecords.length > 0 && revisionRecords.every(r => r.completedAt)) {
        completedRevisionWorkProjects++;
      }

      if (recordsInProject.some(r => !r.completedAt)) {
        pendingProjects++;
      }
    });

    return {
      totalNewWorkProjects,
      totalRevisionWorkProjects,
      completedNewWorkProjects,
      completedRevisionWorkProjects,
      pendingProjects,
    };
  }, [allRecordsInRange]);


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

  const newWorkChartData = useMemo(() => {
    const pendingNew = projectMetrics.totalNewWorkProjects - projectMetrics.completedNewWorkProjects;
    return [
      { name: 'Completed New', value: projectMetrics.completedNewWorkProjects },
      { name: 'Pending/In-Progress New', value: pendingNew > 0 ? pendingNew : 0 },
    ].filter(item => item.value > 0);
  }, [projectMetrics]);
  const COLORS_NEW_WORK = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))'];

  const revisionWorkChartData = useMemo(() => {
    const pendingRevision = projectMetrics.totalRevisionWorkProjects - projectMetrics.completedRevisionWorkProjects;
    return [
      { name: 'Completed Revision', value: projectMetrics.completedRevisionWorkProjects },
      { name: 'Pending/In-Progress Revision', value: pendingRevision > 0 ? pendingRevision : 0 },
    ].filter(item => item.value > 0);
  }, [projectMetrics]);
  const COLORS_REVISION_WORK = ['hsl(var(--accent))', 'hsl(var(--muted-foreground))'];

  const renderSortableHeader = (label: string, columnKey: SortableTimeRecordKeysAdmin, className?: string) => (
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
          <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Admin Time Report
        </h1>
        <DateRangePicker dateRange={dateRange} onDateChange={(range) => { setDateRange(range); setCurrentPage(1);}} disabled={isLoading} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} className="shadow-md" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
           <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Projects</CardTitle>
              <Hourglass className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectMetrics.pendingProjects}</div>
              <p className="text-xs text-muted-foreground">With uncompleted tasks {dateDisplayString}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total New Work Projects</CardTitle>
              <FilePlus2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectMetrics.totalNewWorkProjects}</div>
              <p className="text-xs text-muted-foreground">Unique projects with 'New/Sample' {dateDisplayString}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revision Projects</CardTitle>
              <RefreshCw className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectMetrics.totalRevisionWorkProjects}</div>
              <p className="text-xs text-muted-foreground">Unique projects with 'Revision' {dateDisplayString}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed New Work Projects</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectMetrics.completedNewWorkProjects}</div>
              <p className="text-xs text-muted-foreground">All 'New/Sample' tasks done {dateDisplayString}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Revision Projects</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projectMetrics.completedRevisionWorkProjects}</div>
              <p className="text-xs text-muted-foreground">All 'Revision' tasks done {dateDisplayString}</p>
            </CardContent>
          </Card>
        </div>
      )}


      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <CardSkeleton className="shadow-md h-[350px]" />
          <CardSkeleton className="shadow-md h-[350px]" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
                New Work Projects Status
              </CardTitle>
              <CardDescription>Completion status of new work projects {dateDisplayString}.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {projectMetrics.totalNewWorkProjects > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={newWorkChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      innerRadius={70}
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      {newWorkChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_NEW_WORK[index % COLORS_NEW_WORK.length]} />
                      ))}
                    </Pie>
                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "1.75rem", fontWeight: "bold", fill: "hsl(var(--foreground))" }}>
                        {projectMetrics.totalNewWorkProjects}
                    </text>
                    <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "0.875rem", fill: "hsl(var(--muted-foreground))" }}>
                        Projects
                    </text>
                    <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value} projects`, undefined]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No new work project data for this period.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="mr-2 h-5 w-5 text-accent" />
                Revision Work Projects Status
              </CardTitle>
              <CardDescription>Completion status of revision work projects {dateDisplayString}.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {projectMetrics.totalRevisionWorkProjects > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revisionWorkChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      innerRadius={70}
                      outerRadius={100}
                      fill="hsl(var(--accent))"
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                    >
                      {revisionWorkChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS_REVISION_WORK[index % COLORS_REVISION_WORK.length]} />
                      ))}
                    </Pie>
                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "1.75rem", fontWeight: "bold", fill: "hsl(var(--foreground))" }}>
                        {projectMetrics.totalRevisionWorkProjects}
                    </text>
                    <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "0.875rem", fill: "hsl(var(--muted-foreground))" }}>
                        Projects
                    </text>
                     <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        formatter={(value: number) => [`${value} projects`, undefined]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No revision work project data for this period.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}


      {isLoading ? (
        <TableSkeleton columnCount={9} className="shadow-lg mt-6 h-[480px]" />
      ) : allRecordsInRange.length > 0 ? (
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>All Time Entries</CardTitle>
                <CardDescription>
                  Showing all records {dateDisplayString}.
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <div className="w-full sm:w-48 space-y-1.5">
                  <Label htmlFor="editor-filter" className="sr-only">Filter by editor</Label>
                  <Select
                    value={selectedEditorId}
                    onValueChange={(value) => { setSelectedEditorId(value); setCurrentPage(1); }}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="editor-filter" className="h-9">
                      <User className="mr-2 h-4 w-4 text-muted-foreground"/>
                      <SelectValue placeholder="Filter by editor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Editors</SelectItem>
                      {editorUsers.map(editor => (
                        <SelectItem key={editor.id} value={editor.id}>{editor.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative w-full sm:w-64">
                   <Label htmlFor="project-search" className="sr-only">Search by project name</Label>
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                   <Input 
                      id="project-search"
                      placeholder="Search by project name..."
                      value={projectNameQuery}
                      onChange={(e) => {setProjectNameQuery(e.target.value); setCurrentPage(1);}}
                      className="pl-10 h-9"
                      disabled={isLoading}
                   />
                   {projectNameQuery && (
                      <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => {setProjectNameQuery(''); setCurrentPage(1);}}>
                          <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                   )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {renderSortableHeader("Date", "date")}
                    {renderSortableHeader("Editor", "editorUsername")}
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
                  {paginatedRecords.length > 0 ? paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{record.editorUsername}</TableCell>
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
                            {record.completedAt ? formatDurationFromDecimalHours(record.durationHours) : 'Pending'}
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
                  )) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        No results found for your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 p-4 border-t">
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
                Page {currentPage} of {totalPages} (Total: {filteredAndSortedRecords.length} records)
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
          )}
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
