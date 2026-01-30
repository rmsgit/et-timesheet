
"use client";

import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This error should ideally not happen if AuthProvider wraps the app correctly.
    // If it does, it's a structural issue in the app's component tree.
    console.error('useAuth must be used within an AuthProvider. Ensure your component tree is wrapped correctly.');
    // Fallback to a default state to prevent crashing, though functionality will be broken.
    return {
      user: null,
      login: async () => { console.error("AuthContext not available for login"); return false; },
      logout: async () => { console.error("AuthContext not available for logout"); },
      isAuthenticated: false,
      isAdmin: false,
      isSuperAdmin: false,
      isEditor: false,
      isAuthLoading: true, // Assume loading if context is missing, to prevent premature redirects
    };
  }
  return context;
};
