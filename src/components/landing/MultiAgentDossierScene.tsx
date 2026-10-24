"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ROUTES } from "@/lib/constants";

const AGENT_DISCIPLINES = [
  {
    code: "01",
    name: "TRANSIT AGENT",
    focus: "Multi-Modal Rail, Flights & Scenic Transfers",
    description: "Evaluates high-speed rail, verified flights, and regional ferry or road transfers with real duration buffers.",
  },
  {
    code: "02",
    name: "STAYS AGENT",
    focus: "Curated Boutique Stays & Eco-Lodges",
    description: "Selects distinctive accommodations matching your comfort tier, neighborhood safety, and proximity to your route.",
  },
  {
    code: "03",
    name: "ACTIVITIES AGENT",
    focus: "Timed Landmark Entries & Natural Trails",
    description: "Paces daylight visits, museum tickets, and scenic hikes without overwhelming your schedule.",
  },
  {
    code: "04",
    name: "FOOD AGENT",
    focus: "Authentic Regional Gastronomy",
    description: "Matches morning bakeries, neighborhood bistros, and celebrated dinner tables to your dietary preferences.",
  },
  {
    code: "05",
    name: "BUDGET AGENT",
    focus: "Deterministic Cost Calculation",
    description: "Estimates lodging, transport, dining, and activity costs based on real baseline rates without made-up numbers.",
  },
  {
    code: "06",
    name: "ITINERARY AGENT",
    focus: "Holistic Feasibility & Day Cadence",
    description: "Harmonizes every booking into an interconnected timeline with built-in rest windows and realistic transit buffers.",
  },
];

