"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-lg border border-danger/30 bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Admin dashboard error
        </h2>
        <p className="mt-2 text-sm text-muted">
          A problem occurred while loading the admin dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
