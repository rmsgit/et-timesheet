"use client";

import React, { useState, useMemo } from 'react';
import { useLeave } from '@/hooks/useLeave';
import { useMockUsers } from '@/hooks/useMockUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar as CalendarIcon, Loader2, Search, Download } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';

export default function LeaveReportPage() {
  const { leaveRequests, isLoading: isLoadingLeave } = useLeave();
  const { users, isUsersLoading } = useMockUsers();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = isLoadingLeave || isUsersLoading;

  const reportData = useMemo(() => {
    if (isLoading || !users || !leaveRequests) return [];

    const from = dateRange?.from;
    const to = dateRange?.to || from;

    return users.map(user => {
      // Get approved leaves for this user within the date range
      const userLeavesInRange = leaveRequests.filter(req => 
        req.userId === user.id && 
        req.status === 'approved' &&
        req.date &&
        (!from || !to || isWithinInterval(parseISO(req.date), { start: from, end: to }))
      );

      // Sort dates
      const leaveDates = userLeavesInRange
        .map(req => req.date)
        .sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime());

      return {
        id: user.id,
        username: user.username,
        fullName: user.fullName || user.username,
        leaveCount: userLeavesInRange.length,
        balanceLeave: user.availableLeaves ?? 0,
        leaveDates: leaveDates,
      };
    }).filter(data => 
      data.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      data.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, leaveRequests, dateRange, searchTerm, isLoading]);

  const exportToExcel = () => {
    const dataToExport = reportData.map(item => ({
      'Full Name': item.fullName,
      'Username': item.username,
      'Leave Count (In Range)': item.leaveCount,
      'Remaining Balance': item.balanceLeave,
      'Leave Dates': item.leaveDates.map(d => format(parseISO(d), 'yyyy-MM-dd')).join(', ')
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Report');
    XLSX.writeFile(workbook, `Leave_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <FileText className="mr-3 h-8 w-8 text-primary" /> Leave Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Summary of approved leaves and remaining balances for the selected period.
          </p>
        </div>
        <Button onClick={exportToExcel} variant="outline" disabled={isLoading || reportData.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      <Card className="shadow-md">
        <CardHeader className="pb-3 text-sm font-medium">Filter Report</CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="grid gap-2 w-full md:w-auto">
              <label className="text-sm font-medium">Date Range</label>
              <DateRangePicker
                dateRange={dateRange}
                onDateChange={setDateRange}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2 w-full md:w-auto flex-1">
                <label className="text-sm font-medium">Search User</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name or username..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-10"
                        disabled={isLoading}
                    />
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton columnCount={4} rowCount={10} />
          ) : reportData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
                No leave data found for the selected criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead className="text-center">Leave Count (In Period)</TableHead>
                  <TableHead className="text-center">Balance Leave</TableHead>
                  <TableHead>Dates of Leaves</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.fullName}</div>
                      <div className="text-xs text-muted-foreground">{row.username}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="px-3">
                        {row.leaveCount} Days
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-primary">
                      {row.balanceLeave}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[400px]">
                        {row.leaveDates.length > 0 ? (
                          row.leaveDates.map((date, idx) => (
                            <Badge key={idx} variant="outline" className="text-[11px] font-normal">
                              {format(parseISO(date), 'MMM d, yyyy')}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No leaves in period</span>
                        )}
                      </div>
                    </TableCell>
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
