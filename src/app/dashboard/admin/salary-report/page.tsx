
'use client';

import React, { useState, useMemo } from 'react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { useHolidays } from '@/hooks/useHolidays';
import type { User, AttendanceRecord, LeaveRequest, Paysheet } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, FileSpreadsheet, Search, AlertCircle, MinusCircle, PlusCircle, NotebookText, Briefcase, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, getDaysInMonth, isSameDay, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { usePaysheet } from '@/hooks/usePaysheet';

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

interface SalaryReport {
  user: User;
  payPeriod: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  baseSalary: number;
  conveyanceAllowance: number;
  totalEarnings: number;
  unpaidLeaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
  totalWorkingDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  totalOTHours: string;
}

export default function SalaryReportPage() {
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [report, setReport] = useState<SalaryReport | null>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    
    const { users, isUsersLoading } = useMockUsers();
    const { getAttendanceForMonth } = useAttendance();
    const { leaveRequests, isLoading: isLeaveLoading } = useLeave();
    const { holidays, isLoading: isHolidaysLoading } = useHolidays();
    const { savePaysheet } = usePaysheet();
    const { toast } = useToast();

    const mainLoadingState = isUsersLoading || isLeaveLoading || isHolidaysLoading;

    const editorUsers = useMemo(() => {
        if (isUsersLoading || !users) return [];
        return users.filter(u => u.role === 'editor').sort((a, b) => a.username.localeCompare(b.username));
    }, [users, isUsersLoading]);
    
    const availableYears = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = currentYear; i >= 2020; i--) {
          years.push(i.toString());
      }
      return years;
    }, []);

    const availableMonths = useMemo(() => {
      return Array.from({ length: 12 }, (_, i) => ({
          value: (i + 1).toString().padStart(2, '0'),
          label: format(new Date(2000, i), 'MMMM'),
      }));
    }, []);

    const handleGenerateReport = async () => {
        if (!selectedUserId) {
            toast({ title: 'Editor Not Selected', description: 'Please select an editor to generate a report.', variant: 'destructive' });
            return;
        }

        setIsLoadingReport(true);
        setReport(null);

        try {
            const user = users.find(u => u.id === selectedUserId);
            if (!user) throw new Error('User not found');

            const baseSalary = user.baseSalary || 0;
            const conveyanceAllowance = user.conveyanceAllowance || 0;

            const yearNum = parseInt(selectedYear, 10);
            const monthNum = parseInt(selectedMonth, 10) - 1;
            const monthStartForCalc = startOfMonth(new Date(yearNum, monthNum));
            const monthEndForCalc = endOfMonth(new Date(yearNum, monthNum));
            const daysInMonth = getDaysInMonth(new Date(yearNum, monthNum));

            const attendance = await getAttendanceForMonth(selectedUserId, selectedYear, selectedMonth) || [];
            
            // Determine pay period start/end for display
            let payPeriodStart: Date, payPeriodEnd: Date;
            if (attendance.length > 0) {
                const dates = attendance.map(rec => new Date(rec.date));
                payPeriodStart = dates.reduce((min, d) => d < min ? d : min, dates[0]);
                payPeriodEnd = dates.reduce((max, d) => d > max ? d : max, dates[0]);
            } else {
                payPeriodStart = monthStartForCalc;
                payPeriodEnd = monthEndForCalc;
            }

            const userLeavesForMonth = leaveRequests.filter(req => 
                req.userId === selectedUserId &&
                req.status === 'approved' &&
                req.date &&
                isWithinInterval(parseISO(req.date), { start: monthStartForCalc, end: monthEndForCalc })
            );

            const holidaysInMonth = holidays.filter(h => isWithinInterval(parseISO(h.date), { start: monthStartForCalc, end: monthEndForCalc }));

            let totalWorkingDays = 0;
            let absentDays = 0;
            let presentDays = 0;
            let totalOTSeconds = 0;

            for (let i = 1; i <= daysInMonth; i++) {
                const currentDate = new Date(yearNum, monthNum, i);
                const isSunday = currentDate.getDay() === 0;
                const holidayInfo = holidaysInMonth.find(h => isSameDay(parseISO(h.date), currentDate));

                let isWorkingDay = false;
                if (holidayInfo) {
                    // It's a holiday, check if it's a special working day
                    if (holidayInfo.isWorkingDay) {
                        isWorkingDay = true;
                    } else {
                        // It's a non-working holiday
                        isWorkingDay = false;
                    }
                } else if (isSunday) {
                    // It's a Sunday and not a designated working holiday
                    isWorkingDay = false;
                } else {
                    // It's a weekday (Mon-Sat) and not a holiday
                    isWorkingDay = true;
                }

                if (isWorkingDay) {
                    totalWorkingDays++;

                    const attendanceForDay = attendance.find(a => isSameDay(new Date(a.date), currentDate));
                    const leaveForDay = userLeavesForMonth.find(l => l.date && isSameDay(parseISO(l.date), currentDate));

                    if (attendanceForDay && (attendanceForDay.checkIn || attendanceForDay.checkOut)) {
                        presentDays++;
                        totalOTSeconds += parseDurationToSeconds(attendanceForDay.overtime);
                    } else if (!leaveForDay) {
                        absentDays++;
                    }
                }
            }

            const perDaySalary = totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;
            const unpaidLeaveDeduction = absentDays * perDaySalary;
            
            const generatedReport: SalaryReport = {
                user,
                payPeriod: format(monthStartForCalc, 'MMMM yyyy'),
                payPeriodStart: format(payPeriodStart, 'PPP'),
                payPeriodEnd: format(payPeriodEnd, 'PPP'),
                baseSalary,
                conveyanceAllowance,
                totalEarnings: baseSalary + conveyanceAllowance,
                unpaidLeaveDeduction,
                totalDeductions: unpaidLeaveDeduction,
                netSalary: baseSalary + conveyanceAllowance - unpaidLeaveDeduction,
                totalWorkingDays,
                presentDays,
                leaveDays: userLeavesForMonth.length,
                absentDays,
                totalOTHours: formatSecondsToHoursString(totalOTSeconds),
            };
            
            setReport(generatedReport);
            
            const paysheetToSave: Omit<Paysheet, 'id' | 'generatedAt'> = {
                userId: user.id,
                username: user.username,
                payPeriod: generatedReport.payPeriod,
                year: selectedYear,
                month: selectedMonth,
                baseSalary: generatedReport.baseSalary,
                conveyanceAllowance: generatedReport.conveyanceAllowance,
                totalEarnings: generatedReport.totalEarnings,
                unpaidLeaveDeduction: generatedReport.unpaidLeaveDeduction,
                totalDeductions: generatedReport.totalDeductions,
                netSalary: generatedReport.netSalary,
                totalWorkingDays: generatedReport.totalWorkingDays,
                presentDays: generatedReport.presentDays,
                leaveDays: generatedReport.leaveDays,
                absentDays: generatedReport.absentDays,
                totalOTHours: generatedReport.totalOTHours,
            };

            await savePaysheet(paysheetToSave);

        } catch (error) {
            console.error("Error generating report:", error);
            toast({ title: 'Report Generation Failed', description: 'Could not generate the salary report.', variant: 'destructive' });
        } finally {
            setIsLoadingReport(false);
        }
    };
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <FileSpreadsheet className="mr-3 h-8 w-8 text-primary" /> Salary Report
            </h1>
            <Card>
                <CardHeader>
                    <CardTitle>Generate Monthly Salary Slip</CardTitle>
                    <CardDescription>
                        Select an editor, year, and month to generate and save their salary slip.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="editor-select">Editor</Label>
                            {mainLoadingState ? (
                                <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={mainLoadingState}>
                                    <SelectTrigger id="editor-select">
                                        <SelectValue placeholder="Select an editor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {editorUsers.map(editor => (
                                            <SelectItem key={editor.id} value={editor.id}>{editor.username}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="year-select">Year</Label>
                            <Select value={selectedYear} onValueChange={setSelectedYear} disabled={mainLoadingState}>
                                <SelectTrigger id="year-select"><SelectValue /></SelectTrigger>
                                <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="month-select">Month</Label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={mainLoadingState}>
                                <SelectTrigger id="month-select"><SelectValue /></SelectTrigger>
                                <SelectContent>{availableMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end mt-6">
                        <Button onClick={handleGenerateReport} disabled={mainLoadingState || isLoadingReport || !selectedUserId}>
                            {isLoadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                            Generate & Save Paysheet
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoadingReport && (
                <Card>
                    <CardContent className="h-96 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </CardContent>
                </Card>
            )}

            {report && !isLoadingReport && (
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl">Salary Slip for {report.payPeriod}</CardTitle>
                        <CardDescription>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center"><UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />{report.user.username}</span>
                                <span className="flex items-center"><Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />{report.user.jobDesignation || 'N/A'}</span>
                            </div>
                             <div className="flex items-center text-sm text-muted-foreground mt-2 gap-2">
                                <CalendarDays className="h-4 w-4" />
                                <span>Pay Period: {report.payPeriodStart} to {report.payPeriodEnd}</span>
                            </div>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><PlusCircle className="mr-2 h-5 w-5 text-green-600"/>Earnings</h3>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Base Salary</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(report.baseSalary)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Conveyance Allowance</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(report.conveyanceAllowance)}</TableCell>
                                    </TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Total Earnings</TableHead>
                                        <TableHead className="text-right font-bold">{formatCurrency(report.totalEarnings)}</TableHead>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><MinusCircle className="mr-2 h-5 w-5 text-red-600"/>Deductions</h3>
                             <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Unpaid Leave ({report.absentDays} days)</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(report.unpaidLeaveDeduction)}</TableCell>
                                    </TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Total Deductions</TableHead>
                                        <TableHead className="text-right font-bold">{formatCurrency(report.totalDeductions)}</TableHead>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </CardContent>
                    <CardContent>
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><NotebookText className="mr-2 h-5 w-5 text-primary"/>Attendance Summary</h3>
                             <Table>
                               <TableHeader>
                                 <TableRow>
                                   <TableHead>Total Working Days</TableHead>
                                   <TableHead>Present</TableHead>
                                   <TableHead>Approved Leave</TableHead>
                                   <TableHead>Absent</TableHead>
                                   <TableHead>Total OT</TableHead>
                                 </TableRow>
                               </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>{report.totalWorkingDays}</TableCell>
                                        <TableCell>{report.presentDays}</TableCell>
                                        <TableCell>{report.leaveDays}</TableCell>
                                        <TableCell>{report.absentDays}</TableCell>
                                        <TableCell>{report.totalOTHours}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-primary/10 p-6 mt-6 rounded-b-lg">
                        <div className="w-full flex justify-between items-center">
                            <span className="text-xl font-bold text-primary">Net Salary Payable</span>
                            <span className="text-2xl font-bold text-primary">{formatCurrency(report.netSalary)}</span>
                        </div>
                    </CardFooter>
                </Card>
            )}

            {!report && !isLoadingReport && !selectedUserId && (
                <Card className="text-center py-10 border-dashed">
                    <CardContent>
                        <UserIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-medium">Select an Editor</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Choose an editor to begin generating a salary report.
                        </p>
                    </CardContent>
                </Card>
            )}
             {!report && !isLoadingReport && selectedUserId && (
                <Card className="text-center py-10 border-dashed">
                    <CardContent>
                        <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-xl font-medium">Generate a Report</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Click the "Generate & Save Paysheet" button to view and save the salary slip for the selected period.
                        </p>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
