
"use client";

import type { User } from '@/lib/types';
import { MOCK_USERS_DATA, FIREBASE_USERS_PATH } from '@/lib/constants';
import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase'; 
import { ref, onValue, set, remove } from 'firebase/database';
import { useLoader } from './useLoader';

const USERS_LOADER_ID = "firebase_users_loader";

export const useMockUsers = () => {
  const [users, setUsersState] = useState<User[]>(MOCK_USERS_DATA); 
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();

  useEffect(() => {
    showLoader(USERS_LOADER_ID, "Loading user data...");
    setIsUsersLoading(true);

    if (!database) {
      console.warn("UseMockUsers: Firebase Database not initialized. Using local mock data. User operations will be disabled.");
      setIsUsersLoading(false);
      hideLoader(USERS_LOADER_ID);
      setUsersState(MOCK_USERS_DATA); 
      return;
    }
    
    const dbRef = ref(database, FIREBASE_USERS_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          if (usersData && typeof usersData === 'object' && !Array.isArray(usersData)) {
            const usersArray = Object.values(usersData) as User[];
            setUsersState(usersArray);
          } else {
             if (usersData && !(typeof usersData === 'object' && !Array.isArray(usersData))) {
                console.warn("Users data from Firebase is not a non-array object:", usersData);
             }
            setUsersState(MOCK_USERS_DATA); // Fallback if data is not as expected
          }
        } else {
          const initialUsersObject: { [key: string]: User } = {};
          MOCK_USERS_DATA.forEach(user => {
            initialUsersObject[user.id] = user;
          });
          set(dbRef, initialUsersObject)
            .then(() => setUsersState(MOCK_USERS_DATA)) 
            .catch(error => {
              console.error("Firebase seed error (users):", error);
              setUsersState(MOCK_USERS_DATA); 
            });
        }
      } catch (processingError) {
        console.error("Error processing users snapshot:", processingError);
        setUsersState(MOCK_USERS_DATA); 
      } finally {
        setIsUsersLoading(false);
        hideLoader(USERS_LOADER_ID);
      }
    }, (error) => {
      console.error("Firebase read error (users):", error);
      setIsUsersLoading(false);
      hideLoader(USERS_LOADER_ID);
      setUsersState(MOCK_USERS_DATA); 
    });

    return () => {
      unsubscribe();
      hideLoader(USERS_LOADER_ID);
    };
  }, [showLoader, hideLoader, database]);

  const addUser = useCallback((username: string, role: 'admin' | 'editor'): { success: boolean, message?: string, user?: User } => {
    if (!database) {
      return { success: false, message: "Firebase not available. Cannot add user." };
    }
    if (!username.trim()) {
      return { success: false, message: "Username cannot be empty." };
    }
    
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
      });
    return { success: true, user: newUser }; 
  }, [users, database]); 

  const deleteUser = useCallback((userId: string): { success: boolean, message?: string } => {
     if (!database) {
      return { success: false, message: "Firebase not available. Cannot delete user." };
    }
    
    const currentUsers = users;
    const userExists = currentUsers.some(u => u.id === userId);
    if (!userExists && !isUsersLoading) { // Check loading state as well
        return { success: false, message: "User not found or data still loading." };
    }
    
    const userRef = ref(database, `${FIREBASE_USERS_PATH}/${userId}`);
    remove(userRef)
      .catch(error => {
        console.error("Firebase delete user error:", error);
      });
    return { success: true }; 
  }, [users, isUsersLoading, database]); 

  return { users, addUser, deleteUser, isUsersLoading }; 
};

    