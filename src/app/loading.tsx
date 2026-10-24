/**
 * Root loading UI — shown while any page in the app is loading.
 *
 * This is the App Router convention: `loading.tsx` automatically wraps
 * page content in a React Suspense boundary.
 *
 * Phase 1: Replace with a branded animated loader.
 */
export default function Loading() {
  return (
    <div
      className="flex flex-1 items-center justify-center"
      aria-label="Loading"
      role="status"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Pulse ring */}
        <span className="relative flex h-10 w-10">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-30" />
          <span className="relative inline-flex h-10 w-10 rounded-full bg-amber-500/20 ring-1 ring-amber-500/40" />
        </span>
        <p className="text-xs uppercase tracking-widest text-white/40">
          Loading
        </p>
      </div>
    </div>
  );
}
