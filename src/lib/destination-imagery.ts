/**
 * @file src/lib/destination-imagery.ts
 *
 * Destination imagery provider abstraction.
 * Maps destination names or queries to verified high-aesthetic travel photography
 * or neutral typographic/gradient fallbacks.
 *
 * CRITICAL RULE:
 * NEVER substitute random unrelated photographs (e.g. desert road for Mathura).
 * If unknown, image is null and the UI renders a clean typographic placeholder.
 */

import { getDestinationImage } from "./travel/images";

export interface DestinationVisual {
  name: string;
  country: string;
  image: string | null;
  tagline: string;
  gradient: string;
  badgeColor?: string;
}

export function getDestinationVisual(query: string): DestinationVisual {
  const entry = getDestinationImage(query);

  return {
    name: entry.name,
    country: entry.country,
    image: entry.heroImage,
    tagline: entry.heroImage
      ? `${entry.name}, ${entry.country}`
      : `${entry.name}`,
    gradient: entry.neutralGradient,
    badgeColor: "#1F3D2B",
  };
}
