/**
 * @file src/lib/travel/types/stay.ts
 *
 * Normalized Stay domain model for hotels, resorts, villas, and accommodations.
 */

import type { GeoPoint, SourceMetadata  } from "./common";

export type StayCategory =
  | "hotel"
  | "resort"
  | "villa"
  | "boutique"
  | "hostel"
  | "ryokan"
  | "apartment";

export type StayComfortLevel =
  | "budget"
  | "standard"
  | "comfort"
  | "premium"
  | "luxury";

export type StayPriceType = "exact" | "estimated" | "free" | "unknown";

export type StayAvailability = "available" | "limited" | "sold_out" | "unknown";

export interface Stay extends GeoPoint {
  id: string;
  name: string;
  destinationId: string;
  address: string;
  category: StayCategory;
  rating: number;
  reviewCount: number;
  pricePerNight: number | null;
  currency: string;
  amenities: string[];
  checkIn: string; // e.g. "15:00"
  checkOut: string; // e.g. "11:00"
  description: string;
  website?: string;
  bookingUrl?: string;
  source: SourceMetadata;

  // Rich Stay Intelligence additions (Phase 10.4)
  comfortLevel?: StayComfortLevel;
  priceType?: StayPriceType;
  isPriceEstimate?: boolean;
  totalStayPrice?: number | null;
  availability?: StayAvailability;
  roomType?: string;
  imageUrl?: string;
  googlePlaceId?: string;
  googleMapsUri?: string;
}
