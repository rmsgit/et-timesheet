
"use client";

import React, { createContext, useState, useCallback, ReactNode, useMemo } from 'react';

interface LoaderContextType {
  isLoading: boolean;
  loadingMessage: string | null;
  showLoader: (loaderId: string, message?: string) => void;
  hideLoader: (loaderId: string) => void;
  activeLoaders: Set<string>; 
}

export const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

interface LoaderProviderProps {
  children: ReactNode;
}

export const LoaderProvider: React.FC<LoaderProviderProps> = ({ children }) => {
  const [activeLoaders, setActiveLoaders] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Map<string, string>>(new Map());

  const showLoader = useCallback((loaderId: string, message?: string) => {
    setActiveLoaders(prev => {
      const newSet = new Set(prev);
      newSet.add(loaderId);
      return newSet;
    });
    if (message) {
      setMessages(prev => {
        const newMap = new Map(prev);
        newMap.set(loaderId, message);
        return newMap;
      });
    }
  }, []);

  const hideLoader = useCallback((loaderId: string) => {
    setActiveLoaders(prev => {
      const newSet = new Set(prev);
      newSet.delete(loaderId);
      return newSet;
    });
    setMessages(prev => {
      const newMap = new Map(prev);
      newMap.delete(loaderId);
      return newMap;
    });
  }, []);

  const isLoading = activeLoaders.size > 0;
  
  const loadingMessage = useMemo(() => {
    if (!isLoading) return null;
    
    // Attempt to get the message for the most recently added loaderId still in activeLoaders
    // This is a simple heuristic; a more robust solution might involve timestamps
    const activeLoaderIds = Array.from(activeLoaders);
    if (activeLoaderIds.length > 0) {
      // Iterate in reverse to find the latest message for an active loader
      for (let i = activeLoaderIds.length - 1; i >= 0; i--) {
        const loaderId = activeLoaderIds[i];
        if (messages.has(loaderId)) {
          return messages.get(loaderId) || "Loading...";
        }
      }
    }
    return "Loading...";
  }, [isLoading, activeLoaders, messages]);

  return (
    <LoaderContext.Provider value={{ isLoading, loadingMessage, showLoader, hideLoader, activeLoaders }}>
      {children}
    </LoaderContext.Provider>
  );
};
