/**
 * @file src/lib/travel/providers/real/amadeus-transport-provider.ts
 *
 * Real Transport Provider using Amadeus Self-Service Flight Offers Search API.
 * Uses client_credentials OAuth2 token authentication.
 *
 * CRITICAL RULE:
 * Zero Origin Fabrication.
 * If origin is not provided, does NOT invent an airport or fake flights;
 * throws OriginRequiredError or returns empty results with strict provenance.
 */

import { TransportProvider, TransportFilter } from "../interfaces";
import { TransportOption } from "../../types";
import { transportOptionSchema } from "../../validators/travel-schemas";
import {
  InvalidProviderResponseError,
  ProviderUnavailableError,
  OriginRequiredError,
} from "../../errors/travel-errors";
import { getTravelConfig } from "../../config";

interface AmadeusTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AmadeusFlightOffer {
  id: string;
  itineraries: Array<{
    duration: string; // e.g. "PT7H30M"
    segments: Array<{
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      numberOfStops: number;
    }>;
  }>;
  price: {
    total: string;
    currency: string;
  };
  validatingAirlineCodes?: string[];
}

interface AmadeusFlightResponse {
  data?: AmadeusFlightOffer[];
}

export class AmadeusTransportProvider implements TransportProvider {
  private clientId: string | null;
  private clientSecret: string | null;
  private baseUrl: string;
  private timeoutMs: number;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    clientId?: string | null,
    clientSecret?: string | null,
    baseUrl?: string,
    timeoutMs?: number,
  ) {
    const config = getTravelConfig();
    this.clientId = clientId !== undefined ? clientId : config.providers.amadeus.clientId;
    this.clientSecret =
      clientSecret !== undefined ? clientSecret : config.providers.amadeus.clientSecret;
    this.baseUrl = baseUrl || config.providers.amadeus.baseUrl;
    this.timeoutMs = timeoutMs || config.providers.amadeus.timeoutMs;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new ProviderUnavailableError(
        "amadeus",
        "AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are required.",
      );
    }

    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60000) {
      return this.tokenCache.token;
    }

    const tokenUrl = `${this.baseUrl}/v1/security/oauth2/token`;
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    try {
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (!res.ok) {
        throw new ProviderUnavailableError(
          "amadeus",
          `Amadeus OAuth2 token endpoint failed with HTTP ${res.status}: ${res.statusText}`,
        );
      }

      const data = (await res.json()) as AmadeusTokenResponse;
      this.tokenCache = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
      return data.access_token;
    } catch (err: unknown) {
      if (err instanceof ProviderUnavailableError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderUnavailableError("amadeus", `Authentication failed: ${message}`);
    }
  }

  private parseDurationMinutes(isoDuration: string): number {
    // Matches ISO 8601 duration e.g. PT2H30M or PT45M
    const hoursMatch = isoDuration.match(/(\d+)H/);
    const minsMatch = isoDuration.match(/(\d+)M/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    return hours * 60 + mins || 120;
  }

  // Extract or convert 3-letter IATA code if available
  private resolveIataCode(location: string): string | null {
    const trimmed = location.trim().toUpperCase();
    if (trimmed.length === 3 && /^[A-Z]{3}$/.test(trimmed)) {
      return trimmed;
    }
    const knownIatas: Record<string, string> = {
      tokyo: "HND",
      haneda: "HND",
      narita: "NRT",
      kyoto: "KIX", // Osaka/Kyoto gateway
      osaka: "KIX",
      paris: "CDG",
      london: "LHR",
      delhi: "DEL",
      mumbai: "BOM",
      goa: "GOI",
      bali: "DPS",
      dubai: "DXB",
    };
    for (const [name, code] of Object.entries(knownIatas)) {
      if (location.toLowerCase().includes(name)) return code;
    }
    return null;
  }

  async searchTransport(filter: TransportFilter): Promise<TransportOption[]> {
    if (!filter.origin || !filter.origin.trim()) {
      throw new OriginRequiredError(filter.destination);
    }

    const originIata = this.resolveIataCode(filter.origin);
    const destIata = this.resolveIataCode(filter.destination);

    if (!originIata || !destIata) {
      // Cannot execute flight search without valid airport endpoints
      return [];
    }

    const token = await this.getAccessToken();
    const departureDate = filter.date || new Date(Date.now() + 86400000 * 14).toISOString().split("T")[0];
    const adults = filter.travellers || 1;

    const url = `${this.baseUrl}/v2/shopping/flight-offers?originLocationCode=${originIata}&destinationLocationCode=${destIata}&departureDate=${departureDate}&adults=${adults}&max=5`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        throw new ProviderUnavailableError(
          "amadeus",
          `Amadeus Flight Offers responded with HTTP ${res.status}: ${res.statusText}`,
        );
      }

      const data = (await res.json()) as AmadeusFlightResponse;
      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      const results: TransportOption[] = [];

      for (const offer of data.data) {
        const itinerary = offer.itineraries[0];
        if (!itinerary || !itinerary.segments.length) continue;

        const firstSegment = itinerary.segments[0];
        const lastSegment = itinerary.segments[itinerary.segments.length - 1];
        const carrier = offer.validatingAirlineCodes?.[0] || firstSegment.carrierCode || "Airline";
        const price = parseFloat(offer.price.total) || 0;
        const currency = offer.price.currency || "USD";
        const durationMinutes = this.parseDurationMinutes(itinerary.duration);
        const stops = itinerary.segments.length - 1;

        const option: TransportOption = {
          id: `amadeus_${offer.id}`,
          mode: "flight",
          provider: `${carrier} Airlines`,
          origin: firstSegment.departure.iataCode,
          destination: lastSegment.arrival.iataCode,
          departureTime: firstSegment.departure.at,
          arrivalTime: lastSegment.arrival.at,
          durationMinutes,
          price,
          currency,
          stops,
          availability: "available",
          source: {
            provider: "amadeus",
            providerId: offer.id,
            fetchedAt: new Date().toISOString(),
            isEstimate: false,
            confidence: 1.0,
            attribution: "Flight data provided by Amadeus Self-Service API",
          },
        };

        const check = transportOptionSchema.safeParse(option);
        if (!check.success) {
          throw new InvalidProviderResponseError("amadeus-transport", check.error.format());
        }
        results.push(option);
      }

      return results;
    } catch (err: unknown) {
      if (err instanceof InvalidProviderResponseError || err instanceof ProviderUnavailableError) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderUnavailableError("amadeus", message);
    }
  }
}
