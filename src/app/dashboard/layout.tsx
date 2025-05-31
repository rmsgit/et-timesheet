
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppLogo } from '@/components/dashboard/AppLogo';
import { UserNav } from '@/components/dashboard/UserNav';
import { SidebarNav } from '@/components/dashboard/SidebarNav';
import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarRail
} from '@/components/ui/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Log the state at the beginning of the effect
    console.log(`DashboardLayout Effect: isAuthLoading=${isAuthLoading}, user:`, user ? { id: user.id, username: user.username, role: user.role } : null, `isAuthenticated=${isAuthenticated}`);

    if (isAuthLoading) {
      console.log("DashboardLayout Effect: Auth state still loading (isAuthLoading=true). Dashboard will show its loading skeleton.");
      return; // Still loading auth state, Dashboard will show its own loading state or skeleton
    }

    // At this point, isAuthLoading is false. AuthContext has made a decision.
    if (!user) {
      // If user is null, they are not authenticated.
      console.log("DashboardLayout Effect: Auth state loaded (isAuthLoading=false), but user is NULL. Redirecting to /login.");
      router.replace('/login');
    } else {
      // User object exists. They are authenticated.
      console.log("DashboardLayout Effect: Auth state loaded, user IS authenticated. Proceeding with dashboard render.");
      if (user.role === null) {
        console.warn("DashboardLayout Effect: User is authenticated but has no role assigned in RTDB profile. Ensure RTDB profile exists at /users/<UID> with a 'role'.");
      }
      // Additional role-based access for specific dashboard layouts (like admin) are handled by their own layouts.
    }
  }, [user, isAuthLoading, router, isAuthenticated]); // isAuthenticated is technically redundant if `user` is primary, but good for clarity.

  // Render logic based on these states:

  if (isAuthLoading) {
    // This skeleton is for when auth state is genuinely loading (e.g., initial app load, or onAuthStateChanged is processing)
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full bg-muted" />
          <Skeleton className="h-4 w-[250px] bg-muted" />
          <Skeleton className="h-4 w-[200px] bg-muted" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // At this point, isAuthLoading is false.
  // If there's no user, the useEffect above should have initiated a redirect.
  // This is a fallback display while that redirect to /login happens.
  if (!user) {
    return (
       <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full bg-muted" />
          <Skeleton className="h-4 w-[250px] bg-muted" />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // At this point, isAuthLoading is false, and user object exists.
  // This defensive check is unlikely to be hit if useEffect is working correctly.
  if (user && !isAuthenticated) {
      console.error("DashboardLayout: Inconsistent state - user object exists but isAuthenticated is false. This should ideally not happen if isAuthLoading is also false.");
      // This might indicate a brief moment where user is set but derived isAuthenticated hasn't updated,
      // or a logic flaw in isAuthenticated derivation if isAuthLoading is indeed false.
      // For now, trust the presence of `user` object.
  }


  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" className="border-r">
        <SidebarHeader className="p-4">
          <AppLogo />
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-4">
          {/* Optional: Sidebar footer content */}
        </SidebarFooter>
      </Sidebar>
      <SidebarRail />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 shadow-sm backdrop-blur-md md:px-6">
          <div className="flex items-center gap-2">
             <SidebarTrigger className="md:hidden" /> {/* Mobile trigger */}
             <h1 className="text-lg font-semibold">Editors Table Timesheet</h1>
          </div>
          <UserNav />
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
