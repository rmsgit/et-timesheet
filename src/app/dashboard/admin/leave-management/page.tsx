
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
import { CheckCircle, XCircle, Hourglass, Plane, Loader2, User, Ban } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

export default function LeaveManagementPage() {
  const { leaveRequests, isLoading: isLoadingLeave, updateLeaveStatus } = useLeave();
  const { users, isUsersLoading } = useMockUsers();
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // Store ID of leave being updated

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

  const pendingRequests = useMemo(() => requestsWithUsernames.filter(req => req.status === 'pending'), [requestsWithUsernames]);
  const approvedRequests = useMemo(() => requestsWithUsernames.filter(req => req.status === 'approved'), [requestsWithUsernames]);
  const rejectedRequests = useMemo(() => requestsWithUsernames.filter(req => req.status === 'rejected'), [requestsWithUsernames]);
  const cancelledRequests = useMemo(() => requestsWithUsernames.filter(req => req.status === 'cancelled'), [requestsWithUsernames]);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setIsUpdating(id);
    await updateLeaveStatus(id, status);
    setIsUpdating(null);
  };
  
  const renderTable = (requests: (LeaveRequest & { username: string })[]) => {
      if (isLoading) return <TableSkeleton columnCount={6} />;
      if (requests.length === 0) return <p className="text-center text-muted-foreground py-8">No requests in this category.</p>;

      const currentStatus = requests[0]?.status;

      return (
          <Table>
              <TableHeader>
                  <TableRow>
                      <TableHead>Editor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      {currentStatus === 'pending' && <TableHead className="text-right">Actions</TableHead>}
                      {currentStatus === 'approved' && <TableHead>Approved By</TableHead>}
                      {currentStatus === 'rejected' && <TableHead>Rejected By</TableHead>}
                      {currentStatus === 'cancelled' && <TableHead>Cancelled By</TableHead>}
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {requests.map(req => (
                      <TableRow key={req.id}>
                          <TableCell className="font-medium flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{req.username}</TableCell>
                          <TableCell>{format(parseISO(req.date), 'PPP')}</TableCell>
                          <TableCell className="capitalize">{req.leaveType.replace('-', ' ')}</TableCell>
                          <TableCell className="max-w-xs truncate">{req.reason}</TableCell>
                          {req.status === 'pending' ? (
                            <TableCell className="text-right space-x-2">
                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleUpdateStatus(req.id, 'approved')} disabled={isUpdating === req.id}>
                                    {isUpdating === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                                    Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleUpdateStatus(req.id, 'rejected')} disabled={isUpdating === req.id}>
                                     {isUpdating === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
                                    Reject
                                </Button>
                            </TableCell>
                          ) : (
                            <TableCell>
                                {req.status === 'cancelled' && req.cancelledBy ? getUsername(req.cancelledBy) : (req.reviewedBy ? getUsername(req.reviewedBy) : 'N/A')}
                            </TableCell>
                          )}
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
      );
  };

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
    </div>
  );
}
