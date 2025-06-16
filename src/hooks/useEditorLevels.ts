
"use client";

import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { INITIAL_EDITOR_LEVELS, FIREBASE_EDITOR_LEVELS_PATH } from '@/lib/constants';
import type { EditorLevel } from '@/lib/types';
import { useLoader } from './useLoader';
import { useToast } from './use-toast';

const EDITOR_LEVELS_LOADER_ID = "firebase_editor_levels_loader";

export const useEditorLevels = () => {
  const [editorLevels, setEditorLevelsState] = useState<EditorLevel[]>([]);
  const [isLoadingEditorLevels, setIsLoadingEditorLevels] = useState(true);
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  useEffect(() => {
    showLoader(EDITOR_LEVELS_LOADER_ID, "Loading editor levels...");
    setIsLoadingEditorLevels(true);

    if (!database) {
      console.warn("UseEditorLevels: Firebase Database object is NOT initialized. Using initial defaults.");
      setEditorLevelsState(INITIAL_EDITOR_LEVELS);
      setIsLoadingEditorLevels(false);
      hideLoader(EDITOR_LEVELS_LOADER_ID);
      toast({
        title: "Editor Levels Unavailable",
        description: "Cannot connect to Firebase Realtime Database for editor levels. Using defaults.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    const dbRef = ref(database, FIREBASE_EDITOR_LEVELS_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const levelsData = snapshot.val();
          if (levelsData && typeof levelsData === 'object' && !Array.isArray(levelsData)) {
            const levelsArray = Object.entries(levelsData).map(([id, data]) => ({
              id,
              ...(data as Omit<EditorLevel, 'id'>),
            }));
            setEditorLevelsState(levelsArray);
          } else {
             if (levelsData && !(typeof levelsData === 'object' && !Array.isArray(levelsData))) {
                console.warn("Editor levels data from Firebase is not a non-array object:", levelsData);
             }
            setEditorLevelsState([]);
          }
        } else {
           console.info("No editor levels in Firebase, seeding with initial levels.");
           const initialLevelsToSeed: { [key: string]: Omit<EditorLevel, 'id'> } = {};
           INITIAL_EDITOR_LEVELS.forEach(level => {
             initialLevelsToSeed[level.id] = { name: level.name, description: level.description };
           });
           set(dbRef, initialLevelsToSeed)
            .then(() => {
                setEditorLevelsState(INITIAL_EDITOR_LEVELS); // Set state with IDs included
                toast({ title: "Editor Levels Seeded", description: "Initial editor levels populated in Firebase."});
            })
            .catch(error => {
                console.error("Firebase seed error (editorLevels):", error);
                setEditorLevelsState(INITIAL_EDITOR_LEVELS);
                toast({ title: "Seeding Error", description: "Could not seed editor levels in Firebase.", variant: "destructive"});
            });
        }
      } catch (processingError) {
        console.error("Error processing editor levels snapshot:", processingError);
        setEditorLevelsState(INITIAL_EDITOR_LEVELS); 
      } finally {
        setIsLoadingEditorLevels(false);
        hideLoader(EDITOR_LEVELS_LOADER_ID);
      }
    }, (error) => {
      console.error("Firebase read error (editorLevels):", error);
      setIsLoadingEditorLevels(false);
      hideLoader(EDITOR_LEVELS_LOADER_ID);
      setEditorLevelsState(INITIAL_EDITOR_LEVELS); 
      toast({ title: "Read Error", description: "Could not load editor levels from Firebase.", variant: "destructive"});
    });

    return () => {
      unsubscribe();
      hideLoader(EDITOR_LEVELS_LOADER_ID);
    };
  }, [showLoader, hideLoader, toast]);

  const addEditorLevel = useCallback(async (name: string, description: string): Promise<{ success: boolean; message?: string; id?: string }> => {
    if (!database) {
      return { success: false, message: "Firebase DB not available." };
    }
    if (!name.trim()) {
      return { success: false, message: "Level name cannot be empty." };
    }
     if (editorLevels.some(level => level.name.toLowerCase() === name.trim().toLowerCase())) {
      return { success: false, message: `An editor level with the name "${name.trim()}" already exists.` };
    }

    const newLevelRef = push(ref(database, FIREBASE_EDITOR_LEVELS_PATH));
    const newLevelId = newLevelRef.key;
    if (!newLevelId) {
      return { success: false, message: "Could not generate a new level ID." };
    }

    const levelData: Omit<EditorLevel, 'id'> = { name: name.trim(), description: description.trim() };
    try {
      await set(newLevelRef, levelData);
      return { success: true, id: newLevelId };
    } catch (error) {
      console.error("Firebase add editor level error:", error);
      return { success: false, message: "Failed to add editor level to database." };
    }
  }, [editorLevels]);

  const updateEditorLevel = useCallback(async (id: string, name: string, description: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      return { success: false, message: "Firebase DB not available." };
    }
    if (!name.trim()) {
      return { success: false, message: "Level name cannot be empty." };
    }
    if (editorLevels.some(level => level.id !== id && level.name.toLowerCase() === name.trim().toLowerCase())) {
      return { success: false, message: `Another editor level with the name "${name.trim()}" already exists.` };
    }

    const levelData: Omit<EditorLevel, 'id'> = { name: name.trim(), description: description.trim() };
    const levelRef = ref(database, `${FIREBASE_EDITOR_LEVELS_PATH}/${id}`);
    try {
      await set(levelRef, levelData);
      return { success: true };
    } catch (error) {
      console.error("Firebase update editor level error:", error);
      return { success: false, message: "Failed to update editor level in database." };
    }
  }, [editorLevels]);

  const deleteEditorLevel = useCallback(async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      return { success: false, message: "Firebase DB not available." };
    }
    // Note: Assignment of levels to users is not yet implemented.
    // If it were, a check `isEditorLevelInUse(id)` would be needed here.
    const levelRef = ref(database, `${FIREBASE_EDITOR_LEVELS_PATH}/${id}`);
    try {
      await remove(levelRef);
      return { success: true };
    } catch (error) {
      console.error("Firebase delete editor level error:", error);
      return { success: false, message: "Failed to delete editor level from database." };
    }
  }, []);


  return {
      editorLevels,
      addEditorLevel,
      updateEditorLevel,
      deleteEditorLevel,
      isLoadingEditorLevels,
    };
};
