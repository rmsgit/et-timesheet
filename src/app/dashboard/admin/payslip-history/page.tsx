'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { usePaysheet } from '@/hooks/usePaysheet';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useRouter } from 'next/navigation';
import type { Paysheet } from '@/lib/types';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import * as XLSX from 'xlsx';

// Component imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

// Icon imports
import { History, Loader2, User as UserIcon, Download, Search, Trash2, Eye, X } from 'lucide-react';

const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('si-LK', { style: 'currency', currency: 'LKR' }).format(amount);
};


export default function PayslipHistoryPage() {
  const { paysheets, isLoading: isPaysheetsLoading, deletePaysheet } = usePaysheet();
  const { users, isUsersLoading } = useMockUsers();
  const router = useRouter();
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [paysheetToDelete, setPaysheetToDelete] = useState<Paysheet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = isPaysheetsLoading || isUsersLoading;

  const filteredPaysheets = useMemo(() => {
    let filtered = [...paysheets];

    // Filter by user
    if (selectedUserId !== 'all') {
      filtered = filtered.filter(p => p.userId === selectedUserId);
    }

    // Filter by date range
    if (dateRange?.from) {
      const from = dateRange.from;
      const to = dateRange.to || dateRange.from;
      filtered = filtered.filter(p => {
        const paysheetDate = new Date(parseInt(p.year), parseInt(p.month) - 1);
        return isWithinInterval(paysheetDate, { start: from, end: to });
      });
    }

    return filtered.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }, [paysheets, selectedUserId, dateRange]);
  
  const selectableUsers = useMemo(() => {
    if (isUsersLoading || !users) return [];
    return users.filter(u => u.role === 'editor' || u.role === 'admin' || u.role === 'super admin').sort((a,b) => a.username.localeCompare(b.username));
  }, [users, isUsersLoading]);

  const handleViewPaysheet = (paysheet: Paysheet) => {
    router.push(`/dashboard/admin/salary-report?userId=${paysheet.userId}&year=${paysheet.year}&month=${paysheet.month}`);
  };

  const handleDeleteClick = (paysheet: Paysheet) => {
    setPaysheetToDelete(paysheet);
  };
  
  const handleConfirmDelete = async () => {
    if (!paysheetToDelete) return;
    
    setIsDeleting(true);
    const result = await deletePaysheet(paysheetToDelete.id);
    if (!result.success) {
      // toast is handled in the context
    }
    setIsDeleting(false);
    setPaysheetToDelete(null);
  };

  const handleExport = useCallback(() => {
    const dataToExport = filteredPaysheets.map(p => ({
        "Slry. Date": p.payPeriod,
        "Co-worker Name": p.username,
        "Basic Salary": p.baseSalary,
        "Conv.Allowance": p.conveyanceAllowance,
        "Travelling Allowance": p.travelingAllowance,
        "Overtime": p.otAmount,
        "Poya": p.specialWorkingDayAmount,
        "No Pay Leaves (-)": p.noPayLeaveDeduction,
        "Advance (-)": p.advanceDeduction,
        "Loan Settelments (-)": p.loanDeduction,
        "EPF 8% (-)": p.epfDeduction,
        "Gross Salary": p.totalEarnings,
        "Tot. Deduction": p.totalDeductions,
        "Net Salary": p.netSalary,
        "Special allow": p.otherPayment,
        "Net + Allow": p.netSalary + (p.conveyanceAllowance || 0) + (p.travelingAllowance || 0), // This is an interpretation
        "Target Insentive": 0, // Placeholder
        "-": "", // Placeholder
        "Grand Total": p.netSalary, // This is an interpretation
        "EPF 12%": p.companyEpfContribution,
        "EPF Total": p.epfDeduction + (p.companyEpfContribution || 0),
        "ETF 3%": p.companyEtfContribution,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payslips");
    XLSX.writeFile(workbook, `payslip_history_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
        title: "Export Successful",
        description: "Payslip history has been exported to Excel."
    });

  }, [filteredPaysheets, toast]);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <History className="mr-3 h-8 w-8 text-primary" /> Payslip History
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Filter Paysheets</CardTitle>
          <CardDescription>Select a user and/or date range to filter the list of saved paysheets.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div className="space-y-2">
                <Label htmlFor="user-select">Filter by User</Label>
                 {isUsersLoading ? (
                    <div className="flex items-center justify-center h-10 border rounded-md bg-muted">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger id="user-select"><SelectValue placeholder="All Users" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {selectableUsers.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.fullName || user.username}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            <div className="space-y-2">
                <Label>Filter by Pay Period</Label>
                <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} disabled={isLoading} />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Saved Paysheets</CardTitle>
                    <CardDescription>A history of all generated and saved salary slips.</CardDescription>
                </div>
                <Button onClick={handleExport} disabled={isLoading || filteredPaysheets.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export to Excel
                </Button>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPaysheets.length === 0 ? (
            <div className="text-center text-muted-foreground py-16 p-6">No saved paysheets found for the selected filters.</div>
          ) : (
             <ScrollArea className="h-[calc(100vh-32rem)]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                      <TableHead>Slry. Date</TableHead>
                      <TableHead>Co-worker Name</TableHead>
                      <TableHead className="text-right">Basic Salary</TableHead>
                      <TableHead className="text-right">Gross Salary</TableHead>
                      <TableHead className="text-right">Tot. Deduction</TableHead>
                      <TableHead className="text-right font-semibold">Net Salary</TableHead>
                      <TableHead className="text-right sticky right-0 bg-background pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPaysheets.map(paysheet => (
                    <TableRow key={paysheet.id}>
                        <TableCell>{paysheet.payPeriod}</TableCell>
                        <TableCell className="font-medium">{paysheet.username}</TableCell>
                        <TableCell className="text-right">{formatCurrency(paysheet.baseSalary)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(paysheet.totalEarnings)}</TableCell>
                        <TableCell className="text-right text-red-600">({formatCurrency(paysheet.totalDeductions)})</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(paysheet.netSalary)}</TableCell>
                        <TableCell className="text-right sticky right-0 bg-background/95 backdrop-blur-sm pr-6">
                            <Button variant="outline" size="sm" onClick={() => handleViewPaysheet(paysheet)} className="mr-2">
                                <Eye className="mr-2 h-4 w-4" /> View
                            </Button>
                             <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(paysheet)} disabled={isDeleting}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!paysheetToDelete} onOpenChange={(open) => {if(!open) setPaysheetToDelete(null)}}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the paysheet for <span className="font-semibold">{paysheetToDelete?.username}</span> for the period <span className="font-semibold">{paysheetToDelete?.payPeriod}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
