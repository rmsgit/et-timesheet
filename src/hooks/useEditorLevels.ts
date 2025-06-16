
"use client";

import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove, update as firebaseUpdate } from 'firebase/database';
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

  const sortLevels = (levels: EditorLevel[]) => levels.sort((a, b) => a.order - b.order);

  useEffect(() => {
    showLoader(EDITOR_LEVELS_LOADER_ID, "Loading editor levels...");
    setIsLoadingEditorLevels(true);

    if (!database) {
      console.warn("UseEditorLevels: Firebase Database object is NOT initialized. Using initial defaults.");
      setEditorLevelsState(sortLevels(INITIAL_EDITOR_LEVELS));
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
              ...({...(data as Omit<EditorLevel, 'id'>), order: (data as EditorLevel).order ?? 0 }), // Ensure order exists
            }));
            setEditorLevelsState(sortLevels(levelsArray));
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
             initialLevelsToSeed[level.id] = { name: level.name, description: level.description, order: level.order };
           });
           set(dbRef, initialLevelsToSeed)
            .then(() => {
                setEditorLevelsState(sortLevels(INITIAL_EDITOR_LEVELS)); 
                toast({ title: "Editor Levels Seeded", description: "Initial editor levels populated in Firebase."});
            })
            .catch(error => {
                console.error("Firebase seed error (editorLevels):", error);
                setEditorLevelsState(sortLevels(INITIAL_EDITOR_LEVELS));
                toast({ title: "Seeding Error", description: "Could not seed editor levels in Firebase.", variant: "destructive"});
            });
        }
      } catch (processingError) {
        console.error("Error processing editor levels snapshot:", processingError);
        setEditorLevelsState(sortLevels(INITIAL_EDITOR_LEVELS)); 
      } finally {
        setIsLoadingEditorLevels(false);
        hideLoader(EDITOR_LEVELS_LOADER_ID);
      }
    }, (error) => {
      console.error("Firebase read error (editorLevels):", error);
      setIsLoadingEditorLevels(false);
      hideLoader(EDITOR_LEVELS_LOADER_ID);
      setEditorLevelsState(sortLevels(INITIAL_EDITOR_LEVELS)); 
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

    const newOrder = editorLevels.length > 0 ? Math.max(...editorLevels.map(l => l.order)) + 1 : 0;
    const levelData: Omit<EditorLevel, 'id'> = { 
        name: name.trim(), 
        description: description.trim(),
        order: newOrder 
    };
    try {
      await set(newLevelRef, levelData);
      return { success: true, id: newLevelId };
    } catch (error) {
      console.error("Firebase add editor level error:", error);
      return { success: false, message: "Failed to add editor level to database." };
    }
  }, [editorLevels]);

  const updateEditorLevel = useCallback(async (id: string, name: string, description: string, order?: number): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      return { success: false, message: "Firebase DB not available." };
    }
    if (!name.trim()) {
      return { success: false, message: "Level name cannot be empty." };
    }
    const existingLevel = editorLevels.find(level => level.id === id);
    if (!existingLevel) {
        return { success: false, message: "Level not found." };
    }
    if (editorLevels.some(level => level.id !== id && level.name.toLowerCase() === name.trim().toLowerCase())) {
      return { success: false, message: `Another editor level with the name "${name.trim()}" already exists.` };
    }

    const levelData: Omit<EditorLevel, 'id'> = { 
        name: name.trim(), 
        description: description.trim(),
        order: order !== undefined ? order : existingLevel.order // Preserve existing order if not explicitly passed
    };
    const levelRef = ref(database, `${FIREBASE_EDITOR_LEVELS_PATH}/${id}`);
    try {
      await set(levelRef, levelData);
      return { success: true };
    } catch (error) {
      console.error("Firebase update editor level error:", error);
      return { success: false, message: "Failed to update editor level in database." };
    }
  }, [editorLevels]);

  const deleteEditorLevel = useCallback(async (idToDelete: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      return { success: false, message: "Firebase DB not available." };
    }
    
    const levelBeingDeleted = editorLevels.find(l => l.id === idToDelete);
    if (!levelBeingDeleted) {
        return { success: false, message: "Level to delete not found." };
    }
    const deletedOrder = levelBeingDeleted.order;

    const levelRef = ref(database, `${FIREBASE_EDITOR_LEVELS_PATH}/${idToDelete}`);
    try {
      await remove(levelRef);
      
      const updates: { [key: string]: any } = {};
      const remainingLevels = editorLevels.filter(l => l.id !== idToDelete);
      
      remainingLevels.forEach(level => {
        if (level.order > deletedOrder) {
          updates[`${FIREBASE_EDITOR_LEVELS_PATH}/${level.id}/order`] = level.order - 1;
        }
      });

      if (Object.keys(updates).length > 0) {
        await firebaseUpdate(ref(database), updates);
      }
      return { success: true };
    } catch (error) {
      console.error("Firebase delete editor level or re-order error:", error);
      return { success: false, message: "Failed to delete editor level or re-order subsequent levels." };
    }
  }, [editorLevels]);

  const moveLevel = useCallback(async (levelId: string, direction: 'up' | 'down'): Promise<{ success: boolean, message?: string}> => {
    if (!database) return { success: false, message: "Firebase not connected." };

    const sorted = [...editorLevels].sort((a,b) => a.order - b.order); // Ensure working with sorted list
    const currentIndex = sorted.findIndex(l => l.id === levelId);
    
    if (currentIndex === -1) return { success: false, message: "Level not found."};

    let newIndex;
    if (direction === 'up') {
        newIndex = currentIndex - 1;
        if (newIndex < 0) return { success: true, message: "Already at top." }; // No change needed
    } else { // direction 'down'
        newIndex = currentIndex + 1;
        if (newIndex >= sorted.length) return { success: true, message: "Already at bottom."}; // No change needed
    }

    const levelToMove = sorted[currentIndex];
    const levelToSwapWith = sorted[newIndex];

    // Swap order numbers
    const updates: { [key: string]: any } = {};
    updates[`${FIREBASE_EDITOR_LEVELS_PATH}/${levelToMove.id}/order`] = levelToSwapWith.order;
    updates[`${FIREBASE_EDITOR_LEVELS_PATH}/${levelToSwapWith.id}/order`] = levelToMove.order;
    
    try {
        await firebaseUpdate(ref(database), updates);
        return { success: true };
    } catch (error) {
        console.error("Firebase move level error:", error);
        return { success: false, message: "Failed to reorder levels in Firebase." };
    }
  }, [editorLevels]);


  return {
      editorLevels, // This will be sorted by order due to setEditorLevelsState(sortLevels(...))
      addEditorLevel,
      updateEditorLevel,
      deleteEditorLevel,
      isLoadingEditorLevels,
      moveLevel,
    };
};
