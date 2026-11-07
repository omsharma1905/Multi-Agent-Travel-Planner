"use client";

import { useEffect, useState } from "react";
import { StitchTripPlannerConsole } from "./StitchTripPlannerConsole";
import { StitchIcon } from "./StitchIcon";

export function StitchHero() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="hero" className="relative z-20 w-full min-h-[820px] lg:min-h-[880px] pt-24 sm:pt-28 pb-12 sm:pb-16 flex items-center justify-center bg-[#0c0f0e] scroll-mt-28">
      {/* Full-Bleed Parallax Photographic Background - Isolated Overflow Boundary */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-transform duration-700 ease-out will-change-transform scale-105"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1440&q=75')",
            transform: `scale(1.05) translateY(${scrollY * 0.12}px)`,
          }}
        />

        {/* Atmospheric Multi-stop Scrim Gradients for Pure Legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-surface-container-lowest/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-dim/85 via-transparent to-surface-dim/75" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-surface/40 to-surface" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-10 lg:gap-14 pt-4 sm:pt-8">
        {/* Left Column: Editorial Headline & Narrative Copy */}
        <div className="w-full lg:max-w-xl flex flex-col gap-6 text-left">
          {/* Floating Editorial Badge */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface-container-lowest/80 backdrop-blur-md shadow-sm w-fit border border-white/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
            </span>
            <span className="font-label-sm text-xs uppercase tracking-wider text-on-surface">
              Your next adventure starts here
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display-lg text-4xl sm:text-5xl lg:text-6xl text-on-surface leading-[1.08] tracking-tight drop-shadow-md">
            Discover New Places, <br />
            <span className="italic font-normal text-tertiary">Create Lasting Memories</span>
          </h1>

          {/* Supporting Narrative Copy */}
          <p className="font-body-lg text-base sm:text-lg text-on-surface-variant max-w-lg leading-relaxed drop-shadow-sm">
            Turn your travel ideas into detailed itineraries with real destinations, activities, handpicked stays, and autonomous multi-agent orchestration.
          </p>

          {/* Social Proof Metric Pills */}
          <div
            className="flex items-center gap-4 sm:gap-6 pt-2"
            title="Illustrative benchmark metrics from autonomous multi-agent route simulation tests"
          >
            <div className="flex -space-x-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-container border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                <StitchIcon name="explore" className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary-container border border-secondary/30 flex items-center justify-center text-on-secondary shadow-sm">
                <StitchIcon name="flight_takeoff" className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-surface-container-high border border-white/20 flex items-center justify-center text-secondary shadow-sm">
                <StitchIcon name="verified" className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>

            <div className="flex flex-col">
              <span className="font-title-md text-sm sm:text-base text-on-surface leading-tight font-semibold">
                14,280+ Bespoke Routes
              </span>
              <span className="font-label-sm text-xs text-on-surface-variant">
                Validated with 99.4% AI consensus <span className="opacity-60">(Simulation Benchmark)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Elevated 3D Glass Trip Planner Console */}
        <div className="w-full lg:w-[470px] flex-shrink-0 relative z-30">
          <StitchTripPlannerConsole variant="desktop" />
        </div>
      </div>
    </section>
  );
}
