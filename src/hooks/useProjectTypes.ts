
"use client";

import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { PROJECT_TYPES as INITIAL_PROJECT_TYPES, FIREBASE_PROJECT_TYPES_PATH } from '@/lib/constants';
import type { TimeRecord } from '@/lib/types';
import { useLoader } from './useLoader';

const PROJECT_TYPES_LOADER_ID = "firebase_project_types_loader";

export const useProjectTypes = () => {
  const [projectTypes, setProjectTypesState] = useState<string[]>([]);
  const [isLoadingProjectTypes, setIsLoadingProjectTypes] = useState(true);
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    showLoader(PROJECT_TYPES_LOADER_ID, "Loading project types...");
    const dbRef = ref(database, FIREBASE_PROJECT_TYPES_PATH);

    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const types = snapshot.val();
        setProjectTypesState(Array.isArray(types) ? types : []); // Ensure it's an array
      } else {
        set(dbRef, INITIAL_PROJECT_TYPES)
          .then(() => setProjectTypesState(INITIAL_PROJECT_TYPES))
          .catch(error => console.error("Firebase seed error (projectTypes):", error));
      }
      setIsLoadingProjectTypes(false);
      hideLoader(PROJECT_TYPES_LOADER_ID);
    }, (error) => {
      console.error("Firebase read error (projectTypes):", error);
      setIsLoadingProjectTypes(false);
      hideLoader(PROJECT_TYPES_LOADER_ID);
      setProjectTypesState([]); // Fallback
    });
    
    return () => {
      unsubscribe();
      hideLoader(PROJECT_TYPES_LOADER_ID);
    };
  }, [showLoader, hideLoader]);

  const updateFirebaseProjectTypes = async (newTypes: string[]) => {
    const dbRef = ref(database, FIREBASE_PROJECT_TYPES_PATH);
    try {
      await set(dbRef, newTypes);
      // setProjectTypesState will be updated by the onValue listener
      return { success: true };
    } catch (error) {
      console.error("Firebase update project types error:", error);
      return { success: false, message: "Failed to update project types in database." };
    }
  };

  const addProjectType = useCallback(async (newType: string): Promise<{ success: boolean; message?: string }> => {
    if (newType.trim() === "") {
      return { success: false, message: "Project type cannot be empty." };
    }
    if (projectTypes.map(pt => pt.toLowerCase()).includes(newType.toLowerCase())) {
      return { success: false, message: "Project type already exists." };
    }
    const updatedTypes = [...projectTypes, newType.trim()];
    return updateFirebaseProjectTypes(updatedTypes);
  }, [projectTypes]);

  const updateProjectType = useCallback(async (oldType: string, newType: string): Promise<{ success: boolean; message?: string }> => {
    if (newType.trim() === "") {
      return { success: false, message: "Project type cannot be empty." };
    }
    const lowerNewType = newType.toLowerCase();
    const lowerOldType = oldType.toLowerCase();
    if (lowerOldType !== lowerNewType && projectTypes.some(pt => pt.toLowerCase() === lowerNewType)) {
      return { success: false, message: "New project type name already exists." };
    }
    const updatedTypes = projectTypes.map(pt => (pt.toLowerCase() === lowerOldType ? newType.trim() : pt));
    return updateFirebaseProjectTypes(updatedTypes);
  }, [projectTypes]);

  const deleteProjectType = useCallback(async (typeToDelete: string): Promise<{ success: boolean; message?: string }> => {
    const updatedTypes = projectTypes.filter(pt => pt.toLowerCase() !== typeToDelete.toLowerCase());
    return updateFirebaseProjectTypes(updatedTypes);
  }, [projectTypes]);

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
