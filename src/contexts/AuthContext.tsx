
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useLocalStorage<User | null>(LOCAL_STORAGE_USER_KEY, null);
  const router = useRouter();

  const login = useCallback(async (username: string, _password?: string): Promise<boolean> => {
    // Mock authentication: find user in MOCK_USERS_DATA
    const foundUser = MOCK_USERS_DATA.find(u => u.username === username);
    if (foundUser) {
      // In a real app, you'd validate the password here
      // For this mock, any password for a known username is fine
      setUser(foundUser);
      router.push('/dashboard');
      return true;
    }
    setUser(null);
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
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isEditor }}>
      {children}
    </AuthContext.Provider>
  );
};
