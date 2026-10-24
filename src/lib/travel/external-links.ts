/**
 * @file src/lib/travel/external-links.ts
 *
 * Centralized External Links Service.
 * Generates and validates outbound links for:
 * - Google Maps location views
 * - Outbound flight and transit searches
 * - Property and venue official websites
 *
 * Enforces strict URL protocol safety: allows only https:// and http:// schemes.
 * Rejects javascript:, data:, vbscript:, and relative or malformed URLs.
 */

import {
  buildGoogleMapsUrl,
  buildGoogleMapsCityUrl,
  buildGoogleMapsDirectionsUrl,
  isValidGooglePlaceId,
  GoogleMapsLinkParams,
  GoogleMapsDirectionsParams,
} from "./maps";

export {
  buildGoogleMapsUrl,
  buildGoogleMapsCityUrl,
  buildGoogleMapsDirectionsUrl,
  isValidGooglePlaceId,
  type GoogleMapsLinkParams,
  type GoogleMapsDirectionsParams,
};

/**
 * Validates and normalizes an external URL.
 * Only allows https:// (and http://) schemes.
 * Returns null if the URL is invalid, unsafe, or malformed.
 */
export function validateExternalUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks whether an external URL is valid and safe.
 */
export function isValidExternalUrl(url?: string | null): boolean {
  return validateExternalUrl(url) !== null;
}

export interface FlightSearchUrlParams {
  origin?: string;
  destination?: string;
  departureDate?: string;
  travelers?: number;
  bookingUrl?: string;
  carrier?: string;
}

/**
 * Builds a legitimate external flight search URL or validates provider-supplied booking URL.
 * If provider supplied a valid bookingUrl, returns it.
 * Otherwise, generates an authentic Google Flights search URL reflecting real route endpoints,
 * departure date, and traveler count.
 */
export function buildFlightSearchUrl(params: FlightSearchUrlParams): string {
  const { origin, destination, departureDate, bookingUrl } = params;

  // 1. If provider supplies a direct valid booking/checkout URL, prefer it
  const validatedBooking = validateExternalUrl(bookingUrl);
  if (validatedBooking) {
    return validatedBooking;
  }

  // 2. Otherwise generate a truthful Google Flights query
  const cleanOrigin = origin?.trim() || "";
  const cleanDestination = destination?.trim() || "";

  if (!cleanOrigin && !cleanDestination) {
    return "https://www.google.com/travel/flights";
  }

  let query = "Flights";
  if (cleanDestination) query += ` to ${cleanDestination}`;
  if (cleanOrigin) query += ` from ${cleanOrigin}`;
  if (departureDate && departureDate.trim().length > 0) {
    query += ` on ${departureDate.trim()}`;
  }

  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

export interface HotelWebsiteUrlParams {
  website?: string | null;
  name?: string | null;
  address?: string | null;
  sourceUrl?: string | null;
  bookingUrl?: string | null;
}

/**
 * Extracts and validates the official property website or booking link.
 * Never fabricates synthetic URLs based on the property name.
 * Returns null if no official website URL was supplied by the provider.
 */
export function buildHotelWebsiteUrl(params: HotelWebsiteUrlParams): string | null {
  const website = validateExternalUrl(params.website);
  if (website) return website;

  const bookingUrl = validateExternalUrl(params.bookingUrl);
  if (bookingUrl) return bookingUrl;

  const sourceUrl = validateExternalUrl(params.sourceUrl);
  if (sourceUrl) return sourceUrl;

  return null;
}

export type HotelSearchParams =
  | string
  | {
      hotelName?: string;
      name?: string;
      destination?: string;
      address?: string;
    };

/**
 * Builds a search link for accommodations on Google Travel when direct website is unprovided.
 */
export function buildHotelSearchUrl(
  nameOrParams: HotelSearchParams,
  destinationOrAddress?: string
): string {
  if (typeof nameOrParams === "object" && nameOrParams !== null) {
    const name = (nameOrParams.hotelName || nameOrParams.name || "").trim();
    const loc = (nameOrParams.destination || nameOrParams.address || "").trim();
    const query = [name, loc].filter(Boolean).join(" ");
    return `https://www.google.com/travel/search?q=${encodeURIComponent(query || "Hotels")}`;
  }

  const cleanName = (nameOrParams || "").trim();
  const cleanLoc = (destinationOrAddress || "").trim();
  const query = [cleanName, cleanLoc].filter(Boolean).join(" ");
  return `https://www.google.com/travel/search?q=${encodeURIComponent(query || "Hotels")}`;
}

export interface PlaceWebsiteUrlParams {
  website?: string | null;
  sourceUrl?: string | null;
}

/**
 * Returns validated official website or source URL for a place / restaurant.
 * Returns null if unprovided.
 */
export function buildPlaceWebsiteUrl(params: PlaceWebsiteUrlParams): string | null {
  const website = validateExternalUrl(params.website);
  if (website) return website;

  const sourceUrl = validateExternalUrl(params.sourceUrl);
  if (sourceUrl) return sourceUrl;

  return null;
}

export interface TransitSearchUrlParams {
  origin?: string | null;
  destination?: string | null;
  mode?: "train" | "bus" | "car" | string;
  bookingUrl?: string | null;
}

/**
 * Builds a search link for train, transit, or road connections.
 * If provider supplied a valid bookingUrl, returns it.
 * Otherwise, builds an authentic Google Maps Directions URL in transit/driving mode.
 */
export function buildTransitSearchUrl(params: TransitSearchUrlParams): string {
  const { origin, destination, mode = "train", bookingUrl } = params;
  const validatedBooking = validateExternalUrl(bookingUrl);
  if (validatedBooking) {
    return validatedBooking;
  }

  const cleanOrigin = origin?.trim() || "";
  const cleanDestination = destination?.trim() || "";

  if (cleanOrigin && cleanDestination) {
    const directionsUrl = buildGoogleMapsDirectionsUrl({
      origin: cleanOrigin,
      destination: cleanDestination,
      travelMode: mode === "train" || mode === "bus" ? "transit" : mode === "car" ? "driving" : undefined,
    });
    if (directionsUrl) return directionsUrl;
  }

  const queryPrefix = mode === "train" ? "Train to " : mode === "bus" ? "Bus to " : "Directions to ";
  const target = cleanDestination || cleanOrigin || "Transit";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${queryPrefix}${target}`)}`;
}

