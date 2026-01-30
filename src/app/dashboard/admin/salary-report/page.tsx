
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { useHolidays } from '@/hooks/useHolidays';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import type { User, AttendanceRecord, LeaveRequest, Paysheet } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, User as UserIcon, FileSpreadsheet, Search, AlertCircle, MinusCircle, PlusCircle, NotebookText, Briefcase, CalendarDays, Award, Save, Banknote, Landmark, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, getDaysInMonth, isSameDay, parseISO, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, differenceInYears } from 'date-fns';
import { usePaysheet } from '@/hooks/usePaysheet';
import { useTimesheet } from '@/hooks/useTimesheet';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useLoader } from '@/hooks/useLoader';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  travelingAllowance: number;
  otAmount: number;
  specialWorkingDayAmount: number;
  noLeaveBonusAmount: number;
  otherPayment: number;
  totalEarnings: number;
  noPayLeaveDeduction: number;
  advanceDeduction: number;
  loanDeduction: number;
  epfDeduction: number;
  otherDeduction: number;
  totalDeductions: number;
  netSalary: number;
  totalWorkingDays: number;
  presentDays: number;
  allowedLeaves: number;
  leaveDays: number;
  totalOTHours: string;
  presentOnSpecialWorkingDays: number;
  companyEpfContribution: number;
  companyEtfContribution: number;
}

