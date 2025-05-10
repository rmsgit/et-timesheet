
"use client";

import { useContext } from 'react';
import { TimesheetContext } from '@/contexts/TimesheetContext';

export const useTimesheet = () => {
  const context = useContext(TimesheetContext);
  if (context === undefined) {
    throw new Error('useTimesheet must be used within a TimesheetProvider');
  }
  return context;
};
