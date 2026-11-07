"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { StitchIcon } from "./StitchIcon";

export function StitchFinalCTA() {
  return (
    <section className="relative w-full py-14 sm:py-20 px-4 sm:px-6 lg:px-12 overflow-hidden">
      <div className="max-w-7xl mx-auto rounded-3xl relative overflow-hidden bg-surface-container-lowest border border-white/10 p-8 sm:p-14 lg:p-20 flex flex-col items-center text-center shadow-2xl">
        {/* High impact panoramic dusk mountain image overlay */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-30 mix-blend-luminosity scale-105"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1440&q=75')",
          }}
          aria-hidden="true"
        />

        {/* Atmospheric scrim gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-surface-container-lowest/80 via-surface-container-lowest/90 to-surface-container-lowest pointer-events-none" />

        {/* Ambient Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />

        {/* CTA Content */}
        <div className="relative z-10 flex flex-col items-center max-w-2xl gap-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-high border border-white/10 text-secondary font-label-md text-xs uppercase tracking-wider shadow-sm">
            <StitchIcon name="stars" className="w-4 h-4 text-secondary" />
            <span>Bespoke Journeys Await</span>
          </div>

          <h2 className="font-display-lg text-3xl sm:text-5xl lg:text-6xl text-on-surface leading-tight">
            Your next adventure is waiting.
          </h2>

          <p className="font-body-lg text-sm sm:text-lg text-on-surface-variant max-w-lg leading-relaxed">
            Experience bespoke, stress-free travel curated in seconds by SafariX’s autonomous itinerary network.
          </p>

          {/* CTA Buttons Row */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-3 w-full sm:w-auto">
            <Link
              href={ROUTES.trips.new}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-secondary text-on-secondary font-title-md text-sm sm:text-base font-semibold hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Start Planning Your Trip Now</span>
              <StitchIcon name="arrow_forward" className="w-5 h-5" />
            </Link>

            <a
              href="#agents"
              className="w-full sm:w-auto px-7 py-4 rounded-full bg-surface-container border border-white/10 text-on-surface font-title-md text-sm sm:text-base hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
            >
              <StitchIcon name="menu_book" className="w-5 h-5 text-on-surface-variant" />
              <span>View Sample Itinerary</span>
            </a>
          </div>

          <span className="font-label-sm text-xs text-on-surface-variant/60 pt-2">
            Complimentary autonomous consultation · Zero commitments
          </span>
        </div>
      </div>
    </section>
  );
}
