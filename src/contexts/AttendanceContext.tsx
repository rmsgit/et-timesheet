
"use client";

import React, { createContext, ReactNode, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { FIREBASE_ATTENDANCE_PATH } from '@/lib/constants';
import type { AttendanceRecord } from '@/lib/types';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';

const ATTENDANCE_LOADER_ID = "firebase_attendance_loader";

interface AttendanceContextType {
  saveAttendanceForMonth: (userId: string, year: string, month: string, records: AttendanceRecord[]) => Promise<{ success: boolean }>;
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

  return (
    <AttendanceContext.Provider value={{ saveAttendanceForMonth }}>
      {children}
    </AttendanceContext.Provider>
  );
};
