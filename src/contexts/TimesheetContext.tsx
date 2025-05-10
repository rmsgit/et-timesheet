"use client";

import type { TimeRecord, User } from '@/lib/types';
import React, { createContext, ReactNode, useCallback, useState, useEffect } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { LOCAL_STORAGE_TIMESHEET_KEY } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';

interface TimesheetContextType {
  timeRecords: TimeRecord[];
  addTimeRecord: (record: Omit<TimeRecord, 'id' | 'userId' | 'completedAt'>) => void;
  updateTimeRecord: (record: TimeRecord) => void;
  deleteTimeRecord: (recordId: string) => void;
  markAsComplete: (recordId: string) => void;
  getRecordsForUser: (userId: string) => TimeRecord[];
  getRecordsByDateRange: (userId: string, startDate: Date, endDate: Date) => TimeRecord[];
  getAllRecordsByDateRange: (startDate: Date, endDate: Date) => TimeRecord[];
  isTimesheetLoading: boolean; // New loading state
}

export const TimesheetContext = createContext<TimesheetContextType | undefined>(undefined);

interface TimesheetProviderProps {
  children: ReactNode;
}

const INITIAL_TIMESHEET_RECORDS: TimeRecord[] = [];

export const TimesheetProvider: React.FC<TimesheetProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [timeRecords, setTimeRecords, isTimesheetLoading] = useLocalStorage<TimeRecord[]>(LOCAL_STORAGE_TIMESHEET_KEY, INITIAL_TIMESHEET_RECORDS);

  const addTimeRecord = useCallback((recordData: Omit<TimeRecord, 'id' | 'userId' | 'completedAt'>) => {
    if (!user) return;
    const newRecord: TimeRecord = {
      ...recordData,
      id: crypto.randomUUID(),
      userId: user.id,
      // completedAt is not set on creation
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
    let completedRecordName = "Unknown Task";
    setTimeRecords(prev => prev.map(r => {
      if (r.id === recordId) {
        completedRecordName = r.projectName;
        return { ...r, completedAt: new Date().toISOString() };
      }
      return r;
    }));
    
    if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
            new Notification("Task Completed!", {
            body: `Project "${completedRecordName}" marked as complete.`,
            // icon: '/logo.svg' // Requires logo.svg in public folder
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("Task Completed!", {
                        body: `Project "${completedRecordName}" marked as complete.`,
                        // icon: '/logo.svg'
                    });
                }
            });
        }
    }
  }, [setTimeRecords]);

  const getRecordsForUser = useCallback((userId: string) => {
    return timeRecords.filter(r => r.userId === userId);
  }, [timeRecords]);
  
  const getRecordsByDateRange = useCallback((userId: string, startDate: Date, endDate: Date) => {
    return timeRecords.filter(r => {
      const recordDate = new Date(r.date);
      // Adjust end date to include the whole day
      const inclusiveEndDate = new Date(endDate);
      inclusiveEndDate.setHours(23, 59, 59, 999);
      return r.userId === userId && recordDate >= startDate && recordDate <= inclusiveEndDate;
    });
  }, [timeRecords]);

  const getAllRecordsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return timeRecords.filter(r => {
      const recordDate = new Date(r.date);
      const inclusiveEndDate = new Date(endDate);
      inclusiveEndDate.setHours(23, 59, 59, 999);
      return recordDate >= startDate && recordDate <= inclusiveEndDate;
    });
  }, [timeRecords]);


  useEffect(() => {
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
        getAllRecordsByDateRange,
        isTimesheetLoading
    }}>
      {children}
    </TimesheetContext.Provider>
  );
};

