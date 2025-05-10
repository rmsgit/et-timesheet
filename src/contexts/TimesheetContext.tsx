
"use client";

import type { TimeRecord, User } from '@/lib/types';
import React, { createContext, ReactNode, useCallback, useState, useEffect } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { LOCAL_STORAGE_TIMESHEET_KEY } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

interface TimesheetContextType {
  timeRecords: TimeRecord[];
  addTimeRecord: (record: Omit<TimeRecord, 'id' | 'userId'>) => void;
  updateTimeRecord: (record: TimeRecord) => void;
  deleteTimeRecord: (recordId: string) => void;
  markAsComplete: (recordId: string) => void;
  getRecordsForUser: (userId: string) => TimeRecord[];
  getRecordsByDateRange: (userId: string, startDate: Date, endDate: Date) => TimeRecord[];
  getAllRecordsByDateRange: (startDate: Date, endDate: Date) => TimeRecord[];
}

export const TimesheetContext = createContext<TimesheetContextType | undefined>(undefined);

interface TimesheetProviderProps {
  children: ReactNode;
}

export const TimesheetProvider: React.FC<TimesheetProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [timeRecords, setTimeRecords] = useLocalStorage<TimeRecord[]>(LOCAL_STORAGE_TIMESHEET_KEY, []);

  const addTimeRecord = useCallback((recordData: Omit<TimeRecord, 'id' | 'userId'>) => {
    if (!user) return;
    const newRecord: TimeRecord = {
      ...recordData,
      id: crypto.randomUUID(),
      userId: user.id,
    };
    setTimeRecords(prev => [...prev, newRecord]);
  }, [setTimeRecords, user]);

  const updateTimeRecord = useCallback((updatedRecord: TimeRecord) => {
    setTimeRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
  }, [setTimeRecords]);

  const deleteTimeRecord = useCallback((recordId: string) => {
    setTimeRecords(prev => prev.filter(r => r.id !== recordId));
  }, [setTimeRecords]);

  const markAsComplete = useCallback((recordId: string) => {
    setTimeRecords(prev => prev.map(r => r.id === recordId ? { ...r, completedAt: new Date().toISOString() } : r));
    // Notification logic will be handled in a separate hook/component that consumes this context or action.
    if (Notification.permission === "granted") {
      const record = timeRecords.find(r => r.id === recordId);
      if (record) {
        new Notification("Task Completed!", {
          body: `Project "${record.projectName}" marked as complete.`,
          icon: '/logo.svg' // Placeholder icon
        });
      }
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          const record = timeRecords.find(r => r.id === recordId);
          if (record) {
             new Notification("Task Completed!", {
                body: `Project "${record.projectName}" marked as complete.`,
                icon: '/logo.svg' // Placeholder icon
            });
          }
        }
      });
    }
  }, [setTimeRecords, timeRecords]);

  const getRecordsForUser = useCallback((userId: string) => {
    return timeRecords.filter(r => r.userId === userId);
  }, [timeRecords]);
  
  const getRecordsByDateRange = useCallback((userId: string, startDate: Date, endDate: Date) => {
    return timeRecords.filter(r => {
      const recordDate = new Date(r.date);
      return r.userId === userId && recordDate >= startDate && recordDate <= endDate;
    });
  }, [timeRecords]);

  const getAllRecordsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return timeRecords.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }, [timeRecords]);


  useEffect(() => {
    // Request notification permission when component mounts if not already granted or denied
    if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }
  }, []);


  return (
    <TimesheetContext.Provider value={{ 
        timeRecords, 
        addTimeRecord, 
        updateTimeRecord, 
        deleteTimeRecord, 
        markAsComplete, 
        getRecordsForUser,
        getRecordsByDateRange,
        getAllRecordsByDateRange
    }}>
      {children}
    </TimesheetContext.Provider>
  );
};
