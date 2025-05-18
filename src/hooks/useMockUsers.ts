
"use client";

import type { User } from '@/lib/types';
import { MOCK_USERS_DATA, FIREBASE_USERS_PATH } from '@/lib/constants';
import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase'; 
import { ref, onValue, set, remove } from 'firebase/database';
import { useLoader } from './useLoader';
import { useToast } from './use-toast'; // Import useToast

const USERS_LOADER_ID = "firebase_users_loader";

export const useMockUsers = () => {
  const [users, setUsersState] = useState<User[]>([]); 
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast(); // Initialize useToast

  useEffect(() => {
    showLoader(USERS_LOADER_ID, "Loading user data...");
    setIsUsersLoading(true);

    if (!database) {
      console.warn("UseMockUsers: Firebase Database not initialized or not configured with a real Project ID. Using local mock data for display. User operations will not persist to Firebase.");
      setUsersState(MOCK_USERS_DATA); // Fallback to MOCK_USERS_DATA for display purposes
      setIsUsersLoading(false);
      hideLoader(USERS_LOADER_ID);
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
            setUsersState(MOCK_USERS_DATA); 
          }
        } else {
          // If no data in Firebase, seed it with MOCK_USERS_DATA
          console.info("No user data in Firebase, seeding with initial mock users.");
          const initialUsersObject: { [key: string]: User } = {};
          MOCK_USERS_DATA.forEach(user => {
            initialUsersObject[user.id] = user;
          });
          set(dbRef, initialUsersObject)
            .then(() => {
                setUsersState(MOCK_USERS_DATA);
                toast({ title: "Users Seeded", description: "Initial user data populated in Firebase."});
            }) 
            .catch(error => {
              console.error("Firebase seed error (users):", error);
              setUsersState(MOCK_USERS_DATA); 
              toast({ title: "Seeding Error", description: "Could not seed users in Firebase.", variant: "destructive"});
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
      toast({ title: "Read Error", description: "Could not load users from Firebase.", variant: "destructive"});
    });

    return () => {
      unsubscribe();
      hideLoader(USERS_LOADER_ID);
    };
  }, [showLoader, hideLoader, toast]); // Removed 'database' from deps

  const addUser = useCallback((username: string, role: 'admin' | 'editor'): { success: boolean, message?: string, user?: User } => {
    if (!database) {
      toast({ title: "Configuration Error", description: "Firebase is not connected. User not added.", variant: "destructive" });
      console.warn("AddUser: Firebase DB not initialized or not configured correctly. User will NOT be saved to Firebase.");
      return { success: false, message: "Firebase not available. Cannot add user." };
    }
    if (!username.trim()) {
      toast({ title: "Validation Error", description: "Username cannot be empty.", variant: "destructive" });
      return { success: false, message: "Username cannot be empty." };
    }
    
    const currentUsers = users; 
    const existingUser = currentUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
      toast({ title: "Validation Error", description: `User "${username}" already exists.`, variant: "destructive" });
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
        toast({ title: "User Added", description: `User "${newUser.username}" added to Firebase.` });
      })
      .catch(error => {
        console.error("Firebase add user error:", error);
        toast({ title: "Firebase Error", description: "Failed to add user to Firebase.", variant: "destructive" });
      });
    // Optimistic update for UI, actual state syncs via onValue listener
    // setUsersState(prev => [...prev, newUser]); 
    return { success: true, user: newUser }; 
  }, [users, toast]); // Removed 'database' from deps

  const deleteUser = useCallback((userId: string): { success: boolean, message?: string } => {
     if (!database) {
      toast({ title: "Configuration Error", description: "Firebase is not connected. User not deleted.", variant: "destructive" });
      console.warn("DeleteUser: Firebase DB not initialized or not configured correctly. User will NOT be deleted from Firebase.");
      return { success: false, message: "Firebase not available. Cannot delete user." };
    }
    
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete && !isUsersLoading) {
        toast({ title: "Error", description: "User not found or data still loading.", variant: "destructive" });
        return { success: false, message: "User not found or data still loading." };
    }
    
    const userRef = ref(database, `${FIREBASE_USERS_PATH}/${userId}`);
    remove(userRef)
      .then(() => {
        toast({ title: "User Deleted", description: `User "${userToDelete?.username}" deleted from Firebase.` });
      })
      .catch(error => {
        console.error("Firebase delete user error:", error);
        toast({ title: "Firebase Error", description: "Failed to delete user from Firebase.", variant: "destructive" });
      });
    // Optimistic removal for UI, actual state syncs via onValue listener
    // setUsersState(prev => prev.filter(u => u.id !== userId));
    return { success: true }; 
  }, [users, isUsersLoading, toast]); // Removed 'database' from deps

  return { users, addUser, deleteUser, isUsersLoading }; 
};
