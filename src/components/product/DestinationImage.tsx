"use client";

import React, { useState } from "react";
import Image from "next/image";

interface DestinationImageProps {
  src?: string | null;
  alt: string;
  destinationName: string;
  country?: string;
  className?: string;
  priority?: boolean;
  aspectClassName?: string;
  sizes?: string;
  compact?: boolean;
}

export function DestinationImage({
  src,
  alt,
  destinationName,
  country,
  className = "",
  priority = false,
  aspectClassName = "relative w-full aspect-[16/9] sm:aspect-[21/9]",
  sizes = "(max-width: 1280px) 100vw, 1280px",
  compact = false,
}: DestinationImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const isValidHost = (url?: string | null): boolean => {
    if (!url || typeof url !== "string") return false;
    const lower = url.trim().toLowerCase();
    // Reject flags, coats of arms, seals, and SVGs to prevent stretched non-photo graphics in hero banners
    if (
      /\b(flag|coat_of_arms|seal|emblem|locator|map|insignia|symbol|logo|blason|wappen|escudo)\b/i.test(lower) ||
      /\.svg(\.png)?$/i.test(lower)
    ) {
      return false;
    }
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
      const allowedHosts = [
        "upload.wikimedia.org",
        "commons.wikimedia.org",
        "images.unsplash.com",
        "images.pexels.com",
      ];
      return allowedHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
    } catch {
      return false;
    }
  };

  const hasError = Boolean(src && (failedSrc === src || !isValidHost(src)));

  const cleanAlt = alt?.trim() ? alt : `${destinationName} destination view`;

  if (src && !hasError) {
    return (
      <div className={`overflow-hidden rounded-2xl bg-[#111111] ${aspectClassName} ${className}`}>
        <Image
          src={src}
          alt={cleanAlt}
          fill
          priority={priority}
          sizes={sizes}
          onError={() => setFailedSrc(src)}
          className="object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  // Compact placeholder for small thumbnails
  if (compact) {
    return (
      <div
        className={`overflow-hidden rounded-lg border border-white/10 flex items-center justify-center p-2 text-white ${aspectClassName} ${className}`}
        style={{
          background: "linear-gradient(135deg, #1f2421 0%, #111413 50%, #0a0c0b 100%)",
        }}
        role="img"
        aria-label={`${destinationName} destination thumbnail`}
      >
        <span className="font-mono text-[10px] sm:text-xs font-bold tracking-widest text-emerald-400/90 uppercase">
          {destinationName.slice(0, 3).toUpperCase()}
        </span>
      </div>
    );
  }

  // Designed Architectural / Topographic Hero Placeholder
  // Rendered when no verified authentic landscape photograph is available (prevents stretched flags)
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 flex flex-col justify-between p-6 sm:p-10 text-white relative ${aspectClassName} ${className}`}
      style={{
        background: "linear-gradient(135deg, #1a221e 0%, #111614 45%, #0a0d0c 100%)",
      }}
      role="img"
      aria-label={`${destinationName} destination banner`}
    >
      {/* Decorative architectural topographic contour SVG */}
      <svg
        className="absolute inset-0 w-full h-full opacity-15 pointer-events-none stroke-emerald-500/40 fill-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 400"
        preserveAspectRatio="none"
      >
        <path d="M-100,200 Q200,80 500,250 T900,180" strokeWidth="1.5" />
        <path d="M-100,240 Q250,120 550,290 T900,220" strokeWidth="1" />
        <path d="M-100,280 Q300,160 600,330 T900,260" strokeWidth="1" />
        <path d="M-100,160 Q150,40 450,210 T900,140" strokeWidth="1" />
        <circle cx="680" cy="120" r="80" strokeWidth="0.75" strokeDasharray="4 4" />
      </svg>

      <div className="relative z-10 flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em] text-white/60">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>CURATED DESTINATION</span>
        </span>
        {country && (
          <span className="px-2.5 py-1 rounded-md bg-white/10 border border-white/10 text-white/80 font-bold tracking-wider">
            {country}
          </span>
        )}
      </div>

      <div className="relative z-10 my-auto py-4">
        <h3 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-white/95 drop-shadow-sm">
          {destinationName}
        </h3>
        <p className="font-mono text-xs uppercase tracking-widest text-emerald-400/90 mt-2">
          BESPOKE EXPEDITION ITINERARY
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-mono text-white/40 uppercase tracking-wider">
        <span>AUTHENTIC ROUTE</span>
        <span>SafariX INTELLIGENCE</span>
      </div>
    </div>
  );
}
