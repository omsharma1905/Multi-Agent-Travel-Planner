/**
 * @file src/lib/travel/providers/mock/mock-destination-provider.ts
 *
 * Deterministic Mock Destination Provider with fuzzy alias resolution.
 */

import { DestinationProvider, DestinationFilter } from "../interfaces";
import { Destination } from "../../types";
import { MOCK_DESTINATIONS } from "./fixtures/destinations";
import { normalizeSearchString } from "../../normalizers";
import { destinationSchema } from "../../validators/travel-schemas";
import { InvalidProviderResponseError } from "../../errors/travel-errors";

export class MockDestinationProvider implements DestinationProvider {
  private destinations: Destination[];

  constructor(customDestinations: Destination[] = MOCK_DESTINATIONS) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MOCK_PROVIDER_FORBIDDEN: MockDestinationProvider cannot be instantiated in production environment.",
      );
    }
    this.destinations = customDestinations;
  }


  async searchDestinations(filter: DestinationFilter): Promise<Destination[]> {
    const q = normalizeSearchString(filter.query);
    if (!q) return [];

    const matches = this.destinations.filter((d) => {
      const nameMatch = d.name ? normalizeSearchString(d.name).includes(q) : false;
      const countryMatch = d.country ? normalizeSearchString(d.country).includes(q) : false;
      const aliasMatch = Array.isArray(d.aliases)
        ? d.aliases.some((alias) => normalizeSearchString(alias).includes(q))
        : false;
      return nameMatch || countryMatch || aliasMatch;
    });

    const limit = filter.limit ?? 10;
    const results = matches.slice(0, limit);

    // Boundary validation
    for (const item of results) {
      const check = destinationSchema.safeParse(item);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-destination", check.error.format());
      }
    }

    return results;
  }

  async getDestination(id: string): Promise<Destination | null> {
    const found = this.destinations.find((d) => d.id === id) || null;
    if (found) {
      const check = destinationSchema.safeParse(found);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-destination", check.error.format());
      }
    }
    return found;
  }

  async resolveDestination(query: string): Promise<Destination | null> {
    const q = normalizeSearchString(query);
    if (!q) return null;

    // Exact alias or name match first
    const exact = this.destinations.find(
      (d) =>
        normalizeSearchString(d.name) === q ||
        d.aliases.some((alias) => normalizeSearchString(alias) === q),
    );
    if (exact) {
      const check = destinationSchema.safeParse(exact);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-destination", check.error.format());
      }
      return exact;
    }

    // Substring match
    const candidate = this.destinations.find(
      (d) =>
        q.includes(normalizeSearchString(d.name)) ||
        d.aliases.some((alias) => q.includes(normalizeSearchString(alias))),
    );

    if (candidate) {
      const check = destinationSchema.safeParse(candidate);
      if (!check.success) {
        throw new InvalidProviderResponseError("mock-destination", check.error.format());
      }
      return candidate;
    }

    return null;
  }
}
