
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AppLogo } from '@/components/dashboard/AppLogo';
import { UserNav } from '@/components/dashboard/UserNav';
import { SidebarNav } from '@/components/dashboard/SidebarNav';
import { DailyBriefingDialog } from '@/components/dashboard/DailyBriefingDialog';
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
      <div className="flex h-screen w-full items-center justify-center overflow-x-hidden bg-background">
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
       <div className="flex h-screen w-full items-center justify-center overflow-x-hidden bg-background">
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
      <DailyBriefingDialog />
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
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0 overflow-x-hidden">
        <header className="sticky top-0 z-10 flex h-14 min-w-0 items-center justify-between gap-2 border-b bg-background/80 px-3 shadow-sm backdrop-blur-md sm:h-16 sm:gap-4 sm:px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
             <SidebarTrigger className="shrink-0 md:hidden" />
             <h1 className="truncate text-base font-semibold sm:text-lg">
               <span className="sm:hidden">ET Timesheet</span>
               <span className="hidden sm:inline">Editors Table Timesheet</span>
             </h1>
          </div>
          <div className="shrink-0">
            <UserNav />
          </div>
        </header>
        <div className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 md:p-6">
          <div className="mx-auto w-full min-w-0 max-w-full">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
