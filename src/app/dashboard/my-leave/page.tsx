
"use client";

import React, { useState, useMemo } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useLeave } from '@/hooks/useLeave';
import type { LeaveRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, PlusCircle, Send, Loader2, Plane, CheckCircle, XCircle, Hourglass, Ban, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';

const leaveReasons = [
  'Vacation',
  'Personal Leave',
  'Family and Medical Leave',
  'Funeral/Bereavement Leave',
  'Other'
] as const;

const leaveFormSchema = z.object({
  date: z.date({ required_error: "Please select a date for your leave." }),
  leaveType: z.enum(['full-day', 'half-day', 'short-leave'], { required_error: "Please select a leave type." }),
  reason: z.enum(leaveReasons, { required_error: "Please select a reason." }),
  otherReason: z.string().optional(),
}).refine(data => {
    if (data.reason === 'Other') {
        return !!data.otherReason && data.otherReason.trim().length > 0;
    }
    return true;
}, {
    message: "Please specify the reason if you select 'Other'.",
    path: ['otherReason'],
});


type LeaveFormData = z.infer<typeof leaveFormSchema>;

export default function MyLeavePage() {
  const { user } = useAuth();
  const { leaveRequests, isLoading, applyForLeave, cancelLeaveRequest, updateLeaveRequest } = useLeave();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      reason: undefined,
      otherReason: '',
    },
  });

  const reasonValue = watch("reason");

  const myLeaveRequests = useMemo(() => {
    if (!user) return [];
    return leaveRequests
      .filter(req => req.userId === user.id)
      .sort((a, b) => parseISO(b.requestedAt).getTime() - parseISO(a.requestedAt).getTime());
  }, [leaveRequests, user]);

  const filteredLeaveRequestsForYear = useMemo(() => {
    return myLeaveRequests.filter(req => req.date && parseISO(req.date).getFullYear() === selectedYear);
  }, [myLeaveRequests, selectedYear]);

  const availableYears = useMemo(() => {
      const startYear = 2025;
      const endYear = 2030;
      const years = [];
      for (let i = endYear; i >= startYear; i--) {
          years.push(i);
      }
      return years;
  }, []);

  const { availableLeaves, bookedLeaves, remainingLeaves } = useMemo(() => {
    const available = user?.availableLeaves ?? 0;
    const currentYear = selectedYear;

    const booked = myLeaveRequests.reduce((total, req) => {
      if (!req.date) return total;
      const requestYear = parseISO(req.date).getFullYear();
      if (req.status === 'approved' && requestYear === currentYear) {
        if (req.leaveType === 'full-day') return total + 1;
        if (req.leaveType === 'half-day') return total + 0.5;
      }
      return total;
    }, 0);
    const remaining = available - booked;
    return { availableLeaves: available, bookedLeaves: booked, remainingLeaves: remaining };
  }, [myLeaveRequests, user?.availableLeaves, selectedYear]);

  const handleOpenForm = (request: LeaveRequest | null) => {
    setEditingRequest(request);
    if (request) { // Editing
      const reasonParts = request.reason.split('Other: ');
      let reasonVal: typeof leaveReasons[number] = 'Other';
      let otherReasonVal = '';
      if (reasonParts.length > 1) {
        reasonVal = 'Other';
        otherReasonVal = reasonParts[1];
      } else if (leaveReasons.includes(request.reason as any)) {
        reasonVal = request.reason as typeof leaveReasons[number];
      } else {
        reasonVal = 'Other';
        otherReasonVal = request.reason;
      }
      reset({
        date: request.date ? parseISO(request.date) : new Date(),
        leaveType: request.leaveType,
        reason: reasonVal,
        otherReason: otherReasonVal,
      });
    } else { // Adding new
      reset({
        date: new Date(),
        leaveType: 'full-day',
        reason: undefined,
        otherReason: '',
      });
    }
    setIsFormOpen(true);
  };
  
  const onFormSubmit = async (data: LeaveFormData) => {
    setIsSubmitting(true);
    const finalReason = data.reason === 'Other' && data.otherReason ? `Other: ${data.otherReason}` : data.reason;

    let result;
    if (editingRequest) {
        result = await updateLeaveRequest(editingRequest.id, { reason: finalReason });
    } else {
        result = await applyForLeave(data.date, data.leaveType, finalReason);
    }

    if (result.success) {
      setIsFormOpen(false);
    }
    setIsSubmitting(false);
  };
  
  const handleCancel = async (leaveId: string) => {
    setIsCancelling(leaveId);
    await cancelLeaveRequest(leaveId);
    setIsCancelling(null);
  };

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Hourglass className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-slate-400 text-slate-500"><Ban className="mr-1 h-3 w-3" />Cancelled</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Plane className="mr-3 h-8 w-8 text-primary" /> My Leave Requests
        </h1>
        <Button onClick={() => handleOpenForm(null)} disabled={isSubmitting}>
            <PlusCircle className="mr-2 h-4 w-4" /> Apply for Leave
        </Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{editingRequest ? 'Edit Leave Request' : 'Apply for Leave'}</DialogTitle>
                <DialogDescription>{editingRequest ? 'Update the reason for your leave.' : 'Fill out the form to submit a new leave request.'}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 pt-4">
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
                          disabled={!!editingRequest || isSubmitting}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          disabled={!!editingRequest || isSubmitting}
                        />
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!editingRequest || isSubmitting}>
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
                <Label>Reason</Label>
                <Controller
                  name="reason"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2 mt-2" disabled={isSubmitting}>
                      {leaveReasons.map(r => (
                        <div key={r} className="flex items-center space-x-2">
                          <RadioGroupItem value={r} id={r.replace(/\s+/g, '')} />
                          <Label htmlFor={r.replace(/\s+/g, '')} className="font-normal">{r}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                />
                {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>}
              </div>

              {reasonValue === 'Other' && (
                <div>
                  <Label htmlFor="otherReason">Please Specify</Label>
                   <Controller
                      name="otherReason"
                      control={control}
                      render={({ field }) => (
                        <Input id="otherReason" {...field} placeholder="Specify other reason" disabled={isSubmitting} />
                      )}
                    />
                  {errors.otherReason && <p className="text-sm text-destructive mt-1">{errors.otherReason.message}</p>}
                </div>
              )}

              <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {editingRequest ? 'Save Changes' : 'Submit Request'}
                  </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
      <Card>
        <CardHeader>
          <CardTitle>My Leave History</CardTitle>
          <CardDescription>A record of your past and pending leave requests.</CardDescription>
          <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-foreground">Leave Balance for {selectedYear}</h4>
                  <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(Number(value))}>
                      <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                          {availableYears.map(year => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
              </div>
              <div className="flex justify-around text-center">
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columnCount={5} rowCount={5} />
          ) : filteredLeaveRequestsForYear.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeaveRequestsForYear.map(req => (
                  <TableRow key={req.id}>
                    <TableCell>{req.date ? format(parseISO(req.date), 'PPP') : 'Unassigned'}</TableCell>
                    <TableCell className="capitalize">{req.leaveType.replace('-', ' ')}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{req.reason}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-right space-x-1">
                       <Button variant="ghost" size="sm" onClick={() => handleOpenForm(req)} disabled={isCancelling === req.id || isSubmitting}>
                          <Edit className="mr-1 h-4 w-4" /> Edit
                       </Button>
                      {(req.status === 'pending' || req.status === 'approved') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleCancel(req.id)}
                          disabled={isCancelling === req.id || isSubmitting}
                        >
                          {isCancelling === req.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="mr-1 h-4 w-4" />
                          )}
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">You have no leave requests for {selectedYear}.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    