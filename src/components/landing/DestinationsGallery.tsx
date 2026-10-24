"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ROUTES } from "@/lib/constants";

const CURATED_EXPEDITIONS = [
  {
    name: "Kyoto & Ancient Valleys",
    region: "Kansai, Japan",
    coords: "35.0116° N // 135.7681° E",
    season: "Autumn Foliage / Spring Bloom",
    duration: "6–8 Days",
    pace: "Reflective & Cultural",
    summary: "Morning walks through bamboo groves, private teahouse ceremonies, Zen temple gardens, and multi-course kaiseki dining along the Kamo River.",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1600&q=85",
  },
  {
    name: "Amalfi Coastal Ridges",
    region: "Campania, Italy",
    coords: "40.6340° N // 14.6027° E",
    season: "May–October",
    duration: "5–7 Days",
    pace: "Coastal & Scenic",
    summary: "Cliffside lemon groves, Path of the Gods trail, regional ferry passages between Ravello and Positano, and fresh seafood on cliffside terraces.",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85",
  },
  {
    name: "Oaxacan Culinary Terroir",
    region: "Oaxaca, Mexico",
    coords: "17.0732° N // 96.7266° W",
    season: "Year-Round / Winter Dry Season",
    duration: "5–6 Days",
    pace: "Gastronomic & Artisan",
    summary: "Ancestral mole tastings, traditional mezcal distilleries in the central valleys, Zapotec textile ateliers, and vibrant historic markets.",
    image: "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=1200&q=85",
  },
];

export function DestinationsGallery() {
  const shouldReduceMotion = useReducedMotion();
  const [primary, ...secondary] = CURATED_EXPEDITIONS;

  return (
    <section
      id="destinations"
      className="relative overflow-hidden bg-[#082D23] text-[#F3F0E6] px-6 py-16 sm:px-10 sm:py-24 lg:px-16 border-b border-white/10"
      aria-labelledby="destinations-heading"
    >
      {/* Soft Topographical Ambient Radial Light */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(16,71,53,0.5)_0%,rgba(8,45,35,0.95)_60%,#082D23_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-14 lg:mb-20 pb-6 border-b border-white/15">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#DDE8DA] mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F06C5B]" />
              <span>EXPEDITION ARCHIVE // PROVEN BLUEPRINTS</span>
            </div>
            <h2
              id="destinations-heading"
              className="font-display text-[clamp(2.2rem,4.5vw,3.8rem)] font-bold uppercase tracking-tight text-[#F3F0E6] leading-[1.04]"
            >
              Curated itineraries <br />
              <span className="font-serif italic font-normal text-[#DDE8DA] lowercase tracking-normal">
                tested in the field.
              </span>
            </h2>
          </div>

          <p className="max-w-md text-sm text-[#DDE8DA]/80 font-normal leading-relaxed">
            Real geographical blueprints designed with vetted travel providers. Commission any expedition as your starting canvas and tailor it to your preferences.
          </p>
        </div>

        {/* Asymmetrical Editorial Broadsheet Composition */}
        <div className="space-y-8">
          {/* 1. Large Panoramic Feature: Kyoto — Architectural Framing */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="group relative rounded-lg overflow-hidden border border-white/20 bg-[#0C120E] min-h-[460px] lg:min-h-[520px] flex flex-col justify-end p-8 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
          >
            <Image
              src={primary.image}
              alt={primary.name}
              fill
              sizes="(max-width: 1024px) 100vw, 90vw"
              className="object-cover object-center filter brightness-85 group-hover:scale-[1.02] transition-transform duration-1000 ease-out"
            />
            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Embedded Editorial Content */}
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-[#DDE8DA]">
                <span>{primary.region}</span>
                <span>{"//"}</span>
                <span>{primary.coords}</span>
                <span>{"//"}</span>
                <span>{primary.duration}</span>
              </div>

              <h3 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-[#F8F5EE]">
                {primary.name}
              </h3>

              <p className="text-sm sm:text-base text-[#F8F5EE]/85 font-light leading-relaxed">
                {primary.summary}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href={`${ROUTES.trips.new}?destination=Kyoto`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F3F0E6] hover:bg-white text-[#082D23] px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
                >
                  <span>Commission Kyoto Journey</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <span className="font-mono text-xs text-[#DDE8DA]/90">
                  Best: {primary.season}
                </span>
              </div>
            </div>
          </motion.div>

          {/* 2. Two Supporting Editorial Panels — Crisp Broadsheet Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {secondary.map((dest) => (
              <motion.div
                key={dest.name}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6 }}
                className="group relative rounded-lg overflow-hidden border border-white/20 bg-[#0C120E] min-h-[380px] flex flex-col justify-end p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.35)]"
              >
                <Image
                  src={dest.image}
                  alt={dest.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-center filter brightness-85 group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

                <div className="relative z-10 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#DDE8DA]">
                    <span>{dest.region}</span>
                    <span>{"//"}</span>
                    <span>{dest.duration}</span>
                  </div>

                  <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-[#F8F5EE]">
                    {dest.name}
                  </h3>

                  <p className="text-xs text-[#F8F5EE]/80 font-light leading-relaxed line-clamp-2">
                    {dest.summary}
                  </p>

                  <div className="pt-2">
                    <Link
                      href={`${ROUTES.trips.new}?destination=${encodeURIComponent(dest.name.split(" ")[0])}`}
                      className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#DDE8DA] hover:text-white font-bold transition-colors group"
                    >
                      <span>Tailor this expedition</span>
                      <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
