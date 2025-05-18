
"use client";

import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase'; 
import { ref, onValue, set } from 'firebase/database';
import { PROJECT_TYPES as INITIAL_PROJECT_TYPES, FIREBASE_PROJECT_TYPES_PATH } from '@/lib/constants';
import type { TimeRecord } from '@/lib/types';
import { useLoader } from './useLoader';
import { useToast } from './use-toast'; // Import useToast

const PROJECT_TYPES_LOADER_ID = "firebase_project_types_loader";

export const useProjectTypes = () => {
  const [projectTypes, setProjectTypesState] = useState<string[]>([]); 
  const [isLoadingProjectTypes, setIsLoadingProjectTypes] = useState(true);
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast(); // Initialize useToast

  useEffect(() => {
    showLoader(PROJECT_TYPES_LOADER_ID, "Loading project types...");
    setIsLoadingProjectTypes(true);

    if (!database) {
      console.warn("UseProjectTypes: Firebase Database not initialized or not configured with a real Project ID. Using local initial project types. Operations will not persist to Firebase.");
      setProjectTypesState(INITIAL_PROJECT_TYPES); 
      setIsLoadingProjectTypes(false);
      hideLoader(PROJECT_TYPES_LOADER_ID);
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
            console.warn("Project types from Firebase is an object, attempting to convert with Object.values:", types);
            setProjectTypesState(Object.values(types) as string[] || []);
          } else {
            if (types != null && !Array.isArray(types)) { 
               console.warn("Project types from Firebase is not an array or expected object:", types);
            }
            setProjectTypesState([]); 
          }
        } else {
           // If no data in Firebase, seed it with INITIAL_PROJECT_TYPES
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
      toast({ title: "Read Error", description: "Could not load project types from Firebase.", variant: "destructive"});
    });
    
    return () => {
      unsubscribe();
      hideLoader(PROJECT_TYPES_LOADER_ID);
    };
  }, [showLoader, hideLoader, toast]); // Removed 'database' from deps

  const updateFirebaseProjectTypes = async (newTypes: string[]): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      console.warn("UpdateFirebaseProjectTypes: Firebase DB not initialized or not configured correctly. Project types will NOT be updated in Firebase.");
      // toast({ title: "Configuration Error", description: "Firebase is not connected. Project types not updated.", variant: "destructive" }); // Already handled by caller
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
    if (!database) {
      toast({ title: "Configuration Error", description: "Firebase is not connected. Project type not added.", variant: "destructive" });
      console.warn("AddProjectType: Firebase DB not initialized. Type will NOT be saved to Firebase.");
      return { success: false, message: "Firebase not available." };
    }
    if (!newType || newType.trim() === "") {
      return { success: false, message: "Project type cannot be empty." };
    }
    
    if (projectTypes.map(pt => pt.toLowerCase()).includes(newType.toLowerCase())) {
      return { success: false, message: "Project type already exists." };
    }
    const updatedTypes = [...projectTypes, newType.trim()];
    const result = await updateFirebaseProjectTypes(updatedTypes);
    if (result.success) {
        // toast({ title: "Success", description: "Project type added."}); // Caller handles toast
    } else {
        // toast({ title: "Error", description: result.message || "Failed to add project type.", variant: "destructive" }); // Caller handles toast
    }
    return result;
  }, [projectTypes, toast]); // Removed 'database' from deps

  const updateProjectType = useCallback(async (oldType: string, newType: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      toast({ title: "Configuration Error", description: "Firebase is not connected. Project type not updated.", variant: "destructive" });
      console.warn("UpdateProjectType: Firebase DB not initialized. Type will NOT be updated in Firebase.");
      return { success: false, message: "Firebase not available." };
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
    const result = await updateFirebaseProjectTypes(updatedTypes);
     if (result.success) {
        // toast({ title: "Success", description: "Project type updated."}); // Caller handles toast
    } else {
        // toast({ title: "Error", description: result.message || "Failed to update project type.", variant: "destructive" }); // Caller handles toast
    }
    return result;
  }, [projectTypes, toast]); // Removed 'database' from deps

  const deleteProjectType = useCallback(async (typeToDelete: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      toast({ title: "Configuration Error", description: "Firebase is not connected. Project type not deleted.", variant: "destructive" });
      console.warn("DeleteProjectType: Firebase DB not initialized. Type will NOT be deleted from Firebase.");
      return { success: false, message: "Firebase not available." };
    }
    
    const updatedTypes = projectTypes.filter(pt => pt.toLowerCase() !== typeToDelete.toLowerCase());
    const result = await updateFirebaseProjectTypes(updatedTypes);
    if (result.success) {
        // toast({ title: "Success", description: "Project type deleted."}); // Caller handles toast
    } else {
        // toast({ title: "Error", description: result.message || "Failed to delete project type.", variant: "destructive" }); // Caller handles toast
    }
    return result;
  }, [projectTypes, toast]); // Removed 'database' from deps

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
