
"use client";

import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { LOCAL_STORAGE_USERS_MOCK_KEY, MOCK_USERS_DATA } from '@/lib/constants';
import useLocalStorage from './useLocalStorage';

export const useMockUsers = () => {
  const [users, setUsers] = useLocalStorage<User[]>(LOCAL_STORAGE_USERS_MOCK_KEY, MOCK_USERS_DATA);

  // Note: In a real app, these functions would interact with a backend API.
  // For this mock, we just show a toast and don't actually modify the list permanently beyond session storage,
  // or we could modify the localStorage list if desired.
  // For simplicity, creation/deletion is mocked in UI means no actual list change.

  const addUser = (user: Omit<User, 'id'>) => {
    // This is a mock, so we won't actually add to the list used by AuthContext.
    // Just an example of how it might be structured.
    // const newUser = { ...user, id: crypto.randomUUID() };
    // setUsers(prev => [...prev, newUser]);
    console.log("Mock add user:", user);
  };

  const deleteUser = (userId: string) => {
    // setUsers(prev => prev.filter(u => u.id !== userId));
    console.log("Mock delete user:", userId);
  };

  return { users, addUser, deleteUser };
};
