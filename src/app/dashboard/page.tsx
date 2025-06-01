
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { TimesheetTable } from '@/components/dashboard/TimesheetTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { isEditor, isAdmin, isAuthLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) {
      return; // Wait for auth state to resolve
    }

    if (user) { // User is authenticated
      if (isEditor) {
        // User is an editor, allow access to this page (TimesheetTable)
      } else if (isAdmin) {
        // User is an admin but not an editor, redirect to a default admin page
        router.replace('/dashboard/admin/report');
      } else {
        // User is authenticated but has no recognized role (or role is null)
        // This could indicate a profile setup issue. Redirect to login for safety.
        console.warn(`DashboardPage: User ${user.id} has no 'editor' or 'admin' role. Redirecting to login.`);
        router.replace('/login');
      }
    } else {
      // No user object even after auth loading is complete (e.g., not authenticated)
      // This should ideally be caught by DashboardLayout, but as a safeguard:
      router.replace('/login');
    }
  }, [isEditor, isAdmin, isAuthLoading, user, router]);

  if (isAuthLoading || (user && !isEditor && isAdmin)) {
    // Show loader if auth is loading, or if user is an admin (and not editor) being redirected
    return (
      <div className="flex h-[calc(100vh-theme(spacing.32))] items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard or redirecting...</p>
        </div>
      </div>
    );
  }
  
  // Only render TimesheetTable if user is an editor and auth is resolved
  if (user && isEditor) {
    return (
      <div className="container mx-auto py-2">
        <TimesheetTable />
      </div>
    );
  }

  // Fallback content if not an editor (should typically be redirected by useEffect)
  return (
     <div className="flex h-[calc(100vh-theme(spacing.32))] items-center justify-center">
        <p className="text-muted-foreground">Access restricted or redirecting...</p>
      </div>
  );
}
