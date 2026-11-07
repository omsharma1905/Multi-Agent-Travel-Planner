"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { StitchIcon } from "./StitchIcon";

export function StitchFooter() {
  return (
    <footer id="concierge" className="w-full bg-surface-container-lowest border-t border-white/5 mt-10 sm:mt-16 scroll-mt-28">
      <div className="w-full px-4 sm:px-6 lg:px-12 py-16 sm:py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 sm:gap-12 pb-12 sm:pb-16 border-b border-white/5">
          {/* Brand Info */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-headline-lg text-2xl sm:text-3xl text-on-surface tracking-tight font-semibold">
                SAFARI<span className="text-secondary">X</span>
              </span>
            </Link>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-sm leading-relaxed">
              Curating bespoke exploratory expeditions and autonomous itinerary architecture for discerning global travelers.
            </p>
          </div>

          {/* Exploration Navigation */}
          <div className="md:col-span-3 flex flex-col gap-3">
            <span className="font-label-md text-xs uppercase tracking-wider text-secondary font-semibold">
              Exploration
            </span>
            <ul className="flex flex-col gap-2 font-body-md text-xs sm:text-sm text-on-surface-variant">
              <li>
                <a href="#sanctuaries" className="hover:text-on-surface transition-colors">
                  Private Reserves
                </a>
              </li>
              <li>
                <Link href={ROUTES.trips.new} className="hover:text-on-surface transition-colors">
                  Aviation Charters
                </Link>
              </li>
              <li>
                <a href="#agents" className="hover:text-on-surface transition-colors">
                  Agentic Planning
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <span className="font-label-md text-xs uppercase tracking-wider text-secondary font-semibold">
              Connect
            </span>
            <ul className="flex flex-col gap-2 font-body-md text-xs sm:text-sm text-on-surface-variant">
              <li>
                <a href="mailto:concierge@safarix.travel" className="hover:text-on-surface transition-colors">
                  Concierge Desk
                </a>
              </li>
              <li>
                <a href="#methodology" className="hover:text-on-surface transition-colors">
                  Curator Journal
                </a>
              </li>
              <li>
                <span className="text-on-surface-variant/60 cursor-default">
                  Satellite Dispatch
                </span>
              </li>
            </ul>
          </div>

          {/* Sanctuary Social / Dispatch */}
          <div className="md:col-span-2 flex flex-col gap-3">
            <span className="font-label-md text-xs uppercase tracking-wider text-secondary font-semibold">
              Sanctuary
            </span>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="#sanctuaries"
                className="w-10 h-10 rounded-full bg-surface-container border border-white/10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
                aria-label="Explore Sanctuaries"
              >
                <StitchIcon name="explore" className="w-[18px] h-[18px]" />
              </a>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    navigator.share({ title: "SafariX", url: window.location.href });
                  }
                }}
                className="w-10 h-10 rounded-full bg-surface-container border border-white/10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
                aria-label="Share SafariX"
              >
                <StitchIcon name="share" className="w-[18px] h-[18px]" />
              </button>
              <a
                href="mailto:inquiries@safarix.travel"
                className="w-10 h-10 rounded-full bg-surface-container border border-white/10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
                aria-label="Email Inquiry"
              >
                <StitchIcon name="mail" className="w-[18px] h-[18px]" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-label-sm text-xs text-on-surface-variant/70 text-center sm:text-left">
          <div>
            © 2026 SafariX Expeditions. Designed for cinematic journeys. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href={ROUTES.privacy} className="hover:text-on-surface transition-colors">
              Privacy Policy
            </Link>
            <Link href={ROUTES.terms} className="hover:text-on-surface transition-colors">
              Terms of Dispatch
            </Link>
            <a href="#agents" className="hover:text-on-surface transition-colors">
              Autonomous Protocols
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
