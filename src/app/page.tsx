
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { isAuthenticated, isAuthLoading } = useAuth(); // Use isAuthLoading
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) { // Auth state still loading
      return;
    }
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Show loading skeleton while auth state is being determined
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
