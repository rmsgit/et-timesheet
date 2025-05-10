
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === undefined) return; // Auth state still loading
    
    if (!isAdmin) {
      // If not an admin, redirect to their default dashboard or login
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [isAdmin, user, router]);

  if (user === undefined || !isAdmin) {
    // Show loading skeleton or keep blank while redirecting
    return (
      <div className="flex h-full items-center justify-center p-8">
         <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full bg-muted" />
          <Skeleton className="h-4 w-[250px] bg-muted" />
          <Skeleton className="h-4 w-[200px] bg-muted" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
