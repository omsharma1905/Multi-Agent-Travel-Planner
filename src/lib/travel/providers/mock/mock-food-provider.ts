/**
 * @file src/lib/travel/providers/mock/mock-food-provider.ts
 *
 * Deterministic Mock Food Provider with cuisine, price level, and rating filters.
 */

import { FoodProvider, RestaurantFilter } from "../interfaces";
import { Restaurant } from "../../types";
import { MOCK_RESTAURANTS } from "./fixtures/restaurants";
import { restaurantSchema } from "../../validators/travel-schemas";
import { InvalidProviderResponseError } from "../../errors/travel-errors";
import { normalizeSearchString } from "../../normalizers";
import { generateDynamicRestaurants } from "./dynamic-fallback";

export class MockFoodProvider implements FoodProvider {
  private restaurants: Restaurant[];

  constructor(customRestaurants: Restaurant[] = MOCK_RESTAURANTS) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MOCK_PROVIDER_FORBIDDEN: MockFoodProvider cannot be instantiated in production environment.",
      );
    }
    this.restaurants = customRestaurants;
  }


  async searchRestaurants(filter: RestaurantFilter): Promise<Restaurant[]> {
    const normalizeDest = (id: string) => id.toLowerCase().replace(/^(dest_|om_|geo_|city_)/, "").trim();
    const targetDest = normalizeDest(filter.destinationId);
    let results = this.restaurants.filter((r) => normalizeDest(r.destinationId) === targetDest);

    // Fall back to dynamic candidate generation for arbitrary real-world destinations
    if (results.length === 0) {
      results = generateDynamicRestaurants(filter.destinationId, filter.latitude, filter.longitude);
    }

    if (filter.cuisine) {
      const c = normalizeSearchString(filter.cuisine);
      results = results.filter((r) =>
        r.cuisine.some((item) => normalizeSearchString(item).includes(c)),
      );
    }

    if (filter.priceLevel) {
      results = results.filter((r) => r.priceLevel === filter.priceLevel);
    }

    if (filter.minRating !== undefined) {
      results = results.filter((r) => r.rating >= filter.minRating!);
    }

    if (filter.mealType) {
      const targetMeal = filter.mealType.toLowerCase().trim();
      const mealFiltered = results.filter((r) =>
        r.mealTypes?.some((m) => m.toLowerCase() === targetMeal),
      );
      if (mealFiltered.length > 0) {
        results = mealFiltered;
      }
    }

    const limit = filter.limit ?? 20;
    const sliced = results.slice(0, limit);

    for (const item of sliced) {
      const check = restaurantSchema.safeParse(item);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-food", check.error.format());
      }
    }

    return sliced;
  }

  async getRestaurant(id: string): Promise<Restaurant | null> {
    let found = this.restaurants.find((r) => r.id === id) || null;
    if (!found && id.startsWith("dyn_res_")) {
      const parts = id.split("_");
      const destId = parts.slice(2, -1).join("_");
      if (destId) {
        found = generateDynamicRestaurants(destId).find((r) => r.id === id) || null;
      }
    }
    if (found) {
      const check = restaurantSchema.safeParse(found);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-food", check.error.format());
      }
    }
    return found;
  }
}
