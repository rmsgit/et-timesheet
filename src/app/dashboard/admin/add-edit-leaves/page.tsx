"use client";

import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLeave } from '@/hooks/useLeave';
import { useMockUsers } from '@/hooks/useMockUsers';
import type { LeaveRequest, LeaveType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  PlusCircle,
  Send,
  Loader2,
  CalendarPlus,
  CheckCircle,
  XCircle,
  Hourglass,
  Ban,
  Edit,
  Info,
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfYear, endOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';

const leaveReasons = [
  'Vacation',
  'Personal Leave',
  'Family and Medical Leave',
  'Funeral/Bereavement Leave',
  'Other',
] as const;

const leaveFormSchema = z
  .object({
    date: z.date({ required_error: 'Please select a leave date.' }),
    leaveType: z.enum(['full-day', 'half-day', 'short-leave'], {
      required_error: 'Please select a leave type.',
    }),
    reason: z.enum(leaveReasons, { required_error: 'Please select a reason.' }),
    otherReason: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  })
  .refine(
    (data) => {
      if (data.reason === 'Other') {
        return !!data.otherReason && data.otherReason.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please specify the reason if you select 'Other'.",
      path: ['otherReason'],
    }
  )
  .refine(
    (data) => {
      if (data.leaveType === 'short-leave') {
        return !!data.startTime && !!data.endTime;
      }
      return true;
    },
    {
      message: 'Start and end times are required for short leaves.',
      path: ['startTime'],
    }
  );

type LeaveFormData = z.infer<typeof leaveFormSchema>;

const calculateLeaveValue = (type: LeaveType, startTime?: string, endTime?: string): number => {
  switch (type) {
    case 'full-day':
      return 1;
    case 'half-day':
      return 0.5;
    case 'short-leave': {
      if (!startTime || !endTime) return 0.2;
      try {
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const durationMinutes = endH * 60 + endM - (startH * 60 + startM);
        return Math.max(0, parseFloat((durationMinutes / 480).toFixed(2)));
      } catch {
        return 0.2;
      }
    }
    case 'compensatory':
      return 1;
    default:
      return 1;
  }
};

function LeaveBalanceCards({
  eligible,
  taken,
  balance,
}: {
  eligible: number;
  taken: number;
  balance: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3 text-center">
        <p className="text-2xl font-bold tabular-nums">{eligible}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Eligible</p>
      </div>
      <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
        <p className="text-2xl font-bold tabular-nums">{taken.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Taken</p>
      </div>
      <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-3 text-center">
        <p className="text-2xl font-bold tabular-nums">{balance.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Balance</p>
      </div>
    </div>
  );
}

export default function AdminAddEditLeavesPage() {
  const { leaveRequests, isLoading: isLoadingLeave, adminApplyLeave, updateLeaveRequest, cancelLeaveRequest } =
    useLeave();
  const { users, isUsersLoading } = useMockUsers();

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfYear(new Date()),
    to: endOfYear(new Date()),
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);

  const isLoading = isLoadingLeave || isUsersLoading;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LeaveFormData>({
    resolver: zodResolver(leaveFormSchema),
    defaultValues: {
      leaveType: 'full-day',
      status: 'approved',
      otherReason: '',
      startTime: '',
      endTime: '',
    },
  });

  const reasonValue = watch('reason');
  const leaveType = watch('leaveType');

  const editorUsers = useMemo(() => {
    if (!users) return [];
    return users
      .filter((u) => u.role === 'editor')
      .sort((a, b) => (a.fullName || a.username).localeCompare(b.fullName || b.username));
  }, [users]);

  const selectedUser = useMemo(
    () => editorUsers.find((u) => u.id === selectedUserId) || null,
    [editorUsers, selectedUserId]
  );

  const userLeavesInRange = useMemo(() => {
    if (!selectedUserId || !dateRange?.from) return [];

    const from = new Date(dateRange.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateRange.to || dateRange.from);
    to.setHours(23, 59, 59, 999);

    return leaveRequests
      .filter((req) => {
        if (req.userId !== selectedUserId || !req.date) return false;
        return isWithinInterval(parseISO(req.date), { start: from, end: to });
      })
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [leaveRequests, selectedUserId, dateRange]);

  const leaveBalance = useMemo(() => {
    const eligible = selectedUser?.availableLeaves ?? 0;
    const taken = userLeavesInRange.reduce((total, req) => {
      if (req.status !== 'approved') return total;
      return total + calculateLeaveValue(req.leaveType, req.startTime, req.endTime);
    }, 0);
    return {
      eligible,
      taken,
      balance: eligible - taken,
    };
  }, [selectedUser, userLeavesInRange]);

  const handleOpenForm = (request: LeaveRequest | null) => {
    if (!selectedUserId && !request) return;
    setEditingRequest(request);

    if (request) {
      const reasonParts = request.reason.split('Other: ');
      let reasonVal: (typeof leaveReasons)[number] = 'Other';
      let otherReasonVal = '';
      if (reasonParts.length > 1) {
        reasonVal = 'Other';
        otherReasonVal = reasonParts[1];
      } else if (leaveReasons.includes(request.reason as (typeof leaveReasons)[number])) {
        reasonVal = request.reason as (typeof leaveReasons)[number];
      } else {
        otherReasonVal = request.reason;
      }

      reset({
        date: request.date ? parseISO(request.date) : new Date(),
        leaveType: (request.leaveType === 'compensatory' ? 'full-day' : request.leaveType) as
          | 'full-day'
          | 'half-day'
          | 'short-leave',
        reason: reasonVal,
        otherReason: otherReasonVal,
        startTime: request.startTime || '',
        endTime: request.endTime || '',
        status: request.status,
      });
    } else {
      reset({
        date: new Date(),
        leaveType: 'full-day',
        reason: undefined,
        otherReason: '',
        startTime: '',
        endTime: '',
        status: 'approved',
      });
    }
    setIsFormOpen(true);
  };

  const onFormSubmit = async (data: LeaveFormData) => {
    if (!selectedUserId && !editingRequest) return;
    setIsSubmitting(true);

    const finalReason =
      data.reason === 'Other' && data.otherReason ? `Other: ${data.otherReason}` : data.reason;

    let result;
    if (editingRequest) {
      result = await updateLeaveRequest(editingRequest.id, {
        date: data.date.toISOString(),
        leaveType: data.leaveType,
        reason: finalReason,
        status: data.status,
        startTime: data.leaveType === 'short-leave' ? data.startTime || '' : '',
        endTime: data.leaveType === 'short-leave' ? data.endTime || '' : '',
      });
    } else {
      result = await adminApplyLeave(selectedUserId, data.date, data.leaveType, finalReason, {
        status: data.status === 'approved' || data.status === 'pending' ? data.status : 'approved',
        startTime: data.startTime,
        endTime: data.endTime,
      });
    }

    if (result.success) {
      setIsFormOpen(false);
      setEditingRequest(null);
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
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary">
            <Hourglass className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="border-slate-400 text-slate-500">
            <Ban className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center text-primary">
            <CalendarPlus className="mr-3 h-8 w-8" /> Add / Edit Leaves
          </h1>
          <p className="text-muted-foreground mt-1">
            Create or update leave records for editors and review their leave balance.
          </p>
        </div>
        <Button onClick={() => handleOpenForm(null)} disabled={!selectedUserId || isSubmitting}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Leave
        </Button>
      </div>

      <Card className="shadow-lg border-primary/10">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="grid gap-2 w-full md:w-64">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Editor
              </Label>
              <Select
                value={selectedUserId || undefined}
                onValueChange={setSelectedUserId}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an editor" />
                </SelectTrigger>
                <SelectContent>
                  {editorUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 w-full md:w-auto">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Period
              </Label>
              <DateRangePicker
                dateRange={dateRange}
                onDateChange={setDateRange}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedUser ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Leave Balance — {selectedUser.fullName || selectedUser.username}
              </CardTitle>
              <CardDescription>
                Eligible allotment vs approved leave taken in the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveBalanceCards {...leaveBalance} />
            </CardContent>
          </Card>

          <Card className="shadow-xl overflow-hidden border-none ring-1 ring-black/5">
            <CardHeader>
              <CardTitle>Leave Records</CardTitle>
              <CardDescription>
                Leaves for the selected editor within the date range.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 border-t">
              {isLoading ? (
                <div className="p-4">
                  <TableSkeleton columnCount={5} rowCount={6} />
                </div>
              ) : userLeavesInRange.length === 0 ? (
                <div className="p-16 text-center text-muted-foreground">
                  <Info className="h-10 w-10 mx-auto mb-4 opacity-20" />
                  No leave records found for this period.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Reason</TableHead>
                      <TableHead className="text-center font-semibold">Days</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userLeavesInRange.map((req) => (
                      <TableRow key={req.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          {req.date ? format(parseISO(req.date), 'MMM d, yyyy') : 'Unassigned'}
                        </TableCell>
                        <TableCell className="capitalize">
                          {req.leaveType.replace('-', ' ')}
                          {req.leaveType === 'short-leave' && req.startTime && req.endTime && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              ({req.startTime} – {req.endTime})
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{req.reason}</TableCell>
                        <TableCell className="text-center font-mono tabular-nums">
                          {calculateLeaveValue(req.leaveType, req.startTime, req.endTime).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenForm(req)}
                            disabled={isCancelling === req.id || isSubmitting}
                          >
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
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <Ban className="mr-1 h-4 w-4" />
                              )}
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="shadow-md text-center py-12">
          <CardContent>
            <Info className="mx-auto h-12 w-12 text-muted-foreground opacity-40" />
            <h3 className="mt-4 text-xl font-medium">Select an Editor</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose an editor above to view and manage their leave records.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRequest ? 'Edit Leave' : 'Add Leave'}</DialogTitle>
            <DialogDescription>
              {editingRequest
                ? `Update leave for ${selectedUser?.fullName || selectedUser?.username || 'editor'}.`
                : `Add a leave record for ${selectedUser?.fullName || selectedUser?.username || 'editor'}.`}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Leave Balance (selected period)
              </p>
              <LeaveBalanceCards {...leaveBalance} />
            </div>
          )}

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="date">Leave Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        disabled={isSubmitting}
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
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <SelectTrigger id="leaveType">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-day">Full Day Leave</SelectItem>
                      <SelectItem value="half-day">Half Day Leave</SelectItem>
                      <SelectItem value="short-leave">Short Leave</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.leaveType && (
                <p className="text-sm text-destructive mt-1">{errors.leaveType.message}</p>
              )}
            </div>

            {leaveType === 'short-leave' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Controller
                    name="startTime"
                    control={control}
                    render={({ field }) => (
                      <Input id="startTime" type="time" {...field} disabled={isSubmitting} />
                    )}
                  />
                  {errors.startTime && (
                    <p className="text-sm text-destructive mt-1">{errors.startTime.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Controller
                    name="endTime"
                    control={control}
                    render={({ field }) => (
                      <Input id="endTime" type="time" {...field} disabled={isSubmitting} />
                    )}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      {editingRequest && (
                        <>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label>Reason</Label>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="space-y-2 mt-2"
                    disabled={isSubmitting}
                  >
                    {leaveReasons.map((r) => (
                      <div key={r} className="flex items-center space-x-2">
                        <RadioGroupItem value={r} id={`admin-${r.replace(/\s+/g, '')}`} />
                        <Label htmlFor={`admin-${r.replace(/\s+/g, '')}`} className="font-normal">
                          {r}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              />
              {errors.reason && (
                <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>
              )}
            </div>

            {reasonValue === 'Other' && (
              <div>
                <Label htmlFor="otherReason">Please Specify</Label>
                <Controller
                  name="otherReason"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="otherReason"
                      {...field}
                      placeholder="Specify other reason"
                      disabled={isSubmitting}
                    />
                  )}
                />
                {errors.otherReason && (
                  <p className="text-sm text-destructive mt-1">{errors.otherReason.message}</p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {editingRequest ? 'Save Changes' : 'Add Leave'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
