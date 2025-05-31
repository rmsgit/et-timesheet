
"use client";

import React, { useMemo } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { Layers, Hourglass, CheckCircle2, ListChecks, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';

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

  const projectSummaries = useMemo((): ProjectSummary[] => {
    if (isTimesheetLoading || !timeRecords || timeRecords.length === 0) return [];

    const projectsData: { [key: string]: {
        totalHours: number;
        totalTasks: number;
        completedTasks: number;
    } } = {};

    timeRecords.forEach(record => {
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
  }, [timeRecords, isTimesheetLoading]);

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
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <Layers className="mr-3 h-8 w-8 text-primary" /> Project Overview
            </h1>
            <CardDescription className="mt-1">
                Summary of all projects based on logged time entries.
            </CardDescription>
        </div>
      </div>
      
      {isTimesheetLoading ? (
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
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{completedProjectsCount}</div>
                </CardContent>
            </Card>
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                    <Hourglass className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{inProgressProjectsCount}</div>
                </CardContent>
            </Card>
             <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending</CardTitle>
                    <ListChecks className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingProjectsCount}</div>
                </CardContent>
            </Card>
        </div>
      ) : null}


      {isTimesheetLoading ? (
        <TableSkeleton columnCount={6} className="shadow-lg mt-6 h-[480px]" />
      ) : projectSummaries.length === 0 && !isTimesheetLoading ? (
         <Card className="shadow-md text-center py-10 mt-6">
            <CardContent>
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-xl font-medium">No Project Data</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No time records found to generate project overviews.
              </p>
            </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <CardTitle>Project Status Details</CardTitle>
             <CardDescription>
                Breakdown of each project with its status and logged hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-26rem)] min-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Project Name</TableHead>
                    <TableHead className="w-[15%]">Status</TableHead>
                    <TableHead className="text-right w-[15%]">Total Hours</TableHead>
                    <TableHead className="text-right w-[15%]">Total Tasks</TableHead>
                    <TableHead className="text-right w-[12.5%]">Completed</TableHead>
                    <TableHead className="text-right w-[12.5%]">Pending</TableHead>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