export function MultiAgentDossierScene() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#DDE8DA] text-[#104735] px-6 py-16 sm:px-10 sm:py-24 lg:px-16 border-b border-[#104735]/15"
      aria-labelledby="features-heading"
    >
      {/* Soft Ambient Radial Light */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(243,240,230,0.8)_0%,rgba(221,232,218,0.95)_60%,#DDE8DA_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="max-w-3xl mb-14 lg:mb-20">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#104735] mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F06C5B]" />
            <span>INTELLIGENCE ARCHITECTURE // 6 SPECIALIZED AGENTS</span>
          </div>
          <h2
            id="features-heading"
            className="font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-bold uppercase tracking-tight text-[#082D23] leading-[1.04]"
          >
            Six autonomous minds. <br />
            <span className="font-serif italic font-normal text-[#104735] lowercase tracking-normal">
              one unified expedition.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#3D4E44] font-normal leading-relaxed max-w-2xl">
            Each agent operates with deep domain rules to solve specific travel constraints. They negotiate synchronously, ensuring your stay aligns with your rail arrival and your dinner reservations leave room to savor the evening.
          </p>
        </div>

        {/* Two-Column Editorial Spread */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* LEFT: The 6 Intelligence Disciplines Ledger */}
          <div className="lg:col-span-7 space-y-6">
            <div className="border-t border-[#104735]/15 divide-y divide-[#104735]/15">
              {AGENT_DISCIPLINES.map((agent) => (
                <motion.div
                  key={agent.code}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4 }}
                  className="py-5 sm:py-6 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 group"
                >
                  <div className="flex items-center gap-3 shrink-0 sm:w-44">
                    <span className="font-serif italic text-[#104735] font-light text-xl">
                      {agent.code}
                    </span>
                    <span className="font-mono text-xs uppercase tracking-wider text-[#082D23] font-bold">
                      {agent.name}
                    </span>
                  </div>

                  <div className="space-y-1 flex-1">
                    <p className="font-sans text-xs font-semibold uppercase tracking-wider text-[#104735]">
                      {agent.focus}
                    </p>
                    <p className="font-sans text-xs text-[#52645A] font-normal leading-relaxed">
                      {agent.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                href={ROUTES.trips.new}
                className="inline-flex items-center gap-2 rounded-lg bg-[#104735] hover:bg-[#082D23] text-[#F3F0E6] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
              >
                <span>Commission an Itinerary</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* RIGHT: Live Dossier Blueprint Artifact (Dark contrast card with coral waypoints) */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 rounded-2xl bg-[#082D23] border border-white/15 p-6 sm:p-8 shadow-[0_30px_70px_rgba(8,45,35,0.25)] space-y-6 text-[#F3F0E6]">
              {/* Dossier Header */}
              <div className="border-b border-white/10 pb-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#DDE8DA] block font-semibold">
                    SAMPLE EXPEDITION DOSSIER // ILLUSTRATIVE
                  </span>
                  <h3 className="font-display text-lg font-bold uppercase tracking-tight text-[#F3F0E6]">
                    Dolomites Alpine Traverse
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-[#F06C5B] bg-[#F06C5B]/15 border border-[#F06C5B]/30 px-2.5 py-1 rounded font-semibold">
                  7 DAYS · ACTIVE
                </span>
              </div>

              {/* Day Breakdown Strip with Connected Cartographic Route Line */}
              <div className="relative pl-3 border-l-2 border-dashed border-[#F06C5B]/40 space-y-5 text-xs font-sans ml-1.5">
                <div className="relative space-y-1.5">
                  <span className="absolute -left-[19px] top-1 h-3 w-3 rounded-full bg-[#082D23] border-2 border-[#F06C5B] flex items-center justify-center">
                    <span className="h-1 w-1 rounded-full bg-[#F06C5B]" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#DDE8DA] uppercase tracking-wider font-semibold">
                      DAY 01 // ARRIVAL & CORTINA LODGE
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/25 border border-white/10 p-3 space-y-1">
                    <p className="text-[#F3F0E6] font-semibold">Venice Airport → Cortina d&apos;Ampezzo</p>
                    <p className="text-[#DDE8DA]/70 text-[11px]">Scenic mountain coach transfer (2h 15m) · Boutique hotel check-in</p>
                  </div>
                </div>

                <div className="relative space-y-1.5">
                  <span className="absolute -left-[19px] top-1 h-3 w-3 rounded-full bg-[#082D23] border-2 border-[#F06C5B] flex items-center justify-center">
                    <span className="h-1 w-1 rounded-full bg-[#F06C5B]" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#DDE8DA] uppercase tracking-wider font-semibold">
                      DAY 02 // TRE CIME DI LAVAREDO RIDGE
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/25 border border-white/10 p-3 space-y-1">
                    <p className="text-[#F3F0E6] font-semibold">Morning Loop Trail & Rifugio Locatelli</p>
                    <p className="text-[#DDE8DA]/70 text-[11px]">9.5 km loop · 400m elevation gain · South Tyrolean alpine lunch</p>
                  </div>
                </div>

                <div className="relative space-y-1.5">
                  <span className="absolute -left-[19px] top-1 h-3 w-3 rounded-full bg-[#082D23] border-2 border-[#F06C5B] flex items-center justify-center">
                    <span className="h-1 w-1 rounded-full bg-[#F06C5B]" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#DDE8DA] uppercase tracking-wider font-semibold">
                      DAY 03 // LAGO DI BRAIES & SPA REST
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/25 border border-white/10 p-3 space-y-1">
                    <p className="text-[#F3F0E6] font-semibold">Early Boat Rental & Alpine Forest Walk</p>
                    <p className="text-[#DDE8DA]/70 text-[11px]">Timed entry permit locked · Thermal spa recovery afternoon</p>
                  </div>
                </div>
              </div>

              {/* Cost & Harmony Seal */}
              <div className="border-t border-white/10 pt-4 flex items-center justify-between font-mono text-[11px] text-[#DDE8DA]/70">
                <span>ESTIMATED BUDGET // SAMPLE</span>
                <span className="font-bold text-[#F3F0E6]">€2,100 / TRAVELER</span>
              </div>

              <Link
                href={`${ROUTES.trips.new}?destination=Dolomites`}
                className="block text-center w-full rounded-lg bg-white/15 hover:bg-white/25 text-[#F3F0E6] py-2.5 font-mono text-xs uppercase tracking-wider font-semibold transition-colors"
              >
                Plan Similar Expedition →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
