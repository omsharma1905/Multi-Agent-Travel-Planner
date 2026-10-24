"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants";

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    title: "Vetted Stays",
    subtitle: "STAY AGENT",
    description: "Curated boutique hotels, eco-lodges, and cliffside villas matching your comfort tier with verified availability and pricing.",
    tag: "COMFORT MATCHED",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#E5A83B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    title: "Multi-Modal Transit",
    subtitle: "TRANSPORTATION AGENT",
    description: "Seamless air flights, scenic high-speed rail, regional coaches, and driving itineraries with transparent duration and cost breakdowns.",
    tag: "HONEST ROUTING",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Cultural Experiences",
    subtitle: "ACTIVITIES AGENT",
    description: "Timed landmark entries, natural trails, and local insider viewpoints carefully paced around your daily daylight and energy levels.",
    tag: "TIMED ENTRIES",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-[#E0604E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: "Authentic Gastronomy",
    subtitle: "FOOD AGENT",
    description: "Celebrated dining tables, coastal market counters, and dietary-aware recommendations matched to your culinary preferences.",
    tag: "DIETARY AWARE",
  },
];

export function ConnectedPlanning() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-[#0A0D0B] text-[#F8F5EE] px-6 py-24 sm:px-10 sm:py-36 lg:px-16 border-t border-white/10"
      aria-labelledby="features-heading"
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-radial-at-c from-[#1F3D2B]/20 via-transparent to-transparent opacity-60" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Header (Reference 2 style: Pill badge + Headline on left, descriptive copy on right) */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16 sm:mb-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md border border-white/15 text-xs font-mono uppercase tracking-[0.22em] text-[#E3EBE4] mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>✦ FEATURES</span>
            </div>

            <h2
              id="features-heading"
              className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-bold uppercase tracking-tight text-[#F8F5EE] leading-[0.98]"
            >
              One Place for <br />
              <span className="font-serif italic font-normal text-[#E3EBE4]/85 lowercase">
                every travel detail
              </span>
            </h2>
          </div>

          <p className="max-w-md text-base text-[#E3EBE4]/75 font-normal leading-relaxed">
            SafariX dispatches specialized AI agents across transportation, lodging, cultural activities, and regional dining, synthesizing everything into an airtight, reproducible journey.
          </p>
        </div>

        {/* 4 Frosted Glass Feature Cards Grid (Reference 2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {FEATURES.map((item, idx) => (
            <div
              key={idx}
              className="group relative rounded-3xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 p-8 sm:p-10 backdrop-blur-md hover:border-[#52795D] transition-all duration-300 hover:shadow-2xl hover:shadow-black/50"
            >
              {/* Top row: Icon and Tag */}
              <div className="flex items-center justify-between mb-8">
                <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  {item.icon}
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#E3EBE4]/70">
                  {item.tag}
                </span>
              </div>

              {/* Subtitle & Title */}
              <div className="space-y-1 mb-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#E5A83B] font-semibold block">
                  {item.subtitle}
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase text-[#F8F5EE]">
                  {item.title}
                </h3>
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-[#E3EBE4]/75 leading-relaxed font-light">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Discovery Prompt */}
        <div className="mt-14 sm:mt-18 text-center">
          <Link
            href={ROUTES.trips.new}
            className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-[#E5A83B] hover:text-white transition-colors group"
          >
            <span>DISCOVER HOW MULTI-AGENT PLANNING WORKS IN ACTION</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
