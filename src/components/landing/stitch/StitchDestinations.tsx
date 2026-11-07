"use client";

import { useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { StitchIcon } from "./StitchIcon";

interface DestinationItem {
  id: string;
  name: string;
  region: string;
  badge: string;
  isFeatured?: boolean;
  temp: string;
  season: string;
  duration: string;
  description: string;
  price: string;
  image: string;
  destinationQuery: string;
}

const DESTINATIONS: DestinationItem[] = [
  {
    id: "ha-long-bay",
    name: "Ha Long Bay Karsts",
    region: "Vietnam · Cat Ba Archipelago",
    badge: "Halal & Eco-Luxe",
    isFeatured: true,
    temp: "27°C",
    season: "Golden Season",
    duration: "8 Days Itinerary",
    description:
      "Limestone labyrinths, private sea-plane arrivals, and bioluminescent night paddle-boarding through hidden sea caverns.",
    price: "$3,850",
    image:
      "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=75",
    destinationQuery: "Ha Long Bay, Vietnam",
  },
  {
    id: "dolomites",
    name: "Dolomites Alpine Spire",
    region: "Italy · South Tyrol",
    badge: "High Alpine Trek",
    temp: "16°C",
    season: "Clear Ridge",
    duration: "6 Days Itinerary",
    description:
      "Heli-hiking along dramatic ridgelines paired with Michelin-starred alpine refugios and thermal mineral baths above the clouds.",
    price: "$4,400",
    image:
      "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=75",
    destinationQuery: "Dolomites, Italy",
  },
  {
    id: "kyoto",
    name: "Kyoto Forest Sanctuary",
    region: "Japan · Kansai Sanctuary",
    badge: "Zen Heritage",
    temp: "21°C",
    season: "Autumn Foliage",
    duration: "10 Days Itinerary",
    description:
      "Private temple access, century-old sukiya ryokan estates, and quiet contemplative tea ceremonies curated by masters.",
    price: "$5,900",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=75",
    destinationQuery: "Kyoto, Japan",
  },
];

export function StitchDestinations() {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <section id="sanctuaries" className="w-full px-4 sm:px-6 lg:px-12 py-14 sm:py-20 bg-surface relative z-10 scroll-mt-28">
      <div className="max-w-7xl mx-auto flex flex-col gap-8 sm:gap-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-label-md text-xs uppercase tracking-wider text-secondary">
              <StitchIcon name="travel_explore" className="w-4 h-4 text-secondary" />
              <span>Curated Sanctuaries</span>
            </div>
            <h2 className="font-headline-xl text-3xl sm:text-4xl lg:text-5xl text-on-surface">
              Where will curiosity take you?
            </h2>
          </div>
          <p className="font-body-md text-sm sm:text-base text-on-surface-variant max-w-md leading-relaxed">
            Autonomous agents dynamically cross-reference local seasonal peaks, private land permits, and exclusive eco-lodge availability.
          </p>
        </div>

        {/* 3-Column 3D Perspective Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {DESTINATIONS.map((dest) => {
            const planUrl = `${ROUTES.trips.new}?destination=${encodeURIComponent(dest.destinationQuery)}`;
            const isFailed = failedImages[dest.id];

            return (
              <div
                key={dest.id}
                className="group relative rounded-2xl overflow-hidden bg-surface-container-low border border-white/5 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-white/10 flex flex-col"
              >
                {/* Image Container with Atmosphere Scrim */}
                <div className="relative w-full h-72 sm:h-80 overflow-hidden bg-gradient-to-br from-[#1a2e28] to-[#0c0f0e]">
                  {!isFailed ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={dest.image}
                      alt={dest.name}
                      onError={() => setFailedImages((prev) => ({ ...prev, [dest.id]: true }))}
                      className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-center bg-[#1a2321]">
                      <StitchIcon name="travel_explore" className="w-10 h-10 text-secondary/60" />
                      <span className="font-headline-md text-sm text-on-surface">{dest.name}</span>
                      <span className="font-label-sm text-xs text-on-surface-variant">{dest.region}</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/30 to-transparent pointer-events-none" />

                  {/* Floating Badges */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md font-label-sm text-[11px] uppercase tracking-wider text-on-surface border border-white/10 shadow-sm">
                      {dest.badge}
                    </span>
                    {dest.isFeatured && (
                      <span className="px-2.5 py-1 rounded-full bg-secondary text-on-secondary font-label-sm text-[11px] uppercase tracking-wider font-semibold shadow-sm">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Weather & Duration Overlays */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-on-surface font-label-md" title="Historic seasonal climatological average">
                      <StitchIcon name="wb_sunny" className="w-3.5 h-3.5 text-secondary" />
                      <span>
                        {dest.temp} • {dest.season}
                      </span>
                    </div>
                    <span className="font-label-sm text-on-surface-variant bg-surface-container-lowest/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {dest.duration}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex flex-col gap-4 flex-1 justify-between bg-surface-container-low">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-label-sm text-xs uppercase tracking-wider text-secondary">
                      {dest.region}
                    </span>
                    <h3 className="font-headline-md text-xl sm:text-2xl text-on-surface group-hover:text-primary transition-colors">
                      {dest.name}
                    </h3>
                    <p className="font-body-md text-xs sm:text-sm text-on-surface-variant line-clamp-2 leading-relaxed">
                      {dest.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-label-sm text-[10px] uppercase text-on-surface-variant block">
                        Starting from
                      </span>
                      <p className="font-title-lg text-lg text-secondary font-bold">
                        {dest.price}{" "}
                        <span className="font-body-md text-xs text-on-surface-variant font-normal">
                          / traveler
                        </span>
                      </p>
                    </div>

                    <Link
                      href={planUrl}
                      aria-label={`Plan expedition to ${dest.name}`}
                      className="w-10 h-10 rounded-full bg-surface-container-high border border-white/10 flex items-center justify-center text-on-surface group-hover:bg-primary group-hover:text-on-primary group-hover:border-primary transition-all duration-300"
                    >
                      <StitchIcon name="north_east" className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Honesty Footnote */}
        <div className="text-center font-label-sm text-xs text-on-surface-variant/60 -mt-2">
          * Weather tags reflect historical seasonal averages. Starting prices represent estimated luxury baseline packages curated by autonomous planning models.
        </div>
      </div>
    </section>
  );
}
