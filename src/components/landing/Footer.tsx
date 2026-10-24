"use client";

import Link from "next/link";
import { APP_BRAND, APP_TAGLINE, ROUTES } from "@/lib/constants";
import { Logo } from "@/components/navigation/Logo";
import { MarqueeRow } from "@/components/ui/ContinuousMarquee";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const tickerDestinations = [
    "TOKYO",
    "KYOTO",
    "BALI",
    "ICELAND",
    "LISBON",
    "LADAKH",
    "OSAKA",
    "SWISS ALPS",
    "PATAGONIA",
    "OAXACA",
    "AMALFI",
    "DOLOMITES",
  ];

  return (
    <footer
      className="relative overflow-hidden bg-[#051C15] text-[#F3F0E6] pt-8 sm:pt-10 pb-5 border-t border-[#104735]/60"
      role="contentinfo"
    >
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        {/* 1. TOP: Multi-column rich layout (Brand & Vision + Quick Links + Explore + Plan/Connect) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 pb-6 border-b border-white/10">
          {/* Column 1: Brand Identity & Vision & Action Buttons (Span 5) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div>
              <Logo markSize={22} textColor="text-[#F3F0E6]" />
              <p className="mt-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-[#F06C5B]">
                {APP_TAGLINE}
              </p>
              <p className="mt-2 text-xs sm:text-sm text-[#F3F0E6]/70 leading-relaxed max-w-sm">
                Plan the journey. We’ll connect the rest. Multi-agent intelligent route orchestration tailored to your rhythm.
              </p>
            </div>

            {/* Circular icon buttons: Email, Globe, Share */}
            <div className="flex items-center gap-2.5">
              {/* Email button */}
              <a
                href="mailto:hello@safarix.travel"
                className="group flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/20 text-[#F3F0E6]/80 transition-all duration-300 hover:border-[#F3F0E6] hover:text-[#F3F0E6] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#104735]"
                aria-label="Send email to SafariX"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </a>

              {/* Website / Globe button */}
              <Link
                href={ROUTES.home}
                className="group flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/20 text-[#F3F0E6]/80 transition-all duration-300 hover:border-[#F3F0E6] hover:text-[#F3F0E6] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#104735]"
                aria-label="SafariX Home"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              </Link>

              {/* Share button */}
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: APP_BRAND,
                      text: "Plan journeys intelligently with SafariX",
                      url: window.location.origin,
                    });
                  }
                }}
                className="group flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-white/20 text-[#F3F0E6]/80 transition-all duration-300 hover:border-[#F3F0E6] hover:text-[#F3F0E6] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#104735]"
                aria-label="Share SafariX"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                  <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
                </svg>
              </button>
            </div>
          </div>

          {/* Column 2: Quick Links (Span 2) */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#DDE8DA]/60 mb-3">
              QUICK LINKS
            </h3>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm font-light text-[#F3F0E6]/80">
              <li>
                <Link href={ROUTES.trips.new} className="hover:text-white transition-colors">
                  Create a Journey
                </Link>
              </li>
              <li>
                <Link href={ROUTES.dashboard} className="hover:text-white transition-colors">
                  My Trips
                </Link>
              </li>
              <li>
                <Link href={ROUTES.trips.completed} className="hover:text-white transition-colors">
                  Completed Trips
                </Link>
              </li>
              <li>
                <Link href={ROUTES.wishlist} className="hover:text-white transition-colors">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Explore (Span 2) */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#DDE8DA]/60 mb-3">
              EXPLORE
            </h3>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm font-light text-[#F3F0E6]/80">
              <li>
                <a href="#destinations" className="hover:text-white transition-colors">
                  Destinations
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Planning
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Plan / Connect (Span 3) */}
          <div className="lg:col-span-3">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#DDE8DA]/60 mb-3">
              CONNECT
            </h3>
            <ul className="flex flex-col gap-2 text-xs sm:text-sm font-light text-[#F3F0E6]/80">
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  Instagram
                  <span className="text-white/30 text-xs">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  X (Twitter)
                  <span className="text-white/30 text-xs">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                >
                  LinkedIn
                  <span className="text-white/30 text-xs">↗</span>
                </a>
              </li>
              <li className="pt-1">
                <Link
                  href={ROUTES.trips.new}
                  className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#F06C5B] hover:text-white transition-colors"
                >
                  <span>Start a Plan</span>
                  <span>→</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 2. CENTER: Gigantic low-contrast brand wordmark + Interactive BACK TO TOP */}
        <div className="relative my-2 sm:my-4 flex flex-col items-center justify-center overflow-hidden py-2 sm:py-3 select-none">
          {/* Gigantic low-contrast background graphic wordmark */}
          <p
            className="font-display font-black text-center text-[#082D23]/60 leading-none tracking-tighter pointer-events-none"
            style={{ fontSize: "clamp(3rem, 18vw, 17.5rem)" }}
            aria-hidden="true"
          >
            {APP_BRAND}
          </p>

          {/* Interactive BACK TO TOP button layered over the wordmark */}
          <button
            type="button"
            onClick={scrollToTop}
            className="group absolute flex flex-col items-center justify-center gap-1 rounded-full border border-white/25 bg-[#082D23]/90 px-5 py-5 sm:px-7 sm:py-7 backdrop-blur-md text-[#F3F0E6] transition-all duration-300 hover:scale-105 hover:border-white hover:bg-white hover:text-[#082D23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#104735]"
            aria-label="Back to top"
          >
            <span
              className="text-sm sm:text-base transition-transform duration-300 group-hover:-translate-y-0.5"
              aria-hidden="true"
            >
              ↑
            </span>
            <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.25em]">
              BACK TO TOP
            </span>
          </button>
        </div>

        {/* 3. Subtle continuous destination ticker ribbon */}
        <div className="py-2 border-t border-white/5 opacity-40">
          <MarqueeRow
            items={tickerDestinations}
            direction="left"
            speed="slow"
            separator="✦"
            itemClassName="text-[11px] font-mono uppercase tracking-[0.25em] text-[#F3F0E6]"
          />
        </div>

        {/* 4. BOTTOM: Thin divider, copyright on left, legal on right */}
        <div className="mt-1 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] font-mono uppercase tracking-wider text-[#F3F0E6]/40">
          <p>© {currentYear} {APP_BRAND}. ALL RIGHTS RESERVED.</p>

          <div className="flex items-center gap-5">
            <Link href={ROUTES.privacy} className="hover:text-white transition-colors">
              PRIVACY POLICY
            </Link>
            <span className="text-white/20">/</span>
            <Link href={ROUTES.terms} className="hover:text-white transition-colors">
              TERMS OF SERVICE
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
