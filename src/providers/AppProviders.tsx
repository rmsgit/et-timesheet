
"use client";

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { TimesheetProvider } from '@/contexts/TimesheetContext';
import { PerformanceReviewProvider } from '@/contexts/PerformanceReviewContext';
import { LeaveProvider } from '@/contexts/LeaveContext';
import { AttendanceProvider } from '@/contexts/AttendanceContext';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoaderProvider } from '@/contexts/LoaderContext';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { HolidayProvider } from '@/contexts/HolidayContext';

const AdminNotificationInitializer: React.FC = () => {
  useAdminNotifications(); // Initialize and run the hook globally for admins
  return null; // This component doesn't render anything
};

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <LoaderProvider>
      <AuthProvider>
        <TimesheetProvider>
          <PerformanceReviewProvider>
            <LeaveProvider>
              <AttendanceProvider>
                <HolidayProvider>
                  <TooltipProvider>
                    <AdminNotificationInitializer />
                    {children}
                    <Toaster />
                    <GlobalLoader />
                  </TooltipProvider>
                </HolidayProvider>
              </AttendanceProvider>
            </LeaveProvider>
          </PerformanceReviewProvider>
        </TimesheetProvider>
      </AuthProvider>
    </LoaderProvider>
  );
};
