/**
 * @file src/lib/travel/services/travel-service.ts
 *
 * Central Travel Service Facade.
 *
 * Consumers (AI agents, intake orchestrators, and internal APIs) call this facade
 * and remain completely decoupled from underlying providers, caching strategies, and networks.
 *
 * In Phase 6A, TravelService can be instantiated with real external providers
 * (Open-Meteo, Pexels, Google Places, OSRM, Amadeus) or deterministic mock providers.
 */

import {
  Destination,
  Place,
  Restaurant,
  Stay,
  TransportOption,
  Route,
  RoutingMode,
  TripContext,
} from "../types";
import {
  DestinationProvider,
  PlaceProvider,
  StayProvider,
  TransportProvider,
  FoodProvider,
  MapProvider,
  ImageProvider,
  DestinationImageResult,
  DestinationFilter,
  PlaceFilter,
  StayFilter,
  TransportFilter,
  RestaurantFilter,
  RouteRequest,
} from "../providers/interfaces";
import {
  MockDestinationProvider,
  MockPlaceProvider,
  MockStayProvider,
  MockTransportProvider,
  MockFoodProvider,
  MockMapProvider,
} from "../providers/mock";
import {
  OpenMeteoDestinationProvider,
  OsrmMapProvider,
  WikimediaImageProvider,
  OsmPlaceProvider,
  OsmFoodProvider,
  OsmStayProvider,
  OutboundTransportProvider,
} from "../providers/real";
import { travelCache } from "../cache/memory-cache";
import { TravelCache } from "../cache/cache-interface";
import { DestinationNotFoundError, ProviderConfigurationError } from "../errors/travel-errors";

import { TripWithPreferences } from "@/features/trips/types";
import { getTravelConfig } from "../config";

export interface TravelServiceOptions {
  destinations?: DestinationProvider;
  places?: PlaceProvider;
  stays?: StayProvider;
  transport?: TransportProvider;
  rail?: TransportProvider;
  food?: FoodProvider;
  maps?: MapProvider;
  images?: ImageProvider;
  cache?: TravelCache;
}

export class TravelService {
  private destinationProvider: DestinationProvider;
  private placeProvider: PlaceProvider;
  private stayProvider: StayProvider;
  private transportProvider: TransportProvider;
  private railProvider: TransportProvider;
  private foodProvider: FoodProvider;
  private mapProvider: MapProvider;
  private imageProvider: ImageProvider;
  private cache: TravelCache;

  constructor(options: TravelServiceOptions = {}) {
    const config = getTravelConfig();

    if (config.mode === "real") {
      // In real mode, use exclusively real provider instances.
      // Silent mock fallback is strictly forbidden.
      this.destinationProvider = options.destinations ?? new OpenMeteoDestinationProvider();
      this.imageProvider = options.images ?? new WikimediaImageProvider();
      this.placeProvider = options.places ?? new OsmPlaceProvider();
      this.foodProvider = options.food ?? new OsmFoodProvider();
      this.stayProvider = options.stays ?? new OsmStayProvider();
      this.transportProvider = options.transport ?? new OutboundTransportProvider();
      this.railProvider = options.rail ?? (options.transport ?? new OutboundTransportProvider());
      this.mapProvider = options.maps ?? new OsrmMapProvider();
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new ProviderConfigurationError(
          "travel-service",
          "Mock mode cannot be activated in production environment. Real providers are strictly required.",
        );
      }
      // Mock mode default
      this.destinationProvider = options.destinations ?? new MockDestinationProvider();
      this.placeProvider = options.places ?? new MockPlaceProvider();
      this.stayProvider = options.stays ?? new MockStayProvider();
      this.transportProvider = options.transport ?? new MockTransportProvider();
      this.railProvider = options.rail ?? (options.transport ?? new MockTransportProvider());
      this.foodProvider = options.food ?? new MockFoodProvider();
      this.mapProvider = options.maps ?? new MockMapProvider();
      this.imageProvider = options.images ?? new WikimediaImageProvider();
    }


