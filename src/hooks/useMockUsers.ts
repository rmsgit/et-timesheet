
"use client";

import type { User } from '@/lib/types';
import { MOCK_USERS_DATA, FIREBASE_USERS_PATH } from '@/lib/constants';
import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase'; // This might be undefined
import { ref, onValue, set, remove } from 'firebase/database';
import { useLoader } from './useLoader';

const USERS_LOADER_ID = "firebase_users_loader";

export const useMockUsers = () => {
  const [users, setUsersState] = useState<User[]>(MOCK_USERS_DATA); // Initialize with mock data as a fallback
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    showLoader(USERS_LOADER_ID, "Loading user data...");

    if (!database) {
      console.warn("UseMockUsers: Firebase Database not initialized. Using local mock data. User operations will be disabled.");
      setIsUsersLoading(false);
      hideLoader(USERS_LOADER_ID);
      setUsersState(MOCK_USERS_DATA); // Ensure fallback is set
      return;
    }
    
    const dbRef = ref(database, FIREBASE_USERS_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersArray = Object.values(usersData) as User[];
        setUsersState(usersArray);
      } else {
        // No users in DB, seed MOCK_USERS_DATA if DB is available
        const initialUsersObject: { [key: string]: User } = {};
        MOCK_USERS_DATA.forEach(user => {
          initialUsersObject[user.id] = user;
        });
        set(dbRef, initialUsersObject)
          .then(() => setUsersState(MOCK_USERS_DATA)) // State updates from listener eventually
          .catch(error => {
            console.error("Firebase seed error (users):", error);
            setUsersState(MOCK_USERS_DATA); // Fallback on seed error
          });
      }
      setIsUsersLoading(false);
      hideLoader(USERS_LOADER_ID);
    }, (error) => {
      console.error("Firebase read error (users):", error);
      setIsUsersLoading(false);
      hideLoader(USERS_LOADER_ID);
      setUsersState(MOCK_USERS_DATA); // Fallback to mock data on read error
    });

    return () => {
      unsubscribe();
      hideLoader(USERS_LOADER_ID);
    };
  }, [showLoader, hideLoader]);

  const addUser = useCallback((username: string, role: 'admin' | 'editor'): { success: boolean, message?: string, user?: User } => {
    if (!database) {
      return { success: false, message: "Firebase not available. Cannot add user." };
    }
    if (!username.trim()) {
      return { success: false, message: "Username cannot be empty." };
    }
    // Check against current state, which might be Firebase-sourced or fallback
    const currentUsers = users; 
    const existingUser = currentUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      return { success: false, message: `User "${username}" already exists.` };
    }

    const newUserId = crypto.randomUUID();
    const newUser: User = { 
      id: newUserId, 
      username: username.trim(),
      role 
    };
    
    const userRef = ref(database, `${FIREBASE_USERS_PATH}/${newUserId}`);
    set(userRef, newUser)
      .catch(error => {
        console.error("Firebase add user error:", error);
        // UI might need a more robust error feedback mechanism here
      });
    return { success: true, user: newUser }; // Optimistic return
  }, [users, database]); // Added database to dependencies

  const deleteUser = useCallback((userId: string): { success: boolean, message?: string } => {
     if (!database) {
      return { success: false, message: "Firebase not available. Cannot delete user." };
    }
    // Check against current state
    const currentUsers = users;
    const userExists = currentUsers.some(u => u.id === userId);
    if (!userExists && !isUsersLoading) {
        return { success: false, message: "User not found or data still loading." };
    }
    
    const userRef = ref(database, `${FIREBASE_USERS_PATH}/${userId}`);
    remove(userRef)
      .catch(error => {
        console.error("Firebase delete user error:", error);
      });
    return { success: true }; // Optimistic return
  }, [users, isUsersLoading, database]); // Added database to dependencies

  return { users, addUser, deleteUser, isUsersLoading }; 
};
