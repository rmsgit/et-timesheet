
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
import { Loader2, User as UserIcon, Gift, AlertTriangle, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';

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
}

export default function CompensatoryLeavePage() {
    const { users, isUsersLoading, addUserProfileToRTDB } = useMockUsers();
    const { getAttendanceForYear } = useAttendance();
    const { applyForLeave } = useLeave();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [summaryData, setSummaryData] = useState<DueLeaveSummary[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
    const [editorToApplyFor, setEditorToApplyFor] = useState<User | null>(null);
    const [leaveDate, setLeaveDate] = useState<Date | undefined>(new Date());
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
    const { toast } = useToast();

    const editorUsers = useMemo(() => {
        if (isUsersLoading || !users) return [];
        return users.filter(u => u.role === 'editor').sort((a, b) => a.username.localeCompare(b.username));
    }, [users, isUsersLoading]);

    useEffect(() => {
        const calculateSummaries = async () => {
            if (isUsersLoading || editorUsers.length === 0) return;

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
                const claimedLeaves = editor.claimedCompensatoryYears?.[selectedYear] ?? 0;

                summaries.push({
                    user: editor,
                    totalEarlyLeaveSeconds: totalEarlyLeaveSecondsOnShortLeaveDays,
                    dueCompensatoryLeaves,
                    claimedLeaves,
                });
            }
            setSummaryData(summaries);
            setIsLoadingData(false);
        };

        calculateSummaries();
    }, [selectedYear, editorUsers, getAttendanceForYear, isUsersLoading]);
    
    const availableYears = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = currentYear; i >= 2020; i--) {
          years.push(i.toString());
      }
      return years;
    }, []);

    const handleOpenApplyDialog = (user: User) => {
        setEditorToApplyFor(user);
        setLeaveDate(new Date()); // Reset to today
        setIsApplyDialogOpen(true);
    };

    const handleConfirmApplyLeave = async () => {
        if (!editorToApplyFor || !leaveDate) {
            toast({ title: 'Error', description: 'Editor or leave date is not selected.', variant: 'destructive'});
            return;
        }

        setIsSubmittingLeave(true);
        // Step 1: Apply for the leave request
        const leaveResult = await applyForLeave(leaveDate, 'compensatory', 'Compensatory Leave (Applied by Admin)');

        if (leaveResult.success) {
            // Step 2: Update the user's claimed leaves count
            const currentClaimed = editorToApplyFor.claimedCompensatoryYears?.[selectedYear] ?? 0;
            const newClaimedData = {
                ...editorToApplyFor.claimedCompensatoryYears,
                [selectedYear]: currentClaimed + 1,
            };
            
            const profileUpdateResult = await addUserProfileToRTDB(
                editorToApplyFor.id,
                editorToApplyFor.email || '',
                editorToApplyFor.username,
                editorToApplyFor.role || 'editor',
                editorToApplyFor.editorLevelId,
                editorToApplyFor.isEligibleForMorningOT,
                editorToApplyFor.availableLeaves,
                editorToApplyFor.compensatoryLeaves,
                newClaimedData
            );

            if (profileUpdateResult.success) {
                toast({ title: 'Success', description: `Compensatory leave request created for ${editorToApplyFor.username}.` });
                setIsApplyDialogOpen(false);
                setEditorToApplyFor(null);
            } else {
                toast({ title: 'Profile Update Failed', description: 'The leave was requested, but updating the claimed count failed. Please check user profile.', variant: 'destructive'});
            }
        } else {
            toast({ title: 'Leave Request Failed', description: 'Could not create the leave request.', variant: 'destructive'});
        }

        setIsSubmittingLeave(false);
    };


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
                        <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoadingData}>
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
                    {isLoadingData || isUsersLoading ? (
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
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryData.map(summary => (
                                    <TableRow key={summary.user.id}>
                                        <TableCell className="font-medium">{summary.user.username}</TableCell>
                                        <TableCell>{formatSecondsToHoursString(summary.totalEarlyLeaveSeconds)}</TableCell>
                                        <TableCell className="font-bold text-lg text-primary">{summary.dueCompensatoryLeaves}</TableCell>
                                        <TableCell className="font-semibold text-lg">{summary.claimedLeaves}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenApplyDialog(summary.user)}
                                                disabled={summary.claimedLeaves >= summary.dueCompensatoryLeaves}
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
                        <DialogTitle>Apply Compensatory Leave for {editorToApplyFor?.username}</DialogTitle>
                        <DialogDescription>
                            Select a date to create a 'compensatory' leave request. This will be added to the Leave Management list as 'pending'.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Select Date for Leave</Label>
                        <Calendar
                            mode="single"
                            selected={leaveDate}
                            onSelect={setLeaveDate}
                            className="rounded-md border mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsApplyDialogOpen(false)} disabled={isSubmittingLeave}>Cancel</Button>
                        <Button onClick={handleConfirmApplyLeave} disabled={!leaveDate || isSubmittingLeave}>
                            {isSubmittingLeave ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Confirm & Apply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
