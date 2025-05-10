
"use client";

import type { User } from '@/lib/types';
import { LOCAL_STORAGE_USERS_MOCK_KEY, MOCK_USERS_DATA } from '@/lib/constants';
import useLocalStorage from './useLocalStorage';
import { useCallback, useEffect } from 'react';
import { useLoader } from './useLoader';

const USERS_LOADER_ID = "users_loader";

export const useMockUsers = () => {
  const [users, setUsers, isUsersLoadingLocalStorage] = useLocalStorage<User[]>(LOCAL_STORAGE_USERS_MOCK_KEY, MOCK_USERS_DATA);
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    if (isUsersLoadingLocalStorage) {
      showLoader(USERS_LOADER_ID, "Loading user data...");
    } else {
      hideLoader(USERS_LOADER_ID);
    }
    return () => hideLoader(USERS_LOADER_ID); 
  }, [isUsersLoadingLocalStorage, showLoader, hideLoader]);

  const addUser = useCallback((username: string, role: 'admin' | 'editor'): { success: boolean, message?: string, user?: User } => {
    if (!username.trim()) {
      return { success: false, message: "Username cannot be empty." };
    }
    const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      return { success: false, message: `User "${username}" already exists.` };
    }

    const newUser: User = { 
      id: crypto.randomUUID(), 
      username: username.trim(),
      role 
    };
    setUsers(prev => [...prev, newUser]);
    console.log("Mock add user:", newUser);
    return { success: true, user: newUser };
  }, [users, setUsers]);

  const deleteUser = useCallback((userId: string): { success: boolean, message?: string } => {
    const userExists = users.some(u => u.id === userId);
    if (!userExists) {
        return { success: false, message: "User not found." };
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    console.log("Mock delete user:", userId);
    return { success: true };
  }, [users, setUsers]);

  return { users, addUser, deleteUser, isUsersLoading: isUsersLoadingLocalStorage, setUsers }; 
};
