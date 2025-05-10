
"use client";

import type { User } from '@/lib/types';
import React, { createContext, ReactNode, useCallback, useEffect } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { LOCAL_STORAGE_USER_KEY, MOCK_USERS_DATA } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/hooks/useLoader';

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string) => Promise<boolean>; 
  logout: () => void;
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

  useEffect(() => {
    if (isAuthLoadingLocalStorage) {
      showLoader(AUTH_LOADER_ID, "Authenticating...");
    } else {
      hideLoader(AUTH_LOADER_ID);
    }
    return () => hideLoader(AUTH_LOADER_ID); // Cleanup on unmount
  }, [isAuthLoadingLocalStorage, showLoader, hideLoader]);
  
  const login = useCallback(async (username: string, _password?: string): Promise<boolean> => {
    // LoginForm already calls showLoader, this is an additional safety or for other login mechanisms
    // showLoader(AUTH_LOADER_ID, "Logging in..."); // Keep this commented if LoginForm handles it primarily
    const foundUser = MOCK_USERS_DATA.find(u => u.username === username);
    if (foundUser) {
      setUser(foundUser);
      router.push('/dashboard');
      // hideLoader(AUTH_LOADER_ID); // LoginForm handles its own hideLoader
      return true;
    }
    setUser(null); 
    // hideLoader(AUTH_LOADER_ID); // LoginForm handles its own hideLoader
    return false;
  }, [setUser, router, showLoader, hideLoader]);

  const logout = useCallback(() => {
    showLoader(AUTH_LOADER_ID, "Logging out...");
    setUser(null);
    router.push('/login');
    // The useEffect will handle hiding the loader once isAuthLoadingLocalStorage becomes false after setUser
  }, [setUser, router, showLoader]);

  const isAuthenticated = !!user;
  const isAdmin = isAuthenticated && user.role === 'admin';
  const isEditor = isAuthenticated && user.role === 'editor';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isEditor, isAuthLoading: isAuthLoadingLocalStorage }}>
      {children}
    </AuthContext.Provider>
  );
};
