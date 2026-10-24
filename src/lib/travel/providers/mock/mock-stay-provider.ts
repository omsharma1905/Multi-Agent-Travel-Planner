/**
 * @file src/lib/travel/providers/mock/mock-stay-provider.ts
 *
 * Deterministic Mock Stay Provider with category, price, and rating filtering.
 */

import { StayProvider, StayFilter } from "../interfaces";
import { Stay } from "../../types";
import { MOCK_STAYS } from "./fixtures/stays";
import { staySchema } from "../../validators/travel-schemas";
import { InvalidProviderResponseError } from "../../errors/travel-errors";
import { generateDynamicStays } from "./dynamic-fallback";

export class MockStayProvider implements StayProvider {
  private stays: Stay[];

  constructor(customStays: Stay[] = MOCK_STAYS) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MOCK_PROVIDER_FORBIDDEN: MockStayProvider cannot be instantiated in production environment.",
      );
    }
    this.stays = customStays;
  }


  async searchStays(filter: StayFilter): Promise<Stay[]> {
    const target = filter.destinationId.toLowerCase();
    const normalizedTarget = target.replace(/^(dest_|city_|geo_)/, "");
    let results = this.stays.filter((s) => {
      const stayDest = s.destinationId.toLowerCase();
      const normStayDest = stayDest.replace(/^(dest_|city_|geo_)/, "");
      return stayDest === target || normStayDest === normalizedTarget;
    });

    // Fall back to dynamic candidate generation for arbitrary real-world destinations
    if (results.length === 0) {
      results = generateDynamicStays(filter.destinationId, filter.latitude, filter.longitude);
    }

    if (filter.category) {
      results = results.filter((s) => s.category === filter.category);
    }

    if (filter.comfortLevel) {
      results = results.filter((s) => s.comfortLevel === filter.comfortLevel);
    }

    if (filter.maxPricePerNight !== undefined) {
      results = results.filter((s) => s.pricePerNight !== null && s.pricePerNight <= filter.maxPricePerNight!);
    }

    if (filter.minRating !== undefined) {
      results = results.filter((s) => s.rating >= filter.minRating!);
    }

    const limit = filter.limit ?? 20;
    const sliced = results.slice(0, limit);

    for (const item of sliced) {
      const check = staySchema.safeParse(item);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-stay", check.error.format());
      }
    }

    return sliced;
  }

  async getStay(id: string): Promise<Stay | null> {
    let found = this.stays.find((s) => s.id === id) || null;
    if (!found && id.startsWith("dyn_stay_")) {
      const parts = id.split("_");
      const destId = parts.slice(2, -1).join("_");
      if (destId) {
        found = generateDynamicStays(destId).find((s) => s.id === id) || null;
      }
    }
    if (found) {
      const check = staySchema.safeParse(found);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-stay", check.error.format());
      }
    }
    return found;
  }
}
