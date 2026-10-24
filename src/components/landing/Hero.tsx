"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ROUTES } from "@/lib/constants";

const INSPIRATION_DESTINATIONS = [
  { name: "Kyoto", country: "Japan", highlight: "Arashiyama dawn & teahouses" },
  { name: "Dolomites", country: "Italy", highlight: "Alpine passes & high refuges" },
  { name: "Oaxaca", country: "Mexico", highlight: "Ancestral gastronomy & markets" },
  { name: "Amalfi Coast", country: "Italy", highlight: "Cliffside lemon groves & ferrying" },
];

export function Hero() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [destinationQuery, setDestinationQuery] = useState("");

  const handleStartPlanning = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = destinationQuery.trim();
    if (trimmed) {
      router.push(`${ROUTES.trips.new}?destination=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(ROUTES.trips.new);
    }
  };

  const handleSelectPill = (destName: string) => {
    setDestinationQuery(destName);
    router.push(`${ROUTES.trips.new}?destination=${encodeURIComponent(destName)}`);
  };

  return (
    <section
      className="relative min-h-[90vh] lg:min-h-screen w-full bg-[#F3F0E6] text-[#104735] overflow-hidden pt-28 pb-16 lg:pt-36 lg:pb-24 flex items-center border-b border-[#104735]/10"
      aria-label="Editorial Travel Planning Hero"
    >
      {/* 1. Subtle Cartographic Contour & Atmospheric Warm Lighting */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(221,232,218,0.75)_0%,rgba(243,240,230,0.92)_55%,#F3F0E6_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-10 lg:px-14 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* ========================================================================= */}
          {/* LEFT: Asymmetric Editorial Typography & Immediate Functional Intake       */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 space-y-6 lg:space-y-8 text-left">
            {/* Editorial Cartographic Eyebrow */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex flex-wrap items-center gap-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#104735]"
            >
              <span className="h-2 w-2 rounded-full bg-[#F06C5B] animate-pulse" />
              <span>COOPERATIVE AI TRAVEL ARCHITECTURE</span>
              <span className="text-[#52645A]/50">{"//"}</span>
              <span className="text-[#52645A]/80 font-normal">LAT 35.0116° N · LNG 135.7681° E</span>
            </motion.div>

            {/* Main Editorial Headline with Contrasting Serif Italic */}
            <motion.h1
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="font-display text-[clamp(2.5rem,5.5vw,4.8rem)] font-bold tracking-tight text-[#082D23] leading-[1.03] uppercase"
            >
              The art of travel, <br />
              <span className="font-serif italic font-normal text-[#104735] lowercase tracking-normal">
                composed with quiet precision.
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="max-w-xl text-sm sm:text-base text-[#52645A] font-normal leading-relaxed"
            >
              No rigid listicles or generic recommendations. Six specialized AI agents
              harmonize boutique stays, timed rail & flights, authentic gastronomy, and paced daily
              waypoint flows into one cohesive journey.
            </motion.p>

            {/* Interactive Trip Planner Intake Capsule */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="pt-2 max-w-xl"
            >
              <form
                onSubmit={handleStartPlanning}
                className="relative flex flex-col sm:flex-row items-stretch gap-2.5 rounded-xl bg-white p-2 border border-[#104735]/15 shadow-[0_12px_35px_rgba(8,45,35,0.08)] focus-within:border-[#104735] focus-within:ring-1 focus-within:ring-[#104735] transition-all"
              >
                <div className="relative flex-1 flex items-center px-3.5 py-1">
                  <span className="text-[#F06C5B] mr-2.5 text-base" aria-hidden="true">
                    ✦
                  </span>
                  <input
                    type="text"
                    value={destinationQuery}
                    onChange={(e) => setDestinationQuery(e.target.value)}
                    placeholder="Where should your journey begin? (e.g. Kyoto, Dolomites)"
                    className="w-full bg-transparent text-sm text-[#082D23] placeholder:text-[#52645A]/60 focus:outline-none font-sans"
                    aria-label="Destination for your trip"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#104735] hover:bg-[#082D23] text-[#F3F0E6] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 shrink-0 shadow-md shadow-[#104735]/25"
                >
                  <span>Plan Journey</span>
                  <span aria-hidden="true">→</span>
                </button>
              </form>

              {/* Quick Inspiration Pills */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 text-left">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[#52645A]/80">
                  Popular expeditions:
                </span>
                {INSPIRATION_DESTINATIONS.map((dest) => (
                  <button
                    key={dest.name}
                    type="button"
                    onClick={() => handleSelectPill(dest.name)}
                    className="rounded-full bg-white/80 hover:bg-white border border-[#104735]/15 px-3 py-0.5 font-mono text-[10px] text-[#104735] hover:border-[#104735] transition-colors shadow-2xs"
                  >
                    {dest.name}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Metamarks */}
            <div className="pt-4 flex items-center gap-8 border-t border-[#104735]/10 font-mono text-[11px] uppercase tracking-wider text-[#52645A]">
              <div>
                <span className="block text-[#104735] font-bold text-sm">6 Agents</span>
                <span>Cooperative Engine</span>
              </div>
              <div className="h-6 w-px bg-[#104735]/15" />
              <div>
                <span className="block text-[#104735] font-bold text-sm">Real Providers</span>
                <span>Verified Transit & Stays</span>
              </div>
              <div className="h-6 w-px bg-[#104735]/15" />
              <div>
                <span className="block text-[#104735] font-bold text-sm">0% Hallucination</span>
                <span>Deterministic Feasibility</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT: Layered Asymmetric Photographic Composition & Route Ledger         */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Primary Cinematic Photograph Container with warm ivory framing & clipping entrance */}
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, clipPath: "inset(6% 0% 6% 0%)" }}
                animate={{ opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-[#104735]/15 shadow-[0_25px_60px_rgba(8,45,35,0.18)] bg-[#0C120E]"
              >
                <Image
                  src="https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=85"
                  alt="Atmospheric twilight temple lantern in Kyoto Japan"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 40vw"
                  className="object-cover object-center filter brightness-90 contrast-[1.05]"
                />

                {/* Editorial Vignette & Dual Lighting */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/20" />

                {/* Signature Illustrative Cartographic Route Motif (Animated Vector) */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox="0 0 400 500"
                  fill="none"
                  aria-hidden="true"
                >
                  <motion.path
                    d="M 60 70 Q 180 140 110 250 T 220 370"
                    stroke="#F06C5B"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    initial={shouldReduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.6, ease: "easeInOut", delay: 0.35 }}
                  />
                  {/* Waypoint 1: Origin */}
                  <motion.circle
                    cx="60"
                    cy="70"
                    r="4"
                    fill="#F06C5B"
                    initial={shouldReduceMotion ? { scale: 1 } : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.35, duration: 0.3 }}
                  />
                  {/* Waypoint 2: Mid-transit */}
                  <motion.circle
                    cx="110"
                    cy="250"
                    r="3"
                    fill="#F3F0E6"
                    stroke="#F06C5B"
                    strokeWidth="1.5"
                    initial={shouldReduceMotion ? { scale: 1 } : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.1, duration: 0.3 }}
                  />
                  {/* Waypoint 3: Terminal */}
                  <motion.circle
                    cx="220"
                    cy="370"
                    r="4"
                    fill="#F06C5B"
                    initial={shouldReduceMotion ? { scale: 1 } : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.8, duration: 0.3 }}
                  />
                </svg>

                {/* Inset Photo Heading */}
                <div className="absolute top-6 left-6 right-6 flex items-start justify-between z-20">
                  <div className="rounded bg-[#082D23]/85 backdrop-blur-md px-3.5 py-1.5 border border-white/15 text-[#F3F0E6]">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#DDE8DA] font-semibold block">
                      FEATURED EXPEDITION // 01
                    </span>
                    <span className="font-display text-sm font-bold tracking-tight text-[#F3F0E6]">
                      Kyoto & the Kamo Valleys
                    </span>
                  </div>
                  <span className="rounded-full bg-[#F06C5B]/20 border border-[#F06C5B]/40 px-2.5 py-0.5 text-[9px] font-mono uppercase tracking-wider text-[#F06C5B] font-semibold">
                    Paced 6 Days
                  </span>
                </div>

                {/* Overlaid Editorial Route Ledger */}
                <div className="absolute bottom-6 inset-x-6 rounded-xl bg-[#082D23]/90 backdrop-blur-md border border-white/15 p-4 space-y-3 text-[#F3F0E6] shadow-xl z-20">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#DDE8DA]">
                      DAY 02 · MORNING RHYTHM
                    </span>
                    <span className="font-mono text-[9px] text-[#F06C5B] font-semibold tracking-wider">
                      ILLUSTRATIVE ROUTE // 6 AGENTS RESOLVED
                    </span>
                  </div>

                  {/* Waypoint 1 */}
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10px] text-[#F06C5B] font-bold shrink-0 mt-0.5">
                      07:30
                    </span>
                    <div className="text-xs">
                      <p className="font-semibold text-[#F3F0E6]">Arashiyama Bamboo Grove Walk</p>
                      <p className="text-[11px] text-[#DDE8DA]/70">Pre-crowd daylight walk · 1.8km path</p>
                    </div>
                  </div>

                  {/* Waypoint 2 */}
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10px] text-[#F06C5B] font-bold shrink-0 mt-0.5">
                      11:00
                    </span>
                    <div className="text-xs">
                      <p className="font-semibold text-[#F3F0E6]">Tenryu-ji Sogenchi Garden</p>
                      <p className="text-[11px] text-[#DDE8DA]/70">Timed temple entry · Zen pond garden</p>
                    </div>
                  </div>

                  {/* Waypoint 3 */}
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10px] text-[#F06C5B] font-bold shrink-0 mt-0.5">
                      18:30
                    </span>
                    <div className="text-xs">
                      <p className="font-semibold text-[#F3F0E6]">Gion Kaiseki Tasting</p>
                      <p className="text-[11px] text-[#DDE8DA]/70">Seasonal 8-course dinner · Vegetarian adapted</p>
                    </div>
                  </div>

                  <Link
                    href={`${ROUTES.trips.new}?destination=Kyoto`}
                    className="block text-center w-full mt-2 rounded bg-white/15 hover:bg-white/25 text-[#F3F0E6] py-2 font-mono text-[10px] uppercase tracking-widest font-bold transition-colors"
                  >
                    Load Kyoto Blueprint →
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
