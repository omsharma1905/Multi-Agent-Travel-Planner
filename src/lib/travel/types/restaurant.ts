/**
 * @file src/lib/travel/types/restaurant.ts
 *
 * Normalized Restaurant domain model for culinary and dining venues.
 */

import type { GeoPoint, OpeningHours, PriceLevel, SourceMetadata  } from "./common";

export type RestaurantPriceType = "free" | "budget" | "moderate" | "premium" | "unknown";
export type MealType = "breakfast" | "lunch" | "dinner" | "cafe" | "snack";

export interface Restaurant extends GeoPoint {
  id: string;
  name: string;
  destinationId: string;
  cuisine: string[];
  category?: string;
  description?: string;
  priceLevel: PriceLevel;
  rating: number; // 0.0 - 5.0
  reviewCount: number;
  address: string;
  openingHours?: OpeningHours | null;
  website?: string;
  tags: string[];
  source: SourceMetadata;
  mealTypes?: MealType[];
  averagePricePerPerson?: number | null;
  currency?: string;
  priceType?: RestaurantPriceType;
  isPriceEstimate?: boolean;
  dietaryOptions?: string[];
  imageUrl?: string;
  googlePlaceId?: string;
  googleMapsUri?: string;
}

