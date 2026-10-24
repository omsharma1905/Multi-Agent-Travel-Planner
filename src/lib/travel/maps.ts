/**
 * @file src/lib/travel/maps.ts
 *
 * Canonical Google Maps Location & Directions Service (Phase 10.8).
 * Generates verified, standard Google Maps URLs from real geographic entities.
 *
 * Strict Google Maps Documentation Standards:
 * - Search: https://www.google.com/maps/search/?api=1&query=...[&query_place_id=...]
 * - Directions: https://www.google.com/maps/dir/?api=1&origin=...&destination=...[&origin_place_id=...][&destination_place_id=...][&travelmode=...]
 *
 * Protocol Security:
 * - Allows exclusively https:// schemes on trusted Google Maps domains.
 * - Rejects javascript:, data:, vbscript:, file:, and malformed strings.
 */

/**
 * Validates whether a given string is a genuine Google Place ID.
 * Rejects internal mock/test IDs like "mock_place_...", "dest_...", "stay_...", "dyn_...", etc.
 */
export function isValidGooglePlaceId(placeId?: string | null): boolean {
  if (!placeId || typeof placeId !== "string") return false;
  const clean = placeId.trim().replace(/^places\//, "");
  if (clean.length < 10) return false;

  // Reject internal synthetic identifiers
  const lower = clean.toLowerCase();
  if (
    lower.startsWith("mock") ||
    lower.startsWith("dest_") ||
    lower.startsWith("dyn_") ||
    lower.startsWith("stay_") ||
    lower.startsWith("rest_") ||
    lower.startsWith("place_") ||
    lower.startsWith("item_") ||
    lower.startsWith("flight_") ||
    lower.startsWith("train_") ||
    lower.startsWith("bus_") ||
    lower.startsWith("car_")
  ) {
    return false;
  }

  // Google Place IDs are alphanumeric characters, underscores, and hyphens
  return /^[A-Za-z0-9_-]{10,120}$/.test(clean);
}

/**
 * Validates whether an external URL is a safe, authentic Google Maps link.
 */
function isValidGoogleMapsUri(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "google.com" ||
      host === "www.google.com" ||
      host === "maps.google.com" ||
      host.endsWith(".google.com")
    );
  } catch {
    return false;
  }
}

export interface GoogleMapsLinkParams {
  latitude?: number | null;
  longitude?: number | null;
  label?: string | null;
  address?: string | null;
  placeId?: string | null;
  googlePlaceId?: string | null;
  googleMapsUri?: string | null;
}

/**
 * Builds a standard Google Maps Search URL for an establishment or point of interest.
 * Resolves location in strict priority order (Part 3):
 * 1. Google Place ID + place name/address
 * 2. Google provider's returned Google Maps URI, if valid
 * 3. Exact provider coordinates + name/address
 * 4. Exact provider address + name
 * 5. Returns null if insufficient location information exists
 */
export function buildGoogleMapsUrl(params: GoogleMapsLinkParams): string | null {
  const { latitude, longitude, label, address, placeId, googlePlaceId, googleMapsUri } = params;

  // 1. Google Place ID + place name/address
  const candidatePlaceId = googlePlaceId || placeId;
  if (candidatePlaceId && isValidGooglePlaceId(candidatePlaceId)) {
    const cleanId = candidatePlaceId.trim().replace(/^places\//, "");
    const queryParts = [label?.trim(), address?.trim()].filter(Boolean);
    const query = encodeURIComponent(queryParts.length > 0 ? queryParts.join(", ") : "Location");
    const pid = encodeURIComponent(cleanId);
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${pid}`;
  }

  // 2. Google provider's returned Google Maps URI, if valid
  if (googleMapsUri && isValidGoogleMapsUri(googleMapsUri)) {
    return googleMapsUri.trim();
  }

  // 3. Exact provider coordinates + name/address
  const hasValidCoords =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  if (hasValidCoords) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`;
  }

  // 4. Exact provider address + name
  const textParts = [label?.trim(), address?.trim()].filter(Boolean);
  if (textParts.length > 0) {
    const query = encodeURIComponent(textParts.join(", "));
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  // 5. No reliable location info
  return null;
}

/**
 * Builds a Google Maps Search URL for a city, country, or destination (Part 9 & 10).
 * Does not require a business Place ID; reliably searches city/country geographically.
 */
export function buildGoogleMapsCityUrl(cityOrCountry?: string | null): string | null {
  if (!cityOrCountry || typeof cityOrCountry !== "string") return null;
  const trimmed = cityOrCountry.trim();
  if (trimmed.length === 0) return null;

  const query = encodeURIComponent(trimmed);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export interface GoogleMapsDirectionsParams {
  origin: string;
  destination: string;
  originPlaceId?: string | null;
  destinationPlaceId?: string | null;
  travelMode?:
    | "driving"
    | "transit"
    | "walking"
    | "bicycling"
    | "flight"
    | "train"
    | "car"
    | "bus"
    | null;
}

/**
 * Builds a standard Google Maps Directions URL between origin and destination (Part 11).
 * Uses official /maps/dir/?api=1 format with optional place IDs and travelmode.
 */
export function buildGoogleMapsDirectionsUrl(params: GoogleMapsDirectionsParams): string | null {
  const { origin, destination, originPlaceId, destinationPlaceId, travelMode } = params;
  if (!origin || !origin.trim() || !destination || !destination.trim()) {
    return null;
  }

  const cleanOrigin = origin.trim();
  const cleanDestination = destination.trim();

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", cleanOrigin);
  url.searchParams.set("destination", cleanDestination);

  if (originPlaceId && isValidGooglePlaceId(originPlaceId)) {
    url.searchParams.set("origin_place_id", originPlaceId.trim().replace(/^places\//, ""));
  }

  if (destinationPlaceId && isValidGooglePlaceId(destinationPlaceId)) {
    url.searchParams.set("destination_place_id", destinationPlaceId.trim().replace(/^places\//, ""));
  }

  if (travelMode) {
    const mode = travelMode.toLowerCase();
    if (mode === "train" || mode === "bus" || mode === "transit") {
      url.searchParams.set("travelmode", "transit");
    } else if (mode === "flight") {
      url.searchParams.set("travelmode", "flying");
    } else if (mode === "car" || mode === "driving") {
      url.searchParams.set("travelmode", "driving");
    } else if (mode === "walking" || mode === "bicycling") {
      url.searchParams.set("travelmode", mode);
    }
  }

  return url.toString();
}
