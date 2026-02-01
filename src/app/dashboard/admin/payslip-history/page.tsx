
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useMockUsers } from '@/hooks/useMockUsers';
import { useGlobalSettings } from '@/hooks/useGlobalSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2, TrendingUp, User, Banknote } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('si-LK', { style: 'currency', currency: 'LKR' }).format(amount);
};

interface ForecastItem {
  userId: string;
  username: string;
  fullName: string;
  projectedBasic: number;
  projectedAllowances: number;
  projectedGross: number;
  projectedEpfEmployee: number;
  projectedEpfCompany: number;
  projectedEtfCompany: number;
  projectedTotalCost: number;
}

export default function SalaryForecastPage() {
  const { isSuperAdmin, isAuthLoading } = useAuth();
  const router = useRouter();
  const { users, isUsersLoading } = useMockUsers();
  const { settings, isLoading: isSettingsLoading } = useGlobalSettings();

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));

  const isLoading = isAuthLoading || isUsersLoading || isSettingsLoading;
  
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isSuperAdmin) {
        router.replace('/dashboard');
    }
  }, [isSuperAdmin, isAuthLoading, router]);

  const forecastData = useMemo((): ForecastItem[] => {
    if (isLoading || !users.length || !settings) return [];
    
    const epfRate = settings.epfRate || 0;
    const companyEpfRate = 12; // Standard
    const companyEtfRate = 3;  // Standard

    return users
      .filter(user => user.baseSalary && user.baseSalary > 0)
      .map(user => {
        const projectedBasic = user.baseSalary || 0;
        const projectedAllowances = (user.conveyanceAllowance || 0) + (user.travelingAllowance || 0);
        const projectedGross = projectedBasic + projectedAllowances;
        
        const projectedEpfEmployee = (projectedBasic * epfRate) / 100;
        const projectedEpfCompany = (projectedBasic * companyEpfRate) / 100;
        const projectedEtfCompany = (projectedBasic * companyEtfRate) / 100;

        // Total cost to company is their gross payout plus their own contributions
        const projectedTotalCost = projectedGross + projectedEpfCompany + projectedEtfCompany;

        return {
          userId: user.id,
          username: user.username,
          fullName: user.fullName || user.username,
          projectedBasic,
          projectedAllowances,
          projectedGross,
          projectedEpfEmployee,
          projectedEpfCompany,
          projectedEtfCompany,
          projectedTotalCost,
        };
      })
      .sort((a,b) => a.fullName.localeCompare(b.fullName));
  }, [isLoading, users, settings]);

  const forecastTotals = useMemo(() => {
    return forecastData.reduce((acc, item) => {
        acc.totalBasic += item.projectedBasic;
        acc.totalAllowances += item.projectedAllowances;
        acc.totalGross += item.projectedGross;
        acc.totalEpfEmployee += item.projectedEpfEmployee;
        acc.totalEpfCompany += item.projectedEpfCompany;
        acc.totalEtfCompany += item.projectedEtfCompany;
        acc.grandTotalCost += item.projectedTotalCost;
        return acc;
    }, {
        totalBasic: 0,
        totalAllowances: 0,
        totalGross: 0,
        totalEpfEmployee: 0,
        totalEpfCompany: 0,
        totalEtfCompany: 0,
        grandTotalCost: 0,
    });
  }, [forecastData]);

  const availableYears = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = currentYear - 2; i <= currentYear + 5; i++) {
          years.push(i.toString());
      }
      return years.sort((a,b) => parseInt(b) - parseInt(a));
  }, []);

  const availableMonths = useMemo(() => {
      return Array.from({ length: 12 }, (_, i) => ({
          value: (i + 1).toString().padStart(2, '0'),
          label: format(new Date(2000, i), 'MMMM'),
      }));
  }, []);

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
          <TrendingUp className="mr-3 h-8 w-8 text-primary" /> Salary Forecast
      </h1>
      <Card>
          <CardHeader>
              <CardTitle>Forecast Period</CardTitle>
              <CardDescription>Select a month and year to project the salary costs. The forecast is based on current user salary data and does not include variable earnings like OT or deductions like no-pay.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                  <Label htmlFor="year-select">Year</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoading}>
                      <SelectTrigger id="year-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="month-select">Month</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoading}>
                      <SelectTrigger id="month-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{availableMonths.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
              </div>
          </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                  <CardTitle>Forecast for {format(new Date(parseInt(selectedYear), parseInt(selectedMonth) -1), 'MMMM yyyy')}</CardTitle>
                  <CardDescription>Projected salary costs for all active employees with a base salary.</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Forecasted Cost</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(forecastTotals.grandTotalCost)}</p>
              </div>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 p-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : forecastData.length === 0 ? (
            <div className="text-center text-muted-foreground py-16 p-6">No users with salary data found to generate a forecast.</div>
          ) : (
            <ScrollArea className="h-[calc(100vh-28rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Gross Salary</TableHead>
                    <TableHead className="text-right">EPF (8%)</TableHead>
                    <TableHead className="text-right">EPF (12%)</TableHead>
                    <TableHead className="text-right">ETF (3%)</TableHead>
                    <TableHead className="text-right font-semibold">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecastData.map(item => (
                    <TableRow key={item.userId}>
                      <TableCell className="font-medium">{item.fullName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.projectedBasic)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.projectedAllowances)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.projectedGross)}</TableCell>
                      <TableCell className="text-right text-red-600">({formatCurrency(item.projectedEpfEmployee)})</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.projectedEpfCompany)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.projectedEtfCompany)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.projectedTotalCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50">
                    <TableHead>Totals</TableHead>
                    <TableHead className="text-right">{formatCurrency(forecastTotals.totalBasic)}</TableHead>
                    <TableHead className="text-right">{formatCurrency(forecastTotals.totalAllowances)}</TableHead>
                    <TableHead className="text-right">{formatCurrency(forecastTotals.totalGross)}</TableHead>
                    <TableHead className="text-right text-red-600">({formatCurrency(forecastTotals.totalEpfEmployee)})</TableHead>
                    <TableHead className="text-right">{formatCurrency(forecastTotals.totalEpfCompany)}</TableHead>
                    <TableHead className="text-right">{formatCurrency(forecastTotals.totalEtfCompany)}</TableHead>
                    <TableHead className="text-right font-bold text-lg">{formatCurrency(forecastTotals.grandTotalCost)}</TableHead>
                  </TableRow>
                </TableFooter>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
