/**
 * @file src/lib/travel/services/trip-context-assembler.ts
 *
 * Central Trip Context Assembler.
 *
 * Core Principle:
 * AI REASONS.
 * PROVIDERS RETRIEVE.
 * DETERMINISTIC SERVICES CALCULATE.
 * VALIDATORS VERIFY.
 * DATABASE PERSISTS.
 *
 * Orchestrates parallel retrieval across real or mock providers, enforces
 * zero-fabrication rules, tracks component availability, evaluates readiness,
 * and validates the resulting TripContext against Zod boundary schemas.
 */

import {
  TripContext,
  Destination,
  Place,
  Restaurant,
  Stay,
  TransportOption,
  Route,
  ContextReadiness,
  ComponentAvailability,
} from "../types";
import { DestinationImageResult } from "../providers/interfaces";
import { tripContextSchema } from "../validators/travel-schemas";
import { TravelService } from "./travel-service";

import {
  DestinationNotFoundError,
  OriginNotFoundError,
  InvalidProviderResponseError,
} from "../errors/travel-errors";
import { TripWithPreferences } from "@/features/trips/types";

export interface TripContextAssemblerOptions {
  travelService?: TravelService;
}

export class TripContextAssembler {
  private travelService: TravelService;

  constructor(options: TripContextAssemblerOptions = {}) {
    this.travelService = options.travelService ?? new TravelService();
  }

