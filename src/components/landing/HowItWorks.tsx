"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ROUTES } from "@/lib/constants";

const STEPS = [
  {
    num: "01",
    phase: "TRAVEL INTAKE // VISION & CADENCE",
    title: "Articulate your pace and passions.",
    desc: "Tell us where you want to travel, your dates, and how you move through the world. Whether you seek quiet mornings in temple gardens or rigorous alpine ridge traverses, SafariX adapts to your style.",
    meta: ["Custom Pace", "Comfort Tiers", "Dietary Sensitivities"],
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Serene garden pathway in Japan",
    coords: "LAT 35.0116° N // LNG 135.7681° E",
  },
  {
    num: "02",
    phase: "COOPERATIVE ENGINE // PARALLEL NEGOTIATION",
    title: "Six autonomous agents negotiate in real time.",
    desc: "Rather than planning in disconnected silos, our Stays, Transit, Activities, Food, Budget, and Itinerary agents resolve constraints together. No overlapping tickets, infeasible train connections, or rushed schedules.",
    meta: ["Zero Hallucination", "Transit Duration Buffers", "Deterministic Costing"],
    image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Lush alpine lake surrounded by mountains",
    coords: "LAT 46.5405° N // LNG 12.1357° E",
  },
  {
    num: "03",
    phase: "LIVING DOSSIER // HARMONIZED EXPEDITION",
    title: "A tailored itinerary paced around sunlight and reality.",
    desc: "Receive an interconnected day-by-day journey dossier with verified locations, real travel durations, and clear estimated costs. Save, edit, or adjust directly in your traveler dashboard.",
    meta: ["Day-by-Day Cadence", "Interactive Maps", "Permanent Persistence"],
    image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Scenic coastal town perched on cliffside",
    coords: "LAT 40.6340° N // LNG 14.6027° E",
  },
];

export function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-[#082D23] text-[#F3F0E6] px-6 py-16 sm:px-10 sm:py-24 lg:px-16 border-b border-white/10"
      aria-labelledby="how-it-works-heading"
    >
      {/* Subtle Atmospheric Forest Ambient Lighting */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(16,71,53,0.6)_0%,rgba(8,45,35,0.95)_60%,#082D23_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16 lg:mb-24 pb-8 border-b border-white/15">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#DDE8DA] mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F06C5B]" />
              <span>METHODOLOGY // THE EXPEDITION PROTOCOL</span>
            </div>
            <h2
              id="how-it-works-heading"
              className="font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-bold uppercase tracking-tight text-[#F3F0E6] leading-[1.04]"
            >
              How extraordinary <br />
              <span className="font-serif italic font-normal text-[#DDE8DA] lowercase tracking-normal">
                journeys are composed.
              </span>
            </h2>
          </div>

          <p className="max-w-md text-sm text-[#DDE8DA]/80 font-normal leading-relaxed">
            Eliminating weeks of scattered browser tabs. We synthesize genuine geography, real transport timetables, and curated cultural pacing into a single coherent plan.
          </p>
        </div>

        {/* Alternating Asymmetrical Editorial Rows with Cartographic Separators */}
        <div className="space-y-16 lg:space-y-24 divide-y divide-white/15">
          {STEPS.map((step, idx) => {
            const isReversed = idx % 2 === 1;

            return (
              <div
                key={step.num}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center pt-16 first:pt-0 ${
                  isReversed ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Text Content Column */}
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, x: isReversed ? 16 : -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55 }}
                  className={`space-y-5 ${
                    isReversed ? "lg:col-span-5 lg:order-2" : "lg:col-span-5"
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-5xl sm:text-6xl text-[#DDE8DA] font-light italic tracking-tight">
                      {step.num}
                      <span className="text-[#F06C5B] font-sans not-italic">.</span>
                    </span>
                    <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#DDE8DA]/70 font-semibold">
                      {step.phase}
                    </span>
                  </div>

                  <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[#F3F0E6] leading-tight">
                    {step.title}
                  </h3>

                  <p className="text-sm text-[#DDE8DA]/80 leading-relaxed font-normal">
                    {step.desc}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {step.meta.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[10px] uppercase tracking-wider text-[#DDE8DA] bg-white/10 border border-white/15 rounded-md px-2.5 py-1"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Link
                      href={ROUTES.trips.new}
                      className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#DDE8DA] hover:text-white font-bold transition-colors group"
                    >
                      <span>Explore this step</span>
                      <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </div>
                </motion.div>

                {/* Cinematic Photography Column — Crisp Architectural Framing */}
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6 }}
                  className={`relative aspect-[16/10] rounded-lg overflow-hidden border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.4)] bg-[#0C120E] ${
                    isReversed ? "lg:col-span-7 lg:order-1" : "lg:col-span-7"
                  }`}
                >
                  <Image
                    src={step.image}
                    alt={step.imageAlt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover object-center filter brightness-90 hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between font-mono text-[10px] tracking-widest text-[#F8F5EE] uppercase">
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F06C5B]" />
                      <span>EXPEDITION ARCHIVE // {step.num}</span>
                    </span>
                    <span>{step.coords}</span>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
