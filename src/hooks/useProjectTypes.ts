
"use client";

import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase'; 
import { ref, onValue, set } from 'firebase/database';
import { PROJECT_TYPES as INITIAL_PROJECT_TYPES, FIREBASE_PROJECT_TYPES_PATH } from '@/lib/constants';
import type { TimeRecord } from '@/lib/types';
import { useLoader } from './useLoader';

const PROJECT_TYPES_LOADER_ID = "firebase_project_types_loader";

export const useProjectTypes = () => {
  const [projectTypes, setProjectTypesState] = useState<string[]>(INITIAL_PROJECT_TYPES); 
  const [isLoadingProjectTypes, setIsLoadingProjectTypes] = useState(true);
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    showLoader(PROJECT_TYPES_LOADER_ID, "Loading project types...");
    setIsLoadingProjectTypes(true);

    if (!database) {
      console.warn("UseProjectTypes: Firebase Database not initialized. Using local initial project types. Operations will be disabled.");
      setIsLoadingProjectTypes(false);
      hideLoader(PROJECT_TYPES_LOADER_ID);
      setProjectTypesState(INITIAL_PROJECT_TYPES); 
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
            // Handle cases where Firebase might store an array-like object if keys are not perfectly sequential
            // or if data was saved differently.
            console.warn("Project types from Firebase is an object, attempting to convert with Object.values:", types);
            setProjectTypesState(Object.values(types) as string[] || []);
          } else {
            if (types != null && !Array.isArray(types)) { // Check if types is not null/undefined but also not an array
               console.warn("Project types from Firebase is not an array or expected object:", types);
            }
            setProjectTypesState([]); 
          }
        } else {
          set(dbRef, INITIAL_PROJECT_TYPES)
            .then(() => setProjectTypesState(INITIAL_PROJECT_TYPES)) 
            .catch(error => {
                console.error("Firebase seed error (projectTypes):", error);
                setProjectTypesState(INITIAL_PROJECT_TYPES); 
            });
        }
      } catch (processingError) {
        console.error("Error processing project types snapshot:", processingError);
        setProjectTypesState(INITIAL_PROJECT_TYPES);
      } finally {
        setIsLoadingProjectTypes(false);
        hideLoader(PROJECT_TYPES_LOADER_ID);
      }
    }, (error) => {
      console.error("Firebase read error (projectTypes):", error);
      setIsLoadingProjectTypes(false);
      hideLoader(PROJECT_TYPES_LOADER_ID);
      setProjectTypesState(INITIAL_PROJECT_TYPES); 
    });
    
    return () => {
      unsubscribe();
      hideLoader(PROJECT_TYPES_LOADER_ID);
    };
  }, [showLoader, hideLoader, database]);

  const updateFirebaseProjectTypes = async (newTypes: string[]) => {
    if (!database) {
      console.warn("UpdateFirebaseProjectTypes: Firebase DB not initialized.");
      return { success: false, message: "Firebase not available. Cannot update project types." };
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
    if (!database) return { success: false, message: "Firebase not available." };
    if (!newType || newType.trim() === "") {
      return { success: false, message: "Project type cannot be empty." };
    }
    
    if (projectTypes.map(pt => pt.toLowerCase()).includes(newType.toLowerCase())) {
      return { success: false, message: "Project type already exists." };
    }
    const updatedTypes = [...projectTypes, newType.trim()];
    return updateFirebaseProjectTypes(updatedTypes);
  }, [projectTypes, database]); 

  const updateProjectType = useCallback(async (oldType: string, newType: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) return { success: false, message: "Firebase not available." };
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
  }, [projectTypes, database]); 

  const deleteProjectType = useCallback(async (typeToDelete: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) return { success: false, message: "Firebase not available." };
    
    const updatedTypes = projectTypes.filter(pt => pt.toLowerCase() !== typeToDelete.toLowerCase());
    return updateFirebaseProjectTypes(updatedTypes);
  }, [projectTypes, database]); 

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

    