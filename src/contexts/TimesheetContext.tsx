
"use client";

import type { TimeRecord } from '@/lib/types';
import React, { createContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, remove, update as firebaseUpdate, push } from 'firebase/database';
import { FIREBASE_TIMESHEET_PATH, FIREBASE_ADMIN_NOTIFICATIONS_PATH } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';
import { differenceInSeconds, parseISO } from 'date-fns';

interface TimesheetContextType {
  timeRecords: TimeRecord[];
  addTimeRecord: (record: Omit<TimeRecord, 'id' | 'userId' | 'completedAt' | 'durationHours' | 'entryCreatedAt' | 'isPaused' | 'pausedAt' | 'accumulatedPausedDurationSeconds'>) => Promise<void>;
  updateTimeRecord: (record: TimeRecord) => Promise<void>;
  deleteTimeRecord: (recordId: string) => Promise<void>;
  setCompletionDetails: (recordId: string, completedInHours: number, completedInMinutes: number, completedInSeconds: number) => Promise<void>;
  pauseTimer: (recordId: string) => Promise<void>;
  resumeTimer: (recordId: string) => Promise<void>;
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
  const { toast } = useToast();

  useEffect(() => {
    console.log("DEBUG_TIMESHEET: useEffect triggered. Initial isTimesheetLoading:", isTimesheetLoading);
    showLoader(TIMESHEET_LOADER_ID, "Loading timesheet data...");
    setIsTimesheetLoading(true);

    if (!database) {
      console.warn("DEBUG_TIMESHEET: Firebase Database object is NOT initialized. Timesheet data will not be loaded from Firebase, and operations will not persist.");
      setIsTimesheetLoading(false);
      hideLoader(TIMESHEET_LOADER_ID);
      setTimeRecordsState([]);
      toast({
        title: "Timesheet Data Unavailable",
        description: "Cannot connect to Firebase Realtime Database. Please check your project's DATABASE_URL configuration in .env and restart the server.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    console.log("DEBUG_TIMESHEET: Firebase Database object IS available. Setting up listener for path:", FIREBASE_TIMESHEET_PATH);
    let unsubscribe = () => {};

    try {
      const dbRef = ref(database, FIREBASE_TIMESHEET_PATH);
      unsubscribe = onValue(dbRef, (snapshot) => {
        console.log("DEBUG_TIMESHEET: Firebase onValue data callback invoked.");
        try {
          if (snapshot.exists()) {
            const recordsObject = snapshot.val();
            console.log("DEBUG_TIMESHEET: Snapshot exists. Value:", recordsObject);
            if (recordsObject && typeof recordsObject === 'object' && !Array.isArray(recordsObject)) {
              const recordsArray = Object.values(recordsObject) as TimeRecord[];
              setTimeRecordsState(recordsArray);
            } else {
              if (recordsObject && !(typeof recordsObject === 'object' && !Array.isArray(recordsObject))) {
                 console.warn("DEBUG_TIMESHEET: Timesheet data from Firebase is not a non-array object:", recordsObject);
              }
              setTimeRecordsState([]);
            }
          } else {
            console.log("DEBUG_TIMESHEET: Snapshot does not exist. Setting timeRecords to empty array.");
            setTimeRecordsState([]);
          }
        } catch (processingError) {
          console.error("DEBUG_TIMESHEET: Error processing timesheet snapshot value:", processingError);
          setTimeRecordsState([]);
        } finally {
          console.log("DEBUG_TIMESHEET: Data processing finished. Setting isTimesheetLoading to false and hiding loader.");
          setIsTimesheetLoading(false);
          hideLoader(TIMESHEET_LOADER_ID);
        }
      }, (error) => {
        console.error("DEBUG_TIMESHEET: Firebase read error (timeRecords):", error);
        setIsTimesheetLoading(false);
        hideLoader(TIMESHEET_LOADER_ID);
        setTimeRecordsState([]);
        toast({ title: "Timesheet Load Error", description: "Could not load timesheet data from Firebase. Check console for details.", variant: "destructive"});
      });
    } catch (error) {
      console.error("DEBUG_TIMESHEET: Error setting up Firebase listener for timesheet:", error);
      setIsTimesheetLoading(false);
      hideLoader(TIMESHEET_LOADER_ID);
      setTimeRecordsState([]);
       toast({ title: "Listener Setup Error", description: "Failed to set up Firebase listener for timesheets. Check console for details.", variant: "destructive"});
    }

    return () => {
      console.log("DEBUG_TIMESHEET: useEffect cleanup. Unsubscribing from Firebase listener and hiding loader.");
      unsubscribe();
      hideLoader(TIMESHEET_LOADER_ID);
    };
  }, [showLoader, hideLoader, toast]); 

  const addTimeRecord = useCallback(async (recordData: Omit<TimeRecord, 'id' | 'userId' | 'completedAt' | 'durationHours' | 'entryCreatedAt' | 'isPaused' | 'pausedAt' | 'accumulatedPausedDurationSeconds'>) => {
    if (!user) {
        toast({ title: "Authentication Error", description: "User not logged in. Cannot add record.", variant: "destructive" });
        return;
    }
    if (!database) {
        toast({
          title: "Firebase Not Ready",
          description: "Cannot save: Firebase Database is not configured or connected. Please check setup.",
          variant: "destructive"
        });
        return;
    }
    const newRecordRef = push(ref(database, FIREBASE_TIMESHEET_PATH));
    const newRecordId = newRecordRef.key;
    if (!newRecordId) {
      toast({ title: "Error", description: "Could not create record ID.", variant: "destructive" });
      return;
    }

    const newRecordObject: TimeRecord = {
      ...recordData, 
      id: newRecordId,
      userId: user.id,
      durationHours: 0, 
      entryCreatedAt: new Date().toISOString(),
      isPaused: false,
      accumulatedPausedDurationSeconds: 0,
      // completedAt is undefined here for new records
      // pausedAt is undefined here for new records
    };
    
    const recordToSave = Object.entries(newRecordObject).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        // @ts-ignore
        acc[key] = value;
      }
      return acc;
    }, {} as Partial<TimeRecord>);


    try {
      await set(ref(database, `${FIREBASE_TIMESHEET_PATH}/${newRecordId}`), recordToSave);
      toast({ title: "Success", description: "Time record added." });
    } catch (error) {
      console.error("Firebase add time record error:", error);
      toast({ title: "Firebase Error", description: "Failed to add record to Firebase. Check console for details.", variant: "destructive" });
    }
  }, [user, toast]);

