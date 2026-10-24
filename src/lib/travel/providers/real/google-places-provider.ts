/**
 * @file src/lib/travel/providers/real/google-places-provider.ts
 *
 * Real Place Provider using Google Places API (New Text Search).
 * Retrieves attractions, landmarks, museums, and activities.
 *
 * Endpoint: https://places.googleapis.com/v1/places:searchText
 */

import { PlaceProvider, PlaceFilter } from "../interfaces";
import { Place, PlaceType, PriceLevel } from "../../types";
import { placeSchema } from "../../validators/travel-schemas";
import {
  InvalidProviderResponseError,
  ProviderUnavailableError,
} from "../../errors/travel-errors";
import { getTravelConfig } from "../../config";

interface GooglePlaceItem {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    openNow?: boolean;
  };
  websiteUri?: string;
  googleMapsUri?: string;
  editorialSummary?: { text: string };
}

interface GooglePlacesSearchResponse {
  places?: GooglePlaceItem[];
}

export class GooglePlacesProvider implements PlaceProvider {
  private apiKey: string | null;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(apiKey?: string | null, baseUrl?: string, timeoutMs?: number) {
    const config = getTravelConfig();
    this.apiKey = apiKey !== undefined ? apiKey : config.providers.googlePlaces.apiKey;
    this.baseUrl = baseUrl || config.providers.googlePlaces.baseUrl;
    this.timeoutMs = timeoutMs || config.providers.googlePlaces.timeoutMs;
  }

  private mapType(googleTypes: string[] = []): PlaceType {
    if (googleTypes.includes("museum") || googleTypes.includes("art_gallery")) return "museum";
    if (googleTypes.includes("park") || googleTypes.includes("national_park")) return "park";
    if (
      googleTypes.includes("hindu_temple") ||
      googleTypes.includes("church") ||
      googleTypes.includes("mosque") ||
      googleTypes.includes("place_of_worship")
    )
      return "temple";
    if (googleTypes.includes("natural_feature")) return "beach";
    if (googleTypes.includes("tourist_attraction") || googleTypes.includes("historical_landmark"))
      return "landmark";
    return "attraction";
  }

  private mapPriceLevel(googlePrice?: string): PriceLevel {
    switch (googlePrice) {
      case "PRICE_LEVEL_FREE":
        return "free";
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

  private mapToPlace(item: GooglePlaceItem, destinationId: string): Place {
    const name = item.displayName?.text || "Unknown Place";
    const lat = item.location?.latitude || 0;
    const lng = item.location?.longitude || 0;
    const rating = typeof item.rating === "number" ? Math.min(Math.max(item.rating, 0), 5) : 0;
    const reviewCount = typeof item.userRatingCount === "number" ? item.userRatingCount : 0;
    const type = this.mapType(item.types);
    const priceLevel = this.mapPriceLevel(item.priceLevel);
    const address = item.formattedAddress || name;
    const cleanPlaceId = item.id ? item.id.replace(/^places\//, "") : undefined;
    const description = item.editorialSummary?.text || `${name} in the local district.`;

    const place: Place = {
      id: `gp_${cleanPlaceId || item.id}`,
      name,
      type,
      destinationId,
      latitude: lat,
      longitude: lng,
      rating,
      reviewCount,
      priceLevel,
      address,
      description,
      ticketPrice: null,
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
      tags: item.types || [type],
      source: {
        provider: "google-places",
        providerId: cleanPlaceId || item.id,
        fetchedAt: new Date().toISOString(),
        isEstimate: false,
        confidence: 0.95,
        attribution: "Places data provided by Google Places API",
        sourceUrl: item.googleMapsUri || item.websiteUri,
      },
    };

    const check = placeSchema.safeParse(place);
    if (!check.success) {
      throw new InvalidProviderResponseError("google-places", check.error.format());
    }

    return place;
  }

  async searchPlaces(filter: PlaceFilter): Promise<Place[]> {
    if (!this.apiKey) {
      throw new ProviderUnavailableError(
        "google-places",
        "GOOGLE_PLACES_API_KEY is not configured.",
      );
    }

    const queryParts = [filter.destinationId];
    if (filter.type) queryParts.push(filter.type);
    if (filter.tags?.length) queryParts.push(...filter.tags);
    queryParts.push("top tourist attractions");
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
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.regularOpeningHours,places.websiteUri,places.googleMapsUri,places.editorialSummary",
        },
        body: JSON.stringify({
          textQuery,
          pageSize: Math.min(filter.limit || 10, 20),
        }),
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new ProviderUnavailableError(
          "google-places",
          `Google Places API responded with HTTP ${res.status}: ${res.statusText}`,
        );
      }

      const data = (await res.json()) as GooglePlacesSearchResponse;
      if (!data.places || !Array.isArray(data.places)) {
        return [];
      }

      let results = data.places.map((p) => this.mapToPlace(p, filter.destinationId));

      if (filter.minRating !== undefined) {
        results = results.filter((p) => p.rating >= filter.minRating!);
      }
      if (filter.priceLevel) {
        results = results.filter((p) => p.priceLevel === filter.priceLevel);
      }

      return results;
    } catch (err: unknown) {
      if (err instanceof InvalidProviderResponseError || err instanceof ProviderUnavailableError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderUnavailableError("google-places", message);
    }
  }

  async getPlace(id: string): Promise<Place | null> {
    if (!id.startsWith("gp_")) return null;
    if (!this.apiKey) {
      throw new ProviderUnavailableError(
        "google-places",
        "GOOGLE_PLACES_API_KEY is not configured.",
      );
    }

    const placeId = id.replace("gp_", "");
    const url = `${this.baseUrl}/places/${placeId}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "X-Goog-Api-Key": this.apiKey,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,types,regularOpeningHours,websiteUri,editorialSummary",
        },
      });
      clearTimeout(timer);

      if (res.status === 404) return null;
      if (!res.ok) {
        throw new ProviderUnavailableError(
          "google-places",
          `Google Places details responded with HTTP ${res.status}`,
        );
      }

      const item = (await res.json()) as GooglePlaceItem;
      return this.mapToPlace(item, "destination");
    } catch (err: unknown) {
      if (err instanceof ProviderUnavailableError || err instanceof InvalidProviderResponseError) {
        throw err;
      }
      return null;
    }
  }
}
