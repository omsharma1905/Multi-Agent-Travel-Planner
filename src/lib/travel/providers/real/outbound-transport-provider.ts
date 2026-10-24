/**
 * @file src/lib/travel/providers/real/outbound-transport-provider.ts
 *
 * Real Flight & Long-Distance Transport Provider using Verified Airport Resolution & Outbound Flight Search.
 * 100% Free: requires no API key, no billing account, and no credit card.
 *
 * Integrity & Anti-Hallucination Guarantees:
 * - Authoritative IATA airport resolution for global metropolitan hubs and regional airports.
 * - Truthful Outbound Search: Generates authentic Google Flights search links reflecting real endpoints and dates.
 * - Truthful Pricing: Flight prices and live seat inventory are not available without paid GDS access;
 *   returns price: null, availability: "unknown". Never claims $0 or fabricates fake fares.
 * - Truthful Schedules & Durations: Without live carrier schedule data, departureTime, arrivalTime,
 *   and durationMinutes are marked null (unavailable), and stops are null (varies by carrier).
 *   Never claims 0 stops, direct flight, or constant 4-hour flight times for unverified routes.
 * - Truthful Carrier Label: Labeled honestly as "Commercial Flight Search (Google Flights)" rather than
 *   inventing an airline name like "Major Commercial Airlines".
 * - Conforms strictly to transportOptionSchema Zod validation.
 */

import { TransportProvider, TransportFilter } from "../interfaces";
import { TransportOption } from "../../types";
import { transportOptionSchema } from "../../validators/travel-schemas";
import { AirportResolver } from "../../services/airport-resolver";
import { buildFlightSearchUrl } from "../../external-links";

export class OutboundTransportProvider implements TransportProvider {
  async searchTransport(filter: TransportFilter): Promise<TransportOption[]> {
    const originQuery = filter.origin?.trim();
    const destQuery = filter.destination?.trim();

    if (!originQuery || !destQuery) {
      return [];
    }

    // Resolve origin and destination using the verified airport registry
    const [originResolution, destResolution] = await Promise.all([
      AirportResolver.resolve(originQuery),
      AirportResolver.resolve(destQuery),
    ]);

    const originLabel = originResolution.iataCode || originResolution.cityName || originQuery;
    const destLabel = destResolution.iataCode || destResolution.cityName || destQuery;

    if (!originLabel || !destLabel) {
      return [];
    }

    const departureDate =
      filter.date && /^\d{4}-\d{2}-\d{2}$/.test(filter.date)
        ? filter.date
        : new Date(Date.now() + 86400000 * 14).toISOString().split("T")[0];

    const googleFlightsUrl = buildFlightSearchUrl({
      origin: originLabel,
      destination: destLabel,
      departureDate,
      travelers: filter.travellers || 1,
    });

    const cleanOriginId = originLabel.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const cleanDestId = destLabel.toLowerCase().replace(/[^a-z0-9]/g, "_");

    const option: TransportOption = {
      id: `flight_outbound_${cleanOriginId}_${cleanDestId}`,
      mode: "flight",
      provider: "Commercial Flight Search (Google Flights)",
      origin: originLabel,
      destination: destLabel,
      departureTime: null,
      arrivalTime: null,
      durationMinutes: null,
      price: null,
      currency: "USD",
      stops: null,
      availability: "unknown",
      bookingUrl: googleFlightsUrl,
      isEstimate: true,
      source: {
        provider: "google-flights-search",
        providerId: `${cleanOriginId}-${cleanDestId}`,
        fetchedAt: new Date().toISOString(),
        isEstimate: true,
        confidence: 0.9,
        attribution:
          "Flight search generated via Google Flights. Live fares, schedules, and carrier routes must be confirmed directly on airline websites.",
        sourceUrl: googleFlightsUrl,
      },
    };

    const check = transportOptionSchema.safeParse(option);
    if (!check.success) {
      return [];
    }

    return [option];
  }
}