  const updateTimeRecord = useCallback(async (updatedRecord: TimeRecord) => {
    if (!database) {
        toast({ title: "Configuration Error", description: "Firebase is not connected. Record not updated.", variant: "destructive" });
        return;
    }
    
    const recordToSave = { ...updatedRecord };
    if (recordToSave.entryCreatedAt === undefined && timeRecords.find(r => r.id === updatedRecord.id)?.entryCreatedAt) {
       recordToSave.entryCreatedAt = timeRecords.find(r => r.id === updatedRecord.id)?.entryCreatedAt;
    }
     if (recordToSave.isPaused === undefined) recordToSave.isPaused = false;
     if (recordToSave.accumulatedPausedDurationSeconds === undefined) recordToSave.accumulatedPausedDurationSeconds = 0;


    const finalRecordToSave = Object.entries(recordToSave).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        // @ts-ignore
        acc[key] = value;
      }
      return acc;
    }, {} as Partial<TimeRecord>);

    try {
      await set(ref(database, `${FIREBASE_TIMESHEET_PATH}/${updatedRecord.id}`), finalRecordToSave);
      toast({ title: "Success", description: "Time record updated." });
    } catch (error) {
      console.error("Firebase update time record error:", error);
      toast({ title: "Firebase Error", description: "Failed to update record in Firebase. Check console for details.", variant: "destructive" });
    }
  }, [toast, timeRecords]);

  const deleteTimeRecord = useCallback(async (recordId: string) => {
    if (!database) {
        toast({ title: "Configuration Error", description: "Firebase is not connected. Record not deleted.", variant: "destructive" });
        return;
    }
    try {
      await remove(ref(database, `${FIREBASE_TIMESHEET_PATH}/${recordId}`));
      toast({ title: "Success", description: "Time record deleted." });
    } catch (error) {
      console.error("Firebase delete time record error:", error);
      toast({ title: "Firebase Error", description: "Failed to delete record from Firebase. Check console for details.", variant: "destructive" });
    }
  }, [toast]);

  const setCompletionDetails = useCallback(async (recordId: string, completedInHoursValue: number, completedInMinutesValue: number, completedInSecondsValue: number) => {
    if (!database) {
        toast({ title: "Configuration Error", description: "Firebase is not connected. Record status not updated.", variant: "destructive" });
        return;
    }
    if (!user) {
      toast({ title: "Authentication Error", description: "User not logged in. Cannot mark as complete.", variant: "destructive" });
      return;
    }
    const recordToComplete = timeRecords.find(r => r.id === recordId);
    if (!recordToComplete) {
      toast({ title: "Error", description: "Record not found.", variant: "destructive" });
      return;
    }

    let finalDurationHours = completedInHoursValue + (completedInMinutesValue / 60) + (completedInSecondsValue / 3600);
    const completedAtTimestamp = new Date().toISOString();
    
    const updates: Partial<TimeRecord> = {
      durationHours: finalDurationHours,
      completedAt: completedAtTimestamp,
      isPaused: false, // Ensure task is not paused upon completion
      // pausedAt: null, // Explicitly clear pausedAt if backend doesn't handle undefined well
    };
    // Firebase update with null effectively deletes the key
    // @ts-ignore
    updates.pausedAt = null; 


    try {
      await firebaseUpdate(ref(database, `${FIREBASE_TIMESHEET_PATH}/${recordId}`), updates);
      toast({ title: "Success", description: `Project "${recordToComplete.projectName}" marked as complete with duration.`});

      const adminNotificationRef = push(ref(database, FIREBASE_ADMIN_NOTIFICATIONS_PATH));
      await set(adminNotificationRef, {
        recordId: recordToComplete.id,
        projectName: recordToComplete.projectName,
        editorUsername: user.username || 'Unknown Editor',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error("Firebase set completion details error or admin notification error:", error);
      toast({ title: "Firebase Error", description: "Failed to set completion details or send admin notification. Check console.", variant: "destructive" });
    }
  }, [timeRecords, toast, user]);

  const pauseTimer = useCallback(async (recordId: string) => {
    if (!database) {
        toast({ title: "Configuration Error", description: "Firebase is not connected.", variant: "destructive" });
        return;
    }
    const record = timeRecords.find(r => r.id === recordId);
    if (!record) {
      toast({ title: "Error", description: "Record not found.", variant: "destructive" });
      return;
    }

    const updates: Partial<TimeRecord> = {
      isPaused: true,
      pausedAt: new Date().toISOString(),
    };

    try {
      await firebaseUpdate(ref(database, `${FIREBASE_TIMESHEET_PATH}/${recordId}`), updates);
      toast({ title: "Timer Paused", description: `Timer for "${record.projectName}" paused.` });
    } catch (error) {
      console.error("Firebase pause timer error:", error);
      toast({ title: "Firebase Error", description: "Failed to pause timer. Check console.", variant: "destructive" });
    }
  }, [timeRecords, toast]);

  const resumeTimer = useCallback(async (recordId: string) => {
    if (!database) {
        toast({ title: "Configuration Error", description: "Firebase is not connected.", variant: "destructive" });
        return;
    }
    const record = timeRecords.find(r => r.id === recordId);
    if (!record || !record.pausedAt) {
      toast({ title: "Error", description: "Record not found or not paused.", variant: "destructive" });
      return;
    }

    const durationSincePause = differenceInSeconds(new Date(), parseISO(record.pausedAt));
    const newAccumulatedPausedDuration = (record.accumulatedPausedDurationSeconds || 0) + durationSincePause;

    const updates: Partial<TimeRecord> = {
      isPaused: false,
      accumulatedPausedDurationSeconds: newAccumulatedPausedDuration,
      // pausedAt: null, // Explicitly clear pausedAt
    };
    // @ts-ignore
    updates.pausedAt = null;

    try {
      await firebaseUpdate(ref(database, `${FIREBASE_TIMESHEET_PATH}/${recordId}`), updates);
      toast({ title: "Timer Resumed", description: `Timer for "${record.projectName}" resumed.` });
    } catch (error) {
      console.error("Firebase resume timer error:", error);
      toast({ title: "Firebase Error", description: "Failed to resume timer. Check console.", variant: "destructive" });
    }
  }, [timeRecords, toast]);


  const getRecordsForUser = useCallback((userId: string) => {
    return timeRecords.filter(r => r.userId === userId);
  }, [timeRecords]);

  const getRecordsByDateRange = useCallback((userId: string, startDate: Date, endDate: Date) => {
    const inclusiveEndDate = new Date(endDate);
    inclusiveEndDate.setHours(23, 59, 59, 999);
    return timeRecords.filter(r => {
      const recordDate = new Date(r.date);
      return r.userId === userId && recordDate >= startDate && recordDate <= inclusiveEndDate;
    });
  }, [timeRecords]);

  const getAllRecordsByDateRange = useCallback((startDate: Date, endDate: Date) => {
     const inclusiveEndDate = new Date(endDate);
    inclusiveEndDate.setHours(23, 59, 59, 999);
    return timeRecords.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate >= startDate && recordDate <= inclusiveEndDate;
    });
  }, [timeRecords]);


  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            // Notification.requestPermission(); 
        }
    }
  }, []);

  return (
    <TimesheetContext.Provider value={{
        timeRecords,
        addTimeRecord,
        updateTimeRecord,
        deleteTimeRecord,
        setCompletionDetails,
        pauseTimer,
        resumeTimer,
        getRecordsForUser,
        getRecordsByDateRange,
        getAllRecordsByDateRange,
        isTimesheetLoading
    }}>
      {children}
    </TimesheetContext.Provider>
  );
};

    
