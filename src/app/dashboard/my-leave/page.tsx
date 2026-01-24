"use client";

import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useLeave } from '@/hooks/useLeave';
import type { LeaveRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, PlusCircle, Send, Loader2, Plane, CheckCircle, XCircle, Hourglass } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';

const leaveFormSchema = z.object({
  date: z.date({ required_error: "Please select a date for your leave." }),
  leaveType: z.enum(['full-day', 'half-day', 'short-leave'], { required_error: "Please select a leave type." }),
  reason: z.string().min(10, "Please provide a reason (min. 10 characters).").max(500, "Reason cannot exceed 500 characters."),
});

type LeaveFormData = z.infer<typeof leaveFormSchema>;

export default function MyLeavePage() {
  const { user } = useAuth();
  const { leaveRequests, isLoading, applyForLeave } = useLeave();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      date: new Date(),
      leaveType: 'full-day',
      reason: '',
    },
  });

  const myLeaveRequests = useMemo(() => {
    if (!user) return [];
    return leaveRequests
      .filter(req => req.userId === user.id)
      .sort((a, b) => parseISO(b.requestedAt).getTime() - parseISO(a.requestedAt).getTime());
  }, [leaveRequests, user]);

  const { availableLeaves, bookedLeaves, remainingLeaves } = useMemo(() => {
    const available = user?.availableLeaves ?? 0;
    const booked = myLeaveRequests.reduce((total, req) => {
      if (req.status === 'approved') {
        if (req.leaveType === 'full-day') return total + 1;
        if (req.leaveType === 'half-day') return total + 0.5;
      }
      return total;
    }, 0);
    const remaining = available - booked;
    return { availableLeaves: available, bookedLeaves: booked, remainingLeaves: remaining };
  }, [myLeaveRequests, user?.availableLeaves]);

  const onSubmit = async (data: LeaveFormData) => {
    setIsSubmitting(true);
    const result = await applyForLeave(data.date, data.leaveType, data.reason);
    if (result.success) {
      reset();
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Hourglass className="mr-1 h-3 w-3" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <Plane className="mr-3 h-8 w-8 text-primary" /> My Leave Requests
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Apply for Leave</CardTitle>
            <CardDescription>Fill out the form to submit a new leave request.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="date">Leave Date</Label>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          disabled={isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus disabled={(date) => date < new Date()} />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
              </div>

              <div>
                <Label htmlFor="leaveType">Leave Type</Label>
                <Controller
                  name="leaveType"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                      <SelectTrigger id="leaveType"><SelectValue placeholder="Select a type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-day">Full Day Leave</SelectItem>
                        <SelectItem value="half-day">Half Day Leave</SelectItem>
                        <SelectItem value="short-leave">Short Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                 {errors.leaveType && <p className="text-sm text-destructive mt-1">{errors.leaveType.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Controller
                    name="reason"
                    control={control}
                    render={({ field }) => <Textarea id="reason" {...field} placeholder="Please provide a brief reason for your leave..." rows={3} disabled={isSubmitting}/>}
                />
                 {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Leave History</CardTitle>
            <CardDescription>A record of your past and pending leave requests.</CardDescription>
            <div className="border-t pt-4 mt-4 flex justify-around text-center">
              <div>
                  <p className="text-2xl font-bold">{availableLeaves}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div>
                  <p className="text-2xl font-bold">{bookedLeaves}</p>
                  <p className="text-xs text-muted-foreground">Booked</p>
              </div>
              <div>
                  <p className="text-2xl font-bold">{remainingLeaves}</p>
                  <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton columnCount={4} rowCount={5} />
            ) : myLeaveRequests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myLeaveRequests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell>{format(parseISO(req.date), 'PPP')}</TableCell>
                      <TableCell className="capitalize">{req.leaveType.replace('-', ' ')}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">You have not submitted any leave requests.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
