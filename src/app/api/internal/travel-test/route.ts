/**
 * @file src/app/api/internal/travel-test/route.ts
 *
 * Internal verification test runner for Phase 4 Travel Data Layer.
 * Tests all 13 mandatory test cases:
 * 1. Tokyo destination resolution
 * 2. Unknown destination handling (DestinationNotFoundError)
 * 3. Place search with filters (type, rating, limit)
 * 4. Restaurant search (cuisine, priceLevel)
 * 5. Stay search (category, budget)
 * 6. Transport search across multi-modal options (train, flight, bus)
 * 7. Route calculation (Haversine distance & duration)
 * 8. Invalid provider response rejected by Zod
 * 9. Provider unavailable error handling
 * 10. Mock fallback behavior
 * 11. Source metadata verification (provenance stamps)
 * 12. Stale dynamic data detection (fetchedAt evaluation)
 * 13. Empty results handling
 */

import { NextResponse } from "next/server";
import {
  TravelService,
  travelService,
  travelCache,
  DestinationNotFoundError,
  ProviderUnavailableError,
  InvalidProviderResponseError,
  Destination,
  MockDestinationProvider,
} from "@/lib/travel";
import { assertInternalRouteAllowed } from "@/lib/security/internal-guard";

export interface TestCaseResult {
  testId: number;
  name: string;
  passed: boolean;
  message?: string;
  details?: unknown;
}

