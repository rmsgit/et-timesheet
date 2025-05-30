
"use client";

import type { User } from '@/lib/types';
import React, { createContext, ReactNode, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';
import { auth, database } from '@/lib/firebase'; // Import auth and database
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { ref, get } from 'firebase/database'; // Removed 'child' as it's not used directly here
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
    showLoader(AUTH_LOADER_ID, "Authenticating...");
    setIsAuthLoading(true); // Managed by this effect

    if (!auth) {
      console.warn("AuthContext: Firebase Auth service (auth object) is not initialized. This usually means Firebase app initialization failed in firebase.ts, likely due to missing or incorrect .env configuration for PROJECT_ID or API_KEY.");
      toast({
        title: "CRITICAL: Firebase Auth Unavailable",
        description: "Firebase Authentication service could not be initialized. Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_API_KEY are correctly set in your .env file and that you have RESTARTED your development server. Login will not function.",
        variant: "destructive",
        duration: Infinity, 
      });
      setIsAuthLoading(false);
      hideLoader(AUTH_LOADER_ID);
      return; 
    }
    
    console.log("AuthContext: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('AuthContext: onAuthStateChanged triggered. FirebaseUser UID:', firebaseUser ? firebaseUser.uid : null);
      if (firebaseUser) {
        if (database) {
          try {
            console.log(`AuthContext: User ${firebaseUser.uid} authenticated by Firebase. Fetching profile from RTDB at ${FIREBASE_USERS_PATH}/${firebaseUser.uid}...`);
            const userRef = ref(database, `${FIREBASE_USERS_PATH}/${firebaseUser.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
              const dbUser = snapshot.val() as Omit<User, 'id' | 'email'>; 
              const appUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email, // email from Firebase Auth
                username: dbUser.username || firebaseUser.email || 'User', 
                role: dbUser.role || null, 
              };
              console.log('AuthContext: RTDB profile fetched. Calling setUser with:', appUser);
              setUser(appUser);
            } else {
              // User authenticated with Firebase, but no profile in RTDB
              const appUser = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                username: firebaseUser.email || 'User', // Fallback username
                role: null, // No role defined in app's database
              };
              console.warn(`AuthContext: User ${firebaseUser.uid} has no profile in RTDB. Calling setUser with basic details:`, appUser);
              setUser(appUser);
            }
          } catch (error) {
            console.error("AuthContext: Error fetching user data from RTDB:", error);
            const appUser = { 
              id: firebaseUser.uid,
              email: firebaseUser.email,
              username: firebaseUser.email || 'User',
              role: null, // Error fetching role
            };
            console.log('AuthContext: RTDB fetch error. Calling setUser with basic details and null role:', appUser);
            setUser(appUser);
            toast({ title: "Role Fetch Error", description: "Could not retrieve user role.", variant: "destructive" });
          }
        } else {
           // Database not available, but user is authenticated by Firebase
           const appUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            username: firebaseUser.email || 'User',
            role: null, 
          };
          console.warn("AuthContext: Firebase Database not available. Cannot fetch user role. Calling setUser with basic details:", appUser);
          setUser(appUser);
          toast({ title: "Database Unavailable", description: "Cannot fetch user role, Firebase DB not configured.", variant: "destructive" });
        }
      } else {
        console.log('AuthContext: No FirebaseUser. Calling setUser(null).');
        setUser(null);
      }
      console.log('AuthContext: Calling setIsAuthLoading(false) from onAuthStateChanged.');
      setIsAuthLoading(false);
      hideLoader(AUTH_LOADER_ID);
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
      hideLoader(AUTH_LOADER_ID); // Ensure loader is hidden on cleanup
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed toast, showLoader, hideLoader from deps as they are stable from their hooks
  
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

    // Do NOT set isAuthLoading here. It's managed by onAuthStateChanged.
    showLoader(AUTH_LOADER_ID, "Logging in...");
    try {
      console.log("AuthContext: Attempting Firebase signInWithEmailAndPassword for", email);
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user and isAuthLoading
      toast({ title: "Login Successful", description: "Welcome back!"});
      console.log("AuthContext: Firebase signInWithEmailAndPassword successful for", email);
      return true;
    } catch (error: any) {
      console.error("AuthContext: Firebase login error:", error);
      let toastTitle = "Login Failed";
      let toastMessage = "An unexpected error occurred. Please try again.";

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toastMessage = "Invalid email or password. Please check your credentials.";
      } else if (error.code === 'auth/invalid-email') {
        toastMessage = "The email address is not valid. Please enter a valid email format.";
      } else if (error.code === 'auth/operation-not-allowed') {
        toastTitle = "Sign-in Method Disabled";
        toastMessage = "Email/Password sign-in is not enabled for this Firebase project. Please contact the administrator or enable it in the Firebase console (Authentication > Sign-in method).";
      } else if (error.code === 'auth/too-many-requests') {
        toastMessage = "Access to this account has been temporarily disabled due to many failed login attempts. You can try again later or reset your password.";
      } else if (error.code === 'auth/network-request-failed') {
        toastMessage = "A network error occurred while trying to sign in. Please check your internet connection and try again.";
      }
      
      toast({ title: toastTitle, description: toastMessage, variant: "destructive" });
      // setUser(null); // onAuthStateChanged will handle this if auth state truly becomes null
      return false;
    } finally {
      // Do NOT set isAuthLoading here.
      hideLoader(AUTH_LOADER_ID);
    }
  }, [toast, showLoader, hideLoader]); // `auth` is stable from firebase.ts

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
    // Do NOT set isAuthLoading here.
    showLoader(AUTH_LOADER_ID, "Logging out...");
    try {
      console.log("AuthContext: Attempting Firebase signOut.");
      await signOut(auth);
      // onAuthStateChanged will set user to null and update isAuthLoading.
      // router.push will be handled by page/layout effects reacting to isAuthenticated.
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      console.log("AuthContext: Firebase signOut successful.");
      router.push('/login'); // Explicitly redirect on logout action completion
    } catch (error) {
        console.error("AuthContext: Firebase logout error:", error);
        toast({
            title: "Logout Error",
            description: "An unexpected error occurred while logging out.",
            variant: "destructive",
        });
    } finally {
        // Do NOT set isAuthLoading here.
        hideLoader(AUTH_LOADER_ID);
    }
  }, [toast, router, showLoader, hideLoader]); // `auth` is stable

  const isAuthenticated = !!user && !isAuthLoading; 
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const isEditor = isAuthenticated && user?.role === 'editor';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, isEditor, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
