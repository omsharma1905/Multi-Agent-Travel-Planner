/**
 * @file src/lib/travel/types/route.ts
 *
 * Normalized Route domain model for routing and distance calculation between points.
 */

import type { GeoPoint, SourceMetadata  } from "./common";

export type RoutingMode = "drive" | "transit" | "walk" | "fly";

export interface RouteSegment {
  instruction: string;
  distanceKm: number;
  durationMinutes: number;
  mode: RoutingMode;
}

export interface Route {
  origin: GeoPoint | string;
  destination: GeoPoint | string;
  distanceKm: number;
  durationMinutes: number;
  mode: RoutingMode;
  segments?: RouteSegment[];
  geometry?: string; // Encoded polyline or GeoJSON string
  source: SourceMetadata;
}
