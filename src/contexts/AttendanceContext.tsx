
"use client";

import React, { createContext, ReactNode, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, set, get, DataSnapshot, remove } from 'firebase/database';
import { FIREBASE_ATTENDANCE_PATH } from '@/lib/constants';
import type { AttendanceRecord } from '@/lib/types';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';

const ATTENDANCE_LOADER_ID = "firebase_attendance_loader";

interface AttendanceContextType {
  saveAttendanceForMonth: (userId: string, year: string, month: string, records: AttendanceRecord[]) => Promise<{ success: boolean }>;
  getAttendanceForMonth: (userId: string, year: string, month: string) => Promise<AttendanceRecord[] | null>;
  getAttendanceForYear: (userId: string, year: string) => Promise<AttendanceRecord[] | null>;
  deleteAttendanceForMonth: (userId: string, year: string, month: string) => Promise<{ success: boolean }>;
}

export const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

interface AttendanceProviderProps {
  children: ReactNode;
}

export const AttendanceProvider: React.FC<AttendanceProviderProps> = ({ children }) => {
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  const saveAttendanceForMonth = useCallback(async (userId: string, year: string, month: string, records: AttendanceRecord[]): Promise<{ success: boolean }> => {
    if (!database) {
      toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
      return { success: false };
    }
    if (!userId || !year || !month) {
      toast({ title: "Error", description: "User, year, or month is missing.", variant: "destructive" });
      return { success: false };
    }
    
    showLoader(ATTENDANCE_LOADER_ID, "Saving attendance...");
    try {
      const dbRef = ref(database, `${FIREBASE_ATTENDANCE_PATH}/${userId}/${year}-${month}`);
      await set(dbRef, records);
      toast({ title: "Success", description: "Attendance records have been saved." });
      return { success: true };
    } catch (error) {
      console.error("Firebase save attendance error:", error);
      toast({ title: "Error", description: "Failed to save attendance records.", variant: "destructive" });
      return { success: false };
    } finally {
      hideLoader(ATTENDANCE_LOADER_ID);
    }
  }, [toast, showLoader, hideLoader]);

  const getAttendanceForMonth = useCallback(async (userId: string, year: string, month: string): Promise<AttendanceRecord[] | null> => {
    if (!database) {
      toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
      return null;
    }
    showLoader(ATTENDANCE_LOADER_ID, "Fetching attendance...");
    try {
      const dbRef = ref(database, `${FIREBASE_ATTENDANCE_PATH}/${userId}/${year}-${month}`);
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        toast({ title: "Data Loaded", description: "Saved attendance records for this period have been loaded." });
        return data as AttendanceRecord[];
      }
      return null;
    } catch (error) {
      console.error("Firebase get attendance error:", error);
      toast({ title: "Fetch Error", description: "Failed to fetch attendance records.", variant: "destructive" });
      return null;
    } finally {
      hideLoader(ATTENDANCE_LOADER_ID);
    }
  }, [toast, showLoader, hideLoader]);

  const getAttendanceForYear = useCallback(async (userId: string, year: string): Promise<AttendanceRecord[] | null> => {
    if (!database) {
      toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
      return null;
    }
    showLoader(ATTENDANCE_LOADER_ID, `Fetching year attendance for user...`);
    try {
      let yearlyRecords: AttendanceRecord[] = [];
      const monthPromises: Promise<DataSnapshot>[] = [];
      for (let i = 1; i <= 12; i++) {
        const month = i.toString().padStart(2, '0');
        const dbRef = ref(database, `${FIREBASE_ATTENDANCE_PATH}/${userId}/${year}-${month}`);
        monthPromises.push(get(dbRef));
      }
      
      const snapshots = await Promise.all(monthPromises);
      
      snapshots.forEach(snapshot => {
        if (snapshot.exists()) {
          const monthlyData = snapshot.val() as AttendanceRecord[];
          if (Array.isArray(monthlyData)) {
            yearlyRecords = yearlyRecords.concat(monthlyData);
          }
        }
      });

      return yearlyRecords.length > 0 ? yearlyRecords : null;
    } catch (error) {
      console.error("Firebase get year attendance error:", error);
      toast({ title: "Fetch Error", description: "Failed to fetch yearly attendance records.", variant: "destructive" });
      return null;
    } finally {
      hideLoader(ATTENDANCE_LOADER_ID);
    }
  }, [toast, showLoader, hideLoader]);

  const deleteAttendanceForMonth = useCallback(async (userId: string, year: string, month: string): Promise<{ success: boolean }> => {
    if (!database) {
      toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
      return { success: false };
    }
    if (!userId || !year || !month) {
      toast({ title: "Error", description: "User, year, or month is missing for deletion.", variant: "destructive" });
      return { success: false };
    }

    showLoader(ATTENDANCE_LOADER_ID, "Deleting timesheet...");
    try {
      const dbRef = ref(database, `${FIREBASE_ATTENDANCE_PATH}/${userId}/${year}-${month}`);
      await remove(dbRef);
      toast({ title: "Success", description: "The attendance sheet for the selected period has been deleted." });
      return { success: true };
    } catch (error) {
      console.error("Firebase delete attendance error:", error);
      toast({ title: "Error", description: "Failed to delete the attendance sheet.", variant: "destructive" });
      return { success: false };
    } finally {
      hideLoader(ATTENDANCE_LOADER_ID);
    }
  }, [toast, showLoader, hideLoader]);

  return (
    <AttendanceContext.Provider value={{ saveAttendanceForMonth, getAttendanceForMonth, getAttendanceForYear, deleteAttendanceForMonth }}>
      {children}
    </AttendanceContext.Provider>
  );
};

    