
"use client";

import { useLoader } from '@/hooks/useLoader';
import { Loader2 } from 'lucide-react';

export function GlobalLoader() {
  const { isLoading, loadingMessage } = useLoader();

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      {loadingMessage && <p className="text-lg text-foreground">{loadingMessage}</p>}
    </div>
  );
}
