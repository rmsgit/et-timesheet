"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useMockUsers } from '@/hooks/useMockUsers';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FilePlus2, RefreshCw, Package, CheckCircle2, Hourglass, Search, Download, Info, ClipboardList, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
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
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

type EditorWorkSummaryRow = {
  id: string;
  username: string;
  fullName: string;
  newWorks: number;
  revisions: number;
  sampleWorks: number;
  completed: number;
  pending: number;
  total: number;
};

type SortableColumn = 'fullName' | 'newWorks' | 'revisions' | 'sampleWorks' | 'completed' | 'pending';

export default function EditorWorkSummaryPage() {
  const { getAllRecordsByDateRange, timeRecords, isTimesheetLoading } = useTimesheet();
  const { users, isUsersLoading } = useMockUsers();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableColumn; direction: 'ascending' | 'descending' }>({
    key: 'fullName',
    direction: 'ascending',
  });

  const isLoading = isTimesheetLoading || isUsersLoading;

  const requestSort = (key: SortableColumn) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: SortableColumn) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortConfig.direction === 'ascending'
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const SortableHead = ({
    columnKey,
    label,
    className,
  }: {
    columnKey: SortableColumn;
    label: string;
    className?: string;
  }) => (
    <TableHead
      className={cn('cursor-pointer hover:bg-muted/50 select-none font-semibold', className)}
      onClick={() => requestSort(columnKey)}
    >
      <div className={cn('flex items-center', className?.includes('text-center') && 'justify-center')}>
        {label}
        {getSortIcon(columnKey)}
      </div>
    </TableHead>
  );

  const reportData = useMemo((): EditorWorkSummaryRow[] => {
    if (isLoading || !users || !timeRecords || !dateRange?.from) return [];

    const effectiveStartDate = new Date(dateRange.from);
    effectiveStartDate.setHours(0, 0, 0, 0);

    const effectiveEndDate = new Date(dateRange.to || dateRange.from);
    effectiveEndDate.setHours(23, 59, 59, 999);

    const recordsInRange = getAllRecordsByDateRange(effectiveStartDate, effectiveEndDate);
    const editors = users.filter((u) => u.role === 'editor');

    const rows = editors
      .map((user) => {
        const userRecords = recordsInRange.filter((r) => r.userId === user.id);

        const newWorks = userRecords.filter((r) => r.workType === 'New work').length;
        const revisions = userRecords.filter((r) => r.workType === 'Revision').length;
        const sampleWorks = userRecords.filter((r) => r.workType === 'Sample work').length;
        const completed = userRecords.filter((r) => !!r.completedAt).length;
        const pending = userRecords.filter((r) => !r.completedAt).length;

        return {
          id: user.id,
          username: user.username,
          fullName: user.fullName || user.username,
          newWorks,
          revisions,
          sampleWorks,
          completed,
          pending,
          total: userRecords.length,
        };
      })
      .filter(
        (row) =>
          row.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.username.toLowerCase().includes(searchTerm.toLowerCase())
      );

    rows.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      let comparison = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      }

      return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });

    return rows;
  }, [users, timeRecords, dateRange, searchTerm, isLoading, getAllRecordsByDateRange, sortConfig]);

  const totals = useMemo(() => {
    return reportData.reduce(
      (acc, row) => ({
        newWorks: acc.newWorks + row.newWorks,
        revisions: acc.revisions + row.revisions,
        sampleWorks: acc.sampleWorks + row.sampleWorks,
        completed: acc.completed + row.completed,
        pending: acc.pending + row.pending,
      }),
      { newWorks: 0, revisions: 0, sampleWorks: 0, completed: 0, pending: 0 }
    );
  }, [reportData]);

  const exportToExcel = () => {
    try {
      if (reportData.length === 0) return;

      const dataToExport = reportData.map((item) => ({
        Name: item.fullName,
        Username: item.username,
        'New Works': item.newWorks,
        Revisions: item.revisions,
        'Sample Works': item.sampleWorks,
        Completed: item.completed,
        'Pending Works': item.pending,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Editor Work Summary');
      const fileName = `Editor_Work_Summary_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      XLSX.writeFile(workbook, fileName, { bookType: 'xlsx', type: 'binary' });
    } catch (error) {
      console.error('Failed to export Excel:', error);
    }
  };

  const getEditorReportHref = (userId: string) => {
    const params = new URLSearchParams({ userId });
    if (dateRange?.from) {
      params.set('from', format(dateRange.from, 'yyyy-MM-dd'));
      params.set('to', format(dateRange.to || dateRange.from, 'yyyy-MM-dd'));
    }
    return `/dashboard/admin/editor-report?${params.toString()}`;
  };

  return (
    <TooltipProvider delayDuration={0}>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center text-primary">
            <ClipboardList className="mr-3 h-8 w-8" /> Editor Work Summary
          </h1>
          <p className="text-muted-foreground mt-1">
            Work counts by editor for the selected date range.
          </p>
        </div>
        <Button
          onClick={exportToExcel}
          variant="outline"
          className="shadow-sm"
          disabled={isLoading || reportData.length === 0}
        >
          <Download className="mr-2 h-4 w-4" /> Export Excel
        </Button>
      </div>

      <Card className="shadow-lg border-primary/10">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="grid gap-2 w-full md:w-auto">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Period
              </label>
              <DateRangePicker
                dateRange={dateRange}
                onDateChange={setDateRange}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2 w-full md:w-auto flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Editor Search
              </label>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-3 flex items-center gap-3">
          <FilePlus2 className="h-5 w-5 text-blue-600 shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">New Works</div>
            <div className="text-xl font-bold tabular-nums">{totals.newWorks}</div>
          </div>
        </div>
        <div className="rounded-lg border bg-orange-50 dark:bg-orange-950/30 p-3 flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-orange-600 shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">Revisions</div>
            <div className="text-xl font-bold tabular-nums">{totals.revisions}</div>
          </div>
        </div>
        <div className="rounded-lg border bg-purple-50 dark:bg-purple-950/30 p-3 flex items-center gap-3">
          <Package className="h-5 w-5 text-purple-600 shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">Sample Works</div>
            <div className="text-xl font-bold tabular-nums">{totals.sampleWorks}</div>
          </div>
        </div>
        <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 p-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-xl font-bold tabular-nums">{totals.completed}</div>
          </div>
        </div>
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 flex items-center gap-3">
          <Hourglass className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="text-xl font-bold tabular-nums">{totals.pending}</div>
          </div>
        </div>
      </div>

      <Card className="shadow-xl overflow-hidden border-none ring-1 ring-black/5">
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton columnCount={7} rowCount={10} />
          ) : reportData.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <Info className="h-10 w-10 mx-auto mb-4 opacity-20" />
              No editors found for this period.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <SortableHead columnKey="fullName" label="Name" />
                  <SortableHead columnKey="newWorks" label="New Works" className="text-center" />
                  <SortableHead columnKey="revisions" label="Revisions" className="text-center" />
                  <SortableHead columnKey="sampleWorks" label="Sample Works" className="text-center" />
                  <SortableHead columnKey="completed" label="Completed" className="text-center" />
                  <SortableHead columnKey="pending" label="Pending Works" className="text-center" />
                  <TableHead className="text-center font-semibold w-[80px]">Report</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-4">
                      <div className="font-bold text-gray-900 dark:text-gray-100">{row.fullName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{row.username}</div>
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums">{row.newWorks}</TableCell>
                    <TableCell className="text-center font-mono tabular-nums">{row.revisions}</TableCell>
                    <TableCell className="text-center font-mono tabular-nums">{row.sampleWorks}</TableCell>
                    <TableCell className="text-center font-mono tabular-nums text-green-700 dark:text-green-400">
                      {row.completed}
                    </TableCell>
                    <TableCell className="text-center font-mono tabular-nums text-amber-700 dark:text-amber-400">
                      {row.pending}
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <Link href={getEditorReportHref(row.id)} aria-label={`Open report for ${row.fullName}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Open Editor Report
                        </TooltipContent>
                      </Tooltip>
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
