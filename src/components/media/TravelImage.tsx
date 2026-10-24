"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface TravelImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  fallbackGradient?: string;
  aspect?: "portrait" | "landscape" | "square" | "panorama" | "custom";
  overlay?: "none" | "subtle" | "cinematic" | "heavy";
  sizes?: string;
}

const aspectClasses = {
  portrait: "aspect-[3/4]",
  landscape: "aspect-[16/10]",
  square: "aspect-square",
  panorama: "aspect-[21/9]",
  custom: "",
};

const overlayClasses = {
  none: "",
  subtle: "bg-gradient-to-t from-black/60 via-black/20 to-transparent",
  cinematic: "bg-gradient-to-t from-black/85 via-black/35 to-black/20",
  heavy: "bg-gradient-to-t from-black/95 via-black/60 to-black/40",
};

export function TravelImage({
  src,
  alt,
  fill = true,
  width,
  height,
  priority = false,
  className,
  imageClassName,
  fallbackGradient = "linear-gradient(135deg, #182332 0%, #0d141e 50%, #06090f 100%)",
  aspect = "custom",
  overlay = "cinematic",
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
}: TravelImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      className={cn(
        "group relative overflow-hidden bg-surface-elevated",
        aspectClasses[aspect],
        className,
      )}
      style={{
        background: fallbackGradient,
      }}
    >
      {!hasError && src && (
        <Image
          src={src}
          alt={alt}
          fill={fill}
          width={!fill ? width : undefined}
          height={!fill ? height : undefined}
          priority={priority}
          sizes={sizes}
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={cn(
            "object-cover transition-all duration-1000 ease-out",
            isLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
            "group-hover:scale-105",
            imageClassName,
          )}
        />
      )}

      {/* Atmospheric noise & tone overlay */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-25"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      {/* Cinematic dark gradient scrim */}
      {overlay !== "none" && (
        <div
          className={cn("pointer-events-none absolute inset-0", overlayClasses[overlay])}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
