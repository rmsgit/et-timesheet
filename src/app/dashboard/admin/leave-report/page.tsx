"use client";

import React, { useState, useMemo } from 'react';
import { useLeave } from '@/hooks/useLeave';
import { useMockUsers } from '@/hooks/useMockUsers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar as CalendarIcon, Loader2, Search, Download, Info, Clock } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { TableSkeleton } from '@/components/skeletons/TableSkeleton';
import { DateRangePicker } from '@/components/dashboard/DateRangePicker';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import type { LeaveType } from '@/lib/types';

export default function LeaveReportPage() {
  const { leaveRequests, isLoading: isLoadingLeave } = useLeave();
  const { users, isUsersLoading } = useMockUsers();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = isLoadingLeave || isUsersLoading;

  const getBadgeStyle = (type: LeaveType) => {
    switch (type) {
      case 'full-day': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
      case 'half-day': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 'short-leave': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
      case 'compensatory': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      default: return '';
    }
  };

  const calculateLeaveValue = (type: LeaveType, startTime?: string, endTime?: string) => {
    switch (type) {
      case 'full-day': return 1;
      case 'half-day': return 0.5;
      case 'short-leave': {
        if (!startTime || !endTime) return 0.2; // Fallback if times are missing
        try {
          const [startH, startM] = startTime.split(':').map(Number);
          const [endH, endM] = endTime.split(':').map(Number);
          const startTotalMinutes = startH * 60 + startM;
          const endTotalMinutes = endH * 60 + endM;
          const durationMinutes = endTotalMinutes - startTotalMinutes;
          
          // Calculate fraction of 8-hour workday (480 minutes)
          const value = durationMinutes / 480;
          return Math.max(0, parseFloat(value.toFixed(2)));
        } catch (e) {
          return 0.2;
        }
      }
      case 'compensatory': return 1;
      default: return 1;
    }
  };

  const reportData = useMemo(() => {
    if (isLoading || !users || !leaveRequests) return [];

    const from = dateRange?.from;
    const to = dateRange?.to || from;

    return users.map(user => {
      // Get all approved leaves for this user within the date range
      const userLeavesInRange = leaveRequests.filter(req => 
        req.userId === user.id && 
        req.status === 'approved' &&
        req.date &&
        (!from || !to || isWithinInterval(parseISO(req.date), { start: from, end: to }))
      );

      // Group and summary
      let totalValue = 0;
      const leaves = userLeavesInRange.map(req => {
        const val = calculateLeaveValue(req.leaveType, req.startTime, req.endTime);
        totalValue += val;
        return {
          date: req.date,
          type: req.leaveType,
          value: val,
          reason: req.reason,
          startTime: req.startTime,
          endTime: req.endTime
        };
      }).sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

      return {
        id: user.id,
        username: user.username,
        fullName: user.fullName || user.username,
        leaveCount: totalValue,
        balanceLeave: user.availableLeaves ?? 0,
        leaves: leaves,
      };
    }).filter(data => 
      data.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      data.username.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => b.leaveCount - a.leaveCount);
  }, [users, leaveRequests, dateRange, searchTerm, isLoading]);

  const exportToExcel = () => {
    try {
      if (reportData.length === 0) return;

      const dataToExport = reportData.map(item => ({
        'Full Name': item.fullName,
        'Username': item.username,
        'Total Leave (Days)': item.leaveCount.toFixed(2),
        'Remaining Balance': item.balanceLeave,
        'Detailed Leaves': item.leaves.map(l => {
            const timeStr = l.type === 'short-leave' ? ` [${l.startTime}-${l.endTime}]` : '';
            return `${format(parseISO(l.date), 'yyyy-MM-dd')} (${l.type}${timeStr}: ${l.value.toFixed(2)}d)`;
        }).join(', ')
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leave Report');
      const fileName = `Leave_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      XLSX.writeFile(workbook, fileName, { bookType: 'xlsx', type: 'binary' });
    } catch (error) {
      console.error("Failed to export Excel:", error);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center text-primary">
            <FileText className="mr-3 h-8 w-8" /> Leave Report
          </h1>
          <p className="text-muted-foreground mt-1">
            Dynamic leave calculation based on 8-hour workday.
          </p>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="shadow-sm" disabled={isLoading || reportData.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      <Card className="shadow-lg border-primary/10">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="grid gap-2 w-full md:w-auto">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period</label>
              <DateRangePicker
                dateRange={dateRange}
                onDateChange={setDateRange}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2 w-full md:w-auto flex-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employee Search</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search name or username..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-10 h-10 border-muted-foreground/20 focus:border-primary"
                        disabled={isLoading}
                    />
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 flex-wrap text-xs bg-muted/30 p-3 rounded-lg border border-dashed">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Full-day (1.0)</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Half-day (0.5)</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Short-leave (Dynamic / 8h)</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500"></div> Compensatory (1.0)</div>
      </div>

      <Card className="shadow-xl overflow-hidden border-none ring-1 ring-black/5">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton columnCount={4} rowCount={10} />
          ) : reportData.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
                <Info className="h-10 w-10 mx-auto mb-4 opacity-20" />
                No matching leave records found for this period.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="text-center font-semibold">Total Leave (Days)</TableHead>
                  <TableHead className="text-center font-semibold">Balance</TableHead>
                  <TableHead className="font-semibold">Leave Calendar (Selected Period)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-4">
                      <div className="font-bold text-gray-900 dark:text-gray-100">{row.fullName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{row.username}</div>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      <span className="text-lg font-bold">
                        {row.leaveCount.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-primary/10 text-primary border-none font-bold min-w-[3rem] justify-center">
                        {row.balanceLeave}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[450px]">
                        {row.leaves.length > 0 ? (
                          row.leaves.map((leave, idx) => (
                            <Tooltip key={idx}>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold cursor-help transition-all hover:scale-105", 
                                    getBadgeStyle(leave.type)
                                  )}
                                >
                                  {format(parseISO(leave.date), 'MMM d')}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-gray-900 text-white font-medium p-2 text-xs border-none">
                                <div className="space-y-1">
                                  <div className="flex justify-between gap-4">
                                      <span className="opacity-70 capitalize flex items-center gap-1">
                                          {leave.type.replace('-', ' ')}
                                          {leave.type === 'short-leave' && <Clock className="h-3 w-3" />}
                                      </span>
                                      <span className="font-bold">{leave.value.toFixed(2)} Day</span>
                                  </div>
                                  {leave.type === 'short-leave' && (
                                      <div className="text-[10px] text-blue-300 font-mono">
                                          Time: {leave.startTime} - {leave.endTime}
                                      </div>
                                  )}
                                  <div className="text-xs italic border-t border-white/10 pt-1 mt-1 max-w-[200px] break-words">
                                      {leave.reason || "No reason provided"}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" /> No active leaves
                          </span>
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
    </TooltipProvider>
  );
}
