
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton'; 

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, user, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) return; // Auth state still loading
    
    if (!isAdmin) {
      // If not an admin, redirect to their default dashboard or login
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [isAdmin, user, isAuthLoading, router]);

  if (isAuthLoading || !isAdmin) { // Check isAuthLoading first
    // Show loading skeleton or keep blank while redirecting
    return (
      <div className="flex h-full min-h-[calc(100vh-theme(spacing.16))] items-center justify-center p-8">
         <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full bg-muted" />
          <Skeleton className="h-4 w-[250px] bg-muted" />
          <Skeleton className="h-4 w-[200px] bg-muted" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }
  
  // If !isAdmin and not loading, useEffect would have redirected.
  // This check ensures child components don't render if user is not an admin.
  if (!user || (user.role !== 'admin' && user.role !== 'super admin')) {
     return (
      <div className="flex h-full min-h-[calc(100vh-theme(spacing.16))] items-center justify-center p-8">
         <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return <>{children}</>;
}
