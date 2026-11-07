"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { StitchIcon } from "./StitchIcon";

interface AgentItem {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
}

const AGENTS: AgentItem[] = [
  {
    id: "route",
    name: "Route & Logistics Agent",
    role: "Transportation Architecture",
    description:
      "Syncs charter aviation, scenic high-speed trains, and private luxury catamarans without scheduling friction.",
    icon: "connecting_airports",
    iconBg: "bg-primary-container",
    iconColor: "text-primary",
  },
  {
    id: "stays",
    name: "Bespoke Stays Agent",
    role: "Lodging & Sanctuaries",
    description:
      "Secures invitations to unlisted heritage estates, overwater eco-villas, and private mountain reserves.",
    icon: "villa",
    iconBg: "bg-tertiary-container",
    iconColor: "text-tertiary",
  },
  {
    id: "culinary",
    name: "Culinary & Culture Agent",
    role: "Sensory & Historic Access",
    description:
      "Sources culinary masters, private dining by remote waterfalls, and restricted heritage archaeological guides.",
    icon: "restaurant_menu",
    iconBg: "bg-secondary-container/40",
    iconColor: "text-secondary",
  },
  {
    id: "budget",
    name: "Price & Feasibility Agent",
    role: "Financial & Safety Guard",
    description:
      "Monitors live FX spreads, fuel surcharges, and ensures maximum luxury value return on expenditure.",
    icon: "monetization_on",
    iconBg: "bg-surface-container-highest",
    iconColor: "text-secondary-fixed",
  },
];

const TIMELINE_DAYS = [
  {
    day: "01",
    time: "09:30 AM",
    title: "Private Seaplane from Hanoi & Cat Ba Anchorage",
    narrative:
      "Low-altitude scenic flight over the Red River Delta into Lan Ha Bay. Private tender boarding to the handcrafted teak vessel.",
    tag1: "Coordinates: 20.8449° N, 107.0378° E",
    tag2: "Weather: Calm Seas / 28°C",
  },
  {
    day: "02",
    time: "06:00 PM",
    title: "Bioluminescent Lagoon Exploration & Cave Dinner",
    narrative:
      "Evening sea-kayaking through illuminated karst caverns, followed by private 7-course Vietnamese culinary tasting inside Dau Go Cave.",
    tag1: "Curated by: Culinary Agent",
    tag2: "Curated Activity: Guided Cave Exploration",
  },
  {
    day: "03",
    time: "11:00 AM",
    title: "Lan Ha Eco-Lodge Retreat & Floating Village",
    narrative:
      "Transfer to cliffside bamboo villa sanctuary. Private dialogue with traditional floating village elders regarding maritime ecology.",
    tag1: "Curated Stay: Ocean Eco-Lodge",
    tag2: "Estimated Transit: 2h 45m",
  },
];

export function StitchMultiAgentSection() {
  const [selectedDay, setSelectedDay] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <section id="agents" className="w-full px-4 sm:px-6 lg:px-12 py-16 sm:py-24 bg-surface-container-lowest relative overflow-hidden scroll-mt-28">
      {/* Ambient Radial Specular Glows */}
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto flex flex-col gap-12 sm:gap-16 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto gap-3">
          <span className="font-label-md text-xs uppercase tracking-wider text-secondary">
            Autonomous Architecture
          </span>
          <h2 className="font-headline-xl text-3xl sm:text-4xl lg:text-5xl text-on-surface">
            Coordinated by Specialized Agents
          </h2>
          <p className="font-body-md text-sm sm:text-base text-on-surface-variant leading-relaxed">
            Instead of generic travel scrapers, SafariX activates four specialized AI planners collaborating in real-time to solve complex travel constraints.
          </p>
        </div>

        {/* 2-Column Layout: 4 Agents (Left) + Master Timeline Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: 4 Specialized Agents Overview */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-white/5 transition-all duration-300 hover:bg-surface-container hover:border-white/10 flex items-start gap-4 shadow-sm group"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform",
                    agent.iconBg,
                    agent.iconColor,
                  )}
                >
                  <StitchIcon name={agent.icon} className="w-[22px] h-[22px]" />
                </div>

                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-title-md text-sm sm:text-base text-on-surface font-semibold">
                      {agent.name}
                    </h3>
                    <span className="font-label-sm text-[10px] text-primary uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Engine Ready
                    </span>
                  </div>
                  <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                    {agent.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Harmonized Itinerary Preview Panel */}
          <div className="lg:col-span-7 bg-surface-container rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/5 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-secondary" />
                <div>
                  <h3 className="font-title-lg text-lg sm:text-xl text-on-surface font-semibold">
                    Master Itinerary: Ha Long Bay Expedition{" "}
                    <span className="text-xs font-normal text-secondary font-mono">(Sample Dossier)</span>
                  </h3>
                  <span className="font-label-sm text-xs text-on-surface-variant block">
                    4-Agent Architecture • Illustrative Itinerary Preview
                  </span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-primary-container text-primary font-label-sm text-[11px] uppercase tracking-wider font-semibold border border-primary/20">
                Consensus 1.0
              </span>
            </div>

            {/* Interactive Day Timeline Steps */}
            <div className="flex flex-col gap-4">
              {TIMELINE_DAYS.map((dayItem, idx) => {
                const isActive = selectedDay === idx;

                return (
                  <button
                    key={dayItem.day}
                    type="button"
                    onClick={() => setSelectedDay(idx)}
                    className={cn(
                      "w-full text-left flex items-start gap-4 p-4 rounded-xl transition-all duration-300 border",
                      isActive
                        ? "bg-surface-container-high border-secondary/40 shadow-md translate-x-1"
                        : "bg-surface-container-high/60 border-white/5 hover:bg-surface-container-high hover:border-white/10",
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-headline-md text-2xl text-secondary font-bold">
                        {dayItem.day}
                      </span>
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase">
                        Day
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-title-md text-sm sm:text-base text-on-surface font-semibold">
                          {dayItem.title}
                        </h4>
                        <span className="font-label-sm text-xs text-primary font-semibold">
                          {dayItem.time}
                        </span>
                      </div>

                      <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                        {dayItem.narrative}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="px-2 py-0.5 rounded bg-surface font-label-sm text-[11px] text-on-surface-variant">
                          {dayItem.tag1}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-surface font-label-sm text-[11px] text-secondary font-medium">
                          {dayItem.tag2}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Action Bar */}
            <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-body-md text-xs text-on-surface-variant text-center sm:text-left">
                Autonomous multimodal coordination • Synthesized to user specifications
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href={ROUTES.trips.new}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full bg-primary text-on-primary font-title-md text-xs font-semibold hover:bg-primary-fixed transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <StitchIcon name="travel_explore" className="w-4 h-4 flex-shrink-0" />
                  <span>Synthesize Custom Route</span>
                </Link>

                <button
                  type="button"
                  onClick={handleShare}
                  className="w-10 h-10 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors"
                  aria-label="Share Itinerary"
                >
                  <StitchIcon name={copiedLink ? "check" : "share"} className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
