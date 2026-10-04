"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Catches unexpected errors in signed-in pages. In production Next.js replaces the real error
 * message with a generic one, so internal details never reach the browser; `digest` is an id
 * we can match against the server logs.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border px-6 py-16 text-center">
      <span className="bg-destructive/10 flex size-12 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <h2 className="font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">
          We couldn&apos;t load this page. Please try again.
          {error.digest ? ` (Reference: ${error.digest})` : null}
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
