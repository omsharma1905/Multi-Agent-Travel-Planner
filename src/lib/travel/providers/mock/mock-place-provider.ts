/**
 * @file src/lib/travel/providers/mock/mock-place-provider.ts
 *
 * Deterministic Mock Place Provider with filtering by destination, type, tags, and rating.
 */

import { PlaceProvider, PlaceFilter } from "../interfaces";
import { Place } from "../../types";
import { MOCK_PLACES } from "./fixtures/places";
import { placeSchema } from "../../validators/travel-schemas";
import { InvalidProviderResponseError } from "../../errors/travel-errors";
import { generateDynamicPlaces } from "./dynamic-fallback";

export class MockPlaceProvider implements PlaceProvider {
  private places: Place[];

  constructor(customPlaces: Place[] = MOCK_PLACES) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MOCK_PROVIDER_FORBIDDEN: MockPlaceProvider cannot be instantiated in production environment.",
      );
    }
    this.places = customPlaces;
  }


  async searchPlaces(filter: PlaceFilter): Promise<Place[]> {
    const normalizeDest = (id: string) => id.toLowerCase().replace(/^(dest_|om_|geo_|city_)/, "").trim();
    const targetDest = normalizeDest(filter.destinationId);
    let results = this.places.filter((p) => normalizeDest(p.destinationId) === targetDest);

    // Fall back to dynamic candidate generation for arbitrary real-world destinations
    if (results.length === 0) {
      results = generateDynamicPlaces(filter.destinationId, filter.latitude, filter.longitude);
    }

    if (filter.type) {
      results = results.filter((p) => p.type === filter.type);
    }

    if (filter.priceLevel) {
      results = results.filter((p) => p.priceLevel === filter.priceLevel);
    }

    if (filter.minRating !== undefined) {
      results = results.filter((p) => p.rating >= filter.minRating!);
    }

    if (filter.tags && filter.tags.length > 0) {
      const normalizedFilterTags = filter.tags.map((t) => t.toLowerCase().trim());
      const filtered = results.filter((p) =>
        normalizedFilterTags.some((ft) =>
          p.tags.some((pt) => pt.toLowerCase().includes(ft) || ft.includes(pt.toLowerCase())),
        ),
      );
      if (filtered.length > 0) {
        results = filtered;
      }
    }

    const limit = filter.limit ?? 20;
    const sliced = results.slice(0, limit);

    for (const item of sliced) {
      const check = placeSchema.safeParse(item);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-place", check.error.format());
      }
    }

    return sliced;
  }

  async getPlace(id: string): Promise<Place | null> {
    let found = this.places.find((p) => p.id === id) || null;
    if (!found && id.startsWith("dyn_pl_")) {
      // Extract destinationId from dyn_pl_{destId}_{num}
      const parts = id.split("_");
      const destId = parts.slice(2, -1).join("_");
      if (destId) {
        found = generateDynamicPlaces(destId).find((p) => p.id === id) || null;
      }
    }
    if (found) {
      const check = placeSchema.safeParse(found);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-place", check.error.format());
      }
    }
    return found;
  }
}

