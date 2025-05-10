
"use client";

import type { User } from '@/lib/types';
import React, { createContext, ReactNode, useCallback } from 'react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { LOCAL_STORAGE_USER_KEY, MOCK_USERS_DATA } from '@/lib/constants';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  login: (username: string, password?: string) => Promise<boolean>; // Password for simulation, not actually used for validation here
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isAuthLoading: boolean; // New loading state
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser, isAuthLoading] = useLocalStorage<User | null>(LOCAL_STORAGE_USER_KEY, null);
  const router = useRouter();

  const login = useCallback(async (username: string, _password?: string): Promise<boolean> => {
    const foundUser = MOCK_USERS_DATA.find(u => u.username === username);
    if (foundUser) {
      setUser(foundUser);
      router.push('/dashboard');
      return true;
    }
    setUser(null); // Ensure user is null if login fails
    return false;
  }, [setUser, router]);

  const logout = useCallback(() => {
    setUser(null);
    router.push('/login');
  }, [setUser, router]);

  const isAuthenticated = !!user;
  const isAdmin = isAuthenticated && user.role === 'admin';
  const isEditor = isAuthenticated && user.role === 'editor';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isEditor, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
