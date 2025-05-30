
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const { isAuthenticated, isAuthLoading, user } = useAuth(); // Added user
  const router = useRouter();

  useEffect(() => {
    // Log the state at the beginning of the effect
    console.log(`HomePage Effect: isAuthLoading=${isAuthLoading}, isAuthenticated=${isAuthenticated}, user:`, user ? { id: user.id, username: user.username, role: user.role } : null);

    if (isAuthLoading) {
      console.log("HomePage Effect: Auth state still loading, returning skeleton.");
      return; // Show loading skeleton while auth state is being determined.
    }

    // At this point, isAuthLoading is false.
    if (isAuthenticated) { // isAuthenticated implies user is not null
      console.log("HomePage Effect: User IS authenticated. Redirecting to /dashboard. User:", user ? { id: user.id, username: user.username, role: user.role } : null);
      router.replace('/dashboard');
    } else { // isAuthenticated is false, implies user is null or auth check failed
      console.log("HomePage Effect: User is NOT authenticated. Redirecting to /login. User:", user ? { id: user.id, username: user.username, role: user.role } : null);
      // Check if already on /login to prevent potential replace loops if this page renders unexpectedly
      // Although for the root page '/', this redirect to /login is usually the primary goal if not authenticated.
      if (router.pathname !== '/login') { // router.pathname might not be available or reliable here, using a simpler approach for root page.
         router.replace('/login');
      } else {
        console.log("HomePage Effect: Already on /login or router.pathname not available, no redirect initiated from else block.");
      }
    }
  }, [isAuthenticated, isAuthLoading, user, router]); // Added 'user' to dependency array

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
