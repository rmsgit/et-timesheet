
"use client";

import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove } from 'firebase/database';
import { INITIAL_EDITOR_RATING_CATEGORIES, FIREBASE_EDITOR_RATING_CATEGORIES_PATH } from '@/lib/constants';
import type { EditorRatingCategory } from '@/lib/types';
import { useLoader } from './useLoader';
import { useToast } from './use-toast';

const RATING_CATEGORIES_LOADER_ID = "firebase_rating_categories_loader";

export const useEditorRatingCategories = () => {
  const [editorRatingCategories, setEditorRatingCategories] = useState<EditorRatingCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  const sortCategories = (categories: EditorRatingCategory[]) => categories.sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    showLoader(RATING_CATEGORIES_LOADER_ID, "Loading rating categories...");
    setIsLoading(true);

    if (!database) {
      console.warn("useEditorRatingCategories: Firebase Database object is NOT initialized. Using initial defaults.");
      setEditorRatingCategories(sortCategories(INITIAL_EDITOR_RATING_CATEGORIES));
      setIsLoading(false);
      hideLoader(RATING_CATEGORIES_LOADER_ID);
      toast({
        title: "Rating Categories Unavailable",
        description: "Cannot connect to Firebase. Using default categories.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    const dbRef = ref(database, FIREBASE_EDITOR_RATING_CATEGORIES_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            const categoriesArray = Object.entries(data).map(([id, categoryData]) => ({
              id,
              ...({...(categoryData as Omit<EditorRatingCategory, 'id'>) }), 
            }));
            setEditorRatingCategories(sortCategories(categoriesArray));
          } else {
            setEditorRatingCategories([]);
          }
        } else {
           console.info("No rating categories in Firebase, seeding with initial data.");
           const initialDataToSeed: { [key: string]: Omit<EditorRatingCategory, 'id'> } = {};
           INITIAL_EDITOR_RATING_CATEGORIES.forEach(category => {
             const { id, ...rest } = category;
             initialDataToSeed[id] = rest;
           });
           set(dbRef, initialDataToSeed)
            .then(() => {
                setEditorRatingCategories(sortCategories(INITIAL_EDITOR_RATING_CATEGORIES)); 
                toast({ title: "Rating Categories Seeded", description: "Initial categories populated in Firebase."});
            })
            .catch(error => {
                console.error("Firebase seed error (rating categories):", error);
                setEditorRatingCategories(sortCategories(INITIAL_EDITOR_RATING_CATEGORIES));
                toast({ title: "Seeding Error", description: "Could not seed rating categories.", variant: "destructive"});
            });
        }
      } catch (e) {
        console.error("Error processing rating categories snapshot:", e);
        setEditorRatingCategories(sortCategories(INITIAL_EDITOR_RATING_CATEGORIES));
      } finally {
        setIsLoading(false);
        hideLoader(RATING_CATEGORIES_LOADER_ID);
      }
    }, (error) => {
      console.error("Firebase read error (rating categories):", error);
      setIsLoading(false);
      hideLoader(RATING_CATEGORIES_LOADER_ID);
      setEditorRatingCategories(sortCategories(INITIAL_EDITOR_RATING_CATEGORIES)); 
      toast({ title: "Read Error", description: "Could not load rating categories from Firebase.", variant: "destructive"});
    });

    return () => {
      unsubscribe();
      hideLoader(RATING_CATEGORIES_LOADER_ID);
    };
  }, [showLoader, hideLoader, toast]);

  const addEditorRatingCategory = useCallback(async (name: string, description: string, weight: number): Promise<{ success: boolean; message?: string; id?: string }> => {
    if (!database) return { success: false, message: "Firebase DB not available." };
    if (!name.trim()) return { success: false, message: "Category name cannot be empty." };
    if (editorRatingCategories.some(cat => cat.name.toLowerCase() === name.trim().toLowerCase())) {
        return { success: false, message: `A category with the name "${name.trim()}" already exists.` };
    }

    const newCategoryRef = push(ref(database, FIREBASE_EDITOR_RATING_CATEGORIES_PATH));
    const newId = newCategoryRef.key;
    if (!newId) return { success: false, message: "Could not generate a new category ID." };

    const categoryData: Omit<EditorRatingCategory, 'id'> = { name: name.trim(), description: description, weight };
    try {
      await set(newCategoryRef, categoryData);
      return { success: true, id: newId };
    } catch (error) {
      console.error("Firebase add rating category error:", error);
      return { success: false, message: "Failed to add category to database." };
    }
  }, [editorRatingCategories]);

  const updateEditorRatingCategory = useCallback(async (id: string, name: string, description: string, weight: number): Promise<{ success: boolean; message?: string }> => {
    if (!database) return { success: false, message: "Firebase DB not available." };
    if (!name.trim()) return { success: false, message: "Category name cannot be empty." };

    const existingCategory = editorRatingCategories.find(cat => cat.id !== id && cat.name.toLowerCase() === name.trim().toLowerCase());
    if (existingCategory) {
        return { success: false, message: `Another category with the name "${name.trim()}" already exists.` };
    }

    const categoryData: Omit<EditorRatingCategory, 'id'> = { name: name.trim(), description, weight };
    try {
        await set(ref(database, `${FIREBASE_EDITOR_RATING_CATEGORIES_PATH}/${id}`), categoryData);
        return { success: true };
    } catch (error) {
        console.error("Firebase update rating category error:", error);
        return { success: false, message: "Failed to update category in database." };
    }
  }, [editorRatingCategories]);

  const deleteEditorRatingCategory = useCallback(async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (!database) return { success: false, message: "Firebase DB not available." };
    try {
        await remove(ref(database, `${FIREBASE_EDITOR_RATING_CATEGORIES_PATH}/${id}`));
        return { success: true };
    } catch (error) {
        console.error("Firebase delete rating category error:", error);
        return { success: false, message: "Failed to delete category from database." };
    }
  }, []);

  return { editorRatingCategories, isLoading, addEditorRatingCategory, updateEditorRatingCategory, deleteEditorRatingCategory };
};
