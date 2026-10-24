/**
 * @file src/lib/travel/providers/real/duffel-transport-provider.ts
 *
 * Real Transport Provider using Duffel Air API (v2).
 * Replaces decommissioned Amadeus Self-Service Flight Offers.
 *
 * Capabilities:
 * - Direct integration with Duffel Flights offer requests (/air/offer_requests).
 * - Real carrier codes, flight numbers, itineraries, duration, and verified fares.
 * - Server-only Bearer token authentication via DUFFEL_ACCESS_TOKEN.
 *
 * CRITICAL ZERO-MOCK & DATA INTEGRITY RULES:
 * - Zero Origin Fabrication: Throws OriginRequiredError if origin is missing.
 * - Fails closed with ProviderUnavailableError if DUFFEL_ACCESS_TOKEN is missing in real mode.
 * - Zero silent fallback to mock flights or synthetic fares in production.
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
import { AirportResolver } from "../../services/airport-resolver";

export interface DuffelSlice {
  origin: string;
  destination: string;
  departure_date: string;
}

export interface DuffelPassenger {
  type?: "adult" | "child" | "infant_without_seat";
  age?: number;
}

export interface DuffelOfferSegment {
  id: string;
  origin: { iata_code: string; name?: string };
  destination: { iata_code: string; name?: string };
  departing_at: string;
  arriving_at: string;
  operating_carrier?: { name: string; iata_code: string };
  marketing_carrier?: { name: string; iata_code: string };
  flight_number?: string;
  duration?: string;
  stops?: number;
}

export interface DuffelOfferSlice {
  id: string;
  duration: string; // ISO 8601 e.g. "PT7H30M"
  origin: { iata_code: string; name?: string };
  destination: { iata_code: string; name?: string };
  segments: DuffelOfferSegment[];
}

export interface DuffelOffer {
  id: string;
  total_amount: string; // numeric string e.g. "245.50"
  total_currency: string; // e.g. "USD", "EUR"
  owner: { name: string; iata_code: string };
  slices: DuffelOfferSlice[];
  passenger_identity_documents_required?: boolean;
  expires_at?: string;
}

export interface DuffelOfferResponse {
  data?: {
    id: string;
    offers?: DuffelOffer[];
    slices?: Array<{ origin: { iata_code: string }; destination: { iata_code: string } }>;
  };
}

export class DuffelTransportProvider implements TransportProvider {
  private accessToken: string | null;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(accessToken?: string | null, baseUrl?: string, timeoutMs = 10000) {
    const config = getTravelConfig();
    this.accessToken =
      accessToken !== undefined ? accessToken : config.providers.duffel?.accessToken || null;
    this.baseUrl = baseUrl || config.providers.duffel?.baseUrl || "https://api.duffel.com";
    this.timeoutMs = timeoutMs;
  }

  /**
   * Parses ISO 8601 duration string (e.g. "PT2H30M" or "PT45M") into total minutes.
   */
  private parseDurationMinutes(isoDuration?: string): number {
    if (!isoDuration) return 120;
    const hoursMatch = isoDuration.match(/(\d+)H/);
    const minsMatch = isoDuration.match(/(\d+)M/);
    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const mins = minsMatch ? parseInt(minsMatch[1], 10) : 0;
    return hours * 60 + mins || 120;
  }


  async searchTransport(filter: TransportFilter): Promise<TransportOption[]> {
    if (!filter.origin || !filter.origin.trim()) {
      throw new OriginRequiredError(filter.destination);
    }

    if (!this.accessToken) {
      throw new ProviderUnavailableError(
        "duffel-transport",
        "DUFFEL_ACCESS_TOKEN is required to query live flight offers. Configure DUFFEL_ACCESS_TOKEN in production.",
      );
    }

    // Resolve Origin and Destination via AirportResolver (Server-side, no guessing)
    const [originResolution, destResolution] = await Promise.all([
      AirportResolver.resolve(filter.origin, {
        accessToken: this.accessToken,
        baseUrl: this.baseUrl,
      }),
      AirportResolver.resolve(filter.destination, {
        accessToken: this.accessToken,
        baseUrl: this.baseUrl,
      }),
    ]);

    if (!originResolution.resolved || !originResolution.iataCode) {
      // Cannot execute genuine flight search without verified origin airport
      return [];
    }

    if (!destResolution.resolved || !destResolution.iataCode) {
      // Cannot execute genuine flight search without verified destination airport
      return [];
    }

    const originIata = originResolution.iataCode;
    const destIata = destResolution.iataCode;

    // Validate & format departure date (YYYY-MM-DD)
    let departureDate = filter.date;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!departureDate || !dateRegex.test(departureDate)) {
      departureDate = new Date(Date.now() + 86400000 * 14).toISOString().split("T")[0];
    }

    const passengersCount = Math.max(1, Math.min(filter.travellers || 1, 9));
    const cabinClass = filter.cabinClass || "economy";

    const slices: DuffelSlice[] = [
      {
        origin: originIata,
        destination: destIata,
        departure_date: departureDate,
      },
    ];

    // Multi-slice support for round-trip when returnDate is provided
    if (filter.returnDate && dateRegex.test(filter.returnDate)) {
      slices.push({
        origin: destIata,
        destination: originIata,
        departure_date: filter.returnDate,
      });
    }

    const requestBody = {
      data: {
        slices,
        passengers: Array.from({ length: passengersCount }, () => ({ type: "adult" })),
        cabin_class: cabinClass,
      },
    };

    const url = `${this.baseUrl.replace(/\/$/, "")}/air/offer_requests?return_offers=true`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Duffel-Version": "v2",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      clearTimeout(timer);

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new ProviderUnavailableError(
            "duffel-transport",
            `Duffel authentication failed (HTTP ${res.status}). Verify DUFFEL_ACCESS_TOKEN.`,
          );
        }
        if (res.status === 429) {
          throw new ProviderUnavailableError(
            "duffel-transport",
            "Duffel rate limit exceeded. Please retry shortly.",
          );
        }
        throw new ProviderUnavailableError(
          "duffel-transport",
          `Duffel Air API error: HTTP ${res.status} ${res.statusText}`,
        );
      }

      const json = (await res.json()) as DuffelOfferResponse;
      const offers = json.data?.offers;

      if (!offers || !Array.isArray(offers) || offers.length === 0) {
        return [];
      }

      const results: TransportOption[] = [];

      for (const offer of offers) {
        const slice = offer.slices?.[0];
        if (!slice || !slice.segments || slice.segments.length === 0) continue;

        const firstSegment = slice.segments[0];
        const lastSegment = slice.segments[slice.segments.length - 1];

        const carrierName =
          offer.owner?.name ||
          firstSegment.operating_carrier?.name ||
          firstSegment.marketing_carrier?.name ||
          "Airlines";

        const price = parseFloat(offer.total_amount);
        const currency = (offer.total_currency || "USD").toUpperCase();
        const durationMinutes = this.parseDurationMinutes(slice.duration);
        const stops = Math.max(0, slice.segments.length - 1);

        const option: TransportOption = {
          id: `duffel_${offer.id}`,
          mode: "flight",
          provider: carrierName,
          origin: firstSegment.origin.iata_code || originIata,
          destination: lastSegment.destination.iata_code || destIata,
          departureTime: firstSegment.departing_at,
          arrivalTime: lastSegment.arriving_at,
          durationMinutes,
          price: isNaN(price) ? null : price,
          currency,
          stops,
          availability: "available",
          bookingUrl: `https://app.duffel.com`,
          source: {
            provider: "duffel",
            providerId: offer.id,
            fetchedAt: new Date().toISOString(),
            isEstimate: false,
            confidence: 1.0,
            attribution: "Flight data provided by Duffel Flights API",
          },
        };

        const check = transportOptionSchema.safeParse(option);
        if (!check.success) {
          throw new InvalidProviderResponseError("duffel-transport", check.error.format());
        }

        results.push(option);
      }

      return results;
    } catch (err: unknown) {
      if (
        err instanceof InvalidProviderResponseError ||
        err instanceof ProviderUnavailableError ||
        err instanceof OriginRequiredError
      ) {
        throw err;
      }
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderUnavailableError(
          "duffel-transport",
          `Duffel Flights API timed out after ${this.timeoutMs}ms`,
        );
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new ProviderUnavailableError("duffel-transport", message);
    }
  }
}
