/**
 * @file src/lib/travel/providers/mock/mock-map-provider.ts
 *
 * Deterministic Mock Map & Routing Provider.
 * Calculates exact distances via the Haversine formula and estimates realistic travel durations
 * across driving, transit, walking, and flying modes.
 */

import { MapProvider, RouteRequest } from "../interfaces";
import { Route, GeoPoint } from "../../types";
import { calculateHaversineDistance, createSourceMetadata } from "../../normalizers";
import { routeSchema } from "../../validators/travel-schemas";
import { InvalidProviderResponseError } from "../../errors/travel-errors";

export class MockMapProvider implements MapProvider {
  constructor() {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "MOCK_PROVIDER_FORBIDDEN: MockMapProvider cannot be instantiated in production environment.",
      );
    }
  }

  async getRoute(request: RouteRequest): Promise<Route> {
    const p1: GeoPoint =
      typeof request.origin === "string"
        ? { latitude: 35.6762, longitude: 139.6503 } // Fallback central Tokyo
        : request.origin;

    const p2: GeoPoint =
      typeof request.destination === "string"
        ? { latitude: 35.0116, longitude: 135.7681 } // Fallback Kyoto
        : request.destination;

    const distanceKm = calculateHaversineDistance(p1, p2);

    // Realistic speeds based on mode
    let speedKmPerHour = 45; // default driving in urban/regional
    if (request.mode === "walk") {
      speedKmPerHour = 4.5;
    } else if (request.mode === "transit") {
      speedKmPerHour = 65; // average train/metro with stops
    } else if (request.mode === "fly") {
      speedKmPerHour = 600;
    }

    const durationHours = distanceKm / speedKmPerHour;
    const durationMinutes = Math.max(1, Math.round(durationHours * 60));

    const route: Route = {
      origin: request.origin,
      destination: request.destination,
      distanceKm,
      durationMinutes,
      mode: request.mode,
      geometry: `polyline_mock_${request.mode}_${distanceKm}km`,
      source: createSourceMetadata("mock", true, 0.95),
    };

    const check = routeSchema.safeParse(route);
    if (!check.success) {
      throw new InvalidProviderResponseError("mock-map", check.error.format());
    }

    return route;
  }
}
