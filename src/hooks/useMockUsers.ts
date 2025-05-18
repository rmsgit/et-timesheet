
"use client";

import type { User } from '@/lib/types';
import { MOCK_USERS_DATA, FIREBASE_USERS_PATH } from '@/lib/constants';
import { useState, useEffect, useCallback } from 'react';
import { database } from '@/lib/firebase'; 
import { ref, onValue, set, remove } from 'firebase/database';
import { useLoader } from './useLoader';
import { useToast } from './use-toast'; 
import { auth } from '@/lib/firebase'; // Import Firebase Auth
import { createUserWithEmailAndPassword } from 'firebase/auth'; // For creating auth users

const USERS_LOADER_ID = "firebase_users_data_loader"; // Differentiate from auth loader

export const useMockUsers = () => {
  const [users, setUsersState] = useState<User[]>([]); 
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast(); 

  useEffect(() => {
    showLoader(USERS_LOADER_ID, "Loading user profiles...");
    setIsUsersLoading(true);

    if (!database) {
      console.warn("UseMockUsers (RTDB): Firebase Database not initialized. Using local mock data for display. User profile operations will not persist to Firebase.");
      // setUsersState(MOCK_USERS_DATA); // Don't use MOCK_USERS_DATA directly as it contains placeholder UIDs
      setUsersState([]); // Start with empty if DB not connected
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
            // Map Firebase UIDs from keys to 'id' field in User objects
            const usersArray = Object.entries(usersData).map(([uid, userData]) => ({
              id: uid, // The key in RTDB is the Firebase UID
              ...(userData as Omit<User, 'id'>),
            }));
            setUsersState(usersArray);
          } else {
             if (usersData && !(typeof usersData === 'object' && !Array.isArray(usersData))) {
                console.warn("Users data from Firebase is not a non-array object:", usersData);
             }
            // Seed if empty only if MOCK_USERS_DATA is meant for seeding (requires real UIDs for keys)
            // For now, if format is wrong or empty, just set to empty.
            setUsersState([]); 
          }
        } else {
           console.info("No user data in Firebase RTDB users path. Admin can add users.");
           setUsersState([]); // Set to empty if no users exist
        }
      } catch (processingError) {
        console.error("Error processing users snapshot from RTDB:", processingError);
        setUsersState([]); 
      } finally {
        setIsUsersLoading(false);
        hideLoader(USERS_LOADER_ID);
      }
    }, (error) => {
      console.error("Firebase read error (users RTDB):", error);
      setIsUsersLoading(false);
      hideLoader(USERS_LOADER_ID);
      setUsersState([]); 
      toast({ title: "Read Error", description: "Could not load user profiles from Firebase.", variant: "destructive"});
    });

    return () => {
      unsubscribe();
      hideLoader(USERS_LOADER_ID);
    };
  }, [showLoader, hideLoader, toast]);

  // Note: This addUser now only adds the user's profile (role, username) to RTDB.
  // It does NOT create an authentication user in Firebase Auth.
  // That would typically be done via a registration flow or Firebase console.
  // For an admin panel "Add User", you'd ideally create both.
  // For now, this assumes an Auth user (with an email/password) is created separately.
  // The `id` parameter should be the Firebase UID of the pre-existing Auth user.
  const addUserProfileToRTDB = useCallback(async (id: string, email: string, username: string, role: 'admin' | 'editor'): Promise<{ success: boolean, message?: string, user?: User }> => {
    if (!database) {
      toast({ title: "Configuration Error", description: "Firebase RTDB is not connected. User profile not added.", variant: "destructive" });
      return { success: false, message: "Firebase RTDB not available." };
    }
    if (!username.trim()) {
      toast({ title: "Validation Error", description: "Username cannot be empty.", variant: "destructive" });
      return { success: false, message: "Username cannot be empty." };
    }
    if (!id.trim()) {
      toast({ title: "Validation Error", description: "User ID (Firebase UID) is required.", variant: "destructive" });
      return { success: false, message: "User ID (Firebase UID) is required." };
    }
    
    const existingUser = users.find(u => u.id === id || u.username.toLowerCase() === username.toLowerCase());
    if (existingUser && existingUser.id !== id) { // Check if username is taken by another user
      toast({ title: "Validation Error", description: `Username "${username}" already exists.`, variant: "destructive" });
      return { success: false, message: `Username "${username}" already exists.` };
    }

    // Data to store in RTDB (excluding id, as it's the key)
    const userProfileData: Omit<User, 'id'> = { 
      email: email, // Store email for reference if needed
      username: username.trim(),
      role 
    };
    
    const userRef = ref(database, `${FIREBASE_USERS_PATH}/${id}`); // Use provided ID (Firebase UID) as key
    try {
      await set(userRef, userProfileData);
      toast({ title: "User Profile Added", description: `User profile for "${username}" added to Firebase RTDB.` });
      // The onValue listener will update the local state.
      return { success: true, user: { id, ...userProfileData } };
    } catch (error) {
      console.error("Firebase add user profile error:", error);
      toast({ title: "Firebase Error", description: "Failed to add user profile to Firebase RTDB.", variant: "destructive" });
      return { success: false, message: "Failed to save profile to RTDB." };
    }
  }, [users, toast]); 

  const deleteUserProfileFromRTDB = useCallback(async (userId: string): Promise<{ success: boolean, message?: string }> => {
     if (!database) {
      toast({ title: "Configuration Error", description: "Firebase RTDB is not connected. User profile not deleted.", variant: "destructive" });
      return { success: false, message: "Firebase RTDB not available." };
    }
    
    const userToDelete = users.find(u => u.id === userId);
    
    const userRef = ref(database, `${FIREBASE_USERS_PATH}/${userId}`);
    try {
      await remove(userRef);
      toast({ title: "User Profile Deleted", description: `User profile for "${userToDelete?.username || userId}" deleted from Firebase RTDB.` });
      // The onValue listener will update local state.
      return { success: true };
    } catch (error) {
      console.error("Firebase delete user profile error:", error);
      toast({ title: "Firebase Error", description: "Failed to delete user profile from Firebase RTDB.", variant: "destructive" });
      return { success: false, message: "Failed to delete profile from RTDB." };
    }
  }, [users, toast]); 

  // This hook now primarily manages RTDB user *profiles*.
  // `addUser` is renamed to `addUserProfileToRTDB` for clarity.
  // `deleteUser` is renamed to `deleteUserProfileFromRTDB`.
  // Actual Firebase Auth user creation/deletion is not handled here.
  return { users, addUserProfileToRTDB, deleteUserProfileFromRTDB, isUsersLoading }; 
};
