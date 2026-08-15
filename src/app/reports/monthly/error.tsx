"use client";

import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-semibold text-foreground">Monthly Report</h1>
      <div className="rounded-lg border border-danger/30 bg-danger-bg p-6 text-center">
        <p className="text-sm text-danger">Something went wrong while loading the monthly report.</p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted">Error ID: {error.digest}</p>
        )}
        <Button variant="secondary" onClick={reset} className="mt-4">
          Try again
        </Button>
      </div>
    </div>
  );
}
