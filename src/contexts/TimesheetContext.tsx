
"use client";

import type { TimeRecord } from '@/lib/types';
import React, { createContext, ReactNode, useCallback, useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, remove, update as firebaseUpdate, push } from 'firebase/database';
import { FIREBASE_TIMESHEET_PATH } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    showLoader(TIMESHEET_LOADER_ID, "Loading timesheet data...");
    setIsTimesheetLoading(true); 

    if (!database) {
      console.warn("TimesheetContext (useEffect): Firebase Database not initialized or not configured with a real Project ID. Timesheet data will not be loaded from Firebase, and operations will not persist.");
      setIsTimesheetLoading(false);
      hideLoader(TIMESHEET_LOADER_ID);
      setTimeRecordsState([]); 
      return;
    }

    let unsubscribe = () => {}; 

    try {
      const dbRef = ref(database, FIREBASE_TIMESHEET_PATH);
      unsubscribe = onValue(dbRef, (snapshot) => {
        try {
          if (snapshot.exists()) {
            const recordsObject = snapshot.val();
            if (recordsObject && typeof recordsObject === 'object' && !Array.isArray(recordsObject)) {
              const recordsArray = Object.values(recordsObject) as TimeRecord[];
              setTimeRecordsState(recordsArray);
            } else {
              if (recordsObject && !(typeof recordsObject === 'object' && !Array.isArray(recordsObject))) {
                 console.warn("Timesheet data from Firebase is not a non-array object:", recordsObject);
              }
              setTimeRecordsState([]);
            }
          } else {
            setTimeRecordsState([]);
          }
        } catch (processingError) {
          console.error("Error processing timesheet snapshot value:", processingError);
          setTimeRecordsState([]); 
        } finally {
          setIsTimesheetLoading(false);
          hideLoader(TIMESHEET_LOADER_ID);
        }
      }, (error) => {
        console.error("Firebase read error (timeRecords):", error);
        setIsTimesheetLoading(false);
        hideLoader(TIMESHEET_LOADER_ID);
        setTimeRecordsState([]);
        toast({ title: "Timesheet Load Error", description: "Could not load timesheet data from Firebase.", variant: "destructive"});
      });
    } catch (error) {
      console.error("Error setting up Firebase listener for timesheet:", error);
      setIsTimesheetLoading(false);
      hideLoader(TIMESHEET_LOADER_ID);
      setTimeRecordsState([]);
       toast({ title: "Listener Setup Error", description: "Failed to set up Firebase listener for timesheets.", variant: "destructive"});
    }
    
    return () => {
      unsubscribe(); 
      hideLoader(TIMESHEET_LOADER_ID); 
    };
  }, [showLoader, hideLoader, toast]);
  
  const addTimeRecord = useCallback(async (recordData: Omit<TimeRecord, 'id' | 'userId' | 'completedAt'>) => {
    if (!user) {
        console.warn("AddTimeRecord: User not logged in. Operation aborted.");
        toast({ title: "Authentication Error", description: "User not logged in.", variant: "destructive" });
        return;
    }
    if (!database) {
        // Removed console.error/warn here to prevent Next.js error overlay
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
      console.error("Failed to generate new record ID");
      toast({ title: "Error", description: "Could not create record ID.", variant: "destructive" });
      return;
    }

    const newRecord: TimeRecord = {
      ...recordData,
      id: newRecordId,
      userId: user.id,
    };
    
    try {
      await set(ref(database, `${FIREBASE_TIMESHEET_PATH}/${newRecordId}`), newRecord);
      toast({ title: "Success", description: "Time record added." });
    } catch (error) {
      console.error("Firebase add time record error:", error);
      toast({ title: "Firebase Error", description: "Failed to add record to Firebase. Check console for details.", variant: "destructive" });
    }
  }, [user, toast]); 

  const updateTimeRecord = useCallback(async (updatedRecord: TimeRecord) => {
    if (!database) {
        console.warn("UpdateTimeRecord: Firebase DB not initialized or not configured correctly. Record will NOT be updated in Firebase.");
        toast({ title: "Configuration Error", description: "Firebase is not connected. Record not updated.", variant: "destructive" });
        return;
    }
    try {
      await set(ref(database, `${FIREBASE_TIMESHEET_PATH}/${updatedRecord.id}`), updatedRecord);
      toast({ title: "Success", description: "Time record updated." });
    } catch (error) {
      console.error("Firebase update time record error:", error);
      toast({ title: "Firebase Error", description: "Failed to update record in Firebase. Check console for details.", variant: "destructive" });
    }
  }, [toast]); 

  const deleteTimeRecord = useCallback(async (recordId: string) => {
    if (!database) {
        console.warn("DeleteTimeRecord: Firebase DB not initialized or not configured correctly. Record will NOT be deleted from Firebase.");
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

  const markAsComplete = useCallback(async (recordId: string) => {
    if (!database) {
        console.warn("MarkAsComplete: Firebase DB not initialized or not configured correctly. Record status will NOT be updated in Firebase.");
        toast({ title: "Configuration Error", description: "Firebase is not connected. Record status not updated.", variant: "destructive" });
        return;
    }
    const recordToComplete = timeRecords.find(r => r.id === recordId);
    if (!recordToComplete) {
      toast({ title: "Error", description: "Record not found.", variant: "destructive" });
      return;
    }

    const completedAt = new Date().toISOString();
    try {
      await firebaseUpdate(ref(database, `${FIREBASE_TIMESHEET_PATH}/${recordId}`), { completedAt });
      toast({ title: "Success", description: `Project "${recordToComplete.projectName}" marked as complete.`});

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
      toast({ title: "Firebase Error", description: "Failed to mark record as complete in Firebase. Check console for details.", variant: "destructive" });
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


