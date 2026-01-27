
"use client";

import React, { createContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove, update as firebaseUpdate } from 'firebase/database';
import { FIREBASE_HOLIDAYS_PATH } from '@/lib/constants';
import type { Holiday } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const HOLIDAY_LOADER_ID = "firebase_holidays_loader";

interface HolidayContextType {
  holidays: Holiday[];
  isLoading: boolean;
  addHoliday: (date: Date, name: string, isWorkingDay: boolean) => Promise<{ success: boolean; id?: string }>;
  updateHoliday: (holidayId: string, updates: Partial<Omit<Holiday, 'id'>>) => Promise<{ success: boolean }>;
  deleteHoliday: (holidayId: string) => Promise<{ success: boolean }>;
}

export const HolidayContext = createContext<HolidayContextType | undefined>(undefined);

interface HolidayProviderProps {
  children: ReactNode;
}

export const HolidayProvider: React.FC<HolidayProviderProps> = ({ children }) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  useEffect(() => {
    showLoader(HOLIDAY_LOADER_ID, "Loading holiday data...");
    setIsLoading(true);

    if (!database) {
      console.warn("useHolidays: Firebase Database is not initialized.");
      setIsLoading(false);
      hideLoader(HOLIDAY_LOADER_ID);
      return;
    }

    const dbRef = ref(database, FIREBASE_HOLIDAYS_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const holidaysArray = Object.entries(data).map(([id, holidayData]) => ({
            id,
            ...({...(holidayData as Omit<Holiday, 'id'>)}),
          }));
          setHolidays(holidaysArray.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        } else {
          setHolidays([]);
        }
      } catch (e) {
        console.error("Error processing holidays snapshot:", e);
        setHolidays([]);
      } finally {
        setIsLoading(false);
        hideLoader(HOLIDAY_LOADER_ID);
      }
    }, (error) => {
      console.error("Firebase read error (holidays):", error);
      setIsLoading(false);
      hideLoader(HOLIDAY_LOADER_ID);
    });

    return () => {
      unsubscribe();
      hideLoader(HOLIDAY_LOADER_ID);
    };
  }, [showLoader, hideLoader]);

  const addHoliday = useCallback(async (date: Date, name: string, isWorkingDay: boolean): Promise<{ success: boolean, id?: string }> => {
    if (!user || user.role !== 'admin') {
      toast({ title: "Permission Denied", description: "Only admins can add holidays.", variant: "destructive" });
      return { success: false };
    }
    if (!name.trim()) {
        toast({ title: "Validation Error", description: "Holiday name cannot be empty.", variant: "destructive" });
        return { success: false };
    }
    if (!database) return { success: false };
    
    const newHolidayRef = push(ref(database, FIREBASE_HOLIDAYS_PATH));
    const newId = newHolidayRef.key;
    if (!newId) return { success: false };

    const holidayData: Omit<Holiday, 'id'> = {
      date: date.toISOString(),
      name: name.trim(),
      isWorkingDay,
    };

    try {
      await set(newHolidayRef, holidayData);
      toast({ title: "Success", description: `Holiday "${name}" on ${format(date, 'PPP')} has been added.` });
      return { success: true, id: newId };
    } catch (error) {
      console.error("Firebase add holiday error:", error);
      toast({ title: "Error", description: "Failed to add holiday.", variant: "destructive" });
      return { success: false };
    }
  }, [user, toast]);

  const updateHoliday = useCallback(async (holidayId: string, updates: Partial<Omit<Holiday, 'id'>>): Promise<{ success: boolean }> => {
    if (!user || user.role !== 'admin') {
        toast({ title: "Permission Denied", description: "Only admins can update holidays.", variant: "destructive" });
        return { success: false };
    }
    if (!database) {
        toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
        return { success: false };
    }
    try {
        await firebaseUpdate(ref(database, `${FIREBASE_HOLIDAYS_PATH}/${holidayId}`), updates);
        toast({ title: "Success", description: "Holiday has been updated." });
        return { success: true };
    } catch (error) {
        console.error("Firebase update holiday error:", error);
        toast({ title: "Error", description: "Failed to update holiday.", variant: "destructive" });
        return { success: false };
    }
}, [user, toast]);

  const deleteHoliday = useCallback(async (holidayId: string): Promise<{ success: boolean }> => {
    if (!user || user.role !== 'admin') {
      toast({ title: "Permission Denied", description: "Only admins can delete holidays.", variant: "destructive" });
      return { success: false };
    }
    if (!database) {
      toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
      return { success: false };
    }

    try {
      await remove(ref(database, `${FIREBASE_HOLIDAYS_PATH}/${holidayId}`));
      toast({ title: "Success", description: "Holiday has been deleted." });
      return { success: true };
    } catch (error) {
      console.error("Firebase delete holiday error:", error);
      toast({ title: "Error", description: "Failed to delete holiday.", variant: "destructive" });
      return { success: false };
    }
  }, [user, toast]);

  return (
    <HolidayContext.Provider value={{ holidays, isLoading, addHoliday, updateHoliday, deleteHoliday }}>
      {children}
    </HolidayContext.Provider>
  );
};
