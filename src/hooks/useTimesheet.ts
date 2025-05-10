
"use client";

import { useContext } from 'react';
import { TimesheetContext } from '@/contexts/TimesheetContext';

// This hook remains a simple context consumer.
// The TimesheetContext itself will be updated to use Firebase.

export const useTimesheet = () => {
  const context = useContext(TimesheetContext);
  if (context === undefined) {
    throw new Error('useTimesheet must be used within a TimesheetProvider');
  }
  return context;
};
