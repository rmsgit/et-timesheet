
"use client";

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { TimesheetProvider } from '@/contexts/TimesheetContext';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoaderProvider } from '@/contexts/LoaderContext';
import { GlobalLoader } from '@/components/common/GlobalLoader';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <TimesheetProvider>
        <LoaderProvider>
          <TooltipProvider>
            {children}
            <Toaster />
            <GlobalLoader />
          </TooltipProvider>
        </LoaderProvider>
      </TimesheetProvider>
    </AuthProvider>
  );
};
