"use client";

/**
 * Root error boundary.
 *
 * Next.js App Router requires error.tsx to be a Client Component so that
 * it can catch errors during rendering and provide a reset mechanism.
 *
 * Phase 1: Replace with a branded error page with proper illustration.
 */

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to an error reporting service in future phases
    console.error("[App Error]", error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="max-w-lg space-y-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
          Something went wrong
        </p>
        <h1 className="text-4xl font-bold text-white">Unexpected Error</h1>
        <p className="text-base text-white/60">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-white/30">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-amber-500 px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e1a]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
