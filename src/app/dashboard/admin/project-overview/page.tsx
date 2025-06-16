
"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { Layers, Hourglass, CheckCircle2, ListChecks, AlertCircle, ListTree, FilePlus2, RefreshCw, Package, Film, Clock, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, BarChart2, Loader2, CheckSquare, Square } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useProjectTypes } from '@/hooks/useProjectTypes';
import type { TimeRecord as AppTimeRecord, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

interface ProjectSummary {
  projectName: string;
  totalHours: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  status: 'Completed' | 'In Progress' | 'Pending';
}

type SortableProjectSummaryKeys = keyof ProjectSummary;
type SortableAppTimeRecordKeys = keyof Pick<AppTimeRecord, 'date' | 'projectType' | 'workType' | 'projectDurationSeconds' | 'durationHours' | 'completedAt' | 'reChecked'> | 'editorUsername';

export default function ProjectOverviewPage() {
  const { timeRecords: allTimeRecords, isTimesheetLoading } = useTimesheet();
  const { users: allUsers, isUsersLoading: isUsersApiLoading } = useMockUsers();
  const { projectTypes, isLoadingProjectTypes } = useProjectTypes();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<ProjectSummary | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [mainTableCurrentPage, setMainTableCurrentPage] = useState(1);
  const [modalTableCurrentPage, setModalTableCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const [mainTableSortConfig, setMainTableSortConfig] = useState<{ key: SortableProjectSummaryKeys | null; direction: 'ascending' | 'descending' }>({ key: 'projectName', direction: 'ascending' });
  const [modalTableSortConfig, setModalTableSortConfig] = useState<{ key: SortableAppTimeRecordKeys | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });


  const isLoading = isTimesheetLoading || isUsersApiLoading || isLoadingProjectTypes;

  const filteredTimeRecordsByDate = useMemo(() => {
    if (isTimesheetLoading || !allTimeRecords || !dateRange?.from) return []; 

    const effectiveStartDate = new Date(dateRange.from);
    effectiveStartDate.setHours(0, 0, 0, 0);

    const effectiveEndDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
    effectiveEndDate.setHours(23, 59, 59, 999);

    return allTimeRecords.filter(record => {
      const recordDate = parseISO(record.date);
      return recordDate >= effectiveStartDate && recordDate <= effectiveEndDate;
    });
  }, [allTimeRecords, dateRange, isTimesheetLoading]);

  const projectSummariesFull = useMemo((): ProjectSummary[] => {
    if (isTimesheetLoading || filteredTimeRecordsByDate.length === 0) return []; 

    const projectsData: { [key: string]: {
        totalHours: number;
        totalTasks: number;
        completedTasks: number;
    } } = {};

    filteredTimeRecordsByDate.forEach(record => {
      if (!projectsData[record.projectName]) {
        projectsData[record.projectName] = { totalHours: 0, totalTasks: 0, completedTasks: 0 };
      }
      projectsData[record.projectName].totalHours += record.durationHours;
      projectsData[record.projectName].totalTasks += 1;
      if (record.completedAt) {
        projectsData[record.projectName].completedTasks += 1;
      }
    });

    return Object.entries(projectsData).map(([name, data]) => {
      let status: ProjectSummary['status'];
      const pendingTasks = data.totalTasks - data.completedTasks;

      if (data.totalTasks === 0) {
        status = 'Pending';
      } else if (data.completedTasks === data.totalTasks) {
        status = 'Completed';
      } else if (data.completedTasks > 0 && data.completedTasks < data.totalTasks) {
        status = 'In Progress';
      } else {
        status = 'Pending';
      }

      return {
        projectName: name,
        totalHours: data.totalHours,
        totalTasks: data.totalTasks,
        completedTasks: data.completedTasks,
        pendingTasks: pendingTasks,
        status: status,
      };
    });
  }, [filteredTimeRecordsByDate, isTimesheetLoading]);

  const sortedProjectSummaries = useMemo(() => {
    let sortableItems = [...projectSummariesFull];
    if (mainTableSortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[mainTableSortConfig.key!];
        const valB = b[mainTableSortConfig.key!];
        let comparison = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        }
        return mainTableSortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [projectSummariesFull, mainTableSortConfig]);

  const paginatedProjectSummaries = useMemo(() => {
    const startIndex = (mainTableCurrentPage - 1) * rowsPerPage;
    return sortedProjectSummaries.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedProjectSummaries, mainTableCurrentPage, rowsPerPage]);
  const mainTableTotalPages = Math.ceil(sortedProjectSummaries.length / rowsPerPage);

  const requestMainTableSort = (key: SortableProjectSummaryKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (mainTableSortConfig.key === key && mainTableSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setMainTableSortConfig({ key, direction });
    setMainTableCurrentPage(1);
  };

  const getMainTableSortIcon = (columnKey: SortableProjectSummaryKeys) => {
    if (mainTableSortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return mainTableSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };


  const getUsernameById = useCallback((userId: string): string => {
    if (isUsersApiLoading || !allUsers) return 'Loading...';
    return allUsers.find(u => u.id === userId)?.username || 'Unknown User';
  }, [allUsers, isUsersApiLoading]);

  const getWorkTypeBadge = (workType: AppTimeRecord['workType']) => {
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

  const detailedRecordsForModalFull = useMemo(() => {
    if (!selectedProjectForDetails || filteredTimeRecordsByDate.length === 0) return [];
    return filteredTimeRecordsByDate
      .filter(record => record.projectName === selectedProjectForDetails.projectName)
      .map(record => ({...record, editorUsername: getUsernameById(record.userId)}));
  }, [selectedProjectForDetails, filteredTimeRecordsByDate, getUsernameById]);

  const sortedDetailedRecordsForModal = useMemo(() => {
    let sortableItems = [...detailedRecordsForModalFull];
    if (modalTableSortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const valA = a[modalTableSortConfig.key!];
        const valB = b[modalTableSortConfig.key!];
        let comparison = 0;
        if (modalTableSortConfig.key === 'date' || modalTableSortConfig.key === 'completedAt') {
           comparison = (new Date(valA as string).getTime() || 0) - (new Date(valB as string).getTime() || 0);
        } else if (modalTableSortConfig.key === 'reChecked') {
          const boolA = valA === true;
          const boolB = valB === true;
          comparison = boolA === boolB ? 0 : boolA ? -1 : 1;
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
        }
        return modalTableSortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableItems;
  },[detailedRecordsForModalFull, modalTableSortConfig]);

  const paginatedDetailedRecordsForModal = useMemo(() => {
    const startIndex = (modalTableCurrentPage - 1) * rowsPerPage;
    return sortedDetailedRecordsForModal.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedDetailedRecordsForModal, modalTableCurrentPage, rowsPerPage]);
  const modalTableTotalPages = Math.ceil(sortedDetailedRecordsForModal.length / rowsPerPage);

  const requestModalTableSort = (key: SortableAppTimeRecordKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (modalTableSortConfig.key === key && modalTableSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setModalTableSortConfig({ key, direction });
    setModalTableCurrentPage(1);
  };

  const getModalTableSortIcon = (columnKey: SortableAppTimeRecordKeys) => {
    if (modalTableSortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return modalTableSortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };


  const handleViewProjectDetails = (project: ProjectSummary) => {
    setSelectedProjectForDetails(project);
    setModalTableCurrentPage(1);
    setModalTableSortConfig({ key: 'date', direction: 'descending' });
    setIsDetailsModalOpen(true);
  };

  const getStatusBadge = (status: ProjectSummary['status']) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Completed</Badge>;
      case 'In Progress':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500"><Hourglass className="mr-1 h-3 w-3" />In Progress</Badge>;
      case 'Pending':
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><ListChecks className="mr-1 h-3 w-3" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalProjectsCount = projectSummariesFull.length;
  const completedProjectsCount = projectSummariesFull.filter(p => p.status === 'Completed').length;
  const inProgressProjectsCount = projectSummariesFull.filter(p => p.status === 'In Progress').length;
  const pendingProjectsCount = projectSummariesFull.filter(p => p.status === 'Pending').length;

  const chartDataByProjectType = useMemo(() => {
    if (isLoadingProjectTypes || !projectTypes || filteredTimeRecordsByDate.length === 0) return [];

    const projectCountsByType: { [key: string]: Set<string> } = {};
    projectTypes.forEach(type => projectCountsByType[type] = new Set());

    filteredTimeRecordsByDate.forEach(record => {
      if (projectCountsByType[record.projectType]) {
        projectCountsByType[record.projectType].add(record.projectName);
      }
    });

    return Object.entries(projectCountsByType)
      .map(([type, projectSet]) => ({ name: type, count: projectSet.size }))
      .filter(item => item.count > 0);
  }, [filteredTimeRecordsByDate, projectTypes, isLoadingProjectTypes]);

  const chartDataByEditor = useMemo(() => {
    if (isUsersApiLoading || !allUsers || filteredTimeRecordsByDate.length === 0) return [];

    const projectCountsByEditor: { [userId: string]: Set<string> } = {};
    const editorUsers = allUsers.filter(u => u.role === 'editor');

    editorUsers.forEach(editor => projectCountsByEditor[editor.id] = new Set());

    filteredTimeRecordsByDate.forEach(record => {
      if (projectCountsByEditor[record.userId]) {
        projectCountsByEditor[record.userId].add(record.projectName);
      }
    });

    return editorUsers
      .map(editor => ({ name: editor.username, count: projectCountsByEditor[editor.id]?.size || 0 }))
      .filter(item => item.count > 0);
  }, [filteredTimeRecordsByDate, allUsers, isUsersApiLoading]);


  const renderMainTableSortableHeader = (label: string, columnKey: SortableProjectSummaryKeys, className?: string) => (
    <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestMainTableSort(columnKey)}>
      <div className="flex items-center">
        {label}
        {getMainTableSortIcon(columnKey)}
      </div>
    </TableHead>
  );

  const renderModalTableSortableHeader = (label: string, columnKey: SortableAppTimeRecordKeys, className?: string) => (
    <TableHead className={cn("cursor-pointer hover:bg-muted/50", className)} onClick={() => requestModalTableSort(columnKey)}>
      <div className="flex items-center">
        {label}
        {getModalTableSortIcon(columnKey)}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <Layers className="mr-3 h-8 w-8 text-primary" /> Project Overview
            </h1>
            <CardDescription className="mt-1">
                Summary of all projects {dateRange?.from && dateRange.to ? `from ${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}` : 'for all time'}.
            </CardDescription>
        </div>
        <DateRangePicker dateRange={dateRange} onDateChange={(range) => { setDateRange(range); setMainTableCurrentPage(1); }} disabled={isLoading} />
      </div>

      {isTimesheetLoading || isUsersApiLoading ? ( 
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <CardSkeleton className="shadow-md" />
            <CardSkeleton className="shadow-md" />
            <CardSkeleton className="shadow-md" />
            <CardSkeleton className="shadow-md" />
        </div>
      ) : projectSummariesFull.length > 0 ? (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                    <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalProjectsCount}</div>
                    <p className="text-xs text-muted-foreground">
                      In selected range
                    </p>
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{completedProjectsCount}</div>
                    <p className="text-xs text-muted-foreground">
                      Based on tasks in range
                    </p>
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                    <Hourglass className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{inProgressProjectsCount}</div>
                    <p className="text-xs text-muted-foreground">
                       Based on tasks in range
                    </p>
                </CardContent>
            </Card>
             <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingProjectsCount}</div>
                    <p className="text-xs text-muted-foreground">
                      No tasks or all pending in range
                    </p>
                </CardContent>
            </Card>
        </div>
      ) : !isTimesheetLoading && !isUsersApiLoading && (
        <Card className="shadow-md text-center py-10 mt-6">
          <CardContent>
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-xl font-medium">No Project Data</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              No time records found for the selected date range to generate project overviews.
            </p>
          </CardContent>
        </Card>
      )}

      {filteredTimeRecordsByDate.length > 0 && (
         <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><BarChart2 className="mr-2 h-5 w-5 text-primary" /> Projects by Type</CardTitle>
              <CardDescription>Unique projects for each project type {dateRange?.from && dateRange.to ? `from ${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}` : 'for all time'}.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pl-2 pr-6 pt-4 pb-4">
              {isLoadingProjectTypes ? (
                <div className="flex items-center justify-center h-full"> <Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : chartDataByProjectType.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataByProjectType} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`${value} projects`, "Count"]}
                    />
                    <Legend wrapperStyle={{fontSize: "12px"}} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Project Count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                 <div className="flex items-center justify-center h-full"> <p className="text-muted-foreground">No project type data for this period.</p> </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><BarChart2 className="mr-2 h-5 w-5 text-accent" /> Projects by Editor</CardTitle>
              <CardDescription>Unique projects worked on by each editor {dateRange?.from && dateRange.to ? `from ${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}` : 'for all time'}.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pl-2 pr-6 pt-4 pb-4">
              {isUsersApiLoading ? (
                 <div className="flex items-center justify-center h-full"> <Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
              ) : chartDataByEditor.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataByEditor} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`${value} projects`, "Count"]}
                    />
                    <Legend wrapperStyle={{fontSize: "12px"}} />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Project Count" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                  <div className="flex items-center justify-center h-full"> <p className="text-muted-foreground">No editor project data for this period.</p> </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}


      {isTimesheetLoading ? ( 
        <TableSkeleton columnCount={7} className="shadow-lg mt-6 h-[480px]" />
      ) : projectSummariesFull.length > 0 ? (
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle>Project Status Details</CardTitle>
             <CardDescription>
                Breakdown of each project {dateRange?.from && dateRange.to ? `from ${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}` : ''}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-30rem)] min-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {renderMainTableSortableHeader("Project Name", "projectName", "w-[25%]")}
                    {renderMainTableSortableHeader("Status", "status", "w-[15%]")}
                    {renderMainTableSortableHeader("Total Work Time", "totalHours", "text-right w-[15%]")}
                    {renderMainTableSortableHeader("Total Tasks", "totalTasks", "text-right w-[15%]")}
                    {renderMainTableSortableHeader("Completed", "completedTasks", "text-right w-[10%]")}
                    {renderMainTableSortableHeader("Pending", "pendingTasks", "text-right w-[10%]")}
                    <TableHead className="text-center w-[10%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProjectSummaries.map((project) => (
                    <TableRow key={project.projectName}>
                      <TableCell className="font-medium">{project.projectName}</TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell className="text-right">{formatDurationFromDecimalHours(project.totalHours)}</TableCell>
                      <TableCell className="text-right">{project.totalTasks}</TableCell>
                      <TableCell className="text-right">{project.completedTasks}</TableCell>
                      <TableCell className="text-right">{project.pendingTasks}</TableCell>
                      <TableCell className="text-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewProjectDetails(project)}
                            aria-label={`View details for ${project.projectName}`}
                            title={`View details for ${project.projectName}`}
                        >
                            <ListTree className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
          {mainTableTotalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 p-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setMainTableCurrentPage(prev => Math.max(1, prev - 1))} disabled={mainTableCurrentPage === 1}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {mainTableCurrentPage} of {mainTableTotalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setMainTableCurrentPage(prev => Math.min(mainTableTotalPages, prev + 1))} disabled={mainTableCurrentPage === mainTableTotalPages}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      ) : !isTimesheetLoading && (
        <></>
      )}

      {selectedProjectForDetails && (
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Time Records for: {selectedProjectForDetails.projectName}
              </DialogTitle>
              <CardDescription>
                Showing records {dateRange?.from && dateRange.to ? `from ${format(dateRange.from, "PPP")} to ${format(dateRange.to, "PPP")}` : 'for all time'}.
              </CardDescription>
            </DialogHeader>
            {paginatedDetailedRecordsForModal.length > 0 ? (
              <>
              <ScrollArea className="flex-grow">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {renderModalTableSortableHeader("Date", "date")}
                      {renderModalTableSortableHeader("Editor", "editorUsername")}
                      {renderModalTableSortableHeader("Category", "projectType")}
                      {renderModalTableSortableHeader("Work Type", "workType")}
                      {renderModalTableSortableHeader("Proj. Duration", "projectDurationSeconds")}
                      {renderModalTableSortableHeader("Work Time", "durationHours")}
                      {renderModalTableSortableHeader("Status", "completedAt")}
                      {renderModalTableSortableHeader("Re-checked", "reChecked")}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDetailedRecordsForModal.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{record.editorUsername}</TableCell>
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
              {modalTableTotalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={() => setModalTableCurrentPage(prev => Math.max(1, prev - 1))} disabled={modalTableCurrentPage === 1}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {modalTableCurrentPage} of {modalTableTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setModalTableCurrentPage(prev => Math.min(modalTableTotalPages, prev + 1))} disabled={modalTableCurrentPage === modalTableTotalPages}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
              </>
            ) : (
              <div className="text-center py-10">
                <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No time records found for this project in the selected date range.</p>
              </div>
            )}
            <DialogFooter className="mt-auto pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Close</Button>
                </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

