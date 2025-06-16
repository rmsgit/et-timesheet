
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
              ...({...(data as Omit<EditorLevel, 'id'>), order: (data as EditorLevel).order ?? 0 }), 
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

  const updateEditorLevel = useCallback(async (id: string, name: string, description: string, newOrderDisplay?: number): Promise<{ success: boolean; message?: string }> => {
    if (!database) return { success: false, message: "Firebase DB not available." };
    if (!name.trim()) return { success: false, message: "Level name cannot be empty." };

    const currentLevelsState = [...editorLevels]; // Use the state for consistent reads within the function
    const sortedCurrentLevels = sortLevels(currentLevelsState);

    const editedLevelIndexInSorted = sortedCurrentLevels.findIndex(l => l.id === id);
    if (editedLevelIndexInSorted === -1) return { success: false, message: "Level not found." };

    const existingLevelWithName = sortedCurrentLevels.find(level => level.id !== id && level.name.toLowerCase() === name.trim().toLowerCase());
    if (existingLevelWithName) {
        return { success: false, message: `Another editor level with the name "${name.trim()}" already exists.` };
    }
    
    let finalLevels = [...sortedCurrentLevels];
    let levelToUpdateData = { 
        ...finalLevels[editedLevelIndexInSorted], 
        name: name.trim(), 
        description: description.trim() 
    };

    let orderDidChange = false;
    if (newOrderDisplay !== undefined) {
        let targetZeroBasedOrder = newOrderDisplay - 1; // Convert 1-based display to 0-based index
        
        // Clamp targetZeroBasedOrder to be within the valid range of indices (0 to length-1)
        targetZeroBasedOrder = Math.max(0, Math.min(targetZeroBasedOrder, finalLevels.length - 1));

        if (targetZeroBasedOrder !== levelToUpdateData.order) {
            orderDidChange = true;
            // Temporarily assign a placeholder order to avoid clashes during splice, actual order is set in re-indexing
            levelToUpdateData.order = -1; // Placeholder
            
            finalLevels.splice(editedLevelIndexInSorted, 1); // Remove from old position
            finalLevels.splice(targetZeroBasedOrder, 0, levelToUpdateData); // Insert at new position
        }
    }
    
    if (orderDidChange) {
        // Re-assign sequential order to all levels if order was changed
        finalLevels = finalLevels.map((level, index) => ({ ...level, order: index }));
    } else {
        // If order didn't change, just update the name/description for the target level in its current position
        const currentLevelInPlace = finalLevels.find(l => l.id === id);
        if (currentLevelInPlace) {
            currentLevelInPlace.name = name.trim();
            currentLevelInPlace.description = description.trim();
        }
    }

    const updates: { [key: string]: any } = {};
    let needsFirebaseUpdate = false;

    finalLevels.forEach(level => {
        const originalLevel = sortedCurrentLevels.find(cl => cl.id === level.id);
        // Check if this level is the one being edited OR if its order has changed
        // OR if its name/description changed (already handled for the edited level)
        if (level.id === id || 
            !originalLevel || 
            originalLevel.order !== level.order ||
            originalLevel.name !== level.name || 
            originalLevel.description !== level.description) {
            
            updates[`${FIREBASE_EDITOR_LEVELS_PATH}/${level.id}`] = { 
                name: level.name, 
                description: level.description, 
                order: level.order 
            };
            needsFirebaseUpdate = true;
        }
    });
    
    if (!needsFirebaseUpdate) {
      // This case can happen if only name/description changed for the edited level,
      // but it's identical to what was already there, and order was not changed.
      const originalEditedLevel = sortedCurrentLevels[editedLevelIndexInSorted];
      if(originalEditedLevel.name === name.trim() && originalEditedLevel.description === description.trim() && !orderDidChange) {
        return { success: true, message: "No changes detected." };
      }
      // If here, means the edited level's name/description *did* change, but no re-ordering.
      // Fall through to update just that one level.
      updates[`${FIREBASE_EDITOR_LEVELS_PATH}/${id}`] = {
          name: name.trim(),
          description: description.trim(),
          order: sortedCurrentLevels[editedLevelIndexInSorted].order // original order
      };
    }


    try {
        await firebaseUpdate(ref(database), updates);
        return { success: true };
    } catch (error) {
        console.error("Firebase update editor level error:", error);
        return { success: false, message: "Failed to update editor level(s) in database." };
    }
  }, [editorLevels]); // Depends on editorLevels to get the current state for comparison and re-ordering


  const deleteEditorLevel = useCallback(async (idToDelete: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) {
      return { success: false, message: "Firebase DB not available." };
    }
    
    const sortedCurrentLevels = sortLevels([...editorLevels]);
    const levelBeingDeleted = sortedCurrentLevels.find(l => l.id === idToDelete);

    if (!levelBeingDeleted) {
        return { success: false, message: "Level to delete not found." };
    }
    const deletedOrder = levelBeingDeleted.order;

    const levelRef = ref(database, `${FIREBASE_EDITOR_LEVELS_PATH}/${idToDelete}`);
    try {
      await remove(levelRef);
      
      const updates: { [key: string]: any } = {};
      const remainingLevels = sortedCurrentLevels.filter(l => l.id !== idToDelete);
      
      // Re-index subsequent levels
      let reIndexNeeded = false;
      remainingLevels.forEach((level, index) => {
        if (level.order !== index) { // If current order is not the new sequential index
            updates[`${FIREBASE_EDITOR_LEVELS_PATH}/${level.id}/order`] = index;
            reIndexNeeded = true;
        }
      });

      if (reIndexNeeded && Object.keys(updates).length > 0) {
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

    const sorted = sortLevels([...editorLevels]);
    const currentIndex = sorted.findIndex(l => l.id === levelId);
    
    if (currentIndex === -1) return { success: false, message: "Level not found."};

    let newIndex;
    if (direction === 'up') {
        newIndex = currentIndex - 1;
        if (newIndex < 0) return { success: true, message: "Already at top." }; 
    } else { 
        newIndex = currentIndex + 1;
        if (newIndex >= sorted.length) return { success: true, message: "Already at bottom."};
    }

    const levelToMove = sorted[currentIndex];
    const levelToSwapWith = sorted[newIndex];

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
      editorLevels,
      addEditorLevel,
      updateEditorLevel,
      deleteEditorLevel,
      isLoadingEditorLevels,
      moveLevel,
    };
};
