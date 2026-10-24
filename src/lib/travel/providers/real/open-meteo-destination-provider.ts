/**
 * @file src/lib/travel/providers/real/open-meteo-destination-provider.ts
 *
 * Real Destination Provider using Open-Meteo Geocoding API.
 * Free, deterministic, non-LLM global geocoding requiring no API key.
 *
 * Endpoint: https://geocoding-api.open-meteo.com/v1/search?name={query}&count=10&language=en&format=json
 */

import { DestinationProvider, DestinationFilter } from "../interfaces";
import { Destination } from "../../types";
import { normalizeSearchString } from "../../normalizers";
import { destinationSchema } from "../../validators/travel-schemas";
import {
  InvalidProviderResponseError,
  ProviderUnavailableError,
} from "../../errors/travel-errors";
import { getTravelConfig } from "../../config";

interface OpenMeteoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  timezone?: string;
}

interface OpenMeteoSearchResponse {
  results?: OpenMeteoResult[];
  generationtime_ms?: number;
}

export class OpenMeteoDestinationProvider implements DestinationProvider {
  private baseUrl: string;
  private timeoutMs: number;

  constructor(baseUrl?: string, timeoutMs?: number) {
    const config = getTravelConfig();
    this.baseUrl = baseUrl || config.providers.openMeteo.baseUrl;
    this.timeoutMs = timeoutMs || config.providers.openMeteo.timeoutMs;
  }

  private mapToDestination(item: OpenMeteoResult): Destination {
    const country = item.country || "Unknown";
    const countryCode = (item.country_code || "XX").toUpperCase().slice(0, 2);
    const region = item.admin1 || item.admin2 || country;
    const timezone = item.timezone || "UTC";

    const destination: Destination = {
      id: `om_${item.id}`,
      name: item.name,
      country,
      countryCode,
      region,
      latitude: item.latitude,
      longitude: item.longitude,
      timezone,
      description: `${item.name} is a destination in ${region}, ${country}.`,
      aliases: [
        normalizeSearchString(item.name),
        `${normalizeSearchString(item.name)}, ${normalizeSearchString(country)}`,
      ],
      source: {
        provider: "open-meteo",
        providerId: String(item.id),
        fetchedAt: new Date().toISOString(),
        isEstimate: false,
        confidence: 0.95,
        attribution: "Geocoding data © Open-Meteo (open-meteo.com)",
        sourceUrl: `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(item.name)}`,
      },
    };

    const check = destinationSchema.safeParse(destination);
    if (!check.success) {
      throw new InvalidProviderResponseError("open-meteo", check.error.format());
    }

    return destination;
  }

  async searchDestinations(filter: DestinationFilter): Promise<Destination[]> {
    const q = filter.query.trim();
    if (!q) return [];

    const limit = Math.min(filter.limit || 10, 20);
    const url = `${this.baseUrl}/search?name=${encodeURIComponent(q)}&count=${limit}&language=en&format=json`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new ProviderUnavailableError(
          "open-meteo",
          `Geocoding API responded with HTTP status ${res.status}: ${res.statusText}`,
        );
      }

      const data = (await res.json()) as OpenMeteoSearchResponse;
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map((item) => this.mapToDestination(item));
    } catch (err: unknown) {
      if (err instanceof InvalidProviderResponseError || err instanceof ProviderUnavailableError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderUnavailableError("open-meteo", message);
    }
  }

  async getDestination(id: string): Promise<Destination | null> {
    if (!id.startsWith("om_")) {
      return null;
    }
    // Open-Meteo geocoding search doesn't have a direct /id endpoint;
    // in practice callers resolve by name or retrieve from cache.
    return null;
  }

  async resolveDestination(query: string): Promise<Destination | null> {
    const cleaned = query.split(",")[0].trim();
    const parts = query.split(",").map((s) => normalizeSearchString(s.trim()));
    const countryQuery = parts.length > 1 ? parts[1] : undefined;

    // Fetch candidate set
    let results = await this.searchDestinations({ query: cleaned, limit: 20 });

    // If query is for a region/state like Goa where geocoding might return Panjim or state name
    if (results.length === 0 || (countryQuery && !results.some((r) => normalizeSearchString(r.country).includes(countryQuery)))) {
      const aliasMap: Record<string, string> = {
        goa: "Panjim",
        bali: "Denpasar",
        phuket: "Phuket",
      };
      const alias = aliasMap[cleaned.toLowerCase()];
      if (alias) {
        const aliasResults = await this.searchDestinations({ query: alias, limit: 10 });
        if (aliasResults.length > 0) {
          results = aliasResults;
        }
      }
    }

    if (results.length === 0) {
      return null;
    }

    if (countryQuery) {
      const countryMatch = results.find(
        (r) =>
          normalizeSearchString(r.country).includes(countryQuery) ||
          normalizeSearchString(r.region).includes(countryQuery),
      );
      if (countryMatch) return countryMatch;
    }

    // Prefer exact name match if available
    const exactNameMatch = results.find(
      (r) => normalizeSearchString(r.name) === normalizeSearchString(cleaned),
    );
    if (exactNameMatch) return exactNameMatch;

    return results[0] || null;
  }
}

