"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "./Logo";
import { MenuOverlay } from "./MenuOverlay";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";

import { User } from "@/features/auth/types";
import { AccountPopover } from "@/components/app/AccountPopover";

interface NavbarProps {
  solid?: boolean;
  initialUser?: User | null;
}

export function Navbar({ solid = false, initialUser }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user: clientUser, isLoading } = useAuth();

  // Authoritative user resolution:
  // Once client has loaded, clientUser is source of truth.
  // During hydration while loading, server-provided initialUser avoids any flash of unauthenticated UI.
  const activeUser = !isLoading ? clientUser : (initialUser !== undefined ? initialUser : clientUser);
  const isUserAuthenticated = Boolean(activeUser);

  useEffect(() => {
    if (solid) return;
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [solid]);

  const isSolid = solid || scrolled;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 h-20 transition-all duration-300",
          "bg-[#082D23] text-[#F3F0E6] border-b border-[#104735]/80 shadow-[0_4px_20px_rgba(0,0,0,0.25)]",
          isSolid && "shadow-[0_8px_30px_rgba(0,0,0,0.45)] border-[#104735]",
        )}
      >
        <div className="relative flex h-full items-center justify-between px-4 sm:px-8 lg:px-14">
          {/* LEFT — Hamburger Menu Trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation menu"
            className="group flex items-center gap-2.5 py-2 text-[#F3F0E6]/90 hover:text-[#F3F0E6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#104735] shrink-0 z-10"
          >
            <div className="flex h-3.5 w-5 flex-col justify-between" aria-hidden="true">
              <span className="block h-[1.75px] w-5 bg-current transition-all duration-300 group-hover:w-3.5" />
              <span className="block h-[1.75px] w-3.5 bg-current transition-all duration-300 group-hover:w-5" />
              <span className="block h-[1.75px] w-4.5 bg-current transition-all duration-300 group-hover:w-3" />
            </div>
            <span className="hidden sm:inline text-xs font-mono font-semibold uppercase tracking-[0.22em] text-[#F3F0E6]/85 group-hover:text-[#F3F0E6]">
              MENU
            </span>
          </button>

          {/* CENTER — SafariX Brand Wordmark & Nav Links */}
          <div className="flex items-center justify-center shrink min-w-0 md:absolute md:inset-x-0 md:flex md:justify-center md:pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-8">
              <Logo textColor="text-[#F3F0E6]" />
              <nav className="hidden lg:flex items-center gap-6 ml-6 border-l border-[#104735] pl-6 text-xs font-mono uppercase tracking-[0.2em]">
                <a
                  href="#how-it-works"
                  className="text-[#F3F0E6]/80 hover:text-[#F3F0E6] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#F06C5B] hover:after:w-full after:transition-all after:duration-300"
                >
                  How It Works
                </a>
                <a
                  href="#features"
                  className="text-[#F3F0E6]/80 hover:text-[#F3F0E6] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#F06C5B] hover:after:w-full after:transition-all after:duration-300"
                >
                  Intelligence
                </a>
                <a
                  href="#destinations"
                  className="text-[#F3F0E6]/80 hover:text-[#F3F0E6] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#F06C5B] hover:after:w-full after:transition-all after:duration-300"
                >
                  Destinations
                </a>
                <a
                  href="#faq"
                  className="text-[#F3F0E6]/80 hover:text-[#F3F0E6] transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#F06C5B] hover:after:w-full after:transition-all after:duration-300"
                >
                  FAQ
                </a>
              </nav>
            </div>
          </div>

          {/* RIGHT — Authentication / Profile Action */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0 z-10">
            {isUserAuthenticated && activeUser ? (
              <AccountPopover variant="dark" align="right" />
            ) : (
              <>
                <Link
                  href={ROUTES.signIn}
                  className="hidden sm:inline-block text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[#F3F0E6]/85 hover:text-[#F3F0E6] transition-colors shrink-0"
                >
                  Sign In
                </Link>

                <Link
                  href={ROUTES.signUp}
                  className="rounded-full bg-[#104735] hover:bg-[#165B44] text-[#F3F0E6] border border-[#F3F0E6]/30 hover:border-[#F3F0E6]/70 px-3.5 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] shrink-0 active:scale-[0.98]"
                >
                  Start Planning
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <MenuOverlay isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