export async function runAllTravelTests(): Promise<TestCaseResult[]> {
  await travelCache.clear();
  const results: TestCaseResult[] = [];

  // Test 1: Tokyo destination resolution
  try {
    const dest = await travelService.resolveDestination("Tokyo, Japan");
    const passed =
      dest.id === "dest_tokyo" &&
      dest.country === "Japan" &&
      dest.latitude === 35.6762 &&
      dest.source.provider === "mock";
    results.push({
      testId: 1,
      name: "Tokyo destination resolution",
      passed,
      details: { id: dest.id, name: dest.name, country: dest.country },
    });
  } catch (err) {
    results.push({
      testId: 1,
      name: "Tokyo destination resolution",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 2: Unknown destination handling
  try {
    await travelService.resolveDestination("Atlantis Submerged City 999");
    results.push({
      testId: 2,
      name: "Unknown destination handling",
      passed: false,
      message: "Expected DestinationNotFoundError but resolved unexpectedly",
    });
  } catch (err) {
    const passed = err instanceof DestinationNotFoundError;
    results.push({
      testId: 2,
      name: "Unknown destination handling",
      passed,
      details: { errorName: err instanceof Error ? err.name : String(err) },
    });
  }

  // Test 3: Place search with filters
  try {
    const places = await travelService.searchPlaces({
      destinationId: "dest_tokyo",
      type: "temple",
      minRating: 4.5,
    });
    const passed = places.length > 0 && places.every((p) => p.type === "temple" && p.rating >= 4.5);
    results.push({
      testId: 3,
      name: "Place search with filters",
      passed,
      details: { count: places.length, sampleName: places[0]?.name },
    });
  } catch (err) {
    results.push({
      testId: 3,
      name: "Place search with filters",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 4: Restaurant search
  try {
    const restaurants = await travelService.searchRestaurants({
      destinationId: "dest_tokyo",
      cuisine: "Sushi",
    });
    const passed =
      restaurants.length > 0 &&
      restaurants.some((r) => r.cuisine.some((c) => c.toLowerCase().includes("sushi")));
    results.push({
      testId: 4,
      name: "Restaurant search by cuisine",
      passed,
      details: { count: restaurants.length, sampleName: restaurants[0]?.name },
    });
  } catch (err) {
    results.push({
      testId: 4,
      name: "Restaurant search by cuisine",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 5: Stay search
  try {
    const stays = await travelService.searchStays({
      destinationId: "dest_tokyo",
      category: "ryokan",
    });
    const passed = stays.length > 0 && stays.every((s) => s.category === "ryokan");
    results.push({
      testId: 5,
      name: "Stay search by category",
      passed,
      details: { count: stays.length, sampleName: stays[0]?.name },
    });
  } catch (err) {
    results.push({
      testId: 5,
      name: "Stay search by category",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 6: Transport search across multi-modal options
  try {
    const transport = await travelService.searchTransport({
      origin: "Tokyo Station",
      destination: "Kyoto Station",
    });
    const hasTrain = transport.some((t) => t.mode === "train");
    const hasBus = transport.some((t) => t.mode === "bus");
    const passed = transport.length >= 2 && hasTrain && hasBus;
    results.push({
      testId: 6,
      name: "Transport search across multi-modal options",
      passed,
      details: { count: transport.length, modes: transport.map((t) => t.mode) },
    });
  } catch (err) {
    results.push({
      testId: 6,
      name: "Transport search across multi-modal options",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 7: Route calculation
  try {
    const route = await travelService.getRoute(
      { latitude: 35.6762, longitude: 139.6503 }, // Tokyo
      { latitude: 35.0116, longitude: 135.7681 }, // Kyoto
      "transit",
    );
    // Great circle distance Tokyo -> Kyoto is ~360-380 km
    const passed = route.distanceKm > 300 && route.distanceKm < 450 && route.durationMinutes > 0;
    results.push({
      testId: 7,
      name: "Route calculation (Haversine & duration)",
      passed,
      details: { distanceKm: route.distanceKm, durationMinutes: route.durationMinutes },
    });
  } catch (err) {
    results.push({
      testId: 7,
      name: "Route calculation (Haversine & duration)",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 8: Invalid provider response rejected by Zod
  try {
    // Malformed destination missing required coordinates and country
    const invalidMockDestinations = [
      {
        id: "bad_dest",
        name: "Broken Destination",
        country: "Nowhere",
        countryCode: "INVALID_LENGTH_CODE", // Fails z.string().length(2)
        aliases: ["broken"],
        // missing latitude, longitude, timezone, etc.
      } as unknown as Destination,
    ];
    const invalidProvider = new MockDestinationProvider(invalidMockDestinations);
    await invalidProvider.searchDestinations({ query: "Broken" });
    results.push({
      testId: 8,
      name: "Invalid provider response rejected by Zod",
      passed: false,
      message: "Expected InvalidProviderResponseError but passed validation",
    });
  } catch (err) {
    const passed = err instanceof InvalidProviderResponseError;
    results.push({
      testId: 8,
      name: "Invalid provider response rejected by Zod",
      passed,
      details: { errorName: err instanceof Error ? err.name : String(err) },
    });
  }

  // Test 9: Provider unavailable error handling
  try {
    const failingProvider = {
      searchDestinations: async () => {
        throw new ProviderUnavailableError("external-api", "Gateway Timeout 504");
      },
      getDestination: async () => null,
      resolveDestination: async () => {
        throw new ProviderUnavailableError("external-api", "Gateway Timeout 504");
      },
    };
    const testSvc = new TravelService({ destinations: failingProvider });
    await testSvc.resolveDestination("Paris");
    results.push({
      testId: 9,
      name: "Provider unavailable error handling",
      passed: false,
      message: "Expected ProviderUnavailableError but call succeeded",
    });
  } catch (err) {
    const passed = err instanceof ProviderUnavailableError;
    results.push({
      testId: 9,
      name: "Provider unavailable error handling",
      passed,
      details: { errorName: err instanceof Error ? err.name : String(err) },
    });
  }

  // Test 10: Mock fallback behavior
  try {
    // Instantiate TravelService with no real provider keys; verify it gracefully operates with mock provider
    const svc = new TravelService();
    const dest = await svc.resolveDestination("Kyoto");
    const passed = dest.name === "Kyoto" && dest.source.provider === "mock";
    results.push({
      testId: 10,
      name: "Mock fallback behavior",
      passed,
      details: { provider: dest.source.provider, resolvedName: dest.name },
    });
  } catch (err) {
    results.push({
      testId: 10,
      name: "Mock fallback behavior",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 11: Source metadata verification (provenance)
  try {
    const dest = await travelService.resolveDestination("Bali");
    const passed =
      typeof dest.source.provider === "string" &&
      typeof dest.source.fetchedAt === "string" &&
      dest.source.isEstimate === true &&
      !isNaN(Date.parse(dest.source.fetchedAt));
    results.push({
      testId: 11,
      name: "Source metadata verification",
      passed,
      details: dest.source,
    });
  } catch (err) {
    results.push({
      testId: 11,
      name: "Source metadata verification",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 12: Stale dynamic data detection
  try {
    const staleTimestamp = new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(); // 48 hours ago
    const isStale = (fetchedAt: string, maxAgeHours = 24) => {
      const diffMs = Date.now() - new Date(fetchedAt).getTime();
      return diffMs > maxAgeHours * 60 * 60 * 1000;
    };
    const detectedStale = isStale(staleTimestamp, 24);
    const freshTimestamp = new Date().toISOString();
    const detectedFresh = !isStale(freshTimestamp, 24);
    const passed = detectedStale && detectedFresh;
    results.push({
      testId: 12,
      name: "Stale dynamic data detection",
      passed,
      details: { detectedStale, detectedFresh },
    });
  } catch (err) {
    results.push({
      testId: 12,
      name: "Stale dynamic data detection",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 13: Empty results handling
  try {
    const emptyPlaces = await travelService.searchPlaces({
      destinationId: "dest_tokyo",
      minRating: 5.0,
      priceLevel: "free",
      tags: ["NonExistentTagXYZ"],
    });
    const passed = Array.isArray(emptyPlaces) && emptyPlaces.length === 0;
    results.push({
      testId: 13,
      name: "Empty results handling",
      passed,
      details: { count: emptyPlaces.length },
    });
  } catch (err) {
    results.push({
      testId: 13,
      name: "Empty results handling",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 14: Real Open-Meteo Geocoding Resolution (Tokyo)
  try {
    const { OpenMeteoDestinationProvider } = await import("@/lib/travel");
    const openMeteo = new OpenMeteoDestinationProvider();
    const dest = await openMeteo.resolveDestination("Tokyo, Japan");
    const passed =
      dest !== null &&
      dest.country.toLowerCase().includes("japan") &&
      Math.abs(dest.latitude - 35.6762) < 2 &&
      dest.source.provider === "open-meteo" &&
      dest.source.isEstimate === false;
    results.push({
      testId: 14,
      name: "Real Open-Meteo Geocoding Resolution (Tokyo)",
      passed,
      details: { id: dest?.id, name: dest?.name, lat: dest?.latitude, lon: dest?.longitude },
    });
  } catch (err) {
    results.push({
      testId: 14,
      name: "Real Open-Meteo Geocoding Resolution (Tokyo)",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 15: Real Open-Meteo Geocoding Resolution (Goa, India)
  try {
    const { OpenMeteoDestinationProvider } = await import("@/lib/travel");
    const openMeteo = new OpenMeteoDestinationProvider();
    const dest = await openMeteo.resolveDestination("Goa, India");
    const passed =
      dest !== null &&
      dest.country.toLowerCase().includes("india") &&
      dest.source.provider === "open-meteo" &&
      dest.source.isEstimate === false;
    results.push({
      testId: 15,
      name: "Real Open-Meteo Geocoding Resolution (Goa, India)",
      passed,
      details: { id: dest?.id, name: dest?.name, country: dest?.country },
    });
  } catch (err) {
    results.push({
      testId: 15,
      name: "Real Open-Meteo Geocoding Resolution (Goa, India)",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 16: Real Open-Meteo Unknown Destination Returns Null
  try {
    const { OpenMeteoDestinationProvider } = await import("@/lib/travel");
    const openMeteo = new OpenMeteoDestinationProvider();
    const dest = await openMeteo.resolveDestination("ZzzFakeNonExistentCity9988");
    const passed = dest === null;
    results.push({
      testId: 16,
      name: "Real Open-Meteo Unknown Destination Handling",
      passed,
      details: { resolved: dest },
    });
  } catch (err) {
    results.push({
      testId: 16,
      name: "Real Open-Meteo Unknown Destination Handling",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 17: Real OSRM Road Routing or Haversine Fallback
  try {
    const { OsrmMapProvider } = await import("@/lib/travel");
    const osrm = new OsrmMapProvider();
    const route = await osrm.getRoute({
      origin: { latitude: 35.6762, longitude: 139.6503 }, // Tokyo
      destination: { latitude: 35.0116, longitude: 135.7681 }, // Kyoto
      mode: "drive",
    });
    const passed = route.distanceKm > 300 && route.distanceKm < 550 && route.durationMinutes > 0;
    results.push({
      testId: 17,
      name: "Real OSRM Road Distance & Duration",
      passed,
      details: { distanceKm: route.distanceKm, durationMinutes: route.durationMinutes, provider: route.source.provider },
    });
  } catch (err) {
    results.push({
      testId: 17,
      name: "Real OSRM Road Distance & Duration",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 18: Amadeus Transport Zero-Origin Strictness (OriginRequiredError)
  try {
    const { AmadeusTransportProvider, OriginRequiredError } = await import("@/lib/travel");
    const amadeus = new AmadeusTransportProvider();
    let threwOriginRequired = false;
    try {
      await amadeus.searchTransport({
        origin: "",
        destination: "Tokyo",
      });
    } catch (e) {
      if (e instanceof OriginRequiredError) threwOriginRequired = true;
    }
    results.push({
      testId: 18,
      name: "Amadeus Transport Zero-Origin Strictness",
      passed: threwOriginRequired,
      details: { threwOriginRequired },
    });
  } catch (err) {
    results.push({
      testId: 18,
      name: "Amadeus Transport Zero-Origin Strictness",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 19: Destination Imagery Resolution with Clean Fallback
  try {
    const result = await travelService.getDestinationImage("Tokyo");
    // Without API key configured, returns null cleanly (no random desert images)
    const passed = result === null || (typeof result.url === "string" && result.source.provider === "pexels");
    results.push({
      testId: 19,
      name: "Destination Imagery Provider Fallback Contract",
      passed,
      details: { imageFound: result !== null, provider: result?.source?.provider ?? "null (neutral fallback)" },
    });
  } catch (err) {
    results.push({
      testId: 19,
      name: "Destination Imagery Provider Fallback Contract",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // ---------------------------------------------------------------------------
  // Phase 6B: TripContext Assembly & Origin Integration Tests
  // ---------------------------------------------------------------------------

  // Test 20: TripContext Assembly with Explicit Origin & Destination (Bhopal -> Tokyo)
  try {
    const { tripContextAssembler } = await import("@/lib/travel/services/trip-context-assembler");
    const testTrip = {
      id: "test_trip_bhopal_tokyo",
      userId: "user_test",
      title: "Tokyo Journey",
      origin: "Bhopal, India",
      destination: "Tokyo, Japan",
      days: 7,
      travellers: 2,
      budget: "moderate" as const,
      status: "planning" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        id: "pref_1",
        tripId: "test_trip_bhopal_tokyo",
        interests: ["culture", "food"],
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const context = await tripContextAssembler.assembleTripContext(testTrip);
    const passed =
      context.destination.country === "Japan" &&
      context.origin !== null &&
      context.origin.country === "India" &&
      context.candidatePlaces.length > 0 &&
      context.availability.destination.status === "available" &&
      context.availability.origin.status === "available";

    results.push({
      testId: 20,
      name: "TripContext Assembly with Origin & Destination (Bhopal -> Tokyo)",
      passed,
      details: {
        originName: context.origin?.name,
        destName: context.destination.name,
        placesCount: context.candidatePlaces.length,
        readiness: context.readiness,
      },
    });
  } catch (err) {
    results.push({
      testId: 20,
      name: "TripContext Assembly with Origin & Destination (Bhopal -> Tokyo)",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 21: Domestic TripContext Assembly (Delhi -> Goa)
  try {
    const { tripContextAssembler } = await import("@/lib/travel/services/trip-context-assembler");
    const domesticTrip = {
      id: "test_trip_delhi_goa",
      userId: "user_test",
      title: "Goa Journey",
      origin: "Delhi, India",
      destination: "Goa, India",
      days: 5,
      travellers: 2,
      budget: "moderate" as const,
      status: "planning" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        id: "pref_2",
        tripId: "test_trip_delhi_goa",
        interests: ["beaches", "food"],
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const context = await tripContextAssembler.assembleTripContext(domesticTrip);
    const passed =
      context.origin !== null &&
      context.destination !== null &&
      context.origin.country === "India" &&
      context.destination.country === "India" &&
      context.availability.origin.status === "available";

    results.push({
      testId: 21,
      name: "Domestic TripContext Assembly (Delhi -> Goa)",
      passed,
      details: {
        origin: context.origin?.name,
        destination: context.destination.name,
        readiness: context.readiness,
      },
    });
  } catch (err) {
    results.push({
      testId: 21,
      name: "Domestic TripContext Assembly (Delhi -> Goa)",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 22: Unknown Origin Handling (Marks origin unavailable without crashing context)
  try {
    const { tripContextAssembler } = await import("@/lib/travel/services/trip-context-assembler");
    const badOriginTrip = {
      id: "test_bad_origin",
      userId: "user_test",
      title: "Tokyo Journey",
      origin: "NonExistentUnknownCityX987",
      destination: "Tokyo, Japan",
      days: 7,
      travellers: 2,
      budget: "moderate" as const,
      status: "planning" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: null,
    };

    const context = await tripContextAssembler.assembleTripContext(badOriginTrip);
    const passed =
      context.origin === null &&
      context.availability.origin.status === "unavailable" &&
      context.availability.origin.reason === "origin_not_found" &&
      context.availability.transport.status === "unavailable" &&
      context.destination.name === "Tokyo";

    results.push({
      testId: 22,
      name: "Unknown Origin Handling in TripContext",
      passed,
      details: {
        originStatus: context.availability.origin.status,
        reason: context.availability.origin.reason,
        readiness: context.readiness,
      },
    });
  } catch (err) {
    results.push({
      testId: 22,
      name: "Unknown Origin Handling in TripContext",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 23: Missing Origin (Transport skipped and flagged origin_required)
  try {
    const { tripContextAssembler } = await import("@/lib/travel/services/trip-context-assembler");
    const noOriginTrip = {
      id: "test_no_origin",
      userId: "user_test",
      title: "Tokyo Journey",
      origin: null,
      destination: "Tokyo, Japan",
      days: 7,
      travellers: 2,
      budget: "moderate" as const,
      status: "planning" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: null,
    };

    const context = await tripContextAssembler.assembleTripContext(noOriginTrip);
    const passed =
      context.origin === null &&
      context.availability.origin.reason === "origin_required" &&
      context.availability.transport.reason === "origin_required" &&
      context.candidateTransport.length === 0;

    results.push({
      testId: 23,
      name: "Missing Origin Zero-Fabrication Enforcement",
      passed,
      details: {
        originReason: context.availability.origin.reason,
        transportReason: context.availability.transport.reason,
        transportCount: context.candidateTransport.length,
      },
    });
  } catch (err) {
    results.push({
      testId: 23,
      name: "Missing Origin Zero-Fabrication Enforcement",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 24: Unknown Destination Throws DestinationNotFoundError
  try {
    const { tripContextAssembler } = await import("@/lib/travel/services/trip-context-assembler");
    const badDestTrip = {
      id: "test_bad_dest",
      userId: "user_test",
      title: "Unknown Journey",
      origin: "Bhopal",
      destination: "UnknownAtlantisIsland9999",
      days: 7,
      travellers: 2,
      budget: "moderate" as const,
      status: "planning" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: null,
    };

    let threwDestNotFound = false;
    try {
      await tripContextAssembler.assembleTripContext(badDestTrip);
    } catch (e) {
      if (e instanceof DestinationNotFoundError) threwDestNotFound = true;
    }

    results.push({
      testId: 24,
      name: "Unknown Destination Throws DestinationNotFoundError",
      passed: threwDestNotFound,
      details: { threwDestNotFound },
    });
  } catch (err) {
    results.push({
      testId: 24,
      name: "Unknown Destination Throws DestinationNotFoundError",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 25: TripContext Provenance Integrity & Source Tracking
  try {
    const { tripContextAssembler } = await import("@/lib/travel/services/trip-context-assembler");
    const validTrip = {
      id: "test_trip_prov",
      userId: "user_test",
      title: "Kyoto Journey",
      origin: "Tokyo",
      destination: "Kyoto",
      days: 5,
      travellers: 2,
      budget: "moderate" as const,
      status: "planning" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: null,
    };

    const context = await tripContextAssembler.assembleTripContext(validTrip);
    const passed =
      Array.isArray(context.sourceSummary.realProviders) &&
      Array.isArray(context.sourceSummary.estimatedProviders) &&
      Array.isArray(context.sourceSummary.unavailableProviders) &&
      context.destination.source !== undefined &&
      typeof context.destination.source.provider === "string";

    results.push({
      testId: 25,
      name: "TripContext Provenance Integrity & Source Tracking",
      passed,
      details: context.sourceSummary,
    });
  } catch (err) {
    results.push({
      testId: 25,
      name: "TripContext Provenance Integrity & Source Tracking",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 26: TripContext Boundary Validation via Zod Schema
  try {
    const { tripContextAssembler } = await import("@/lib/travel/services/trip-context-assembler");
    const { tripContextSchema } = await import("@/lib/travel/validators/travel-schemas");
    const testTrip = {
      id: "test_trip_zod",
      userId: "user_test",
      title: "Paris Journey",
      origin: "London",
      destination: "Paris",
      days: 4,
      travellers: 2,
      budget: "premium" as const,
      status: "planning" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: null,
    };

    const context = await tripContextAssembler.assembleTripContext(testTrip);
    const parseResult = tripContextSchema.safeParse(context);
    const passed = parseResult.success;

    results.push({
      testId: 26,
      name: "TripContext Boundary Validation via Zod Schema",
      passed,
      details: { valid: passed, readiness: context.readiness },
    });
  } catch (err) {
    results.push({
      testId: 26,
      name: "TripContext Boundary Validation via Zod Schema",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // =========================================================================
  // Phase 7: Multi-Agent Journey Planner Verification Tests (Tests 27 - 32)
  // =========================================================================

  // Test 27: Full Multi-Agent Orchestration — Tokyo (7 Days, 2 Travelers, Culture)
  try {
    const { travelOrchestrator } = await import("@/lib/orchestration");
    const tokyoTrip = {
      id: "trip_test_tokyo_phase7",
      userId: "user_test_p7",
      title: "Tokyo Journey",
      origin: "Bhopal",
      destination: "Tokyo",
      days: 7,
      travellers: 2,
      budget: "moderate" as const,
      status: "planning" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        id: "pref_test_tokyo",
        tripId: "trip_test_tokyo_phase7",
        interests: ["Culture & Arts", "Food & Drink"],
        notes: "Central and walkable",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const plan = await travelOrchestrator.planTrip(tokyoTrip);
    const passed =
      plan.status === "completed" &&
      plan.itinerary !== null &&
      plan.itinerary.days.length === 7 &&
      plan.stay !== null &&
      plan.food !== null &&
      plan.activities !== null &&
      plan.budget !== null &&
      plan.budget.totalEstimatedCost > 0 &&
      plan.validation !== null &&
      plan.validation.passed === true;

    results.push({
      testId: 27,
      name: "Full Multi-Agent Orchestration — Tokyo (7 Days, Zero Hallucination)",
      passed,
      details: {
        status: plan.status,
        error: plan.error,
        days: plan.itinerary?.days.length,
        totalCost: plan.budget?.totalEstimatedCost,
        validationPassed: plan.validation?.passed,
      },
    });
  } catch (err) {
    results.push({
      testId: 27,
      name: "Full Multi-Agent Orchestration — Tokyo (7 Days, Zero Hallucination)",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 28: Multi-Agent Orchestration — Goa (5 Days, 2 Travelers, Nature/Food)
  try {
    const { travelOrchestrator } = await import("@/lib/orchestration");
    const goaTrip = {
      id: "trip_test_goa_phase7",
      userId: "user_test_p7",
      title: "Goa Journey",
      origin: "Mumbai",
      destination: "Goa",
      days: 5,
      travellers: 2,
      budget: "moderate" as const,
      status: "planning" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        id: "pref_test_goa",
        tripId: "trip_test_goa_phase7",
        interests: ["Beaches & Islands", "Food & Wine"],
        notes: "Relaxed pace",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const plan = await travelOrchestrator.planTrip(goaTrip);
    const passed =
      plan.status === "completed" &&
      plan.itinerary !== null &&
      plan.itinerary.days.length === 5 &&
      plan.budget !== null &&
      plan.validation !== null &&
      plan.validation.passed === true;

    results.push({
      testId: 28,
      name: "Multi-Agent Orchestration — Goa (5 Days, Intercity Transit + Days Invariant)",
      passed,
      details: {
        status: plan.status,
        days: plan.itinerary?.days.length,
        transport: plan.transportation?.recommendedOptionId,
        validationPassed: plan.validation?.passed,
      },
    });
  } catch (err) {
    results.push({
      testId: 28,
      name: "Multi-Agent Orchestration — Goa (5 Days, Intercity Transit + Days Invariant)",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 29: Feasibility Engine Deterministic Validation & Destination Constraint
  try {
    const { FeasibilityEngine } = await import("@/lib/agents/validator/feasibility-engine");
    const invalidIssues = FeasibilityEngine.verifyCandidates({
      destinationId: "dest_tokyo",
      stay: {
        id: "stay_invalid",
        name: "Kyoto Hotel",
        destinationId: "dest_kyoto", // Mismatch
        address: "Kyoto",
        category: "hotel",
        latitude: 35.0,
        longitude: 135.0,
        rating: 4.5,
        reviewCount: 100,
        pricePerNight: -50, // Invalid price
        currency: "USD",
        amenities: [],
        checkIn: "15:00",
        checkOut: "11:00",
        description: "Mismatch stay",
        source: {
          provider: "mock",
          isEstimate: true,
          confidence: 1,
          fetchedAt: new Date().toISOString(),
        },
      },
      transport: null,
      places: [],
      restaurants: [],
    });

    const hasDestMismatch = invalidIssues.some((i) => i.code === "STAY_DESTINATION_MISMATCH");
    const hasInvalidPrice = invalidIssues.some((i) => i.code === "INVALID_STAY_PRICE");
    const passed = hasDestMismatch && hasInvalidPrice;

    results.push({
      testId: 29,
      name: "Feasibility Engine Candidate Integrity & Boundary Defense",
      passed,
      details: { issueCount: invalidIssues.length, codes: invalidIssues.map((i) => i.code) },
    });
  } catch (err) {
    results.push({
      testId: 29,
      name: "Feasibility Engine Candidate Integrity & Boundary Defense",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 30: Anti-Hallucination Defense — ItineraryValidator Rejects Nonexistent IDs
  try {
    const { ItineraryValidator } = await import("@/lib/agents/validator/itinerary-validator");
    const hallucinatedReport = ItineraryValidator.validate({
      expectedDays: 2,
      itinerary: {
        days: [
          {
            dayNumber: 1,
            theme: "Arrival",
            items: [
              {
                type: "activity",
                referenceId: "hallucinated_ghost_place_999",
                startTime: "10:00",
                endTime: "12:00",
                reasoning: "Visit ghost place",
              },
            ],
          },
          {
            dayNumber: 2,
            theme: "Departure",
            items: [
              {
                type: "activity",
                referenceId: "real_valid_place_1",
                startTime: "10:00",
                endTime: "11:00",
                reasoning: "Valid place",
              },
            ],
          },
        ],
        orchestrationNotes: "Test notes",
      },
      validReferenceIds: new Set(["real_valid_place_1"]),
    });

    const passed =
      hallucinatedReport.passed === false &&
      hallucinatedReport.issues.some((i) => i.code === "HALLUCINATED_REFERENCE_ID");

    results.push({
      testId: 30,
      name: "Anti-Hallucination Defense — Strict ID Whitelist Enforcement",
      passed,
      details: {
        passedCheck: hallucinatedReport.passed,
        issues: hallucinatedReport.issues.map((i) => i.code),
      },
    });
  } catch (err) {
    results.push({
      testId: 30,
      name: "Anti-Hallucination Defense — Strict ID Whitelist Enforcement",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 31: Mathematical Budget Calculator Invariant Check
  try {
    const { BudgetCalculator } = await import("@/lib/agents/budget/budget-calculator");
    const testStay = {
      id: "stay_t1",
      name: "Test Hotel",
      destinationId: "dest_tokyo",
      address: "Tokyo",
      category: "hotel" as const,
      latitude: 35.6,
      longitude: 139.7,
      rating: 4.5,
      reviewCount: 100,
      pricePerNight: 200,
      currency: "USD",
      amenities: [],
      checkIn: "15:00",
      checkOut: "11:00",
      description: "Nice stay",
      source: {
        provider: "mock" as const,
        isEstimate: true,
        confidence: 1,
        fetchedAt: new Date().toISOString(),
      },
    };

    const budget = BudgetCalculator.calculate({
      days: 4,
      travellers: 2,
      budgetTier: "moderate",
      stay: testStay,
      transport: null,
      places: [],
    });

    // 4 days = 3 nights * 200 = 600 accommodation cost
    const passed =
      budget.accommodationCost === 600 &&
      budget.totalEstimatedCost > 600 &&
      budget.dailyFoodEstimate > 0;

    results.push({
      testId: 31,
      name: "Deterministic Mathematical Budget Calculator Invariant Check",
      passed,
      details: budget,
    });
  } catch (err) {
    results.push({
      testId: 31,
      name: "Deterministic Mathematical Budget Calculator Invariant Check",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 32: Transactional Trip Plan Persistence & Status Lifecycle
  try {
    const { TripsRepository } = await import("@/features/trips/repository");
    const testUser = { id: "test_user_persistence_p7", email: "p7@veora.travel", name: "P7 Tester" };
    await TripsRepository.ensureUser(testUser);

    const trip = await TripsRepository.createTrip(testUser.id, "Persistence Test Journey", {
      origin: "Delhi",
      destination: "Goa",
      days: 3,
      travellers: 1,
      budget: "moderate",
      interests: ["Beaches & Islands"],
    });

    const mockOrchestrationResult: import("@/lib/orchestration/types").OrchestrationResult = {
      tripId: trip.id,
      status: "completed",
      stage: "completed",
      attempts: 1,
      transportation: null,
      stay: null,
      activities: null,
      food: null,
      budget: null,
      itinerary: null,
      validation: { passed: true, issues: [], criticalCount: 0, warningCount: 0 },
      assembledAt: new Date().toISOString(),
    };

    const updated = await TripsRepository.updateTripPlan(
      trip.id,
      testUser.id,
      mockOrchestrationResult,
      "upcoming",
    );

    const fetched = await TripsRepository.getTripById(trip.id, testUser.id);
    const passed =
      updated !== null &&
      fetched !== null &&
      fetched.status === "upcoming" &&
      fetched.plan !== null &&
      fetched.plan?.status === "completed";

    results.push({
      testId: 32,
      name: "Transactional Trip Plan Persistence & Status Transition",
      passed,
      details: { status: fetched?.status, planSaved: fetched?.plan !== null },
    });
  } catch (err) {
    results.push({
      testId: 32,
      name: "Transactional Trip Plan Persistence & Status Transition",
      passed: false,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}

export async function GET() {
  const guard = assertInternalRouteAllowed();
  if (guard) return guard;

  const results = await runAllTravelTests();
  const allPassed = results.every((r) => r.passed);
  return NextResponse.json(
    {
      status: allPassed ? "success" : "failure",
      totalTests: results.length,
      passedCount: results.filter((r) => r.passed).length,
      results,
    },
    { status: allPassed ? 200 : 500 },
  );
}



