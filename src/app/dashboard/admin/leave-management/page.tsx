
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useLeave } from '@/hooks/useLeave';
import { useMockUsers } from '@/hooks/useMockUsers';
import type { LeaveRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Hourglass, Plane, Loader2, User, Ban, MoreHorizontal, Trash2 } from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';

export default function LeaveManagementPage() {
  const { leaveRequests, isLoading: isLoadingLeave, updateLeaveStatus, deleteLeaveRequest } = useLeave();
  const { users, isUsersLoading } = useMockUsers();
  
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [leaveRequestToDelete, setLeaveRequestToDelete] = useState<(LeaveRequest & { username: string }) | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const isLoading = isLoadingLeave || isUsersLoading;

  const getUsername = useCallback((userId: string) => {
    return users.find(u => u.id === userId)?.username || 'Unknown User';
  }, [users]);

  const requestsWithUsernames = useMemo(() => {
    return leaveRequests.map(req => ({
      ...req,
      username: getUsername(req.userId),
    })).sort((a,b) => parseISO(b.requestedAt).getTime() - parseISO(a.requestedAt).getTime());
  }, [leaveRequests, getUsername]);

  const filteredRequests = useMemo(() => {
    let filtered = requestsWithUsernames;

    if (selectedUserId !== 'all') {
        filtered = filtered.filter(req => req.userId === selectedUserId);
    }
    
    if (dateRange?.from) {
        const from = dateRange.from;
        const to = dateRange.to || from;
        filtered = filtered.filter(req => {
            if (!req.date) return false; // Exclude requests with no date when filtering by date
            const reqDate = parseISO(req.date);
            return isWithinInterval(reqDate, { start: from, end: to });
        });
    }

    return filtered;
  }, [requestsWithUsernames, selectedUserId, dateRange]);

  const pendingRequests = useMemo(() => filteredRequests.filter(req => req.status === 'pending'), [filteredRequests]);
  const approvedRequests = useMemo(() => filteredRequests.filter(req => req.status === 'approved'), [filteredRequests]);
  const rejectedRequests = useMemo(() => filteredRequests.filter(req => req.status === 'rejected'), [filteredRequests]);
  const cancelledRequests = useMemo(() => filteredRequests.filter(req => req.status === 'cancelled'), [filteredRequests]);


  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setIsUpdating(id);
    await updateLeaveStatus(id, status);
    setIsUpdating(null);
  };
  
  const handleDelete = (req: LeaveRequest & { username: string }) => {
    setLeaveRequestToDelete(req);
  };

  const confirmDelete = async () => {
    if (!leaveRequestToDelete) return;
    setIsDeleting(leaveRequestToDelete.id);
    await deleteLeaveRequest(leaveRequestToDelete.id);
    setIsDeleting(null);
    setLeaveRequestToDelete(null);
  };

  const renderTable = (requests: (LeaveRequest & { username: string })[]) => {
      if (isLoading) return <TableSkeleton columnCount={7} />;
      if (requests.length === 0) return <p className="text-center text-muted-foreground py-8">No requests in this category for the selected filters.</p>;

      const currentStatus = requests[0]?.status;

      return (
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Editor</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Leave Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      {currentStatus === 'approved' && <TableHead>Approved By</TableHead>}
                      {currentStatus === 'rejected' && <TableHead>Rejected By</TableHead>}
                      {currentStatus === 'cancelled' && <TableHead>Cancelled By</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {requests.map(req => (
                      <TableRow key={req.id}>
                          <TableCell className="font-medium flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{req.username}</TableCell>
                          <TableCell>{req.requestedAt ? format(parseISO(req.requestedAt), 'PPP') : 'N/A'}</TableCell>
                          <TableCell>{req.date ? format(parseISO(req.date), 'PPP') : 'Unassigned'}</TableCell>
                          <TableCell className="capitalize">{req.leaveType.replace('-', ' ')}</TableCell>
                          <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                          
                          {currentStatus === 'approved' && <TableCell>{req.reviewedBy ? getUsername(req.reviewedBy) : 'N/A'}</TableCell>}
                          {currentStatus === 'rejected' && <TableCell>{req.reviewedBy ? getUsername(req.reviewedBy) : 'N/A'}</TableCell>}
                          {currentStatus === 'cancelled' && <TableCell>{req.cancelledBy ? getUsername(req.cancelledBy) : 'N/A'}</TableCell>}

                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isUpdating === req.id || isDeleting === req.id}>
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {currentStatus === 'pending' && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(req.id, 'approved')} disabled={isUpdating === req.id}>
                                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(req.id, 'rejected')} disabled={isUpdating === req.id}>
                                      <XCircle className="mr-2 h-4 w-4" /> Reject
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDelete(req)}
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10 data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
                                  disabled={isDeleting === req.id}
                                >
                                  {isDeleting === req.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                  )}
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      );
  };
  
  const allUsersSorted = useMemo(() => {
    return [...users].sort((a,b) => a.username.localeCompare(b.username));
  }, [users]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <Plane className="mr-3 h-8 w-8 text-primary" /> Leave Management
      </h1>
      <Card>
        <CardHeader>
            <CardTitle>Manage Employee Leave Requests</CardTitle>
            <CardDescription>Review, approve, or reject leave requests submitted by editors.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="space-y-2">
                    <Label htmlFor="user-filter">Filter by User</Label>
                    {isUsersLoading ? (
                        <div className="flex items-center justify-center h-10 border rounded-md bg-muted w-full sm:w-[280px]">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={isLoading}>
                            <SelectTrigger id="user-filter" className="w-full sm:w-[280px]">
                                <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {allUsersSorted.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.username}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date-range-filter">Filter by Leave Date</Label>
                    <DateRangePicker
                        id="date-range-filter"
                        dateRange={dateRange}
                        onDateChange={setDateRange}
                        disabled={isLoading}
                    />
                </div>
            </div>

            <Tabs defaultValue="pending">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="pending">
                        <Hourglass className="mr-2 h-4 w-4" /> Pending <Badge className="ml-2">{pendingRequests.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                        <CheckCircle className="mr-2 h-4 w-4" /> Approved
                    </TabsTrigger>
                    <TabsTrigger value="rejected">
                        <XCircle className="mr-2 h-4 w-4" /> Rejected
                    </TabsTrigger>
                    <TabsTrigger value="cancelled">
                        <Ban className="mr-2 h-4 w-4" /> Cancelled
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-4">
                    {renderTable(pendingRequests)}
                </TabsContent>
                <TabsContent value="approved" className="mt-4">
                     {renderTable(approvedRequests)}
                </TabsContent>
                <TabsContent value="rejected" className="mt-4">
                     {renderTable(rejectedRequests)}
                </TabsContent>
                <TabsContent value="cancelled" className="mt-4">
                     {renderTable(cancelledRequests)}
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={!!leaveRequestToDelete} onOpenChange={(open) => !open && setLeaveRequestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the leave request for <span className="font-semibold">{leaveRequestToDelete?.username}</span> on <span className="font-semibold">{leaveRequestToDelete && leaveRequestToDelete.date ? format(parseISO(leaveRequestToDelete.date), 'PPP') : 'Unassigned'}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={!!isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
