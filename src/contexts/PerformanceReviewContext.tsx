
"use client";

import React, { createContext, ReactNode } from 'react';
import { usePerformanceReviews } from '@/hooks/usePerformanceReviews';
import type { PerformanceReview, CategoryRating } from '@/lib/types';

interface PerformanceReviewContextType {
  reviews: PerformanceReview[];
  isLoading: boolean;
  addReview: (editorId: string, adminId: string, data: { overallComment: string; categoryRatings: CategoryRating[] }) => Promise<{ success: boolean; id?: string }>;
  updateReview: (reviewId: string, data: { overallComment: string; categoryRatings: CategoryRating[] }) => Promise<{ success: boolean }>;
  deleteReview: (reviewId: string) => Promise<{ success: boolean }>;
}

export const PerformanceReviewContext = createContext<PerformanceReviewContextType | undefined>(undefined);

interface PerformanceReviewProviderProps {
  children: ReactNode;
}

export const PerformanceReviewProvider: React.FC<PerformanceReviewProviderProps> = ({ children }) => {
  const performanceReviewData = usePerformanceReviews();

  return (
    <PerformanceReviewContext.Provider value={performanceReviewData}>
      {children}
    </PerformanceReviewContext.Provider>
  );
};
