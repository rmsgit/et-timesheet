
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log(`HomePage Effect: isAuthLoading=${isAuthLoading}, isAuthenticated=${isAuthenticated}`);
    if (isAuthLoading) {
      console.log("HomePage Effect: Auth state still loading, returning.");
      return;
    }
    if (isAuthenticated) {
      console.log("HomePage Effect: User is authenticated. Redirecting to /dashboard.");
      router.replace('/dashboard');
    } else {
      console.log("HomePage Effect: User is NOT authenticated. Redirecting to /login.");
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Show loading skeleton while auth state is being determined or redirection is occurring.
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Skeleton className="h-12 w-12 rounded-full bg-muted" />
        <Skeleton className="h-4 w-[250px] bg-muted" />
        <Skeleton className="h-4 w-[200px] bg-muted" />
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    </div>
  );
}
