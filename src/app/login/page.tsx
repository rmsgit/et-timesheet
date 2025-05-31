
"use client";

import { LoginForm } from '@/components/auth/LoginForm';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth is still loading, don't do anything yet.
    if (isAuthLoading) {
      return;
    }
    // If auth is resolved and user is authenticated, redirect to dashboard.
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
    // If not authenticated (and not loading), user stays on login page.
  }, [isAuthenticated, isAuthLoading, router]);

  // Optional: Show a loading skeleton if auth is loading and user isn't authenticated yet
  // This prevents a brief flash of the login form if already logged in and redirecting.
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full bg-muted" />
          <Skeleton className="h-4 w-[250px] bg-muted" />
          <p className="text-muted-foreground">Checking authentication status...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
        {/* Background Image Layer */}
        <div className="absolute inset-0 opacity-10">
            <Image 
                src="https://picsum.photos/1920/1080" 
                alt="Background" 
                layout="fill" 
                objectFit="cover" 
                data-ai-hint="office workspace"
            />
        </div>
        {/* Login Form Container - applying relative and z-index to ensure it's on top */}
        {/* Only render LoginForm if not authenticated and not loading (or redirecting) */}
        {!isAuthenticated && (
          <div className="relative z-10">
            <LoginForm />
          </div>
        )}
        {/* If authenticated and not loading, useEffect should redirect, can show a message too */}
        {isAuthenticated && !isAuthLoading && (
          <div className="text-center">
            <p className="text-lg font-medium">Login successful. Redirecting to dashboard...</p>
            <Skeleton className="h-4 w-[200px] bg-muted mt-2 mx-auto" />
          </div>
        )}
    </div>
  );
}
