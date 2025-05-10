
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
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
     if (user === undefined) return; // Still loading
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, user, router]);

  if (user === undefined || !isAuthenticated) {
    // Show loading skeleton or redirect
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
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
