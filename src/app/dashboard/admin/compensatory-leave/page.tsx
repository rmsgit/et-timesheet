'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useAttendance } from '@/hooks/useAttendance';
import type { User, AttendanceRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, Gift, Hourglass } from 'lucide-react';

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
    userId: string;
    username: string;
    totalOvertimeSeconds: number;
    compensatoryLeaves: number;
}

export default function CompensatoryLeavePage() {
    const { users, isUsersLoading } = useMockUsers();
    const { getAttendanceForYear } = useAttendance();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [summaryData, setSummaryData] = useState<CompensatoryLeaveSummary[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

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
                
                const compensatoryLeaves = Math.floor((totalOvertimeSeconds / 3600) / 8);

                summaries.push({
                    userId: editor.id,
                    username: editor.username,
                    totalOvertimeSeconds,
                    compensatoryLeaves,
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
                                    <TableHead><Gift className="inline-block mr-2 h-4 w-4" />Compensatory Leaves Earned</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryData.map(summary => (
                                    <TableRow key={summary.userId}>
                                        <TableCell className="font-medium">{summary.username}</TableCell>
                                        <TableCell>{formatSecondsToHoursString(summary.totalOvertimeSeconds)}</TableCell>
                                        <TableCell className="font-bold text-lg text-primary">{summary.compensatoryLeaves}</TableCell>
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
