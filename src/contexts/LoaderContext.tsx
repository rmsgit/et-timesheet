
"use client";

import React, { createContext, useState, useCallback, ReactNode } from 'react';

interface LoaderContextType {
  isLoading: boolean;
  loadingMessage: string | null;
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

export const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

interface LoaderProviderProps {
  children: ReactNode;
}

export const LoaderProvider: React.FC<LoaderProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const showLoader = useCallback((message?: string) => {
    setLoadingMessage(message || null);
    setIsLoading(true);
  }, []);

  const hideLoader = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(null);
  }, []);

  return (
    <LoaderContext.Provider value={{ isLoading, loadingMessage, showLoader, hideLoader }}>
      {children}
    </LoaderContext.Provider>
  );
};
