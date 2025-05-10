
"use client";

import type { User } from '@/lib/types';
import { MOCK_USERS_DATA, FIREBASE_USERS_PATH } from '@/lib/constants';
import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { useLoader } from './useLoader';

const USERS_LOADER_ID = "firebase_users_loader";

export const useMockUsers = () => {
  const [users, setUsersState] = useState<User[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    showLoader(USERS_LOADER_ID, "Loading user data...");
    const dbRef = ref(database, FIREBASE_USERS_PATH);
    
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersArray = Object.values(usersData) as User[];
        setUsersState(usersArray);
      } else {
        // No users in DB, seed MOCK_USERS_DATA
        const initialUsersObject: { [key: string]: User } = {};
        MOCK_USERS_DATA.forEach(user => {
          initialUsersObject[user.id] = user;
        });
        set(dbRef, initialUsersObject)
          .then(() => setUsersState(MOCK_USERS_DATA))
          .catch(error => console.error("Firebase seed error (users):", error));
      }
      setIsUsersLoading(false);
      hideLoader(USERS_LOADER_ID);
    }, (error) => {
      console.error("Firebase read error (users):", error);
      setIsUsersLoading(false);
      hideLoader(USERS_LOADER_ID);
      setUsersState([]); // Fallback to empty on error
    });

    return () => {
      unsubscribe();
      hideLoader(USERS_LOADER_ID);
    };
  }, [showLoader, hideLoader]);

  const addUser = useCallback((username: string, role: 'admin' | 'editor'): { success: boolean, message?: string, user?: User } => {
    if (!username.trim()) {
      return { success: false, message: "Username cannot be empty." };
    }
    const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());
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
      .then(() => {
        // Firebase onValue listener will update the local state
      })
      .catch(error => {
        console.error("Firebase add user error:", error);
        // Caller should handle this error, perhaps with a toast
      });
    return { success: true, user: newUser }; // Optimistic return
  }, [users]);

  const deleteUser = useCallback((userId: string): { success: boolean, message?: string } => {
    const userExists = users.some(u => u.id === userId);
    if (!userExists && !isUsersLoading) { // Check loading state to avoid premature "not found"
        return { success: false, message: "User not found or data still loading." };
    }
    
    const userRef = ref(database, `${FIREBASE_USERS_PATH}/${userId}`);
    remove(userRef)
      .then(() => {
        // Firebase onValue listener will update the local state
      })
      .catch(error => {
        console.error("Firebase delete user error:", error);
      });
    return { success: true }; // Optimistic return
  }, [users, isUsersLoading]);

  // setUsers function is not directly exposed as state is managed by Firebase listener
  // If direct manipulation is needed, it would require writing back to Firebase.

  return { users, addUser, deleteUser, isUsersLoading }; 
};
