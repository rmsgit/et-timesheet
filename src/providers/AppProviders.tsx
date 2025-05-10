
"use client";

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { TimesheetProvider } from '@/contexts/TimesheetContext';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <TimesheetProvider>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </TimesheetProvider>
    </AuthProvider>
  );
};