export default function SalaryReportPage() {
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [report, setReport] = useState<SalaryReport | null>(null);
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isPayslipPreviewOpen, setIsPayslipPreviewOpen] = useState(false);
    const [payslipPdfUrl, setPayslipPdfUrl] = useState<string>('');
    const [generatedPdf, setGeneratedPdf] = useState<jsPDF | null>(null);

    const { users, isUsersLoading } = useMockUsers();
    const { getAttendanceForMonth } = useAttendance();
    const { getRecordsForUser: getTimesheetForMonth } = useTimesheet();
    const { leaveRequests, isLoading: isLeaveLoading } = useLeave();
    const { holidays, isLoading: isHolidaysLoading } = useHolidays();
    const { settings, isLoading: isSettingsLoading } = useGlobalSettings();
    const { savePaysheet, paysheets, isLoading: isPaysheetsLoading } = usePaysheet();
    const { toast } = useToast();
    const { showLoader, hideLoader } = useLoader();

    const mainLoadingState = isUsersLoading || isLeaveLoading || isHolidaysLoading || isSettingsLoading || isPaysheetsLoading;

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

    useEffect(() => {
        if (!selectedUserId || !selectedYear || !selectedMonth || !paysheets || !users) {
            setReport(null);
            setIsSaved(false);
            return;
        }

        if (mainLoadingState) return;

        const paysheetId = `${selectedUserId}_${selectedYear}-${selectedMonth}`;
        const savedPaysheet = paysheets.find(p => p.id === paysheetId);
        
        if (savedPaysheet) {
            const user = users.find(u => u.id === savedPaysheet.userId);
            if (!user) {
                setReport(null);
                setIsSaved(false);
                return;
            }
            
            const yearNum = parseInt(savedPaysheet.year, 10);
            const monthNum = parseInt(savedPaysheet.month, 10) - 1;
            const payPeriodStartDt = startOfMonth(new Date(yearNum, monthNum));
            const payPeriodEndDt = endOfMonth(new Date(yearNum, monthNum));

            const reportFromSaved: SalaryReport = {
                user: user,
                payPeriod: savedPaysheet.payPeriod,
                payPeriodStart: format(payPeriodStartDt, 'PPP'),
                payPeriodEnd: format(payPeriodEndDt, 'PPP'),
                baseSalary: savedPaysheet.baseSalary,
                conveyanceAllowance: savedPaysheet.conveyanceAllowance,
                travelingAllowance: savedPaysheet.travelingAllowance,
                otAmount: savedPaysheet.otAmount || 0,
                specialWorkingDayAmount: savedPaysheet.specialWorkingDayAmount || 0,
                noLeaveBonusAmount: savedPaysheet.noLeaveBonusAmount || 0,
                otherPayment: savedPaysheet.otherPayment,
                totalEarnings: savedPaysheet.totalEarnings,
                noPayLeaveDeduction: savedPaysheet.noPayLeaveDeduction,
                advanceDeduction: savedPaysheet.advanceDeduction,
                loanDeduction: savedPaysheet.loanDeduction,
                epfDeduction: savedPaysheet.epfDeduction,
                otherDeduction: savedPaysheet.otherDeduction,
                totalDeductions: savedPaysheet.totalDeductions,
                netSalary: savedPaysheet.netSalary,
                totalWorkingDays: savedPaysheet.totalWorkingDays,
                presentDays: savedPaysheet.presentDays,
                allowedLeaves: savedPaysheet.allowedLeaves,
                leaveDays: savedPaysheet.leaveDays,
                totalOTHours: savedPaysheet.totalOTHours,
                presentOnSpecialWorkingDays: savedPaysheet.presentOnSpecialWorkingDays || 0,
                companyEpfContribution: savedPaysheet.companyEpfContribution || 0,
                companyEtfContribution: savedPaysheet.companyEtfContribution || 0,
            };
            setReport(reportFromSaved);
            setIsSaved(true);
            toast({ title: "Loaded Saved Paysheet", description: `Displaying a previously saved paysheet for ${user.username}.`})
        } else {
            setReport(null);
            setIsSaved(false);
        }
    }, [selectedUserId, selectedYear, selectedMonth, paysheets, users, mainLoadingState, toast]);

    const handleOtherPaymentChange = (amount: number) => {
        if (!report) return;

        const currentOtherPayment = report.otherPayment || 0;
        const newTotalEarnings = (report.totalEarnings - currentOtherPayment) + amount;
        const newNetSalary = newTotalEarnings - report.totalDeductions;
        
        setReport(prevReport => {
            if (!prevReport) return null;
            return {
                ...prevReport,
                otherPayment: amount,
                totalEarnings: newTotalEarnings,
                netSalary: newNetSalary,
            };
        });
    };

    const handleDeductionChange = (field: 'advanceDeduction' | 'loanDeduction' | 'otherDeduction', amount: number) => {
        if (!report) return;

        const newReport = { ...report, [field]: amount };

        const newTotalDeductions =
            newReport.noPayLeaveDeduction +
            newReport.epfDeduction +
            newReport.advanceDeduction +
            newReport.loanDeduction +
            newReport.otherDeduction;

        const newNetSalary = newReport.totalEarnings - newTotalDeductions;

        setReport({
            ...newReport,
            totalDeductions: newTotalDeductions,
            netSalary: newNetSalary,
        });
    };

    const handleGenerateReport = async () => {
        if (!selectedUserId) {
            toast({ title: 'Editor Not Selected', description: 'Please select an editor to generate a report.', variant: 'destructive' });
            return;
        }

        setIsLoadingReport(true);
        setIsSaved(false);
        setReport(null);

        try {
            const user = users.find(u => u.id === selectedUserId);
            if (!user) throw new Error('User not found');

            const baseSalary = user.baseSalary || 0;
            const conveyanceAllowance = user.conveyanceAllowance || 0;
            const travelingAllowance = user.travelingAllowance || 0;
            const otRate = settings?.otRate || 0;
            const epfRate = settings?.epfRate || 0;

            const yearNum = parseInt(selectedYear, 10);
            const monthNum = parseInt(selectedMonth, 10) - 1;
            
            const attendance = await getAttendanceForMonth(selectedUserId, selectedYear, selectedMonth) || [];

            let payPeriodStart: Date, payPeriodEnd: Date;
            if (attendance.length > 0) {
                const dates = attendance.map(rec => new Date(rec.date));
                payPeriodStart = dates.reduce((min, d) => d < min ? d : min, dates[0]);
                payPeriodEnd = dates.reduce((max, d) => d > max ? d : max, dates[0]);
            } else {
                payPeriodStart = startOfMonth(new Date(yearNum, monthNum));
                payPeriodEnd = endOfMonth(new Date(yearNum, monthNum));
            }
            
            const timesheetRecordsForMonth = getTimesheetForMonth(selectedUserId).filter(rec => {
                const recDate = parseISO(rec.date);
                return isWithinInterval(recDate, {start: payPeriodStart, end: payPeriodEnd});
            });
            
            const userLeavesForMonth = leaveRequests.filter(req => 
                req.userId === selectedUserId &&
                req.status === 'approved' &&
                req.date &&
                isWithinInterval(parseISO(req.date), { start: payPeriodStart, end: payPeriodEnd })
            );

            const holidaysInMonth = holidays.filter(h => isWithinInterval(new Date(h.date), { start: payPeriodStart, end: payPeriodEnd }));
            
            const totalOTSeconds = attendance.reduce((total, record) => {
                return total + parseDurationToSeconds(record.overtime);
            }, 0);
            const totalOTDecimalHours = totalOTSeconds / 3600;
            const otAmount = totalOTDecimalHours * otRate;

            const specialWorkingDaysInMonth = holidaysInMonth.filter(h => h.isWorkingDay);
            const presentOnSpecialWorkingDays = specialWorkingDaysInMonth.filter(swd => 
                timesheetRecordsForMonth.some(t => isSameDay(parseISO(t.date), new Date(swd.date)))
            ).length;

            const specialWorkingDayAmount = Math.round(((baseSalary / 25) * presentOnSpecialWorkingDays));

            let totalWorkingDays = 0;
            let presentDays = 0;

            const daysInPeriod = eachDayOfInterval({ start: payPeriodStart, end: payPeriodEnd });
            daysInPeriod.forEach(currentDate => {
                const isSunday = currentDate.getDay() === 0;
                const holidayInfo = holidaysInMonth.find(h => isSameDay(new Date(h.date), currentDate));

                let isWorkingDayForCalc = !isSunday;

                if(holidayInfo) {
                    if(!holidayInfo.isWorkingDay) {
                        isWorkingDayForCalc = false;
                    } else {
                        isWorkingDayForCalc = true;
                    }
                }
                
                if (isWorkingDayForCalc) {
                    totalWorkingDays++;

                    const timesheetEntryForDay = timesheetRecordsForMonth.find(t => isSameDay(parseISO(t.date), currentDate));

                    if (timesheetEntryForDay) {
                        presentDays++;
                    }
                }
            });

            const leaveDays = userLeavesForMonth.reduce((total, leave) => {
                if (leave.leaveType === 'full-day' || leave.leaveType === 'compensatory') {
                    return total + 1;
                }
                if (leave.leaveType === 'half-day') {
                    return total + 0.5;
                }
                return total;
            }, 0);
            
            let noLeaveBonusAmount = 0;
            const nonShortLeaveDaysCount = userLeavesForMonth.filter(l => l.leaveType !== 'short-leave').length;

            if (nonShortLeaveDaysCount <= 2 && user.joiningDate && (settings?.noLeaveBonusOneYearOrMore || settings?.noLeaveBonusLessThanOneYear)) {
                const yearsOfService = differenceInYears(payPeriodEnd, parseISO(user.joiningDate));
                if (yearsOfService >= 1) {
                    noLeaveBonusAmount = settings.noLeaveBonusOneYearOrMore || 0;
                } else {
                    noLeaveBonusAmount = settings.noLeaveBonusLessThanOneYear || 0;
                }
            }

            const allowedLeaves = totalWorkingDays - leaveDays;
            const absentDays = totalWorkingDays - presentDays - leaveDays;
            
            const perDaySalary = totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;
            const noPayLeaveDeduction = Math.round(((absentDays > 0 ? absentDays : 0) * perDaySalary) / 10) * 10;
            const epfDeduction = (baseSalary * epfRate) / 100;
            
            const companyEpfContribution = baseSalary * 0.12;
            const companyEtfContribution = baseSalary * 0.03;

            const totalEarnings = baseSalary + conveyanceAllowance + travelingAllowance + otAmount + specialWorkingDayAmount + noLeaveBonusAmount;

            const totalDeductions = noPayLeaveDeduction + epfDeduction;
            const netSalary = totalEarnings - totalDeductions;

            const generatedReport: SalaryReport = {
                user,
                payPeriod: format(payPeriodStart, 'MMMM yyyy'),
                payPeriodStart: format(payPeriodStart, 'PPP'),
                payPeriodEnd: format(payPeriodEnd, 'PPP'),
                baseSalary,
                conveyanceAllowance,
                travelingAllowance,
                otAmount,
                specialWorkingDayAmount,
                noLeaveBonusAmount,
                otherPayment: 0,
                totalEarnings,
                noPayLeaveDeduction,
                advanceDeduction: 0,
                loanDeduction: 0,
                epfDeduction: epfDeduction,
                otherDeduction: 0,
                totalDeductions,
                netSalary: netSalary,
                totalWorkingDays,
                presentDays,
                allowedLeaves,
                leaveDays,
                totalOTHours: formatSecondsToHoursString(totalOTSeconds),
                presentOnSpecialWorkingDays,
                companyEpfContribution,
                companyEtfContribution,
            };
            
            setReport(generatedReport);

        } catch (error) {
            console.error("Error generating report:", error);
            toast({ title: 'Report Generation Failed', description: (error instanceof Error) ? error.message : 'Could not generate the salary report.', variant: 'destructive' });
        } finally {
            setIsLoadingReport(false);
        }
    };
    
    const handleSavePaysheet = async () => {
        if (!report) {
            toast({ title: 'No Report', description: 'Please generate a report first.', variant: 'destructive' });
            return;
        }

        setIsSaving(true);
        const absentDays = report.totalWorkingDays - report.presentDays - report.leaveDays;
        const paysheetToSave: Omit<Paysheet, 'id' | 'generatedAt'> = {
            userId: report.user.id,
            username: report.user.username,
            payPeriod: report.payPeriod,
            year: selectedYear,
            month: selectedMonth,
            baseSalary: report.baseSalary,
            conveyanceAllowance: report.conveyanceAllowance,
            travelingAllowance: report.travelingAllowance,
            otAmount: report.otAmount,
            specialWorkingDayAmount: report.specialWorkingDayAmount,
            noLeaveBonusAmount: report.noLeaveBonusAmount,
            otherPayment: report.otherPayment,
            totalEarnings: report.totalEarnings,
            noPayLeaveDeduction: report.noPayLeaveDeduction,
            advanceDeduction: report.advanceDeduction,
            loanDeduction: report.loanDeduction,
            epfDeduction: report.epfDeduction,
            otherDeduction: report.otherDeduction,
            totalDeductions: report.totalDeductions,
            netSalary: report.netSalary,
            totalWorkingDays: report.totalWorkingDays,
            presentDays: report.presentDays,
            allowedLeaves: report.allowedLeaves,
            leaveDays: report.leaveDays,
            absentDays: absentDays > 0 ? absentDays : 0,
            totalOTHours: report.totalOTHours,
            presentOnSpecialWorkingDays: report.presentOnSpecialWorkingDays,
            companyEpfContribution: report.companyEpfContribution,
            companyEtfContribution: report.companyEtfContribution,
        };

        await savePaysheet(paysheetToSave);
        setIsSaving(false);
        setIsSaved(true); // After saving, the currently viewed report is now a "saved" one
    };

    const handleGeneratePdfForPreview = async () => {
        if (!report) {
            toast({ title: 'No Report', description: 'Please generate a report first.', variant: 'destructive' });
            return;
        }
        if (!report.user.personalEmail) {
            toast({ title: 'Missing Email', description: "This user doesn't have a personal email configured.", variant: 'destructive' });
            return;
        }
    
        const payslipElement = document.getElementById('payslip-card');
        if (!payslipElement) {
            toast({ title: 'Error', description: 'Could not find payslip content to export.', variant: 'destructive' });
            return;
        }
    
        setIsGeneratingPdf(true);
        
        try {
            const canvas = await html2canvas(payslipElement, {
                scale: 2,
                ignoreElements: (element) => element.classList.contains('payslip-actions-container')
            });

            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'px',
                format: 'a4',
            });
    
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 15;
    
            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
            
            setGeneratedPdf(pdf);
            setPayslipPdfUrl(pdf.output('datauristring'));
            setIsPayslipPreviewOpen(true);
    
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ title: 'PDF Generation Failed', description: 'Could not generate the payslip PDF.', variant: 'destructive' });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleDownloadAndClose = () => {
        if (generatedPdf && report) {
            generatedPdf.save(`payslip_${report.user.username}_${selectedYear}-${selectedMonth}.pdf`);
            toast({
                title: 'Payslip PDF Downloaded',
                description: `The payslip for ${report.user.username} has been downloaded.`,
                duration: 8000,
            });
        }
        setIsPayslipPreviewOpen(false);
        setGeneratedPdf(null);
        setPayslipPdfUrl('');
    };


    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('si-LK', { style: 'currency', currency: 'LKR' }).format(amount);
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
                        Select an editor, year, and month to view a saved paysheet or generate a new one.
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
                            Generate Report
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
                <Card id="payslip-card" className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-2xl">Salary Slip for {report.payPeriod}</CardTitle>
                                <CardDescription>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="flex items-center"><UserIcon className="mr-2 h-4 w-4 text-muted-foreground inline-block align-middle" />{report.user.username}</span>
                                        <span className="flex items-center"><Briefcase className="mr-2 h-4 w-4 text-muted-foreground inline-block align-middle" />{report.user.jobDesignation || 'N/A'}</span>
                                        <span className="flex items-center"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground inline-block align-middle" />Pay Period: {report.payPeriodStart} to {report.payPeriodEnd}</span>
                                    </div>
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 payslip-actions-container">
                                {isSaved && (
                                    <Button onClick={handleGenerateReport} variant="outline" disabled={isLoadingReport || mainLoadingState}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Recalculate
                                    </Button>
                                )}
                                <Button onClick={handleSavePaysheet} disabled={isSaving || mainLoadingState}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Paysheet
                                </Button>
                                <Button onClick={handleGeneratePdfForPreview} variant="secondary" disabled={isGeneratingPdf || isSaving || mainLoadingState || !report?.user?.personalEmail} title={!report?.user?.personalEmail ? "User has no personal email set" : "Preview & Download Payslip"}>
                                    {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                    {isGeneratingPdf ? 'Generating...' : 'Send Payslip'}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-4 pt-4">
                            <h3 className="font-semibold text-lg flex items-center"><NotebookText className="mr-2 h-5 w-5 text-primary inline-block align-middle"/>Attendance Summary</h3>
                             <Table>
                               <TableHeader>
                                 <TableRow>
                                   <TableHead>Total Working Days</TableHead>
                                   <TableHead>Leave Taken</TableHead>
                                   <TableHead>Present</TableHead>
                                   <TableHead>Balance leave</TableHead>
                                   <TableHead>Total OT</TableHead>
                                 </TableRow>
                               </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>{report.totalWorkingDays}</TableCell>
                                        <TableCell>{report.leaveDays}</TableCell>
                                        <TableCell>{report.presentDays}</TableCell>
                                        <TableCell>{report.allowedLeaves}</TableCell>
                                        <TableCell>{report.totalOTHours}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-8 p-6">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center"><PlusCircle className="mr-2 h-5 w-5 text-green-600 inline-block align-middle"/>Earnings</h3>
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
                                        <TableRow>
                                            <TableCell>Traveling Allowance</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(report.travelingAllowance)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>OT Amount ({report.totalOTHours})</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(report.otAmount)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>Special Working Day Amount ({report.presentOnSpecialWorkingDays} days)</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(report.specialWorkingDayAmount)}</TableCell>
                                        </TableRow>
                                        {report.noLeaveBonusAmount > 0 && (
                                            <TableRow>
                                                <TableCell className="flex items-center"><Award className="mr-2 h-4 w-4 text-yellow-500 inline-block align-middle" />No-Leave Bonus</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(report.noLeaveBonusAmount)}</TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow>
                                            <TableCell className="flex items-center"><PlusCircle className="mr-2 h-4 w-4 inline-block align-middle" />Other Payments</TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="w-32 h-8 text-right ml-auto"
                                                    value={report.otherPayment}
                                                    onChange={(e) => handleOtherPaymentChange(Number(e.target.value) || 0)}
                                                />
                                            </TableCell>
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
                                <h3 className="font-semibold text-lg flex items-center"><MinusCircle className="mr-2 h-5 w-5 text-red-600 inline-block align-middle"/>Deductions</h3>
                                <Table>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell>No Pay Leave ({Math.max(0, report.totalWorkingDays - report.presentDays - report.leaveDays)} days)</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(report.noPayLeaveDeduction)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell>EPF ({settings?.epfRate || 0}%)</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(report.epfDeduction)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="flex items-center"><Banknote className="mr-2 h-4 w-4 text-muted-foreground inline-block align-middle" />Advance</TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="w-32 h-8 text-right ml-auto"
                                                    value={report.advanceDeduction}
                                                    onChange={(e) => handleDeductionChange('advanceDeduction', Number(e.target.value) || 0)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="flex items-center"><Landmark className="mr-2 h-4 w-4 text-muted-foreground inline-block align-middle" />Loan Payment</TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="w-32 h-8 text-right ml-auto"
                                                    value={report.loanDeduction}
                                                    onChange={(e) => handleDeductionChange('loanDeduction', Number(e.target.value) || 0)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="flex items-center"><MinusCircle className="mr-2 h-4 w-4 inline-block align-middle" />Other Deductions</TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    className="w-32 h-8 text-right ml-auto"
                                                    value={report.otherDeduction}
                                                    onChange={(e) => handleDeductionChange('otherDeduction', Number(e.target.value) || 0)}
                                                />
                                            </TableCell>
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
                        </div>
                         
                    </CardContent>
                    
                    <CardFooter className="flex-col items-start gap-6 p-6">
                        <div className="w-full bg-primary/10 p-6 rounded-lg flex justify-between items-center">
                            <span className="text-xl font-bold text-primary">Net Salary Payable</span>
                            <span className="text-2xl font-bold text-primary">{formatCurrency(report.netSalary)}</span>
                        </div>
                        <div className="w-full space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><Landmark className="mr-2 h-5 w-5 text-primary inline-block align-middle"/>Company Contributions (Informational)</h3>
                             <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Company EPF Contribution (12%)</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(report.companyEpfContribution)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Company ETF Contribution (3%)</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(report.companyEtfContribution)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
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
                            Click the "Generate Report" button to view the salary slip for the selected period.
                        </p>
                    </CardContent>
                </Card>
            )}

            <Dialog open={isPayslipPreviewOpen} onOpenChange={setIsPayslipPreviewOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Payslip Preview</DialogTitle>
                        <DialogDescription>
                            Review the generated payslip. Click "Download & Close" to save the PDF, which you can then attach to an email.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow border rounded-md overflow-hidden bg-muted">
                        {payslipPdfUrl ? (
                            <iframe
                                src={payslipPdfUrl}
                                className="w-full h-full"
                                title="Payslip Preview"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="ml-2 text-muted-foreground">Loading Preview...</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPayslipPreviewOpen(false)}>Cancel</Button>
                        <Button onClick={handleDownloadAndClose} disabled={!generatedPdf}>
                            <FileSpreadsheet className="mr-2 h-4 w-4" /> Download & Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}


    