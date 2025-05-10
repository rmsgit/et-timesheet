
"use client";

import { useContext } from 'react';
import { LoaderContext } from '@/contexts/LoaderContext';

export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
};
