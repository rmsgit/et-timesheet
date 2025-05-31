
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useMockUsers } from '@/hooks/useMockUsers';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { format, parseISO, startOfMonth } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserCheck, AlertCircle, Hourglass, CheckCircle2, Briefcase, Loader2 } from 'lucide-react';
import { CardSkeleton } from '@/components/skeletons/CardSkeleton';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import type { User } from '@/lib/types';

export default function AdminEditorReportPage() {
  const { getRecordsByDateRange, isTimesheetLoading } = useTimesheet();
  const { users: allUsers, isUsersLoading } = useMockUsers();
  
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [selectedEditor, setSelectedEditor] = useState<User | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });

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
  }, [selectedUserId, allUsers]);

  const filteredRecords = useMemo(() => {
    if (isLoading || !selectedUserId || !dateRange?.from || !dateRange?.to) return [];
    return getRecordsByDateRange(selectedUserId, dateRange.from, dateRange.to)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedUserId, dateRange, getRecordsByDateRange, isLoading]);

  const totalHours = useMemo(() => {
    return filteredRecords.reduce((sum, record) => sum + record.durationHours, 0);
  }, [filteredRecords]);

  const totalProjects = useMemo(() => {
    return new Set(filteredRecords.map(record => record.projectName)).size;
  }, [filteredRecords]);
  
  const totalCompletedTasks = useMemo(() => {
    return filteredRecords.filter(record => record.completedAt).length;
  }, [filteredRecords]);

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
                    onValueChange={setSelectedUserId}
                    disabled={isLoading}
                >
                    <SelectTrigger id="editor-select">
                    <SelectValue placeholder="Select an editor" />
                    </SelectTrigger>
                    <SelectContent>
                    {editorUsers.map(editor => (
                        <SelectItem key={editor.id} value={editor.id}>
                        {editor.username} ({editor.email})
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
            <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} disabled={isLoading || !selectedUserId} />
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
                  <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
                  <Hourglass className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalHours.toFixed(1)} hrs</div>
                  <p className="text-xs text-muted-foreground">
                    For {selectedEditor?.username || 'selected editor'}
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
            <TableSkeleton columnCount={5} className="shadow-lg h-[480px]" />
          ) : filteredRecords.length > 0 ? (
            <Card className="shadow-lg mt-6">
              <CardHeader>
                <CardTitle>Detailed Log for {selectedEditor?.username || 'Editor'}</CardTitle>
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
                <p className="text-sm text-muted-foreground">Total entries for {selectedEditor?.username || 'editor'} in range: {filteredRecords.length}</p>
              </CardFooter>
            </Card>
          ) : (
            <Card className="shadow-md text-center py-10 mt-6">
              <CardContent>
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-xl font-medium">No Records Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedEditor?.username || 'The selected editor'} has no time records for the selected date range.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

    