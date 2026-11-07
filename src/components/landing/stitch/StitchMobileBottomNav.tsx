"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ROUTES } from "@/lib/constants";
import { StitchIcon } from "./StitchIcon";

export function StitchMobileBottomNav() {
  const { user } = useAuth();
  const profileHref = user ? ROUTES.dashboard : ROUTES.signIn;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 pb-safe bg-[#121414]/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-1px_16px_rgba(0,0,0,0.35)] md:hidden"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex justify-around items-center h-16 px-4">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] transition-colors text-secondary"
        >
          <StitchIcon name="villa" className="w-[22px] h-[22px]" />
          <span className="font-label-sm text-[10px] uppercase tracking-wider font-semibold">Sanctuary</span>
        </button>

        <a
          href="#sanctuaries"
          className="flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <StitchIcon name="explore" className="w-[22px] h-[22px]" />
          <span className="font-label-sm text-[10px] uppercase tracking-wider font-semibold">Voyages</span>
        </a>

        <a
          href="#agents"
          className="flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <StitchIcon name="psychology" className="w-[22px] h-[22px]" />
          <span className="font-label-sm text-[10px] uppercase tracking-wider font-semibold">Agent</span>
        </a>

        <a
          href="#methodology"
          className="flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <StitchIcon name="auto_stories" className="w-[22px] h-[22px]" />
          <span className="font-label-sm text-[10px] uppercase tracking-wider font-semibold">Method</span>
        </a>

        <Link
          href={profileHref}
          className="flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[44px] text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <StitchIcon name="account_circle" className="w-[22px] h-[22px]" />
          <span className="font-label-sm text-[10px] uppercase tracking-wider font-semibold">Cabinet</span>
        </Link>
      </div>
    </nav>
  );
}
