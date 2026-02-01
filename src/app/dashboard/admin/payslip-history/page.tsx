'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { usePaysheet } from '@/hooks/usePaysheet';
import type { Paysheet } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('si-LK', { style: 'currency', currency: 'LKR' }).format(amount);
}

export default function PayslipHistoryPage() {
    const { isSuperAdmin, isAuthLoading } = useAuth();
    const router = useRouter();
    const { paysheets, isLoading: isPaysheetsLoading } = usePaysheet();
    
    const [paysheetListPage, setPaysheetListPage] = useState(1);
    const paysheetsPerPage = 15;

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isSuperAdmin) {
            router.replace('/dashboard');
        }
    }, [isSuperAdmin, isAuthLoading, router]);
    
    const sortedPaysheets = useMemo(() => {
        return [...paysheets].sort((a, b) => {
            const dateA = a.generatedAt ? new Date(a.generatedAt).getTime() : 0;
            const dateB = b.generatedAt ? new Date(b.generatedAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [paysheets]);

    const paginatedPaysheets = useMemo(() => {
        const startIndex = (paysheetListPage - 1) * paysheetsPerPage;
        return sortedPaysheets.slice(startIndex, startIndex + paysheetsPerPage);
    }, [sortedPaysheets, paysheetListPage]);

    const totalPaysheetPages = Math.ceil(sortedPaysheets.length / paysheetsPerPage);

    const handleDownloadPaysheet = (paysheet: Paysheet) => {
        const url = `/dashboard/admin/salary-report?userId=${paysheet.userId}&year=${paysheet.year}&month=${paysheet.month}&download=true`;
        router.push(url);
    };


    if (isAuthLoading || !isSuperAdmin) {
        return (
            <div className="flex h-full min-h-[calc(100vh-theme(spacing.16))] items-center justify-center p-8">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Verifying payroll access...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold tracking-tight flex items-center">
                <History className="mr-3 h-8 w-8 text-primary" /> Payslip History
            </h1>
            <Card>
                <CardHeader>
                    <CardTitle>Saved Paysheets History</CardTitle>
                    <CardDescription>Browse all previously generated and saved paysheets. Click "Download" to get the PDF.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isPaysheetsLoading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : sortedPaysheets.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10">No paysheets have been saved yet.</div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Slry. Date</TableHead>
                                        <TableHead className="whitespace-nowrap">Co-worker Name</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Basic Salary</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Conv.Allowance</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Travelling Allowance</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Overtime</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Poya</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">No Pay Leaves (-)</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Advance (-)</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Loan Settelments (-)</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">EPF 8% (-)</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Gross Salary</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Tot. Deduction</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Net Salary</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Special allow</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Net + Allow</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Target Insentive</TableHead>
                                        <TableHead className="whitespace-nowrap">-</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">Grand Total</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">EPF 12%</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">EPF Total</TableHead>
                                        <TableHead className="whitespace-nowrap text-right">ETF 3%</TableHead>
                                        <TableHead className="text-right sticky right-0 bg-card">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedPaysheets.map(p => {
                                        const netPlusAllow = (p.netSalary || 0) + (p.otherPayment || 0);
                                        const epfTotal = (p.epfDeduction || 0) + (p.companyEpfContribution || 0);
                                        return (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium whitespace-nowrap">{p.payPeriod}</TableCell>
                                            <TableCell className="whitespace-nowrap">{p.username}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.baseSalary)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.conveyanceAllowance)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.travelingAllowance)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.otAmount || 0)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.specialWorkingDayAmount || 0)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.noPayLeaveDeduction)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.advanceDeduction)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.loanDeduction)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.epfDeduction)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.totalEarnings)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.totalDeductions)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap font-bold">{formatCurrency(p.netSalary)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.otherPayment || 0)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(netPlusAllow)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.noLeaveBonusAmount || 0)}</TableCell>
                                            <TableCell>-</TableCell>
                                            <TableCell className="text-right whitespace-nowrap font-bold">{formatCurrency(p.netSalary)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.companyEpfContribution || 0)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(epfTotal)}</TableCell>
                                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(p.companyEtfContribution || 0)}</TableCell>
                                            <TableCell className="text-right sticky right-0 bg-card">
                                                <Button variant="outline" size="sm" onClick={() => handleDownloadPaysheet(p)}>
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Download
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )})}
                                </TableBody>
                            </Table>
                             {totalPaysheetPages > 1 && (
                                <div className="flex items-center justify-between space-x-2 pt-4">
                                  <Button variant="outline" size="sm" onClick={() => setPaysheetListPage(p => Math.max(1, p - 1))} disabled={paysheetListPage === 1}>
                                    <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                                  </Button>
                                  <span className="text-sm text-muted-foreground">Page {paysheetListPage} of {totalPaysheetPages}</span>
                                  <Button variant="outline" size="sm" onClick={() => setPaysheetListPage(p => Math.min(totalPaysheetPages, p + 1))} disabled={paysheetListPage === totalPaysheetPages}>
                                    Next <ChevronRight className="ml-1 h-4 w-4" />
                                  </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
