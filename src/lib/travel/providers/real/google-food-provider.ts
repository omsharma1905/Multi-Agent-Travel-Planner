/**
 * @file src/lib/travel/providers/real/google-food-provider.ts
 *
 * Real Food Provider using Google Places API (New Text Search for restaurants).
 * Retrieves curated dining, local cafes, and fine dining.
 *
 * Endpoint: https://places.googleapis.com/v1/places:searchText
 */

import { FoodProvider, RestaurantFilter } from "../interfaces";
import { Restaurant, PriceLevel } from "../../types";
import { restaurantSchema } from "../../validators/travel-schemas";
import {
  InvalidProviderResponseError,
  ProviderUnavailableError,
} from "../../errors/travel-errors";
import { getTravelConfig } from "../../config";

interface GooglePlaceRestaurant {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
  };
  websiteUri?: string;
  googleMapsUri?: string;
}

interface GooglePlacesSearchResponse {
  places?: GooglePlaceRestaurant[];
}

export class GoogleFoodProvider implements FoodProvider {
  private apiKey: string | null;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(apiKey?: string | null, baseUrl?: string, timeoutMs?: number) {
    const config = getTravelConfig();
    this.apiKey = apiKey !== undefined ? apiKey : config.providers.googlePlaces.apiKey;
    this.baseUrl = baseUrl || config.providers.googlePlaces.baseUrl;
    this.timeoutMs = timeoutMs || config.providers.googlePlaces.timeoutMs;
  }

  private mapPriceLevel(googlePrice?: string): PriceLevel {
    switch (googlePrice) {
      case "PRICE_LEVEL_FREE":
        return "budget";
      case "PRICE_LEVEL_INEXPENSIVE":
        return "budget";
      case "PRICE_LEVEL_MODERATE":
        return "moderate";
      case "PRICE_LEVEL_EXPENSIVE":
        return "expensive";
      case "PRICE_LEVEL_VERY_EXPENSIVE":
        return "luxury";
      default:
        return "moderate";
    }
  }

  private extractCuisine(types: string[] = [], requestedCuisine?: string): string[] {
    const found: string[] = [];
    if (requestedCuisine) found.push(requestedCuisine);
    for (const t of types) {
      if (t.includes("restaurant") && !t.includes("meal")) {
        found.push(t.replace("_restaurant", "").replace("_", " "));
      }
    }
    if (found.length === 0) found.push("Local", "Dining");
    return Array.from(new Set(found));
  }

  private mapToRestaurant(item: GooglePlaceRestaurant, destinationId: string, requestedCuisine?: string): Restaurant {
    const name = item.displayName?.text || "Local Restaurant";
    const lat = item.location?.latitude || 0;
    const lng = item.location?.longitude || 0;
    const rating = typeof item.rating === "number" ? Math.min(Math.max(item.rating, 0), 5) : 0;
    const reviewCount = typeof item.userRatingCount === "number" ? item.userRatingCount : 0;
    const priceLevel = this.mapPriceLevel(item.priceLevel);
    const cuisine = this.extractCuisine(item.types, requestedCuisine);
    const address = item.formattedAddress || name;
    const cleanPlaceId = item.id ? item.id.replace(/^places\//, "") : undefined;

    const restaurant: Restaurant = {
      id: `gf_${cleanPlaceId || item.id}`,
      name,
      destinationId,
      latitude: lat,
      longitude: lng,
      cuisine,
      priceLevel,
      rating,
      reviewCount,
      address,
      averagePricePerPerson: null,
      priceType: "unknown",
      openingHours: item.regularOpeningHours?.weekdayDescriptions && item.regularOpeningHours.weekdayDescriptions.length > 0
        ? {
            isAlwaysOpen: false,
            isUnknown: false,
            text: item.regularOpeningHours.weekdayDescriptions.join(", "),
          }
        : {
            isAlwaysOpen: false,
            isUnknown: true,
            text: null,
          },
      website: item.websiteUri,
      googlePlaceId: cleanPlaceId,
      googleMapsUri: item.googleMapsUri,
      tags: item.types || cuisine,
      source: {
        provider: "google-places",
        providerId: cleanPlaceId || item.id,
        fetchedAt: new Date().toISOString(),
        isEstimate: false,
        confidence: 0.95,
        attribution: "Restaurant data provided by Google Places API",
        sourceUrl: item.googleMapsUri || item.websiteUri,
      },
    };

    const check = restaurantSchema.safeParse(restaurant);
    if (!check.success) {
      throw new InvalidProviderResponseError("google-places-food", check.error.format());
    }

    return restaurant;
  }

  async searchRestaurants(filter: RestaurantFilter): Promise<Restaurant[]> {
    if (!this.apiKey) {
      throw new ProviderUnavailableError(
        "google-places-food",
        "GOOGLE_PLACES_API_KEY is not configured.",
      );
    }

    const queryParts = [filter.destinationId];
    if (filter.cuisine) queryParts.push(filter.cuisine);
    queryParts.push("restaurants dining");
    const textQuery = queryParts.join(" ");

    const url = `${this.baseUrl}/places:searchText`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.regularOpeningHours,places.websiteUri,places.googleMapsUri",
        },
        body: JSON.stringify({
          textQuery,
          pageSize: Math.min(filter.limit || 10, 20),
        }),
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new ProviderUnavailableError(
          "google-places-food",
          `Google Places API responded with HTTP ${res.status}: ${res.statusText}`,
        );
      }

      const data = (await res.json()) as GooglePlacesSearchResponse;
      if (!data.places || !Array.isArray(data.places)) {
        return [];
      }

      let results = data.places.map((p) => this.mapToRestaurant(p, filter.destinationId, filter.cuisine));

      if (filter.minRating !== undefined) {
        results = results.filter((r) => r.rating >= filter.minRating!);
      }
      if (filter.priceLevel) {
        results = results.filter((r) => r.priceLevel === filter.priceLevel);
      }

      return results;
    } catch (err: unknown) {
      if (err instanceof InvalidProviderResponseError || err instanceof ProviderUnavailableError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderUnavailableError("google-places-food", message);
    }
  }

  async getRestaurant(id: string): Promise<Restaurant | null> {
    if (!id.startsWith("gf_")) return null;
    if (!this.apiKey) {
      throw new ProviderUnavailableError(
        "google-places-food",
        "GOOGLE_PLACES_API_KEY is not configured.",
      );
    }

    const placeId = id.replace("gf_", "");
    const url = `${this.baseUrl}/places/${placeId}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,types,regularOpeningHours,websiteUri",
        },
      });
      clearTimeout(timer);

      if (res.status === 404) return null;
      if (!res.ok) {
        throw new ProviderUnavailableError(
          "google-places-food",
          `Google Places restaurant details responded with HTTP ${res.status}`,
        );
      }

      const item = (await res.json()) as GooglePlaceRestaurant;
      return this.mapToRestaurant(item, "destination");
    } catch (err: unknown) {
      if (err instanceof ProviderUnavailableError || err instanceof InvalidProviderResponseError) {
        throw err;
      }
      return null;
    }
  }
}
