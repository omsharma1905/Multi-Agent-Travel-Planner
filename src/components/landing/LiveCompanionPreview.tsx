"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export function LiveCompanionPreview() {
  return (
    <section
      id="companion-preview"
      className="relative overflow-hidden bg-[#0A0D0B] text-[#F8F5EE] px-6 py-24 sm:px-10 sm:py-36 lg:px-16 border-t border-white/10"
      aria-labelledby="companion-preview-heading"
    >
      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-24">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md border border-white/15 text-xs font-mono uppercase tracking-[0.22em] text-[#E3EBE4] mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>LIVE TRAVEL COMPANION</span>
          </div>

          <h2
            id="companion-preview-heading"
            className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-bold uppercase tracking-tight text-[#F8F5EE] leading-[0.98]"
          >
            Plan on the web. <br />
            <span className="font-serif italic font-normal text-[#E3EBE4]/85 lowercase">
              travel with effortless clarity.
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#E3EBE4]/75 max-w-xl mx-auto font-normal">
            Digital boarding passes, synchronized route waypoints, verified check-in windows, and dynamic weather alerts live in your mobile itinerary.
          </p>
        </div>

        {/* 3-Column Visual Layout (Inspired by Reference 3, 4, 5) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          
          {/* Card 1: Boarding Pass & Transit Logistics (Reference 3) */}
          <div className="rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/15 p-6 sm:p-8 backdrop-blur-md space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
                  TRANSIT LOGISTICS
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[9px] font-mono text-emerald-300">
                  ON TIME ✈
                </span>
              </div>

              {/* Boarding Pass Box */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-white/50">
                  <span>DEPARTURE</span>
                  <span>ARRIVAL</span>
                </div>
                <div className="flex items-center justify-between font-display text-2xl font-bold text-white">
                  <span>BOM</span>
                  <span className="text-xs font-mono font-normal text-[#E5A83B]">➔ 4h 30m ➔</span>
                  <span>GOI</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-white/70 pt-2 border-t border-white/10">
                  <span>Indigo 6E-241</span>
                  <span>Seat 12A · Economy</span>
                </div>
              </div>

              {/* Weather & Transit Time */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                  <span className="text-[10px] font-mono text-white/50 block">DESTINATION WEATHER</span>
                  <span className="text-lg font-display font-bold text-white">28°C Sunny</span>
                </div>
                <div className="rounded-xl bg-white/5 p-3 border border-white/5">
                  <span className="text-[10px] font-mono text-white/50 block">AIRPORT TRANSFER</span>
                  <span className="text-lg font-display font-bold text-emerald-400">Pre-Routed</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#E3EBE4]/60 font-mono">
              Auto-syncs flight & train schedules with live Google Maps navigation.
            </p>
          </div>

          {/* Card 2: AI Route Optimization & Waypoints (Reference 4) */}
          <div className="rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/15 p-6 sm:p-8 backdrop-blur-md space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#E5A83B] font-semibold">
                  ROUTE WAYPOINTS
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-[9px] font-mono text-white/80">
                  142 KM TOTAL
                </span>
              </div>

              {/* Visual Waypoint Nodes */}
              <div className="space-y-3.5 py-2">
                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-[#1F3D2B] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/40">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white uppercase">Panjim Heritage District</p>
                    <p className="text-[11px] text-white/60">Colonial Quarter · Check-in & Walk</p>
                  </div>
                </div>

                <div className="ml-3 h-5 border-l-2 border-dashed border-white/20" />

                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-[#1F3D2B] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/40">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white uppercase">Anjuna Cliffside Coast</p>
                    <p className="text-[11px] text-white/60">Sunset Table & Ocean Trail</p>
                  </div>
                </div>

                <div className="ml-3 h-5 border-l-2 border-dashed border-white/20" />

                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-[#1F3D2B] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/40">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white uppercase">Palolem Secluded Bay</p>
                    <p className="text-[11px] text-white/60">Kayaking & Eco-Lodge Retreat</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-mono text-white/70">
                <span>Estimated Energy Burn</span>
                <span className="text-emerald-400 font-bold">Optimal Daylight</span>
              </div>
            </div>
          </div>

          {/* Card 3: Real-Time Day Timeline & AI Regeneration (Reference 5) */}
          <div className="rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/15 p-6 sm:p-8 backdrop-blur-md space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-semibold">
                  TIMED SCHEDULE
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/30 text-[9px] font-mono text-sky-300">
                  DAY 2 FLOW
                </span>
              </div>

              {/* Time Nodes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] text-white/50">09:00</span>
                    <span className="text-xs font-bold text-white truncate">Artisan Breakfast</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">✓ Vetted</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] text-white/50">11:30</span>
                    <span className="text-xs font-bold text-white truncate">Spice Plantation Tour</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">✓ Timed</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[10px] text-white/50">17:00</span>
                    <span className="text-xs font-bold text-white truncate">Candolim Beach Sundown</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#E5A83B]">★ Sunset</span>
                </div>
              </div>

              {/* Quick replanning prompt chip */}
              <div className="rounded-xl bg-[#1F3D2B]/40 p-3 border border-[#52795D]/30 space-y-1">
                <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-300">ONE-CLICK EDITING</span>
                <p className="text-[11px] text-[#E3EBE4]">
                  Swap any activity or restaurant instantly with validated alternatives.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={ROUTES.trips.new}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1F3D2B] py-3 text-xs font-mono font-bold uppercase tracking-wider text-white hover:bg-[#14281C] transition-colors"
              >
                <span>Plan Your Living Itinerary →</span>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
