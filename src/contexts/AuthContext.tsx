"use client";

import type { User } from '@/lib/types';
import React, { createContext, ReactNode, useCallback, useEffect } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { LOCAL_STORAGE_USER_KEY, MOCK_USERS_DATA } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string) => Promise<boolean>; 
  logout: () => Promise<void>; // Changed to Promise<void> as it's now async
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isAuthLoading: boolean; 
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_LOADER_ID = "auth_loader";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser, isAuthLoadingLocalStorage] = useLocalStorage<User | null>(LOCAL_STORAGE_USER_KEY, null);
  const router = useRouter();
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthLoadingLocalStorage) {
      showLoader(AUTH_LOADER_ID, "Authenticating...");
    } else {
      hideLoader(AUTH_LOADER_ID);
    }
    return () => hideLoader(AUTH_LOADER_ID); // Cleanup on unmount
  }, [isAuthLoadingLocalStorage, showLoader, hideLoader]);
  
  const login = useCallback(async (username: string, _password?: string): Promise<boolean> => {
    const foundUser = MOCK_USERS_DATA.find(u => u.username === username);
    if (foundUser) {
      setUser(foundUser);
      router.push('/dashboard');
      return true;
    }
    setUser(null); 
    return false;
  }, [setUser, router]);

  const logout = useCallback(async () => {
    showLoader(AUTH_LOADER_ID, "Logging out...");
    try {
      setUser(null);
      // router.push is asynchronous. The loader will hide after navigation is initiated.
      router.push('/login');
    } catch (error) {
        console.error("Logout error:", error);
        toast({
            title: "Logout Error",
            description: "An unexpected error occurred while logging out.",
            variant: "destructive",
        });
    } finally {
        hideLoader(AUTH_LOADER_ID);
    }
  }, [setUser, router, showLoader, hideLoader, toast]);

  const isAuthenticated = !!user;
  const isAdmin = isAuthenticated && user.role === 'admin';
  const isEditor = isAuthenticated && user.role === 'editor';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isEditor, isAuthLoading: isAuthLoadingLocalStorage }}>
      {children}
    </AuthContext.Provider>
  );
};
