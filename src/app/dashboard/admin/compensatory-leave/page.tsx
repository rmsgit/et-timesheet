
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useAttendance } from '@/hooks/useAttendance';
import type { User, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, Gift, AlertTriangle } from 'lucide-react';

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
}

export default function CompensatoryLeavePage() {
    const { users, isUsersLoading } = useMockUsers();
    const { getAttendanceForYear } = useAttendance();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [summaryData, setSummaryData] = useState<DueLeaveSummary[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

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

                summaries.push({
                    user: editor,
                    totalEarlyLeaveSeconds: totalEarlyLeaveSecondsOnShortLeaveDays,
                    dueCompensatoryLeaves,
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

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <Gift className="mr-3 h-8 w-8 text-primary" /> Due Compensatory Leave Report
            </h1>
            <Card>
                <CardHeader>
                    <CardTitle>Calculate Due Compensatory Leaves</CardTitle>
                    <CardDescription>
                        Calculates due compensatory leaves for editors. This is based on the total accumulated early leave hours that occur only on days where a short leave was also taken. The formula is: 1 leave is due for every 8 hours of this specific early leave time for a selected year.
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryData.map(summary => (
                                    <TableRow key={summary.user.id}>
                                        <TableCell className="font-medium">{summary.user.username}</TableCell>
                                        <TableCell>{formatSecondsToHoursString(summary.totalEarlyLeaveSeconds)}</TableCell>
                                        <TableCell className="font-bold text-lg text-primary">{summary.dueCompensatoryLeaves}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
