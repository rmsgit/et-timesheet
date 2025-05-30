
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

const AUTH_LOADER_ID = "auth_module_loader"; 

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
      console.warn("AuthContext: Firebase Auth service (auth object) is not initialized. Authentication will not work. This usually means Firebase app initialization failed in firebase.ts, likely due to missing or incorrect .env configuration for PROJECT_ID or API_KEY.");
      toast({
        title: "CRITICAL: Firebase Auth Unavailable",
        description: "Firebase Authentication service could not be initialized. Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_API_KEY are correctly set in your .env file and that you have RESTARTED your development server. Login will not function.",
        variant: "destructive",
        duration: Infinity, 
      });
      setIsAuthLoading(false);
      return; 
    }
    
    showLoader(AUTH_LOADER_ID, "Authenticating...");
    setIsAuthLoading(true);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        if (database) {
          try {
            const userRef = ref(database, `${FIREBASE_USERS_PATH}/${firebaseUser.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
              const dbUser = snapshot.val() as Omit<User, 'id' | 'email'>; 
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                username: dbUser.username || firebaseUser.email || 'User', 
                role: dbUser.role || null, 
              });
            } else {
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email,
                username: firebaseUser.email || 'User', 
                role: null, 
              });
              console.warn(`User ${firebaseUser.uid} authenticated with Firebase but not found in Realtime Database at ${FIREBASE_USERS_PATH}. No app-specific role assigned.`);
            }
          } catch (error) {
            console.error("Error fetching user data from RTDB:", error);
            setUser({ 
              id: firebaseUser.uid,
              email: firebaseUser.email,
              username: firebaseUser.email || 'User',
              role: null,
            });
            toast({ title: "Role Fetch Error", description: "Could not retrieve user role.", variant: "destructive" });
          }
        } else {
           setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            username: firebaseUser.email || 'User',
            role: null, 
          });
          console.warn("AuthContext: Firebase Database not available. Cannot fetch user role.");
           toast({ title: "Database Unavailable", description: "Cannot fetch user role, Firebase DB not configured.", variant: "destructive" });
        }
      } else {
        setUser(null);
      }
      setIsAuthLoading(false);
      hideLoader(AUTH_LOADER_ID);
    });

    return () => {
      unsubscribe();
      hideLoader(AUTH_LOADER_ID);
    }
  }, [showLoader, hideLoader, toast]); 
  
  const login = useCallback(async (email: string, password?: string): Promise<boolean> => {
    if (!auth) {
      toast({ 
        title: "CRITICAL: Firebase Auth Unavailable", 
        description: "Cannot login: Firebase Auth is not initialized. Check .env configuration (PROJECT_ID, API_KEY) and restart your server.", 
        variant: "destructive",
        duration: Infinity 
      });
      return false;
    }
    if (!password) { 
      toast({ title: "Login Error", description: "Password is required.", variant: "destructive" });
      return false;
    }

    setIsAuthLoading(true);
    showLoader(AUTH_LOADER_ID, "Logging in...");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login Successful", description: "Welcome back!"});
      return true;
    } catch (error: any) {
      console.error("Firebase login error:", error);
      let title = "Login Failed";
      let message = "An unexpected error occurred. Please try again.";

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Invalid email or password. Please check your credentials.";
      } else if (error.code === 'auth/invalid-email') {
        message = "The email address is not valid. Please enter a valid email format.";
      } else if (error.code === 'auth/operation-not-allowed') {
        title = "Sign-in Method Disabled";
        message = "Email/Password sign-in is not enabled for this Firebase project. Please contact the administrator or enable it in the Firebase console (Authentication > Sign-in method).";
      } else if (error.code === 'auth/too-many-requests') {
        message = "Access to this account has been temporarily disabled due to many failed login attempts. You can try again later or reset your password.";
      } else if (error.code === 'auth/network-request-failed') {
        message = "A network error occurred while trying to sign in. Please check your internet connection and try again.";
      }
      
      toast({ title: title, description: message, variant: "destructive" });
      setUser(null); // Ensure user state is cleared on login failure
      return false;
    } finally {
      setIsAuthLoading(false);
      hideLoader(AUTH_LOADER_ID);
    }
  }, [toast, showLoader, hideLoader]);

  const logout = useCallback(async () => {
    if (!auth) {
      toast({ 
        title: "CRITICAL: Firebase Auth Unavailable", 
        description: "Cannot logout: Firebase Auth is not initialized. Check .env configuration and restart server.", 
        variant: "destructive",
        duration: Infinity 
      });
      return;
    }
    setIsAuthLoading(true);
    showLoader(AUTH_LOADER_ID, "Logging out...");
    try {
      await signOut(auth);
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

  const isAuthenticated = !!user && !isAuthLoading; 
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const isEditor = isAuthenticated && user?.role === 'editor';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isEditor, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