    this.cache = options.cache ?? travelCache;
  }

  // ---------------------------------------------------------------------------
  // 1. Destination Resolution & Search
  // ---------------------------------------------------------------------------

  async resolveDestination(query: string): Promise<Destination> {
    const cacheKey = `dest:resolve:${query.toLowerCase().trim()}`;
    const cached = await this.cache.get<Destination>(cacheKey);
    if (cached) {
      return { ...cached, source: { ...cached.source, cached: true } };
    }

    let resolved: Destination | null = null;
    try {
      resolved = await this.destinationProvider.resolveDestination(query);
    } catch (err) {
      if (err instanceof DestinationNotFoundError) {
        resolved = null;
      } else {
        throw err;
      }
    }

    // Fall back to OpenMeteo geocoding for arbitrary global locations if not in mock fixture
    if (!resolved && !(this.destinationProvider instanceof OpenMeteoDestinationProvider)) {
      try {
        const openMeteo = new OpenMeteoDestinationProvider();
        resolved = await openMeteo.resolveDestination(query);
      } catch {
        // Fall through to not found check
      }
    }

    if (!resolved) {
      throw new DestinationNotFoundError(query);
    }

    await this.cache.set(cacheKey, resolved, 3600); // 1 hour TTL
    await this.cache.set(`dest:id:${resolved.id}`, resolved, 3600);
    return resolved;
  }

  async searchDestinations(filter: DestinationFilter): Promise<Destination[]> {
    const primary = await this.destinationProvider.searchDestinations(filter);
    const limit = filter.limit ?? 10;
    if (primary.length >= limit) {
      return primary.slice(0, limit);
    }

    // Enhance with Open-Meteo for arbitrary real locations when query length >= 2
    if (!(this.destinationProvider instanceof OpenMeteoDestinationProvider) && filter.query.trim().length >= 2) {
      try {
        const openMeteo = new OpenMeteoDestinationProvider();
        const realResults = await openMeteo.searchDestinations({ ...filter, limit });
        const seen = new Set(primary.map((d) => d.name.toLowerCase()));
        const combined = [...primary];
        for (const item of realResults) {
          if (!seen.has(item.name.toLowerCase())) {
            seen.add(item.name.toLowerCase());
            combined.push(item);
          }
        }
        return combined.slice(0, limit);
      } catch {
        // Silently fall back to primary
      }
    }

    return primary;
  }

  async getDestination(id: string): Promise<Destination | null> {
    const cacheKey = `dest:id:${id}`;
    const cached = await this.cache.get<Destination>(cacheKey);
    if (cached) return { ...cached, source: { ...cached.source, cached: true } };

    const destination = await this.destinationProvider.getDestination(id).catch(() => null);
    if (destination) {
      await this.cache.set(cacheKey, destination, 3600);
    }
    return destination;
  }

  // ---------------------------------------------------------------------------
  // 2. Destination Imagery
  // ---------------------------------------------------------------------------

  async getDestinationImage(query: string): Promise<DestinationImageResult | null> {
    const cacheKey = `dest:image:${query.toLowerCase().trim()}`;
    const cached = await this.cache.get<DestinationImageResult>(cacheKey);
    if (cached) return cached;

    const result = await this.imageProvider.getDestinationImage(query);
    if (result) {
      await this.cache.set(cacheKey, result, 86400); // 24 hours TTL
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // 3. Places / Attractions
  // ---------------------------------------------------------------------------

  async searchPlaces(filter: PlaceFilter): Promise<Place[]> {
    const cacheKey = `places:${JSON.stringify(filter)}`;
    const cached = await this.cache.get<Place[]>(cacheKey);
    if (cached) return cached;

    const results = await this.placeProvider.searchPlaces(filter);
    await this.cache.set(cacheKey, results, 600); // 10 min TTL
    return results;
  }

  async getPlace(id: string): Promise<Place | null> {
    return this.placeProvider.getPlace(id);
  }

  // ---------------------------------------------------------------------------
  // 4. Stays / Accommodations
  // ---------------------------------------------------------------------------

  async searchStays(filter: StayFilter): Promise<Stay[]> {
    const cacheKey = `stays:${JSON.stringify(filter)}`;
    const cached = await this.cache.get<Stay[]>(cacheKey);
    if (cached) return cached;

    const results = await this.stayProvider.searchStays(filter);
    await this.cache.set(cacheKey, results, 600);
    return results;
  }

  async getStay(id: string): Promise<Stay | null> {
    return this.stayProvider.getStay(id);
  }

  // ---------------------------------------------------------------------------
  // 5. Multi-modal Transport
  // ---------------------------------------------------------------------------

  async searchTransport(filter: TransportFilter): Promise<TransportOption[]> {
    const cacheKey = `transport:${JSON.stringify(filter)}`;
    const cached = await this.cache.get<TransportOption[]>(cacheKey);
    if (cached) return cached;

    const requestedModes = filter.preferredModes;
    let results: TransportOption[] = [];

    if (requestedModes && requestedModes.length === 1 && requestedModes[0] === "train") {
      // 1. Explicit TRAIN preference: query rail/transit provider
      results = await this.railProvider.searchTransport(filter).catch(() => []);
      if (results.length === 0) {
        // Fall back to flight candidates for transoceanic/unserved routes so agent can explain preferredModeUnavailable
        const flightFilter = { ...filter, preferredModes: ["flight" as const] };
        results = await this.transportProvider.searchTransport(flightFilter).catch(() => []);
      }
    } else if (requestedModes && requestedModes.length === 1 && requestedModes[0] === "flight") {
      // 2. Explicit FLIGHT preference: only query flight provider
      results = await this.transportProvider.searchTransport(filter);
    } else if (requestedModes && requestedModes.length === 1 && requestedModes[0] === "car") {
      // 3. Explicit CAR preference: query driving route
      results = await this.searchDrivingTransport(filter);
    } else if (requestedModes && requestedModes.length === 1 && requestedModes[0] === "bus") {
      // 4. Explicit BUS preference: truthful empty state if no bus provider
      results = [];
    } else {
      // 5. AUTO mode or multi-mode: query supported candidate providers and compare
      const [flights, trains] = await Promise.all([
        this.transportProvider.searchTransport(filter).catch(() => []),
        this.railProvider.searchTransport(filter).catch(() => []),
      ]);
      results = [...flights, ...trains];
    }

    await this.cache.set(cacheKey, results, 300); // 5 min TTL
    return results;
  }

  private async searchDrivingTransport(filter: TransportFilter): Promise<TransportOption[]> {
    try {
      const route = await this.mapProvider.getRoute({
        origin: filter.origin,
        destination: filter.destination,
        mode: "drive",
      });
      if (!route || !route.durationMinutes) return [];
      const timestamp = new Date().toISOString();
      const originSlug = filter.origin.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 3);
      const destSlug = filter.destination.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 3);

      return [
        {
          id: `road_${originSlug}_${destSlug}`,
          mode: "car",
          provider: "Road / Driving Route (OSRM)",
          origin: filter.origin.trim(),
          destination: filter.destination.trim(),
          departureTime: "07:00",
          arrivalTime: "13:00",
          durationMinutes: Math.round(route.durationMinutes),
          price: null,
          currency: "USD",
          stops: 0,
          availability: "available",
          isEstimate: true,
          source: {
            provider: "osrm",
            providerId: `osrm_${filter.origin}_${filter.destination}`,
            fetchedAt: timestamp,
            isEstimate: true,
            attribution: "Driving route duration provided by OSRM",
          },
        },
      ];
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Food & Restaurants
  // ---------------------------------------------------------------------------

  async searchRestaurants(filter: RestaurantFilter): Promise<Restaurant[]> {
    const cacheKey = `restaurants:${JSON.stringify(filter)}`;
    const cached = await this.cache.get<Restaurant[]>(cacheKey);
    if (cached) return cached;

    const results = await this.foodProvider.searchRestaurants(filter);
    await this.cache.set(cacheKey, results, 600);
    return results;
  }

  async getRestaurant(id: string): Promise<Restaurant | null> {
    return this.foodProvider.getRestaurant(id);
  }

  // ---------------------------------------------------------------------------
  // 7. Routing & Distance Engine
  // ---------------------------------------------------------------------------

  async getRoute(
    origin: RouteRequest["origin"],
    destination: RouteRequest["destination"],
    mode: RoutingMode = "transit",
  ): Promise<Route> {
    return this.mapProvider.getRoute({ origin, destination, mode });
  }

  // ---------------------------------------------------------------------------
  // 8. Trip Context Preparation (Foundation for Phase 5 Orchestration)
  // ---------------------------------------------------------------------------

  async prepareTripContext(trip: TripWithPreferences): Promise<TripContext> {
    const { tripContextAssembler } = await import("./trip-context-assembler");
    return tripContextAssembler.assembleTripContext(trip);
  }
}


// Global default instance for easy import across services and APIs
export const travelService = new TravelService();
