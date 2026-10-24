/**
 * @file src/lib/agents/validator/feasibility-engine.ts
 *
 * Deterministic Feasibility Engine.
 * Verifies existence of referenced IDs, price bounds, coordinate validity, and travel constraints.
 */

import { Place, Restaurant, Stay, TransportOption } from "@/lib/travel";

export interface FeasibilityIssue {
  code: string;
  message: string;
  field?: string;
  severity: "error" | "warning";
}

export class FeasibilityEngine {
  /**
   * Verifies candidate integrity before itinerary synthesis.
   */
  static verifyCandidates(params: {
    destinationId: string;
    stay: Stay | null;
    transport: TransportOption | null;
    places: Place[];
    restaurants: Restaurant[];
    transportPreference?: string;
  }): FeasibilityIssue[] {
    const issues: FeasibilityIssue[] = [];

    const matchesDest = (entityDestId: string, targetDestId: string): boolean => {
      if (entityDestId === targetDestId) return true;
      const normalize = (id: string) =>
        id.toLowerCase().replace(/^(dest_|om_|geo_|city_)/, "").trim();
      return normalize(entityDestId) === normalize(targetDestId);
    };

    // 1. Verify stay
    if (params.stay) {
      if (!matchesDest(params.stay.destinationId, params.destinationId)) {
        issues.push({
          code: "STAY_DESTINATION_MISMATCH",
          message: `Selected stay "${params.stay.name}" belongs to destination "${params.stay.destinationId}", expected "${params.destinationId}".`,
          severity: "error",
        });
      }

      // Price validation: must not be negative (null is allowed for unknown rates, 0 for free)
      if (typeof params.stay.pricePerNight === "number" && params.stay.pricePerNight < 0) {
        issues.push({
          code: "INVALID_STAY_PRICE",
          message: `Stay price per night cannot be negative.`,
          severity: "error",
        });
      }

      // Coordinate bounds validation
      if (
        typeof params.stay.latitude !== "number" ||
        typeof params.stay.longitude !== "number" ||
        isNaN(params.stay.latitude) ||
        isNaN(params.stay.longitude) ||
        params.stay.latitude < -90 ||
        params.stay.latitude > 90 ||
        params.stay.longitude < -180 ||
        params.stay.longitude > 180
      ) {
        issues.push({
          code: "INVALID_STAY_COORDINATES",
          message: `Stay coordinates (${params.stay.latitude}, ${params.stay.longitude}) are out of valid geographic bounds.`,
          severity: "error",
        });
      }

      // Availability check: reject sold_out stays
      if (params.stay.availability === "sold_out") {
        issues.push({
          code: "STAY_UNAVAILABLE",
          message: `Selected property "${params.stay.name}" has no available inventory.`,
          severity: "error",
        });
      }
    }

    // 2. Verify places
    const seenPlaceIds = new Set<string>();
    for (const place of params.places) {
      if (seenPlaceIds.has(place.id)) {
        issues.push({
          code: "DUPLICATE_PLACE",
          message: `Duplicate place detected: "${place.name}" (${place.id}).`,
          severity: "warning",
        });
      }
      seenPlaceIds.add(place.id);

      // Coordinate bounds validation: -90 <= lat <= 90, -180 <= lng <= 180, valid numbers
      if (
        typeof place.latitude !== "number" ||
        typeof place.longitude !== "number" ||
        isNaN(place.latitude) ||
        isNaN(place.longitude) ||
        place.latitude < -90 ||
        place.latitude > 90 ||
        place.longitude < -180 ||
        place.longitude > 180
      ) {
        issues.push({
          code: "INVALID_PLACE_COORDINATES",
          message: `Place "${place.name}" (${place.id}) has invalid coordinates: (${place.latitude}, ${place.longitude}).`,
          severity: "error",
        });
      }

      // Ticket price validation if explicitly set
      if (typeof place.ticketPrice === "number" && (isNaN(place.ticketPrice) || place.ticketPrice < 0)) {
        issues.push({
          code: "INVALID_TICKET_PRICE",
          message: `Place "${place.name}" (${place.id}) has invalid ticket price: ${place.ticketPrice}.`,
          severity: "error",
        });
      }

      if (!matchesDest(place.destinationId, params.destinationId)) {
        issues.push({
          code: "PLACE_DESTINATION_MISMATCH",
          message: `Place "${place.name}" belongs to destination "${place.destinationId}", expected "${params.destinationId}".`,
          severity: "error",
        });
      }
    }

    // 3. Verify restaurants
    const seenRestaurantIds = new Set<string>();
    for (const restaurant of params.restaurants) {
      if (seenRestaurantIds.has(restaurant.id)) {
        issues.push({
          code: "DUPLICATE_RESTAURANT",
          message: `Duplicate restaurant detected: "${restaurant.name}" (${restaurant.id}).`,
          severity: "warning",
        });
      }
      seenRestaurantIds.add(restaurant.id);

      // Coordinate bounds validation: -90 <= lat <= 90, -180 <= lng <= 180, valid numbers
      if (
        typeof restaurant.latitude !== "number" ||
        typeof restaurant.longitude !== "number" ||
        isNaN(restaurant.latitude) ||
        isNaN(restaurant.longitude) ||
        restaurant.latitude < -90 ||
        restaurant.latitude > 90 ||
        restaurant.longitude < -180 ||
        restaurant.longitude > 180
      ) {
        issues.push({
          code: "INVALID_RESTAURANT_COORDINATES",
          message: `Restaurant "${restaurant.name}" (${restaurant.id}) has invalid coordinates: (${restaurant.latitude}, ${restaurant.longitude}).`,
          severity: "error",
        });
      }

      // Average price validation if explicitly set
      if (
        typeof restaurant.averagePricePerPerson === "number" &&
        (isNaN(restaurant.averagePricePerPerson) || restaurant.averagePricePerPerson < 0)
      ) {
        issues.push({
          code: "INVALID_RESTAURANT_PRICE",
          message: `Restaurant "${restaurant.name}" (${restaurant.id}) has invalid average price: ${restaurant.averagePricePerPerson}.`,
          severity: "error",
        });
      }

      if (!matchesDest(restaurant.destinationId, params.destinationId)) {
        issues.push({
          code: "RESTAURANT_DESTINATION_MISMATCH",
          message: `Restaurant "${restaurant.name}" belongs to "${restaurant.destinationId}", expected "${params.destinationId}".`,
          severity: "error",
        });
      }
    }

    // 4. Verify transport
    if (params.transport) {
      if (
        params.transportPreference &&
        params.transportPreference !== "auto" &&
        params.transport.mode !== params.transportPreference
      ) {
        issues.push({
          code: "PREFERENCE_MODE_MISMATCH",
          message: `Selected transport mode "${params.transport.mode}" does not match requested transport preference "${params.transportPreference}".`,
          severity: "warning",
        });
      }

      if (typeof params.transport.price === "number" && params.transport.price < 0) {
        issues.push({
          code: "INVALID_TRANSPORT_PRICE",
          message: `Transport price cannot be negative: ${params.transport.price}.`,
          severity: "error",
        });
      }
    }

    return issues;
  }
}
