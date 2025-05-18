
"use client";

import type { User } from '@/lib/types';
import React, { createContext, ReactNode, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';
import { auth, database } from '@/lib/firebase'; // Import auth and database
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { ref, get, child } from 'firebase/database';
import { FIREBASE_USERS_PATH } from '@/lib/constants';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>; 
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isAuthLoading: boolean; 
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_LOADER_ID = "auth_module_loader"; // Renamed to avoid conflict

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  useEffect(() => {
    if (!auth) {
      setIsAuthLoading(false);
      if (process.env.NODE_ENV === 'development') {
        console.warn("AuthContext: Firebase Auth is not initialized. Authentication will not work.");
        toast({
          title: "Auth Service Unavailable",
          description: "Firebase Auth is not configured. Please check Firebase setup.",
          variant: "destructive"
        });
      }
      return;
    }
    
    showLoader(AUTH_LOADER_ID, "Authenticating...");
    setIsAuthLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in with Firebase Auth, now fetch their role and username from RTDB
        if (database) {
          try {
            const userRef = ref(database, `${FIREBASE_USERS_PATH}/${firebaseUser.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
              const dbUser = snapshot.val() as Omit<User, 'id' | 'email'>; // RTDB stores username and role
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                username: dbUser.username || firebaseUser.email || 'User', // Fallback for username
                role: dbUser.role || null, // Default to null role if not found
              });
            } else {
              // User exists in Auth but not in our RTDB users table.
              // They are authenticated but have no specific app role or username.
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                username: firebaseUser.email || 'User', // Use email as username
                role: null, // No role assigned in the app's system
              });
              console.warn(`User ${firebaseUser.uid} authenticated with Firebase but not found in Realtime Database at ${FIREBASE_USERS_PATH}. No app-specific role assigned.`);
            }
          } catch (error) {
            console.error("Error fetching user data from RTDB:", error);
            setUser({ // Fallback if RTDB fetch fails
              id: firebaseUser.uid,
              email: firebaseUser.email,
              username: firebaseUser.email || 'User',
              role: null,
            });
            toast({ title: "Role Fetch Error", description: "Could not retrieve user role.", variant: "destructive" });
          }
        } else {
          // Database not available, user is authenticated but we can't get role
           setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            username: firebaseUser.email || 'User',
            role: null, // Cannot determine role
          });
          console.warn("AuthContext: Firebase Database not available. Cannot fetch user role.");
           toast({ title: "Database Unavailable", description: "Cannot fetch user role, Firebase DB not configured.", variant: "destructive" });
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setIsAuthLoading(false);
      hideLoader(AUTH_LOADER_ID);
    });

    return () => {
      unsubscribe();
      hideLoader(AUTH_LOADER_ID);
    }
  }, [showLoader, hideLoader, toast, router]); // router removed as push is inside login/logout
  
  const login = useCallback(async (email: string, password?: string): Promise<boolean> => {
    if (!auth) {
      toast({ title: "Auth Not Ready", description: "Firebase Auth is not initialized.", variant: "destructive" });
      return false;
    }
    if (!password) { // Ensure password is provided
      toast({ title: "Login Error", description: "Password is required.", variant: "destructive" });
      return false;
    }

    setIsAuthLoading(true);
    showLoader(AUTH_LOADER_ID, "Logging in...");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and navigating.
      // It will also fetch user role from RTDB.
      // router.push('/dashboard') will be implicitly handled by layout/page logic based on isAuthenticated
      toast({ title: "Login Successful", description: "Welcome back!"});
      return true;
    } catch (error: any) {
      console.error("Firebase login error:", error);
      let message = "Login failed. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Invalid email or password.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Please enter a valid email address.";
      }
      toast({ title: "Login Failed", description: message, variant: "destructive" });
      setUser(null);
      return false;
    } finally {
      setIsAuthLoading(false);
      hideLoader(AUTH_LOADER_ID);
    }
  }, [toast, showLoader, hideLoader]);

  const logout = useCallback(async () => {
    if (!auth) {
      toast({ title: "Auth Not Ready", description: "Firebase Auth is not initialized.", variant: "destructive" });
      return;
    }
    setIsAuthLoading(true);
    showLoader(AUTH_LOADER_ID, "Logging out...");
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null
      router.push('/login'); 
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error) {
        console.error("Firebase logout error:", error);
        toast({
            title: "Logout Error",
            description: "An unexpected error occurred while logging out.",
            variant: "destructive",
        });
    } finally {
        setIsAuthLoading(false);
        hideLoader(AUTH_LOADER_ID);
    }
  }, [toast, router, showLoader, hideLoader]);

  const isAuthenticated = !!user && !isAuthLoading; // User is authenticated only if not loading and user object exists
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const isEditor = isAuthenticated && user?.role === 'editor';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isEditor, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
