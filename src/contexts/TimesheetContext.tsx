"use client";

import type { TimeRecord } from '@/lib/types';
import React, { createContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, remove, update as firebaseUpdate, push } from 'firebase/database';
import { FIREBASE_TIMESHEET_PATH } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';

interface TimesheetContextType {
  timeRecords: TimeRecord[];
  addTimeRecord: (record: Omit<TimeRecord, 'id' | 'userId' | 'completedAt'>) => Promise<void>;
  updateTimeRecord: (record: TimeRecord) => Promise<void>;
  deleteTimeRecord: (recordId: string) => Promise<void>;
  markAsComplete: (recordId: string) => Promise<void>;
  getRecordsForUser: (userId: string) => TimeRecord[];
  getRecordsByDateRange: (userId: string, startDate: Date, endDate: Date) => TimeRecord[];
  getAllRecordsByDateRange: (startDate: Date, endDate: Date) => TimeRecord[];
  isTimesheetLoading: boolean; 
}

export const TimesheetContext = createContext<TimesheetContextType | undefined>(undefined);

const TIMESHEET_LOADER_ID = "firebase_timesheet_loader";

interface TimesheetProviderProps {
  children: ReactNode;
}

export const TimesheetProvider: React.FC<TimesheetProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [timeRecords, setTimeRecordsState] = useState<TimeRecord[]>([]);
  const [isTimesheetLoading, setIsTimesheetLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    showLoader(TIMESHEET_LOADER_ID, "Loading timesheet data...");
    setIsTimesheetLoading(true); // Explicitly set true at the start of fetching attempt

    if (!database) {
      console.warn("TimesheetContext: Firebase Database not initialized. Timesheet data will not be loaded.");
      setIsTimesheetLoading(false);
      hideLoader(TIMESHEET_LOADER_ID);
      setTimeRecordsState([]);
      return;
    }

    let unsubscribe = () => {}; // Initialize unsubscribe to a no-op

    try {
      const dbRef = ref(database, FIREBASE_TIMESHEET_PATH);
      unsubscribe = onValue(dbRef, (snapshot) => {
        if (snapshot.exists()) {
          const recordsObject = snapshot.val();
          // Ensure recordsObject is not null before calling Object.values
          const recordsArray = recordsObject ? Object.values(recordsObject) as TimeRecord[] : [];
          setTimeRecordsState(recordsArray);
        } else {
          setTimeRecordsState([]);
        }
        setIsTimesheetLoading(false);
        hideLoader(TIMESHEET_LOADER_ID);
      }, (error) => {
        console.error("Firebase read error (timeRecords):", error);
        setIsTimesheetLoading(false);
        hideLoader(TIMESHEET_LOADER_ID);
        setTimeRecordsState([]);
      });
    } catch (error) {
      console.error("Error setting up Firebase listener for timesheet:", error);
      setIsTimesheetLoading(false);
      hideLoader(TIMESHEET_LOADER_ID);
      setTimeRecordsState([]);
    }
    
    return () => {
      unsubscribe(); // Call the potentially real unsubscribe function
      hideLoader(TIMESHEET_LOADER_ID); // Ensure loader is hidden on cleanup
    };
  }, [showLoader, hideLoader, database]); // Added database to dependency array
  
  const addTimeRecord = useCallback(async (recordData: Omit<TimeRecord, 'id' | 'userId' | 'completedAt'>) => {
    if (!user || !database) {
        console.warn("AddTimeRecord: User not logged in or Firebase DB not initialized.");
        return;
    }
    const newRecordRef = push(ref(database, FIREBASE_TIMESHEET_PATH));
    const newRecordId = newRecordRef.key;
    if (!newRecordId) {
      console.error("Failed to generate new record ID");
      return;
    }

    const newRecord: TimeRecord = {
      ...recordData,
      id: newRecordId,
      userId: user.id,
    };
    
    try {
      await set(ref(database, `${FIREBASE_TIMESHEET_PATH}/${newRecordId}`), newRecord);
    } catch (error) {
      console.error("Firebase add time record error:", error);
    }
  }, [user, database]);

  const updateTimeRecord = useCallback(async (updatedRecord: TimeRecord) => {
    if (!database) {
        console.warn("UpdateTimeRecord: Firebase DB not initialized.");
        return;
    }
    try {
      await set(ref(database, `${FIREBASE_TIMESHEET_PATH}/${updatedRecord.id}`), updatedRecord);
    } catch (error) {
      console.error("Firebase update time record error:", error);
    }
  }, [database]);

  const deleteTimeRecord = useCallback(async (recordId: string) => {
    if (!database) {
        console.warn("DeleteTimeRecord: Firebase DB not initialized.");
        return;
    }
    try {
      await remove(ref(database, `${FIREBASE_TIMESHEET_PATH}/${recordId}`));
    } catch (error) {
      console.error("Firebase delete time record error:", error);
    }
  }, [database]);

  const markAsComplete = useCallback(async (recordId: string) => {
    if (!database) {
        console.warn("MarkAsComplete: Firebase DB not initialized.");
        return;
    }
    const recordToComplete = timeRecords.find(r => r.id === recordId);
    if (!recordToComplete) return;

    const completedAt = new Date().toISOString();
    try {
      await firebaseUpdate(ref(database, `${FIREBASE_TIMESHEET_PATH}/${recordId}`), { completedAt });

      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
            new Notification("Task Completed!", {
            body: `Project "${recordToComplete.projectName}" marked as complete.`,
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("Task Completed!", {
                        body: `Project "${recordToComplete.projectName}" marked as complete.`,
                    });
                }
            });
        }
    }
    } catch (error) {
      console.error("Firebase mark as complete error:", error);
    }
  }, [timeRecords, database]); 

  const getRecordsForUser = useCallback((userId: string) => {
    return timeRecords.filter(r => r.userId === userId);
  }, [timeRecords]);
  
  const getRecordsByDateRange = useCallback((userId: string, startDate: Date, endDate: Date) => {
    return timeRecords.filter(r => {
      const recordDate = new Date(r.date);
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
