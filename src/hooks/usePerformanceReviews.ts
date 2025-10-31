
"use client";

import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, push, remove, update as firebaseUpdate, serverTimestamp } from 'firebase/database';
import { FIREBASE_PERFORMANCE_REVIEWS_PATH } from '@/lib/constants';
import type { PerformanceReview, CategoryRating } from '@/lib/types';
import { useLoader } from './useLoader';

const REVIEWS_LOADER_ID = "firebase_performance_reviews_loader";

export const usePerformanceReviews = () => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    showLoader(REVIEWS_LOADER_ID, "Loading performance reviews...");
    setIsLoading(true);

    if (!database) {
      console.warn("usePerformanceReviews: Firebase Database is not initialized.");
      setIsLoading(false);
      hideLoader(REVIEWS_LOADER_ID);
      return;
    }

    const dbRef = ref(database, FIREBASE_PERFORMANCE_REVIEWS_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const reviewsArray = Object.entries(data).map(([id, reviewData]) => ({
            id,
            ...(reviewData as Omit<PerformanceReview, 'id'>),
          }));
          setReviews(reviewsArray);
        } else {
          setReviews([]);
        }
      } catch (e) {
        console.error("Error processing performance reviews snapshot:", e);
        setReviews([]);
      } finally {
        setIsLoading(false);
        hideLoader(REVIEWS_LOADER_ID);
      }
    }, (error) => {
      console.error("Firebase read error (performanceReviews):", error);
      setIsLoading(false);
      hideLoader(REVIEWS_LOADER_ID);
    });

    return () => {
      unsubscribe();
      hideLoader(REVIEWS_LOADER_ID);
    };
  }, [showLoader, hideLoader]);

  const addReview = useCallback(async (editorId: string, adminId: string, data: { overallComment: string; categoryRatings: CategoryRating[] }): Promise<{ success: boolean; id?: string }> => {
    if (!database) return { success: false };

    const newReviewRef = push(ref(database, FIREBASE_PERFORMANCE_REVIEWS_PATH));
    const newId = newReviewRef.key;
    if (!newId) return { success: false };

    const reviewData: Omit<PerformanceReview, 'id'> = {
      editorId,
      adminId,
      date: new Date().toISOString(),
      overallComment: data.overallComment,
      categoryRatings: data.categoryRatings,
    };

    try {
      await set(newReviewRef, reviewData);
      return { success: true, id: newId };
    } catch (error) {
      console.error("Firebase add performance review error:", error);
      return { success: false };
    }
  }, []);

  const updateReview = useCallback(async (reviewId: string, data: { overallComment: string; categoryRatings: CategoryRating[] }): Promise<{ success: boolean }> => {
    if (!database) return { success: false };
    
    const updates = {
        overallComment: data.overallComment,
        categoryRatings: data.categoryRatings,
        date: new Date().toISOString(), // Also update the date on edit
    };

    try {
      await firebaseUpdate(ref(database, `${FIREBASE_PERFORMANCE_REVIEWS_PATH}/${reviewId}`), updates);
      return { success: true };
    } catch (error) {
      console.error("Firebase update performance review error:", error);
      return { success: false };
    }
  }, []);

  const deleteReview = useCallback(async (reviewId: string): Promise<{ success: boolean }> => {
    if (!database) return { success: false };
    try {
      await remove(ref(database, `${FIREBASE_PERFORMANCE_REVIEWS_PATH}/${reviewId}`));
      return { success: true };
    } catch (error) {
      console.error("Firebase delete performance review error:", error);
      return { success: false };
    }
  }, []);

  return { reviews, isLoading, addReview, updateReview, deleteReview };
};
