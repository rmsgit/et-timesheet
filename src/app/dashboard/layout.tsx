
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
    console.log(`DashboardLayout Effect: isAuthLoading=${isAuthLoading}, isAuthenticated=${isAuthenticated}, user:`, user ? { id: user.id, username: user.username, role: user.role } : null);

    if (isAuthLoading) {
      console.log("DashboardLayout Effect: Auth state still loading, returning skeleton/loader placeholder.");
      return; // Still loading auth state, Dashboard will show its own loading state or skeleton
    }

    if (!isAuthenticated) {
      console.log("DashboardLayout Effect: User is NOT authenticated. Redirecting to /login.");
      router.replace('/login');
    } else {
      console.log("DashboardLayout Effect: User IS authenticated. Proceeding with dashboard render.");
      // Additional check: if user exists but has no role, perhaps a redirect to a 'profile setup' or error page?
      // For now, just ensuring they are authenticated.
      if (user && user.role === null) {
        console.warn("DashboardLayout Effect: User is authenticated but has no role assigned in RTDB profile.");
        // Potentially redirect to a page explaining the role issue or a default non-functional dashboard.
        // For now, we allow access if authenticated.
      }
    }
  }, [isAuthenticated, isAuthLoading, user, router]); // Added 'user' to dependency array

  if (isAuthLoading) {
    // This skeleton is for when auth state is genuinely loading (e.g., initial app load)
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

  // If !isAuthenticated AND !isAuthLoading, the useEffect above would have already initiated a redirect.
  // This additional check acts as a safeguard or handles cases where the redirect might be slow
  // or if the component attempts to render children before the redirect effect fully processes.
  if (!isAuthenticated) {
    // This state means isAuthLoading is false, and isAuthenticated is false.
    // The useEffect should have redirected. This is a fallback.
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

  // At this point, isAuthLoading is false, and isAuthenticated is true. User should be valid.
  if (!user) {
      // This case should ideally not be reached if isAuthenticated is true because isAuthenticated = !!user && !isAuthLoading.
      // However, as a very defensive measure:
      console.error("DashboardLayout: Inconsistent state - isAuthenticated is true but user is null. This should not happen.");
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <p className="text-destructive">Authentication state error. Please try refreshing.</p>
        </div>
      );
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
