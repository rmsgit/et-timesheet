
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { SalaryConfigurationTable } from '@/components/admin/SalaryConfigurationTable';
import { GlobalSalarySettings } from '@/components/admin/GlobalSalarySettings';
import { Wallet } from 'lucide-react';

export default function SalaryConfigurationPage() {
  const { isSuperAdmin, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isSuperAdmin) {
      router.replace('/dashboard');
    }
  }, [isSuperAdmin, isAuthLoading, router]);

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
      <h1 className="flex items-center text-2xl font-bold tracking-tight sm:text-3xl">
        <Wallet className="mr-2 h-6 w-6 shrink-0 text-primary sm:mr-3 sm:h-8 sm:w-8" /> Salary & Global Configuration
      </h1>
      <p className="text-muted-foreground">
        Manage global payroll settings like OT and EPF rates, and individual user salary details.
      </p>
      
      <GlobalSalarySettings />

      <SalaryConfigurationTable />
    </div>
  );
}
