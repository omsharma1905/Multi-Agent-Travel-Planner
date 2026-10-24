/**
 * @file src/lib/travel/types/place.ts
 *
 * Normalized Place domain model for attractions, landmarks, museums, and activities.
 */

import type { GeoPoint, OpeningHours, PriceLevel, SourceMetadata  } from "./common";

export type PlaceType =
  | "attraction"
  | "museum"
  | "landmark"
  | "park"
  | "beach"
  | "temple"
  | "viewpoint"
  | "market"
  | "neighborhood"
  | "activity";

export type PlacePriceType = "free" | "paid" | "unknown";

export interface Place extends GeoPoint {
  id: string;
  name: string;
  type: PlaceType;
  destinationId: string;
  rating: number; // 0.0 - 5.0
  reviewCount: number;
  priceLevel: PriceLevel;
  address: string;
  description: string;
  openingHours?: OpeningHours | null;
  website?: string;
  tags: string[];
  source: SourceMetadata;
  estimatedDurationMinutes?: number;
  ticketPrice?: number | null;
  currency?: string;
  isPriceEstimate?: boolean;
  priceType?: PlacePriceType;
  imageUrl?: string;
  googlePlaceId?: string;
  googleMapsUri?: string;
}
