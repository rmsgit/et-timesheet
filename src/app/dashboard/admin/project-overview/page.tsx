
"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { Layers, Hourglass, CheckCircle2, ListChecks, AlertCircle, ListTree, FilePlus2, RefreshCw, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { startOfMonth, format, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useMockUsers } from '@/hooks/useMockUsers';
import type { TimeRecord as AppTimeRecord } from '@/lib/types';

interface ProjectSummary {
  projectName: string;
  totalHours: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  status: 'Completed' | 'In Progress' | 'Pending';
}

export default function ProjectOverviewPage() {
  const { timeRecords, isTimesheetLoading } = useTimesheet();
  const { users: allUsers, isUsersLoading: isUsersApiLoading } = useMockUsers();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<ProjectSummary | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const isLoading = isTimesheetLoading || isUsersApiLoading;

  const filteredTimeRecordsByDate = useMemo(() => {
    if (!timeRecords || !dateRange?.from || !dateRange?.to) return [];
    const fromDate = dateRange.from;
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999); // Ensure end of day for 'to' date

    return timeRecords.filter(record => {
      const recordDate = parseISO(record.date);
      return recordDate >= fromDate && recordDate <= toDate;
    });
  }, [timeRecords, dateRange]);

  const projectSummaries = useMemo((): ProjectSummary[] => {
    if (isLoading || filteredTimeRecordsByDate.length === 0) return [];

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
        totalHours: parseFloat(data.totalHours.toFixed(1)),
        totalTasks: data.totalTasks,
        completedTasks: data.completedTasks,
        pendingTasks: pendingTasks,
        status: status,
      };
    }).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [filteredTimeRecordsByDate, isLoading]);

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
  
  const detailedRecordsForModal = useMemo(() => {
    if (!selectedProjectForDetails || filteredTimeRecordsByDate.length === 0) return [];
    return filteredTimeRecordsByDate
      .filter(record => record.projectName === selectedProjectForDetails.projectName)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedProjectForDetails, filteredTimeRecordsByDate]);

  const handleViewProjectDetails = (project: ProjectSummary) => {
    setSelectedProjectForDetails(project);
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

  const totalProjectsCount = projectSummaries.length;
  const completedProjectsCount = projectSummaries.filter(p => p.status === 'Completed').length;
  const inProgressProjectsCount = projectSummaries.filter(p => p.status === 'In Progress').length;
  const pendingProjectsCount = projectSummaries.filter(p => p.status === 'Pending').length;

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
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} disabled={isLoading} />
      </div>
      
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <CardSkeleton className="shadow-md" />
            <CardSkeleton className="shadow-md" />
            <CardSkeleton className="shadow-md" />
            <CardSkeleton className="shadow-md" />
        </div>
      ) : projectSummaries.length > 0 ? (
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
      ) : !isLoading && (
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

      {isLoading ? (
        <TableSkeleton columnCount={7} className="shadow-lg mt-6 h-[480px]" />
      ) : projectSummaries.length > 0 ? (
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
                    <TableHead className="w-[25%]">Project Name</TableHead>
                    <TableHead className="w-[15%]">Status</TableHead>
                    <TableHead className="text-right w-[15%]">Total Hours</TableHead>
                    <TableHead className="text-right w-[15%]">Total Tasks</TableHead>
                    <TableHead className="text-right w-[10%]">Completed</TableHead>
                    <TableHead className="text-right w-[10%]">Pending</TableHead>
                    <TableHead className="text-center w-[10%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectSummaries.map((project) => (
                    <TableRow key={project.projectName}>
                      <TableCell className="font-medium">{project.projectName}</TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell className="text-right">{project.totalHours.toFixed(1)}</TableCell>
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
        </Card>
      ) : !isLoading && (
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
            {detailedRecordsForModal.length > 0 ? (
              <ScrollArea className="flex-grow">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Editor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Work Type</TableHead>
                      <TableHead>Duration (hrs)</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedRecordsForModal.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{getUsernameById(record.userId)}</TableCell>
                        <TableCell><Badge variant="secondary">{record.projectType}</Badge></TableCell>
                        <TableCell>{getWorkTypeBadge(record.workType)}</TableCell>
                        <TableCell>{record.durationHours.toFixed(1)}</TableCell>
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

