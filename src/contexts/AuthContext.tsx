
"use client";

import type { User } from '@/lib/types';
import React, { createContext, ReactNode, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/hooks/useLoader';
import { useToast } from '@/hooks/use-toast';
import { auth, database } from '@/lib/firebase'; // Import auth and database
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { FIREBASE_USERS_PATH } from '@/lib/constants';

interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isEditor: boolean;
  isAuthLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_LOADER_ID = "auth_module_loader";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [userState, _setUserState] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const router = useRouter();
  const { showLoader, hideLoader } = useLoader();
  const { toast } = useToast();

  // Wrapper for setUserState to log changes
  const setUser = useCallback((newUser: User | null) => {
    console.log("AuthContext: setUser called with:", newUser);
    _setUserState(newUser);
  }, []);

  useEffect(() => {
    setIsAuthLoading(true); // Ensure loading is true when listener setup starts
    showLoader(AUTH_LOADER_ID, "Authenticating...");
    console.log("AuthContext: useEffect for onAuthStateChanged - setting up listener.");

    if (!auth) {
      console.warn("AuthContext: Firebase Auth service (auth object) is not initialized. This usually means Firebase app initialization failed, likely due to missing or incorrect .env configuration for PROJECT_ID or API_KEY.");
      toast({
        title: "CRITICAL: Firebase Auth Unavailable",
        description: "Firebase Authentication service could not be initialized. Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID and NEXT_PUBLIC_FIREBASE_API_KEY are correctly set in your .env file and that you have RESTARTED your development server. Login will not function.",
        variant: "destructive",
        duration: Infinity,
      });
      setIsAuthLoading(false);
      hideLoader(AUTH_LOADER_ID);
      setUser(null); // Ensure user is null if auth is not available
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('AuthContext: onAuthStateChanged triggered. FirebaseUser UID:', firebaseUser ? firebaseUser.uid : null);
      if (firebaseUser) {
        if (database) {
          try {
            console.log(`AuthContext: User ${firebaseUser.uid} authenticated by Firebase. Fetching profile from RTDB at ${FIREBASE_USERS_PATH}/${firebaseUser.uid}...`);
            const userRef = ref(database, `${FIREBASE_USERS_PATH}/${firebaseUser.uid}`);
            const snapshot = await get(userRef);
            if (snapshot.exists()) {
              const dbUser = snapshot.val() as Omit<User, 'id' | 'email'>; // This type includes username, role, and editorLevelId (optional)
              const appUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                username: dbUser.username || firebaseUser.email || 'User',
                role: dbUser.role || null,
                editorLevelId: dbUser.role === 'editor' ? dbUser.editorLevelId : undefined,
                isEligibleForMorningOT: dbUser.isEligibleForMorningOT ?? false,
                availableLeaves: dbUser.availableLeaves ?? 0,
                compensatoryLeaves: dbUser.compensatoryLeaves ?? 0,
              };
              console.log('AuthContext: RTDB profile fetched. Calling setUser with:', appUser);
              setUser(appUser);
            } else {
              const appUser: User = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                username: firebaseUser.email || 'User',
                role: null,
                editorLevelId: undefined,
                isEligibleForMorningOT: false,
                availableLeaves: 0,
                compensatoryLeaves: 0,
              };
              console.warn(`AuthContext: User ${firebaseUser.uid} has no profile in RTDB. Calling setUser with basic details:`, appUser);
              setUser(appUser);
            }
          } catch (error) {
            console.error("AuthContext: Error fetching user data from RTDB:", error);
            const appUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              username: firebaseUser.email || 'User',
              role: null,
              editorLevelId: undefined,
              isEligibleForMorningOT: false,
              availableLeaves: 0,
              compensatoryLeaves: 0,
            };
            console.log('AuthContext: RTDB fetch error. Calling setUser with basic details and null role:', appUser);
            setUser(appUser);
            toast({ title: "Role Fetch Error", description: "Could not retrieve user role.", variant: "destructive" });
          }
        } else {
           const appUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            username: firebaseUser.email || 'User',
            role: null,
            editorLevelId: undefined,
            isEligibleForMorningOT: false,
            availableLeaves: 0,
            compensatoryLeaves: 0,
          };
          console.warn("AuthContext: Firebase Database not available. Cannot fetch user role. Calling setUser with basic details:", appUser);
          setUser(appUser);
          toast({ title: "Database Unavailable", description: "Cannot fetch user role, Firebase DB not configured.", variant: "destructive" });
        }
      } else {
        console.log('AuthContext: No FirebaseUser in onAuthStateChanged. Calling setUser(null).');
        setUser(null);
      }
      console.log('AuthContext: Calling setIsAuthLoading(false) from onAuthStateChanged.');
      setIsAuthLoading(false);
      hideLoader(AUTH_LOADER_ID);
    });

    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
      hideLoader(AUTH_LOADER_ID);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showLoader, hideLoader, toast, setUser]); // setUser is now stable from useCallback

  const login = useCallback(async (email: string, password?: string): Promise<boolean> => {
    if (!auth) {
      toast({
        title: "CRITICAL: Firebase Auth Unavailable",
        description: "Cannot login: Firebase Auth is not initialized. Check .env configuration (PROJECT_ID, API_KEY) and restart server.",
        variant: "destructive",
        duration: Infinity
      });
      return false;
    }
    if (!password) {
      toast({ title: "Login Error", description: "Password is required.", variant: "destructive" });
      return false;
    }

    showLoader(AUTH_LOADER_ID, "Logging in...");
    try {
      console.log("AuthContext: Attempting Firebase signInWithEmailAndPassword for", email);
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user and isAuthLoading.
      // Navigation will be handled by page effects (e.g., LoginPage, HomePage) reacting to isAuthenticated state.
      toast({ title: "Login Successful", description: "Welcome back!"});
      console.log("AuthContext: Firebase signInWithEmailAndPassword successful for", email);
      return true;
    } catch (error: any) {
      const isExpectedLoginFailure = 
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/invalid-email';

      if (!isExpectedLoginFailure) {
        console.error("AuthContext: Unexpected Firebase login error:", error, "Code:", error.code);
      } else {
        // Log expected failures with console.info to potentially reduce dev overlay noise
        console.info(`AuthContext: Handled Firebase login attempt for email "${email}" with code: ${error.code}`);
      }
      
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
      return false;
    } finally {
      hideLoader(AUTH_LOADER_ID); // Hide loader specific to login action
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
    showLoader(AUTH_LOADER_ID, "Logging out...");
    try {
      console.log("AuthContext: Attempting Firebase signOut.");
      await signOut(auth);
      // onAuthStateChanged will set user to null.
      // Explicit navigation here ensures user lands on login page.
      console.log("AuthContext: Firebase signOut successful. Navigating to /login.");
      router.push('/login');
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error) {
        console.error("AuthContext: Firebase logout error:", error);
        toast({
            title: "Logout Error",
            description: "An unexpected error occurred while logging out.",
            variant: "destructive",
        });
    } finally {
        hideLoader(AUTH_LOADER_ID);
    }
  }, [toast, router, showLoader, hideLoader]);

  const isAuthenticated = !!userState && !isAuthLoading;
  const isAdmin = isAuthenticated && (userState?.role === 'admin' || userState?.role === 'super admin');
  const isSuperAdmin = isAuthenticated && userState?.role === 'super admin';
  const isEditor = isAuthenticated && userState?.role === 'editor';

  // Log final context values provided
  // console.log("AuthContext: Providing context values:", { user: userState, isAuthenticated, isAdmin, isEditor, isAuthLoading });

  return (
    <AuthContext.Provider value={{ user: userState, login, logout, isAuthenticated, isAdmin, isSuperAdmin, isEditor, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
