

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import type { User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, Gift, AlertTriangle, Send, CheckCircle, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { parseISO } from 'date-fns';

const parseDurationToSeconds = (duration: string): number => {
    if (!duration || typeof duration !== 'string' || duration === '-') return 0;
    
    let totalSeconds = 0;
    const hourMatch = duration.match(/(\d+)\s*h/);
    const minMatch = duration.match(/(\d+)\s*m/);

    if (hourMatch) {
        totalSeconds += parseInt(hourMatch[1], 10) * 3600;
    }
    if (minMatch) {
        totalSeconds += parseInt(minMatch[1], 10) * 60;
    }

    return totalSeconds;
};

const formatSecondsToHoursString = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return '0h 0m';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
};


interface DueLeaveSummary {
    user: User;
    totalEarlyLeaveSeconds: number;
    dueCompensatoryLeaves: number;
    claimedLeaves: number;
    pendingLeaves: number;
    balanceDueLeaves: number;
}

export default function CompensatoryLeavePage() {
    const { users, isUsersLoading } = useMockUsers();
    const { getAttendanceForYear } = useAttendance();
    const { leaveRequests, adminApplyCompensatoryLeave, isLoading: isLeaveLoading } = useLeave();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [summaryData, setSummaryData] = useState<DueLeaveSummary[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
    const [editorToApplyFor, setEditorToApplyFor] = useState<User | null>(null);
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
    const { toast } = useToast();

    const editorUsers = useMemo(() => {
        if (isUsersLoading || !users) return [];
        return users.filter(u => u.role === 'editor').sort((a, b) => a.username.localeCompare(b.username));
    }, [users, isUsersLoading]);

    useEffect(() => {
        const calculateSummaries = async () => {
            if (isUsersLoading || isLeaveLoading || editorUsers.length === 0) return;

            setIsLoadingData(true);
            const summaries: DueLeaveSummary[] = [];

            for (const editor of editorUsers) {
                const yearlyAttendance = await getAttendanceForYear(editor.id, selectedYear);
                let totalEarlyLeaveSecondsOnShortLeaveDays = 0;

                if (yearlyAttendance) {
                    yearlyAttendance.forEach(record => {
                        // Only accumulate early leave hours on days where the user also took a "short leave".
                        if (record.leaveInfo && record.leaveInfo.toLowerCase().includes('short')) {
                            totalEarlyLeaveSecondsOnShortLeaveDays += parseDurationToSeconds(record.earlyLeave);
                        }
                    });
                }
                
                const dueCompensatoryLeaves = Math.floor((totalEarlyLeaveSecondsOnShortLeaveDays / 3600) / 8);
                
                const claimedLeaves = leaveRequests.filter(
                    req => req.userId === editor.id &&
                    req.leaveType === 'compensatory' &&
                    req.earnedInYear?.toString() === selectedYear &&
                    req.status === 'approved'
                ).length;
                
                const pendingLeaves = leaveRequests.filter(
                    req => req.userId === editor.id &&
                    req.leaveType === 'compensatory' &&
                    req.earnedInYear?.toString() === selectedYear &&
                    req.status === 'pending'
                ).length;

                summaries.push({
                    user: editor,
                    totalEarlyLeaveSeconds: totalEarlyLeaveSecondsOnShortLeaveDays,
                    dueCompensatoryLeaves,
                    claimedLeaves,
                    pendingLeaves,
                    balanceDueLeaves: dueCompensatoryLeaves - claimedLeaves,
                });
            }
            setSummaryData(summaries);
            setIsLoadingData(false);
        };

        calculateSummaries();
    }, [selectedYear, editorUsers, getAttendanceForYear, isUsersLoading, leaveRequests, isLeaveLoading]);
    
    const availableYears = useMemo(() => {
      const years = [];
      for (let i = 2030; i >= 2025; i--) {
          years.push(i.toString());
      }
      return years;
    }, []);

    const handleOpenApplyDialog = (user: User) => {
        setEditorToApplyFor(user);
        setIsApplyDialogOpen(true);
    };

    const handleConfirmApplyLeave = async () => {
        if (!editorToApplyFor) {
            toast({ title: 'Error', description: 'Editor is not selected.', variant: 'destructive'});
            return;
        }

        setIsSubmittingLeave(true);
        const leaveResult = await adminApplyCompensatoryLeave(editorToApplyFor.id, 'Compensatory Leave (Applied by Admin)', parseInt(selectedYear, 10));

        if (leaveResult.success) {
            toast({ title: 'Success', description: `Compensatory leave request created for ${editorToApplyFor.fullName || editorToApplyFor.username}.` });
            setIsApplyDialogOpen(false);
            setEditorToApplyFor(null);
        } else {
            toast({ title: 'Leave Request Failed', description: 'Could not create the leave request.', variant: 'destructive'});
        }

        setIsSubmittingLeave(false);
    };

    const mainLoadingState = isLoadingData || isUsersLoading || isLeaveLoading;


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <Gift className="mr-3 h-8 w-8 text-primary" /> Due Compensatory Leave Report
            </h1>
            <Card>
                <CardHeader>
                    <CardTitle>Calculate Due Compensatory Leaves</CardTitle>
                    <CardDescription>
                        Calculates due compensatory leaves for editors based on accumulated early leave hours that occur only on days where a short leave was also taken. The formula is: 1 leave is due for every 8 hours of this specific early leave time for a selected year.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="max-w-xs space-y-2">
                        <Label htmlFor="year-select">Select Year</Label>
                        <Select value={selectedYear} onValueChange={setSelectedYear} disabled={mainLoadingState}>
                            <SelectTrigger id="year-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Yearly Summary - {selectedYear}</CardTitle>
                </CardHeader>
                <CardContent>
                    {mainLoadingState ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><UserIcon className="inline-block mr-2 h-4 w-4" />Editor</TableHead>
                                    <TableHead><AlertTriangle className="inline-block mr-2 h-4 w-4 text-orange-600" />Total Early Leave (on Short Leave days)</TableHead>
                                    <TableHead><Gift className="inline-block mr-2 h-4 w-4" />Due Compensatory Leaves</TableHead>
                                    <TableHead><CheckCircle className="inline-block mr-2 h-4 w-4" />Claimed Leaves</TableHead>
                                    <TableHead><Hourglass className="inline-block mr-2 h-4 w-4" />Pending Approval</TableHead>
                                    <TableHead><Gift className="inline-block mr-2 h-4 w-4 text-primary" />Balance Due</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryData.map(summary => (
                                    <TableRow key={summary.user.id}>
                                        <TableCell className="font-medium">{summary.user.fullName || summary.user.username}</TableCell>
                                        <TableCell>{formatSecondsToHoursString(summary.totalEarlyLeaveSeconds)}</TableCell>
                                        <TableCell className="font-bold text-lg text-primary">{summary.dueCompensatoryLeaves}</TableCell>
                                        <TableCell className="font-semibold text-lg">{summary.claimedLeaves}</TableCell>
                                        <TableCell className="font-semibold text-lg text-yellow-600">{summary.pendingLeaves}</TableCell>
                                        <TableCell className="font-bold text-lg text-green-600">{summary.balanceDueLeaves > 0 ? summary.balanceDueLeaves : 0}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenApplyDialog(summary.user)}
                                                disabled={(summary.claimedLeaves + summary.pendingLeaves) >= summary.dueCompensatoryLeaves}
                                            >
                                                <Send className="mr-2 h-4 w-4" /> Apply Leave
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Apply Compensatory Leave for {editorToApplyFor?.fullName || editorToApplyFor?.username}</DialogTitle>
                        <DialogDescription>
                           This will create a 'compensatory' leave request without a specific date. The editor can assign a date later. The request will be added to the Leave Management list as 'pending'.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="pt-4">
                        <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)} disabled={isSubmittingLeave}>Cancel</Button>
                        <Button onClick={handleConfirmApplyLeave} disabled={isSubmittingLeave}>
                            {isSubmittingLeave ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Confirm & Apply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
