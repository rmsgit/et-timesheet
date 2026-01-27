
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useAttendance } from '@/hooks/useAttendance';
import type { User, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, Gift, Hourglass, Leaf, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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


interface CompensatoryLeaveSummary {
    user: User;
    totalOvertimeSeconds: number;
    compensatoryLeavesEarned: number;
}

export default function CompensatoryLeavePage() {
    const { users, isUsersLoading, addUserProfileToRTDB } = useMockUsers();
    const { getAttendanceForYear } = useAttendance();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [summaryData, setSummaryData] = useState<CompensatoryLeaveSummary[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const { toast } = useToast();

    const [isApplyingLeaves, setIsApplyingLeaves] = useState(false);
    const [summaryToApply, setSummaryToApply] = useState<CompensatoryLeaveSummary | null>(null);

    const editorUsers = useMemo(() => {
        if (isUsersLoading || !users) return [];
        return users.filter(u => u.role === 'editor').sort((a, b) => a.username.localeCompare(b.username));
    }, [users, isUsersLoading]);

    useEffect(() => {
        const calculateSummaries = async () => {
            if (isUsersLoading || editorUsers.length === 0) return;

            setIsLoadingData(true);
            const summaries: CompensatoryLeaveSummary[] = [];

            for (const editor of editorUsers) {
                const yearlyAttendance = await getAttendanceForYear(editor.id, selectedYear);
                let totalOvertimeSeconds = 0;

                if (yearlyAttendance) {
                    yearlyAttendance.forEach(record => {
                        totalOvertimeSeconds += parseDurationToSeconds(record.overtime);
                    });
                }
                
                const compensatoryLeavesEarned = Math.floor((totalOvertimeSeconds / 3600) / 8);

                summaries.push({
                    user: editor,
                    totalOvertimeSeconds,
                    compensatoryLeavesEarned,
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

    const handleApplyEarnedLeaves = async () => {
        if (!summaryToApply || summaryToApply.compensatoryLeavesEarned <= 0) return;

        setIsApplyingLeaves(true);
        const userToUpdate = summaryToApply.user;
        const currentCompensatoryLeaves = userToUpdate.compensatoryLeaves ?? 0;
        const earnedLeaves = summaryToApply.compensatoryLeavesEarned;
        const newTotalCompensatoryLeaves = currentCompensatoryLeaves + earnedLeaves;

        const result = await addUserProfileToRTDB(
            userToUpdate.id,
            userToUpdate.email!,
            userToUpdate.username,
            userToUpdate.role!,
            userToUpdate.editorLevelId,
            userToUpdate.isEligibleForMorningOT,
            userToUpdate.availableLeaves,
            newTotalCompensatoryLeaves
        );

        if (result.success) {
            toast({ title: 'Leaves Applied', description: `${earnedLeaves} compensatory leave(s) added to ${userToUpdate.username}'s balance.` });
        } else {
            toast({ title: 'Error', description: result.message || 'Failed to apply leaves.', variant: 'destructive' });
        }

        setIsApplyingLeaves(false);
        setSummaryToApply(null);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <Gift className="mr-3 h-8 w-8 text-primary" /> Compensatory Leave Management
            </h1>
            <Card>
                <CardHeader>
                    <CardTitle>Calculate Compensatory Leaves</CardTitle>
                    <CardDescription>
                        Calculates compensatory leaves earned by editors based on their total overtime hours for a selected year. The formula is: 1 leave for every 8 hours of overtime.
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
                                    <TableHead><Hourglass className="inline-block mr-2 h-4 w-4" />Total Overtime</TableHead>
                                    <TableHead><Gift className="inline-block mr-2 h-4 w-4" />Comp Leaves Earned</TableHead>
                                    <TableHead><Leaf className="inline-block mr-2 h-4 w-4" />Compensatory Balance</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryData.map(summary => (
                                    <TableRow key={summary.user.id}>
                                        <TableCell className="font-medium">{summary.user.username}</TableCell>
                                        <TableCell>{formatSecondsToHoursString(summary.totalOvertimeSeconds)}</TableCell>
                                        <TableCell className="font-bold text-lg text-primary">{summary.compensatoryLeavesEarned}</TableCell>
                                        <TableCell className="font-bold text-lg text-accent">{summary.user.compensatoryLeaves ?? 0}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                onClick={() => setSummaryToApply(summary)}
                                                disabled={isLoadingData || summary.compensatoryLeavesEarned <= 0 || isApplyingLeaves}
                                                size="sm"
                                                variant="outline"
                                            >
                                                <PlusCircle className="mr-2 h-4 w-4" /> Apply Earned
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={!!summaryToApply} onOpenChange={(open) => !open && setSummaryToApply(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Apply Compensatory Leaves?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to add <span className="font-bold">{summaryToApply?.compensatoryLeavesEarned}</span> earned leave(s) to <span className="font-bold">{summaryToApply?.user.username}</span>'s compensatory balance?
                          <br />
                          Their current compensatory balance is <span className="font-semibold">{summaryToApply?.user.compensatoryLeaves ?? 0}</span>. The new balance will be <span className="font-semibold">{(summaryToApply?.user.compensatoryLeaves ?? 0) + (summaryToApply?.compensatoryLeavesEarned ?? 0)}</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isApplyingLeaves}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleApplyEarnedLeaves} disabled={isApplyingLeaves}>
                            {isApplyingLeaves ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Apply
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
