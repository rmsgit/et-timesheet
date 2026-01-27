
"use client";

import React, { createContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { FIREBASE_GLOBAL_SETTINGS_PATH } from '@/lib/constants';
import type { GlobalSettings } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';

const SETTINGS_LOADER_ID = "firebase_global_settings_loader";

interface GlobalSettingsContextType {
  settings: GlobalSettings | null;
  isLoading: boolean;
  saveSettings: (settings: GlobalSettings) => Promise<{ success: boolean }>;
}

export const GlobalSettingsContext = createContext<GlobalSettingsContextType | undefined>(undefined);

interface GlobalSettingsProviderProps {
  children: ReactNode;
}

export const GlobalSettingsProvider: React.FC<GlobalSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    if (!database) {
      console.warn("GlobalSettingsContext: Firebase Database is not initialized.");
      setIsLoading(false);
      return;
    }

    const dbRef = ref(database, FIREBASE_GLOBAL_SETTINGS_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          setSettings(snapshot.val());
        } else {
          setSettings(null); // Or set default values
        }
      } catch (e) {
        console.error("Error processing global settings snapshot:", e);
        setSettings(null);
      } finally {
        setIsLoading(false);
      }
    }, (error) => {
      console.error("Firebase read error (global settings):", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveSettings = useCallback(async (newSettings: GlobalSettings): Promise<{ success: boolean }> => {
    if (!user || user.role !== 'admin') {
      toast({ title: "Permission Denied", description: "Only admins can save global settings.", variant: "destructive" });
      return { success: false };
    }
    if (!database) {
      toast({ title: "Error", description: "Database not connected.", variant: "destructive" });
      return { success: false };
    }

    showLoader(SETTINGS_LOADER_ID, "Saving global settings...");
    try {
      const dbRef = ref(database, FIREBASE_GLOBAL_SETTINGS_PATH);
      await set(dbRef, newSettings);
      toast({ title: "Success", description: "Global settings have been saved." });
      return { success: true };
    } catch (error) {
      console.error("Firebase save global settings error:", error);
      toast({ title: "Error", description: "Failed to save global settings.", variant: "destructive" });
      return { success: false };
    } finally {
      hideLoader(SETTINGS_LOADER_ID);
    }
  }, [user, toast, showLoader, hideLoader]);

  return (
    <GlobalSettingsContext.Provider value={{ settings, isLoading, saveSettings }}>
      {children}
    </GlobalSettingsContext.Provider>
  );
};
