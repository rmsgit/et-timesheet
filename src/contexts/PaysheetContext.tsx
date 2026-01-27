
"use client";

import React, { createContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { FIREBASE_PAYSHEETS_PATH } from '@/lib/constants';
import type { Paysheet } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';

const PAYSHEET_LOADER_ID = "firebase_paysheets_loader";

interface PaysheetContextType {
  paysheets: Paysheet[];
  isLoading: boolean;
  savePaysheet: (paysheetData: Omit<Paysheet, 'id' | 'generatedAt'>) => Promise<{ success: boolean; id?: string }>;
}

export const PaysheetContext = createContext<PaysheetContextType | undefined>(undefined);

interface PaysheetProviderProps {
  children: ReactNode;
}

export const PaysheetProvider: React.FC<PaysheetProviderProps> = ({ children }) => {
  const [paysheets, setPaysheets] = useState<Paysheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Listener for all paysheets
    setIsLoading(true);
    const dbRef = ref(database, FIREBASE_PAYSHEETS_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const paysheetsArray = Object.entries(data).map(([id, paysheetData]) => ({
          id,
          ...({...(paysheetData as Omit<Paysheet, 'id'>)}),
        }));
        setPaysheets(paysheetsArray);
      } else {
        setPaysheets([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase read error (paysheets):", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const savePaysheet = useCallback(async (paysheetData: Omit<Paysheet, 'id' | 'generatedAt'>): Promise<{ success: boolean; id?: string }> => {
    if (!user || user.role !== 'admin') {
      toast({ title: "Permission Denied", description: "Only admins can save paysheets.", variant: "destructive" });
      return { success: false };
    }
    if (!database) return { success: false };

    // A paysheet for a user for a given period should be unique.
    // Let's create a unique ID based on userId and payPeriod (YYYY-MM).
    const paysheetId = `${paysheetData.userId}_${paysheetData.year}-${paysheetData.month}`;
    const paysheetRef = ref(database, `${FIREBASE_PAYSHEETS_PATH}/${paysheetId}`);

    const finalPaysheetData: Omit<Paysheet, 'id'> = {
      ...paysheetData,
      generatedAt: new Date().toISOString(),
    };

    try {
      await set(paysheetRef, finalPaysheetData);
      toast({ title: "Success", description: "Paysheet has been saved successfully." });
      return { success: true, id: paysheetId };
    } catch (error) {
      console.error("Firebase save paysheet error:", error);
      toast({ title: "Error", description: "Failed to save paysheet.", variant: "destructive" });
      return { success: false };
    }
  }, [user, toast]);

  return (
    <PaysheetContext.Provider value={{ paysheets, isLoading, savePaysheet }}>
      {children}
    </PaysheetContext.Provider>
  );
};
