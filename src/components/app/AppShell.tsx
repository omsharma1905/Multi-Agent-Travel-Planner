"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { WorkspaceMenuOverlay } from "./WorkspaceMenuOverlay";
import { AccountPopover } from "./AccountPopover";
import { SafariXMark } from "@/components/navigation/Logo";
import { APP_BRAND, ROUTES } from "@/lib/constants";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#F8F5EE] text-[#171A18] flex flex-col selection:bg-[#1F3D2B] selection:text-white">
        {/* Editorial Top Chrome */}
        <header className="sticky top-0 z-40 h-20 bg-[#F8F5EE]/95 backdrop-blur-md border-b border-[#171A18]/10 px-4 sm:px-10 lg:px-16 flex items-center justify-between transition-colors">
          {/* LEFT: Menu Trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            className="group flex items-center gap-3 py-2 text-[#171A18]/80 hover:text-[#171A18] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B]"
          >
            <div className="flex h-3.5 w-5 flex-col justify-between" aria-hidden="true">
              <span className="block h-[1.75px] w-5 bg-current transition-all duration-300 group-hover:w-3.5" />
              <span className="block h-[1.75px] w-3.5 bg-current transition-all duration-300 group-hover:w-5" />
              <span className="block h-[1.75px] w-4.5 bg-current transition-all duration-300 group-hover:w-3" />
            </div>
            <span className="hidden sm:inline text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#171A18]/80 group-hover:text-[#171A18]">
              MENU
            </span>
          </button>

          {/* CENTER: Brand Wordmark */}
          <div className="flex items-center gap-2.5">
            <Link
              href={ROUTES.dashboard}
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3D2B]"
              aria-label="SafariX Home"
            >
              <SafariXMark size={20} className="text-[#1F3D2B] transition-transform duration-300 group-hover:scale-105" />
              <span className="font-display text-base font-bold tracking-[0.28em] text-[#171A18]">
                {APP_BRAND}
              </span>
            </Link>
          </div>

          {/* RIGHT: Profile & Direct Plan Trigger */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* User Account Popover */}
            <AccountPopover variant="light" />

            <Link
              href={ROUTES.trips.new}
              className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-[#1F3D2B] px-3.5 sm:px-5 py-2 sm:py-2.5 font-mono text-[11px] sm:text-xs font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-[#F8F5EE] hover:bg-[#14281C] hover:text-white transition-all duration-200 shadow-sm shrink-0"
            >
              <span className="hidden sm:inline">PLAN A JOURNEY</span>
              <span className="sm:hidden">PLAN</span>
              <span>→</span>
            </Link>
          </div>
        </header>

        {/* Editorial Full-Screen Menu Overlay */}
        <WorkspaceMenuOverlay isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
