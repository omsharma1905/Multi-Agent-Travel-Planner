"use client";

import Link from "next/link";
import { Logo } from "@/components/navigation/Logo";
import { ROUTES, APP_BRAND } from "@/lib/constants";
import { useAuth } from "@/features/auth/hooks/useAuth";

/**
 * SafariX Branded 404 Not Found Page.
 *
 * Provides a graceful, on-brand recovery experience when a user navigates
 * to an unmatched route. Works seamlessly for both authenticated and guest users.
 */
export default function NotFound() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#F8F5EE] text-[#111111] px-6 sm:px-12 py-8 selection:bg-[#1F3D2B] selection:text-white">
      {/* Top Bar with Brand Logo */}
      <header className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <Logo textColor="text-[#111111]" />
        <Link
          href={ROUTES.home}
          className="text-xs font-mono uppercase tracking-widest text-[#111111]/60 hover:text-[#1F3D2B] transition-colors"
        >
          EXPLORE
        </Link>
      </header>

      {/* Main Editorial 404 Experience */}
      <main className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto py-16">
        {/* Subtle Route Indicator Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#F06C5B]/25 bg-[#F06C5B]/10 mb-6">
          <span className="flex h-2 w-2 rounded-full bg-[#F06C5B] animate-pulse" aria-hidden="true" />
          <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#F06C5B]">
            404 · OFF ROUTE
          </span>
        </div>

        {/* Heading */}
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#111111] leading-tight mb-4">
          Looks like you&apos;ve wandered off route.
        </h1>

        {/* Supporting Copy */}
        <p className="text-sm sm:text-base text-[#111111]/70 leading-relaxed font-light mb-8 max-w-md">
          The page or journey coordinates you requested cannot be found or may have moved to a new destination.
        </p>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href={ROUTES.home}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#111111] px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#FAF7F0] hover:bg-[#1F3D2B] hover:text-white transition-all shadow-sm"
          >
            <span>Back to SafariX</span>
            <span>→</span>
          </Link>

          {isAuthenticated && (
            <Link
              href={ROUTES.dashboard}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#111111]/15 bg-white/70 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-[#111111] hover:bg-white hover:border-[#1F3D2B] hover:text-[#1F3D2B] transition-all shadow-xs"
            >
              Go to My Journeys
            </Link>
          )}
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#111111]/10 pt-6 text-[11px] font-mono tracking-widest text-[#111111]/40">
        <p>TRAVEL INTELLIGENTLY · {APP_BRAND} © 2026</p>
        <p className="text-[#111111]/30">404 RESOURCE NOT FOUND</p>
      </footer>
    </div>
  );
}
