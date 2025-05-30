
"use client";

import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { PROJECT_TYPES as INITIAL_PROJECT_TYPES, FIREBASE_PROJECT_TYPES_PATH } from '@/lib/constants';
import type { TimeRecord } from '@/lib/types';
import { useLoader } from './useLoader';
import { useToast } from './use-toast';

const PROJECT_TYPES_LOADER_ID = "firebase_project_types_loader";

export const useProjectTypes = () => {
  const [projectTypes, setProjectTypesState] = useState<string[]>([]);
  const [isLoadingProjectTypes, setIsLoadingProjectTypes] = useState(true);
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  useEffect(() => {
    showLoader(PROJECT_TYPES_LOADER_ID, "Loading project types...");
    setIsLoadingProjectTypes(true);

    if (!database) {
      console.warn("UseProjectTypes: Firebase Database object is NOT initialized. Project types will not be loaded from Firebase. Using initial defaults.");
      setProjectTypesState(INITIAL_PROJECT_TYPES);
      setIsLoadingProjectTypes(false);
      hideLoader(PROJECT_TYPES_LOADER_ID);
      toast({
        title: "Project Types Unavailable",
        description: "Cannot connect to Firebase Realtime Database for project types. Using defaults. Please check DATABASE_URL configuration.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    const dbRef = ref(database, FIREBASE_PROJECT_TYPES_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const types = snapshot.val();
          if (Array.isArray(types)) {
            setProjectTypesState(types);
          } else if (types && typeof types === 'object' && !Array.isArray(types)) {
            setProjectTypesState(Object.values(types) as string[] || []);
          } else {
            setProjectTypesState([]);
          }
        } else {
           console.info("No project types in Firebase, seeding with initial types.");
           set(dbRef, INITIAL_PROJECT_TYPES)
            .then(() => {
                setProjectTypesState(INITIAL_PROJECT_TYPES);
                toast({ title: "Project Types Seeded", description: "Initial project types populated in Firebase."});
            })
            .catch(error => {
                console.error("Firebase seed error (projectTypes):", error);
                setProjectTypesState(INITIAL_PROJECT_TYPES);
                toast({ title: "Seeding Error", description: "Could not seed project types in Firebase.", variant: "destructive"});
            });
        }
      } catch (processingError) {
        console.error("Error processing project types snapshot:", processingError);
        setProjectTypesState(INITIAL_PROJECT_TYPES); // Fallback to defaults on error
      } finally {
        setIsLoadingProjectTypes(false);
        hideLoader(PROJECT_TYPES_LOADER_ID);
      }
    }, (error) => {
      console.error("Firebase read error (projectTypes):", error);
      setIsLoadingProjectTypes(false);
      hideLoader(PROJECT_TYPES_LOADER_ID);
      setProjectTypesState(INITIAL_PROJECT_TYPES); // Fallback to defaults on error
      toast({ title: "Read Error", description: "Could not load project types from Firebase.", variant: "destructive"});
    });

    return () => {
      unsubscribe();
      hideLoader(PROJECT_TYPES_LOADER_ID);
    };
  }, [showLoader, hideLoader, toast]);

  const updateFirebaseProjectTypes = async (newTypes: string[]): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      return { success: false, message: "Firebase DB not available. Cannot update project types." };
    }
    const dbRef = ref(database, FIREBASE_PROJECT_TYPES_PATH);
    try {
      await set(dbRef, newTypes);
      return { success: true };
    } catch (error) {
      console.error("Firebase update project types error:", error);
      return { success: false, message: "Failed to update project types in database." };
    }
  };

  const addProjectType = useCallback(async (newType: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      toast({ title: "Configuration Error", description: "Firebase is not connected. Project type not added.", variant: "destructive" });
      return { success: false, message: "Firebase DB not available." };
    }
    if (!newType || newType.trim() === "") {
      return { success: false, message: "Project type cannot be empty." };
    }
    if (projectTypes.map(pt => pt.toLowerCase()).includes(newType.toLowerCase())) {
      return { success: false, message: "Project type already exists." };
    }
    const updatedTypes = [...projectTypes, newType.trim()];
    return updateFirebaseProjectTypes(updatedTypes);
  }, [projectTypes, toast]);

  const updateProjectType = useCallback(async (oldType: string, newType: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      toast({ title: "Configuration Error", description: "Firebase is not connected. Project type not updated.", variant: "destructive" });
      return { success: false, message: "Firebase DB not available." };
    }
    if (!newType || newType.trim() === "") {
      return { success: false, message: "Project type cannot be empty." };
    }
    const lowerNewType = newType.toLowerCase();
    const lowerOldType = oldType.toLowerCase();
    if (lowerOldType !== lowerNewType && projectTypes.some(pt => pt.toLowerCase() === lowerNewType)) {
      return { success: false, message: "New project type name already exists." };
    }
    const updatedTypes = projectTypes.map(pt => (pt.toLowerCase() === lowerOldType ? newType.trim() : pt));
    return updateFirebaseProjectTypes(updatedTypes);
  }, [projectTypes, toast]);

  const deleteProjectType = useCallback(async (typeToDelete: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      toast({ title: "Configuration Error", description: "Firebase is not connected. Project type not deleted.", variant: "destructive" });
      return { success: false, message: "Firebase DB not available." };
    }
    const updatedTypes = projectTypes.filter(pt => pt.toLowerCase() !== typeToDelete.toLowerCase());
    return updateFirebaseProjectTypes(updatedTypes);
  }, [projectTypes, toast]);

  const isProjectTypeInUse = useCallback((projectType: string, allTimeRecords: TimeRecord[]): boolean => {
    if (!allTimeRecords) return false;
    return allTimeRecords.some(record => record.projectType.toLowerCase() === projectType.toLowerCase());
  }, []);

  return {
      projectTypes,
      addProjectType,
      updateProjectType,
      deleteProjectType,
      isLoadingProjectTypes,
      isProjectTypeInUse
    };
};
