
"use client"; // Error components must be Client Components

import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 text-center">
      <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
      <h2 className="text-3xl font-semibold text-foreground mb-4">
        Oops! Something went wrong.
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        An unexpected error occurred. We've been notified and are working to fix it. Please try again later.
      </p>
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
        variant="default"
        size="lg"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        Try again
      </Button>
      {error.digest && (
        <p className="mt-4 text-xs text-muted-foreground">Error Digest: {error.digest}</p>
      )}
    </div>
  );
}
