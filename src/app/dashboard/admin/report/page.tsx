
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { format, parseISO, isSameDay } from 'date-fns';
import { AdminTimesheetChart } from '@/components/admin/AdminTimesheetChart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, AlertCircle, Clock, Package, RefreshCw, FilePlus2, Film, Hourglass, CheckCircle2, PieChart as PieChartIcon } from 'lucide-react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { useAuth } from '@/hooks/useAuth'; 
import type { TimeRecord } from '@/lib/types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
  const effectiveStartDate = new Date(range.from);
  effectiveStartDate.setHours(0,0,0,0);

  const fromDateFormatted = format(effectiveStartDate, "PPP");
  if (range.to && !isSameDay(effectiveStartDate, range.to)) {
    const toDateFormatted = format(range.to, "PPP");
    return `from ${fromDateFormatted} to ${toDateFormatted}`;
  }
  return `for ${fromDateFormatted}`;
};


export default function AdminReportPage() {
  const { getAllRecordsByDateRange, timeRecords: allTimeRecordsFromContext, isTimesheetLoading } = useTimesheet();
  const { users: mockUsers, isUsersLoading } = useMockUsers();
  const { user: loggedInUser } = useAuth(); 
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const isLoading = isTimesheetLoading || isUsersLoading;

  const filteredRecords = useMemo(() => {
    if (isLoading || !dateRange?.from || !allTimeRecordsFromContext || !mockUsers) return [];
    
    const effectiveStartDate = new Date(dateRange.from);
    effectiveStartDate.setHours(0, 0, 0, 0); 

    const effectiveEndDate = dateRange.to || dateRange.from; 
    effectiveEndDate.setHours(23, 59, 59, 999);

    const recordsToDisplay = getAllRecordsByDateRange(effectiveStartDate, effectiveEndDate)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return recordsToDisplay;
  }, [dateRange, getAllRecordsByDateRange, isLoading, allTimeRecordsFromContext, mockUsers]);

  const getUsernameById = (userId: string) => {
    if (isLoading || !mockUsers) return 'Loading...';
    return mockUsers.find(u => u.id === userId)?.username || 'Unknown User';
  };
  

  const projectMetrics = useMemo(() => {
    if (filteredRecords.length === 0) {
      return {
        totalNewWorkProjects: 0,
        totalRevisionWorkProjects: 0,
        completedNewWorkProjects: 0,
        completedRevisionWorkProjects: 0,
        pendingProjects: 0,
      };
    }

    const projectsMap = new Map<string, TimeRecord[]>();
    filteredRecords.forEach(record => {
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

    filteredRecords.forEach(record => {
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
  }, [filteredRecords]);


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


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Admin Time Report
        </h1>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} disabled={isLoading} />
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

      <AdminTimesheetChart records={filteredRecords} />

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

