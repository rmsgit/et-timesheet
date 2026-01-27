
"use client";

import type { User } from '@/lib/types';
import { MOCK_USERS_DATA, FIREBASE_USERS_PATH } from '@/lib/constants';
import { useState, useEffect, useCallback } from 'react';
import { database, auth as firebaseAuthInstance } from '@/lib/firebase'; // Ensure auth is imported if needed for current user check
import { ref, onValue, set, remove } from 'firebase/database';
import { useLoader } from './useLoader';
import { useToast } from './use-toast';

const USERS_LOADER_ID = "firebase_users_data_loader";

export const useMockUsers = () => {
  const [users, setUsersState] = useState<User[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  useEffect(() => {
    showLoader(USERS_LOADER_ID, "Loading user profiles...");
    setIsUsersLoading(true);

    if (!database) {
      console.warn("UseMockUsers: Firebase Database object is NOT initialized. User profiles will not be loaded from Firebase.");
      setUsersState([]); 
      setIsUsersLoading(false);
      hideLoader(USERS_LOADER_ID);
      toast({
        title: "User Profiles Unavailable",
        description: "Cannot connect to Firebase Realtime Database for user profiles. Please check DATABASE_URL configuration.",
        variant: "destructive",
        duration: 10000,
      });
      return;
    }

    const dbRef = ref(database, FIREBASE_USERS_PATH);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          if (usersData && typeof usersData === 'object' && !Array.isArray(usersData)) {
            const usersArray = Object.entries(usersData).map(([uid, userData]) => ({
              id: uid,
              ...(userData as Omit<User, 'id'>),
            }));
            setUsersState(usersArray);
          } else {
             if (usersData && !(typeof usersData === 'object' && !Array.isArray(usersData))) {
                console.warn("Users data from Firebase is not a non-array object:", usersData);
             }
            setUsersState([]);
          }
        } else {
           console.info("No user data in Firebase RTDB users path. Admin can add users.");
           setUsersState([]);
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
      toast({ title: "User Profile Load Error", description: "Could not load user profiles from Firebase.", variant: "destructive"});
    });

    return () => {
      unsubscribe();
      hideLoader(USERS_LOADER_ID);
    };
  }, [showLoader, hideLoader, toast]);

  const addUserProfileToRTDB = useCallback(async (
    id: string, 
    email: string, 
    username: string, 
    role: 'admin' | 'editor',
    editorLevelId?: string,
    isEligibleForMorningOT?: boolean,
    availableLeaves?: number,
    compensatoryLeaves?: number,
    claimedCompensatoryYears?: { [year: string]: number },
    baseSalary?: number,
    department?: string,
    jobDesignation?: string,
    conveyanceAllowance?: number
  ): Promise<{ success: boolean, message?: string, user?: User }> => {
    if (!database) {
      toast({ title: "Configuration Error", description: "Firebase RTDB is not connected. User profile not added/updated.", variant: "destructive" });
      return { success: false, message: "Firebase RTDB not available." };
    }
    if (!username.trim()) {
      toast({ title: "Validation Error", description: "Username cannot be empty.", variant: "destructive" });
      return { success: false, message: "Username cannot be empty." };
    }
     if (!email.trim()) {
      toast({ title: "Validation Error", description: "Profile email cannot be empty.", variant: "destructive" });
      return { success: false, message: "Profile email cannot be empty." };
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        toast({ title: "Validation Error", description: "Please enter a valid profile email format.", variant: "destructive" });
        return { success: false, message: "Invalid profile email format." };
    }
    if (!id.trim()) {
      toast({ title: "Validation Error", description: "User ID (Firebase UID) is required.", variant: "destructive" });
      return { success: false, message: "User ID (Firebase UID) is required." };
    }

    const trimmedUsername = username.trim();
    const existingUserByUsername = users.find(u => u.username.toLowerCase() === trimmedUsername.toLowerCase() && u.id !== id);
    if (existingUserByUsername) {
      toast({ title: "Validation Error", description: `Username "${trimmedUsername}" is already used by another user.`, variant: "destructive" });
      return { success: false, message: `Username "${trimmedUsername}" already exists.` };
    }

    const userBeingEdited = users.find(u => u.id === id);
    if (userBeingEdited) { 
        const currentUserAuth = firebaseAuthInstance?.currentUser; 
        if (currentUserAuth && userBeingEdited.id === currentUserAuth.uid && 
            userBeingEdited.role === 'admin' && role === 'editor') { 

            const adminUsersCount = users.filter(u => u.role === 'admin').length;
            if (adminUsersCount <= 1) {
                toast({
                    title: "Action Restricted",
                    description: "Cannot change your own role from Admin to Editor as you are the only administrator.",
                    variant: "destructive"
                });
                return { success: false, message: "Cannot demote the last admin." };
            }
        }
    }

    const userProfileData: Omit<User, 'id'> = {
      email: email.trim(),
      username: trimmedUsername,
      role,
      editorLevelId: role === 'editor' ? (editorLevelId || null) : null,
      isEligibleForMorningOT: role === 'editor' ? (isEligibleForMorningOT ?? false) : false,
      availableLeaves: availableLeaves ?? null,
      compensatoryLeaves: compensatoryLeaves ?? null,
      claimedCompensatoryYears: claimedCompensatoryYears ?? null,
      baseSalary: baseSalary ?? null,
      department: department ?? null,
      jobDesignation: jobDesignation ?? null,
      conveyanceAllowance: conveyanceAllowance ?? null,
    };

    const userRef = ref(database, `${FIREBASE_USERS_PATH}/${id}`);
    try {
      await set(userRef, userProfileData);
      return { success: true, user: { id, ...userProfileData } };
    } catch (error) {
      console.error("Firebase add/update user profile error:", error);
      toast({ title: "Firebase Error", description: "Failed to save user profile to Firebase RTDB.", variant: "destructive" });
      return { success: false, message: "Failed to save profile to RTDB." };
    }
  }, [users, toast]);

  const deleteUserProfileFromRTDB = useCallback(async (userId: string): Promise<{ success: boolean, message?: string }> => {
     if (!database) {
      toast({ title: "Configuration Error", description: "Firebase RTDB is not connected. User profile not deleted.", variant: "destructive" });
      return { success: false, message: "Firebase RTDB not available." };
    }
    const userRef = ref(database, `${FIREBASE_USERS_PATH}/${userId}`);
    try {
      await remove(userRef);
      return { success: true };
    } catch (error) {
      console.error("Firebase delete user profile error:", error);
      toast({ title: "Firebase Error", description: "Failed to delete user profile from Firebase RTDB.", variant: "destructive" });
      return { success: false, message: "Failed to delete profile from RTDB." };
    }
  }, [toast]); 

  return { users, addUserProfileToRTDB, deleteUserProfileFromRTDB, isUsersLoading };
};