  /**
   * Assembles a complete, validated TripContext from a persisted Trip entity.
   */
  async assembleTripContext(trip: TripWithPreferences): Promise<TripContext> {
    const realProviders = new Set<string>();
    const estimatedProviders = new Set<string>();
    const unavailableProviders = new Set<string>();

    const recordProvenance = (source?: { provider: string; isEstimate: boolean }) => {
      if (!source) return;
      if (source.isEstimate) {
        estimatedProviders.add(source.provider);
      } else {
        realProviders.add(source.provider);
      }
    };

    // -------------------------------------------------------------------------
    // 1. Resolve Destination (Mandatory)
    // -------------------------------------------------------------------------
    let destination: Destination;
    const destAvailability: ComponentAvailability = { status: "available" };

    try {
      destination = await this.travelService.resolveDestination(trip.destination);
      recordProvenance(destination.source);
    } catch (err: unknown) {
      destAvailability.status = "unavailable";
      destAvailability.error = err instanceof Error ? err.message : String(err);
      unavailableProviders.add("destination-resolver");

      // Critical failure: cannot proceed without destination
      throw err instanceof DestinationNotFoundError ? err : new DestinationNotFoundError(trip.destination);
    }

    // -------------------------------------------------------------------------
    // 2. Resolve Origin (Explicit User Input Only)
    // -------------------------------------------------------------------------
    let origin: Destination | null = null;
    let originAvailability: ComponentAvailability;

    if (trip.origin && trip.origin.trim()) {
      try {
        origin = await this.travelService.resolveDestination(trip.origin.trim());
        recordProvenance(origin.source);
        originAvailability = { status: "available" };
      } catch (err: unknown) {
        const originErr =
          err instanceof OriginNotFoundError
            ? err
            : new OriginNotFoundError(trip.origin.trim());
        originAvailability = {
          status: "unavailable",
          reason: "origin_not_found",
          error: originErr.message,
        };
        unavailableProviders.add("origin-resolver");
      }

    } else {
      originAvailability = {
        status: "available",
        reason: "not_specified",
      };
    }

    // -------------------------------------------------------------------------
    // 3. Parallel Retrieval of Candidate Travel Data
    // -------------------------------------------------------------------------
    const [
      imageryResult,
      placesResult,
      foodResult,
      staysResult,
      transportResult,
      routeResult,
    ] = await Promise.allSettled([
      // A. Destination Imagery
      this.travelService.getDestinationImage(destination.name),

      // B. Places / Attractions
      this.travelService.searchPlaces({
        destinationId: destination.id,
        tags: trip.preferences?.interests,
        limit: Math.max(15, trip.days * 4),
        latitude: destination.latitude,
        longitude: destination.longitude,
      }),

      // C. Food / Restaurants
      this.travelService.searchRestaurants({
        destinationId: destination.id,
        limit: Math.max(12, trip.days * 3),
        latitude: destination.latitude,
        longitude: destination.longitude,
      }),

      // D. Stays / Hotels
      this.travelService.searchStays({
        destinationId: destination.id,
        limit: 10,
        latitude: destination.latitude,
        longitude: destination.longitude,
        budgetTier: trip.budget,
        nights: trip.days,
        guests: trip.travellers,
        rooms: Math.max(1, Math.ceil(trip.travellers / 2)),
      }),

      // E. Transport: STRICT CHECK - Only query provider if origin is resolved
      origin
        ? this.travelService.searchTransport({
            origin: origin.name,
            destination: destination.name,
            travellers: trip.travellers,
            preferredModes:
              trip.preferences?.transportPreference && trip.preferences.transportPreference !== "auto"
                ? [trip.preferences.transportPreference as import("../types").TransportMode]
                : undefined,
          })
        : Promise.resolve([] as TransportOption[]),

      // F. Route: STRICT CHECK - Only query if origin is resolved
      origin
        ? this.travelService.getRoute(
            { latitude: origin.latitude, longitude: origin.longitude },
            { latitude: destination.latitude, longitude: destination.longitude },
            "drive",
          )
        : Promise.resolve(null as Route | null),
    ]);

    // -------------------------------------------------------------------------
    // 4. Process Imagery
    // -------------------------------------------------------------------------
    let heroImage: DestinationImageResult | null = null;
    let imageryAvailability: ComponentAvailability;

    if (imageryResult.status === "fulfilled") {
      heroImage = imageryResult.value;
      if (heroImage) {
        recordProvenance(heroImage.source);
        imageryAvailability = { status: "available" };
      } else {
        imageryAvailability = { status: "unavailable", reason: "no_image_found" };
      }
    } else {
      imageryAvailability = {
        status: "unavailable",
        error: String(imageryResult.reason),
      };
      unavailableProviders.add("pexels");
    }

    // -------------------------------------------------------------------------
    // 5. Process Places
    // -------------------------------------------------------------------------
    let candidatePlaces: Place[] = [];
    let placesAvailability: ComponentAvailability;

    if (placesResult.status === "fulfilled") {
      candidatePlaces = placesResult.value;
      candidatePlaces.forEach((p) => recordProvenance(p.source));
      placesAvailability = {
        status: candidatePlaces.length > 0 ? "available" : "unavailable",
        reason: candidatePlaces.length === 0 ? "no_places_found" : undefined,
      };
    } else {
      placesAvailability = {
        status: "unavailable",
        error: String(placesResult.reason),
      };
      unavailableProviders.add("google-places");
    }

    // -------------------------------------------------------------------------
    // 6. Process Food
    // -------------------------------------------------------------------------
    let candidateRestaurants: Restaurant[] = [];
    let foodAvailability: ComponentAvailability;

    if (foodResult.status === "fulfilled") {
      candidateRestaurants = foodResult.value;
      candidateRestaurants.forEach((r) => recordProvenance(r.source));
      foodAvailability = {
        status: candidateRestaurants.length > 0 ? "available" : "unavailable",
        reason: candidateRestaurants.length === 0 ? "no_restaurants_found" : undefined,
      };
    } else {
      foodAvailability = {
        status: "unavailable",
        error: String(foodResult.reason),
      };
      unavailableProviders.add("google-food");
    }

    // -------------------------------------------------------------------------
    // 7. Process Stays
    // -------------------------------------------------------------------------
    let candidateStays: Stay[] = [];
    let staysAvailability: ComponentAvailability;

    if (staysResult.status === "fulfilled") {
      candidateStays = staysResult.value;
      candidateStays.forEach((s) => recordProvenance(s.source));
      staysAvailability = {
        status: candidateStays.length > 0 ? "available" : "unavailable",
        reason: candidateStays.length === 0 ? "no_stays_found" : undefined,
      };
    } else {
      staysAvailability = {
        status: "unavailable",
        error: String(staysResult.reason),
      };
      unavailableProviders.add("duffel-stays");
    }

    // -------------------------------------------------------------------------
    // 8. Process Transport
    // -------------------------------------------------------------------------
    let candidateTransport: TransportOption[] = [];
    let transportAvailability: ComponentAvailability;

    if (!origin) {
      if (trip.origin && trip.origin.trim()) {
        transportAvailability = {
          status: "unavailable",
          reason: "origin_not_found",
          error: originAvailability.error || `Origin "${trip.origin}" could not be resolved.`,
        };
      } else {
        transportAvailability = {
          status: "available",
          reason: "not_required",
        };
      }
    } else if (transportResult.status === "fulfilled") {
      candidateTransport = transportResult.value;
      candidateTransport.forEach((t) => recordProvenance(t.source));
      transportAvailability = {
        status: candidateTransport.length > 0 ? "available" : "unavailable",
        reason: candidateTransport.length === 0 ? "no_transport_found" : undefined,
      };
    } else {
      transportAvailability = {
        status: "unavailable",
        error: String(transportResult.reason),
      };
      unavailableProviders.add("duffel-transport");
    }

    // -------------------------------------------------------------------------
    // 9. Process Routes
    // -------------------------------------------------------------------------
    const routes: Route[] = [];
    let routesAvailability: ComponentAvailability;

    if (!origin) {
      routesAvailability = {
        status: "unavailable",
        reason: "origin_required",
      };
    } else if (routeResult.status === "fulfilled" && routeResult.value) {
      routes.push(routeResult.value);
      recordProvenance(routeResult.value.source);
      routesAvailability = { status: "available" };
    } else {
      routesAvailability = {
        status: "unavailable",
        error: routeResult.status === "rejected" ? String(routeResult.reason) : "route_unavailable",
      };
      unavailableProviders.add("osrm");
    }

    // -------------------------------------------------------------------------
    // 10. Deterministic Readiness Scoring
    // -------------------------------------------------------------------------
    // READY: Destination resolved, core local data retrieved (places/food/stays),
    // and if origin was provided, transport/routes evaluated.
    // PARTIAL: Destination resolved, but some providers were unavailable or returned empty.
    // BLOCKED: Destination cannot be resolved.
    let readiness: ContextReadiness = "ready";

    const hasCoreData =
      candidatePlaces.length > 0 || candidateRestaurants.length > 0 || candidateStays.length > 0;

    if (!hasCoreData) {
      readiness = "partial";
    }

    if (unavailableProviders.size > 0) {
      readiness = "partial";
    }

    if (trip.origin && originAvailability.status === "unavailable" && originAvailability.reason === "origin_not_found") {
      readiness = "partial";
    }

    // -------------------------------------------------------------------------
    const transportPreference = trip.preferences?.transportPreference || "auto";

    const assembledContext: TripContext = {
      trip,
      transportPreference,
      origin,
      destination,
      imagery: {
        hero: heroImage,
      },
      candidateStays,
      candidatePlaces,
      candidateRestaurants,
      candidateTransport,
      routes,
      availability: {
        origin: originAvailability,
        destination: destAvailability,
        imagery: imageryAvailability,
        stays: staysAvailability,
        places: placesAvailability,
        food: foodAvailability,
        transport: transportAvailability,
        routes: routesAvailability,
      },
      sourceSummary: {
        realProviders: Array.from(realProviders),
        estimatedProviders: Array.from(estimatedProviders),
        unavailableProviders: Array.from(unavailableProviders),
      },
      readiness,
      assembledAt: new Date().toISOString(),
    };

    const check = tripContextSchema.safeParse(assembledContext);
    if (!check.success) {
      throw new InvalidProviderResponseError("trip-context-assembler", check.error.format());
    }

    return assembledContext;
  }
}

export const tripContextAssembler = new TripContextAssembler();
