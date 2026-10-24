import { NextResponse } from "next/server";
import { assertInternalRouteAllowed } from "@/lib/security/internal-guard";
import {
  buildGoogleMapsUrl,
  buildGoogleMapsCityUrl,
  buildGoogleMapsDirectionsUrl,
  isValidGooglePlaceId,
  buildTransitSearchUrl,
} from "@/lib/travel/external-links";
import { GoogleTransitProvider } from "@/lib/travel/providers/real/google-transit-provider";
import { MockTransportProvider } from "@/lib/travel/providers/mock/mock-transport-provider";
import { TravelService } from "@/lib/travel/services/travel-service";
import { TransportScorer } from "@/lib/agents/transportation/scoring";
import { TransportationAgent } from "@/lib/agents/transportation/transportation-agent";
import { FeasibilityEngine } from "@/lib/agents/validator/feasibility-engine";
import { TravelOrchestrator } from "@/lib/orchestration/orchestrator";
import { TransportOption } from "@/lib/travel/types/transport";
import { TripWithPreferences } from "@/features/trips/types";

interface TestCaseResult {
  testId: number;
  name: string;
  passed: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

export async function GET() {
  const guard = assertInternalRouteAllowed();
  if (guard) return guard;

  const results: TestCaseResult[] = [];

  // =========================================================================
  // PART 1: 15 MAPS AND LOCATION LINK TESTS
  // =========================================================================

  // Test 1: isValidGooglePlaceId accepts authentic Google Place IDs
  try {
    const validIds = [
      "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "ChIJ2eUgeAK6j4ARbn5u_wAGqWA",
      "ChIJLfySpTOuEmsRsc_TotFo45E",
    ];
    const allValid = validIds.every((id) => isValidGooglePlaceId(id));
    results.push({
      testId: 1,
      name: "isValidGooglePlaceId accepts authentic Google Place IDs",
      passed: allValid,
      details: { tested: validIds },
    });
  } catch (err) {
    results.push({ testId: 1, name: "isValidGooglePlaceId valid IDs", passed: false, message: String(err) });
  }

  // Test 2: isValidGooglePlaceId rejects synthetic/mock internal IDs
  try {
    const syntheticIds = [
      "mock_place_12345",
      "dest_bhopal_central",
      "dyn_hotel_grand",
      "stay_ocean_view_resort",
      "rest_local_bistro_42",
      "flight_ai_101_express",
      "train_rajdhani_12952",
    ];
    const allRejected = syntheticIds.every((id) => !isValidGooglePlaceId(id));
    results.push({
      testId: 2,
      name: "isValidGooglePlaceId rejects synthetic/mock internal IDs",
      passed: allRejected,
      details: { rejectedCount: syntheticIds.length },
    });
  } catch (err) {
    results.push({ testId: 2, name: "isValidGooglePlaceId synthetic IDs", passed: false, message: String(err) });
  }

  // Test 3: isValidGooglePlaceId rejects null, undefined, empty, or short strings
  try {
    const invalidInputs = [null, undefined, "", "   ", "abc", "short_id"];
    const allInvalid = invalidInputs.every((v) => !isValidGooglePlaceId(v));
    results.push({
      testId: 3,
      name: "isValidGooglePlaceId rejects null, empty, or short strings",
      passed: allInvalid,
    });
  } catch (err) {
    results.push({ testId: 3, name: "isValidGooglePlaceId invalid inputs", passed: false, message: String(err) });
  }

  // Test 4: buildGoogleMapsUrl with valid Place ID produces standard API query with query_place_id
  try {
    const url = buildGoogleMapsUrl({
      label: "Sydney Opera House",
      address: "Bennelong Point, Sydney NSW 2000",
      googlePlaceId: "ChIJ3S-JXmauEmsRUcIaWtf4MzE",
    });
    const passed =
      url !== null &&
      url.startsWith("https://www.google.com/maps/search/?api=1") &&
      url.includes("query_place_id=ChIJ3S-JXmauEmsRUcIaWtf4MzE") &&
      url.includes("Sydney");
    results.push({
      testId: 4,
      name: "buildGoogleMapsUrl with valid Place ID produces standard API query with query_place_id",
      passed,
      details: { url },
    });
  } catch (err) {
    results.push({ testId: 4, name: "buildGoogleMapsUrl place ID", passed: false, message: String(err) });
  }

  // Test 5: buildGoogleMapsUrl never includes invalid/synthetic place IDs in query_place_id
  try {
    const url = buildGoogleMapsUrl({
      label: "Taj Lake Palace",
      address: "Pichola, Udaipur, Rajasthan",
      placeId: "mock_place_udaipur_palace",
      latitude: 24.5753,
      longitude: 73.6802,
    });
    const passed = url !== null && !url.includes("query_place_id=");
    results.push({
      testId: 5,
      name: "buildGoogleMapsUrl never includes invalid/synthetic place IDs in query_place_id",
      passed,
      details: { url },
    });
  } catch (err) {
    results.push({ testId: 5, name: "buildGoogleMapsUrl synthetic ID exclusion", passed: false, message: String(err) });
  }

  // Test 6: buildGoogleMapsUrl prioritizes valid provider googleMapsUri when Place ID is not genuine
  try {
    const directUri = "https://maps.google.com/?cid=1023849182374619";
    const url = buildGoogleMapsUrl({
      label: "Boutique Residence",
      googleMapsUri: directUri,
      placeId: "mock_stay_boutique",
    });
    const passed = url === directUri;
    results.push({
      testId: 6,
      name: "buildGoogleMapsUrl prioritizes valid provider googleMapsUri when Place ID is synthetic",
      passed,
      details: { url },
    });
  } catch (err) {
    results.push({ testId: 6, name: "buildGoogleMapsUrl URI priority", passed: false, message: String(err) });
  }

  // Test 7: buildGoogleMapsUrl falls back to coordinates when place ID and URI are absent
  try {
    const url = buildGoogleMapsUrl({
      latitude: 15.2993,
      longitude: 74.124,
      label: "Palolem Beach",
    });
    const passed =
      url !== null &&
      url.startsWith("https://www.google.com/maps/search/?api=1") &&
      url.includes("query=15.2993%2C74.124");
    results.push({
      testId: 7,
      name: "buildGoogleMapsUrl falls back to coordinates when place ID and URI are absent",
      passed,
      details: { url },
    });
  } catch (err) {
    results.push({ testId: 7, name: "buildGoogleMapsUrl coordinate fallback", passed: false, message: String(err) });
  }

  // Test 8: buildGoogleMapsUrl falls back to address + name when coordinates are absent
  try {
    const url = buildGoogleMapsUrl({
      label: "Cafe Leopold",
      address: "Colaba Causeway, Mumbai",
    });
    const passed =
      url !== null &&
      url.startsWith("https://www.google.com/maps/search/?api=1&query=") &&
      url.includes("Leopold");
    results.push({
      testId: 8,
      name: "buildGoogleMapsUrl falls back to address + name when coordinates are absent",
      passed,
      details: { url },
    });
  } catch (err) {
    results.push({ testId: 8, name: "buildGoogleMapsUrl address fallback", passed: false, message: String(err) });
  }

  // Test 9: buildGoogleMapsUrl returns null when no reliable location info exists
  try {
    const url = buildGoogleMapsUrl({});
    const passed = url === null;
    results.push({
      testId: 9,
      name: "buildGoogleMapsUrl returns null when no location info is provided",
      passed,
    });
  } catch (err) {
    results.push({ testId: 9, name: "buildGoogleMapsUrl null on empty", passed: false, message: String(err) });
  }

  // Test 10: buildGoogleMapsCityUrl creates canonical city search URL with api=1
  try {
    const url = buildGoogleMapsCityUrl("Bhopal, Madhya Pradesh, India");
    const passed =
      url !== null &&
      url.startsWith("https://www.google.com/maps/search/?api=1&query=") &&
      url.includes("Bhopal");
    results.push({
      testId: 10,
      name: "buildGoogleMapsCityUrl creates canonical city search URL with api=1",
      passed,
      details: { url },
    });
  } catch (err) {
    results.push({ testId: 10, name: "buildGoogleMapsCityUrl canonical format", passed: false, message: String(err) });
  }

  // Test 11: buildGoogleMapsCityUrl works reliably for domestic cities
  try {
    const cities = ["Mumbai, India", "Goa", "Jaipur, Rajasthan", "Kochi, Kerala"];
    const allValid = cities.every((c) => {
      const u = buildGoogleMapsCityUrl(c);
      return u !== null && u.startsWith("https://www.google.com/maps/search/?api=1");
    });
    results.push({
      testId: 11,
      name: "buildGoogleMapsCityUrl works reliably for domestic cities",
      passed: allValid,
    });
  } catch (err) {
    results.push({ testId: 11, name: "buildGoogleMapsCityUrl domestic", passed: false, message: String(err) });
  }

  // Test 12: buildGoogleMapsCityUrl works reliably for international destinations
  try {
    const intlCities = ["Tokyo, Japan", "Paris, France", "New York, USA", "Cape Town, South Africa"];
    const allValid = intlCities.every((c) => {
      const u = buildGoogleMapsCityUrl(c);
      return u !== null && u.startsWith("https://www.google.com/maps/search/?api=1");
    });
    results.push({
      testId: 12,
      name: "buildGoogleMapsCityUrl works reliably for international destinations",
      passed: allValid,
    });
  } catch (err) {
    results.push({ testId: 12, name: "buildGoogleMapsCityUrl international", passed: false, message: String(err) });
  }

  // Test 13: buildGoogleMapsDirectionsUrl creates canonical directions URL
  try {
    const url = buildGoogleMapsDirectionsUrl({
      origin: "Bhopal, India",
      destination: "Goa, India",
    });
    const passed =
      url !== null &&
      url.startsWith("https://www.google.com/maps/dir/?api=1") &&
      url.includes("origin=Bhopal") &&
      url.includes("destination=Goa");
    results.push({
      testId: 13,
      name: "buildGoogleMapsDirectionsUrl creates canonical directions URL",
      passed,
      details: { url },
    });
  } catch (err) {
    results.push({ testId: 13, name: "buildGoogleMapsDirectionsUrl basic", passed: false, message: String(err) });
  }

  // Test 14: buildGoogleMapsDirectionsUrl supports travelmode=transit and driving
  try {
    const transitUrl = buildGoogleMapsDirectionsUrl({
      origin: "New Delhi",
      destination: "Agra",
      travelMode: "transit",
    });
    const drivingUrl = buildGoogleMapsDirectionsUrl({
      origin: "New Delhi",
      destination: "Agra",
      travelMode: "driving",
    });
    const passed =
      transitUrl !== null &&
      transitUrl.includes("travelmode=transit") &&
      drivingUrl !== null &&
      drivingUrl.includes("travelmode=driving");
    results.push({
      testId: 14,
      name: "buildGoogleMapsDirectionsUrl supports travelmode=transit and travelmode=driving",
      passed,
      details: { transitUrl, drivingUrl },
    });
  } catch (err) {
    results.push({ testId: 14, name: "buildGoogleMapsDirectionsUrl travelmode", passed: false, message: String(err) });
  }

  // Test 15: buildTransitSearchUrl produces canonical transit directions or search link
  try {
    const url = buildTransitSearchUrl({
      origin: "Bhopal",
      destination: "Goa",
      mode: "train",
    });
    const passed =
      url.startsWith("https://www.google.com/maps/dir/?api=1") &&
      url.includes("travelmode=transit");
    results.push({
      testId: 15,
      name: "buildTransitSearchUrl produces canonical transit directions link",
      passed,
      details: { url },
    });
  } catch (err) {
    results.push({ testId: 15, name: "buildTransitSearchUrl", passed: false, message: String(err) });
  }

  // =========================================================================
  // PART 2: 15 TRANSPORT PREFERENCE AND ROUTING TESTS
  // =========================================================================

  // Test 16: GoogleTransitProvider produces empty array when no API key configured (graceful degradation)
  try {
    const transitProvider = new GoogleTransitProvider();
    try {
      const routes = await transitProvider.searchTransport({
        origin: "Bhopal",
        destination: "Goa",
      });
      results.push({
        testId: 16,
        name: "GoogleTransitProvider degrades gracefully without throwing unhandled errors",
        passed: Array.isArray(routes),
        details: { routeCount: routes.length },
      });
    } catch (providerErr: unknown) {
      const isExpected = providerErr instanceof Error && providerErr.name === "ProviderUnavailableError";
      results.push({
        testId: 16,
        name: "GoogleTransitProvider degrades gracefully without throwing unhandled errors",
        passed: isExpected,
        details: { expectedError: (providerErr as Error).message },
      });
    }
  } catch (err) {
    results.push({ testId: 16, name: "GoogleTransitProvider degradation", passed: false, message: String(err) });
  }

  // Test 17: GoogleTransitProvider gracefully handles transoceanic routes returning empty array
  try {
    const transitProvider = new GoogleTransitProvider();
    try {
      const routes = await transitProvider.searchTransport({
        origin: "Mumbai",
        destination: "New York, USA",
      });
      results.push({
        testId: 17,
        name: "GoogleTransitProvider returns empty array for transoceanic train routes",
        passed: Array.isArray(routes) && routes.length === 0,
        details: { routeCount: routes.length },
      });
    } catch (providerErr: unknown) {
      const isExpected = providerErr instanceof Error && providerErr.name === "ProviderUnavailableError";
      results.push({
        testId: 17,
        name: "GoogleTransitProvider returns empty array for transoceanic train routes",
        passed: isExpected,
        details: { expectedError: (providerErr as Error).message },
      });
    }
  } catch (err) {
    results.push({ testId: 17, name: "GoogleTransitProvider transoceanic", passed: false, message: String(err) });
  }

  // Test 18: MockTransportProvider mode-aware filtering strictly respects preferred mode
  try {
    const mockTransport = new MockTransportProvider();
    const trainOnly = await mockTransport.searchTransport({
      origin: "Bhopal",
      destination: "Goa",
      preferredModes: ["train"],
    });
    const passed =
      trainOnly.length > 0 &&
      trainOnly.every((t) => t.mode === "train");
    results.push({
      testId: 18,
      name: "MockTransportProvider strictly filters by train mode when requested",
      passed,
      details: { count: trainOnly.length, modes: trainOnly.map((t) => t.mode) },
    });
  } catch (err) {
    results.push({ testId: 18, name: "MockTransportProvider train filtering", passed: false, message: String(err) });
  }

  // Test 19: MockTransportProvider returns zero train routes for transoceanic itineraries
  try {
    const mockTransport = new MockTransportProvider();
    const transoceanicTrains = await mockTransport.searchTransport({
      origin: "Mumbai",
      destination: "New York, USA",
      preferredModes: ["train"],
    });
    const passed = transoceanicTrains.length === 0;
    results.push({
      testId: 19,
      name: "MockTransportProvider returns zero trains for transoceanic routes",
      passed,
      details: { trainCount: transoceanicTrains.length },
    });
  } catch (err) {
    results.push({ testId: 19, name: "MockTransportProvider transoceanic train check", passed: false, message: String(err) });
  }

  // Test 20: TravelService routes train preference to rail provider
  try {
    const travelService = new TravelService();
    const resultsModeTrain = await travelService.searchTransport({
      origin: "Bhopal",
      destination: "Goa",
      preferredModes: ["train"],
    });
    const passed =
      resultsModeTrain.length > 0 &&
      resultsModeTrain.every((t) => t.mode === "train");
    results.push({
      testId: 20,
      name: "TravelService routes train preference to rail provider returning only train options",
      passed,
      details: { count: resultsModeTrain.length, modes: resultsModeTrain.map((t) => t.mode) },
    });
  } catch (err) {
    results.push({ testId: 20, name: "TravelService train routing", passed: false, message: String(err) });
  }

  // Test 21: TravelService routes flight preference to flight provider
  try {
    const travelService = new TravelService();
    const resultsModeFlight = await travelService.searchTransport({
      origin: "Bhopal",
      destination: "Goa",
      preferredModes: ["flight"],
    });
    const passed =
      resultsModeFlight.length > 0 &&
      resultsModeFlight.every((t) => t.mode === "flight");
    results.push({
      testId: 21,
      name: "TravelService routes flight preference to flight provider returning only flight options",
      passed,
      details: { count: resultsModeFlight.length, modes: resultsModeFlight.map((t) => t.mode) },
    });
  } catch (err) {
    results.push({ testId: 21, name: "TravelService flight routing", passed: false, message: String(err) });
  }

  // Test 22: TravelService routes car preference to driving route provider
  try {
    const travelService = new TravelService();
    const resultsModeCar = await travelService.searchTransport({
      origin: "Bhopal",
      destination: "Indore",
      preferredModes: ["car"],
    });
    const passed =
      resultsModeCar.length > 0 &&
      resultsModeCar.every((t) => t.mode === "car");
    results.push({
      testId: 22,
      name: "TravelService routes car preference to driving route provider returning only car options",
      passed,
      details: { count: resultsModeCar.length, modes: resultsModeCar.map((t) => t.mode) },
    });
  } catch (err) {
    results.push({ testId: 22, name: "TravelService car routing", passed: false, message: String(err) });
  }

  // Test 23: TransportScorer gives +60 preference boost when user chooses train
  try {
    const mockCandidates: TransportOption[] = [
      {
        id: "train_1",
        mode: "train",
        provider: "Indian Railways",
        origin: "Bhopal",
        destination: "Goa",
        departureTime: "08:00",
        arrivalTime: "20:00",
        durationMinutes: 720,
        price: 45,
        currency: "USD",
        stops: 2,
        availability: "available",
        source: { provider: "mock-transport", providerId: "train_1", fetchedAt: new Date().toISOString(), isEstimate: true, confidence: 0.9 },
      },
      {
        id: "flight_1",
        mode: "flight",
        provider: "IndiGo",
        origin: "Bhopal",
        destination: "Goa",
        departureTime: "10:00",
        arrivalTime: "13:00",
        durationMinutes: 180,
        price: 90,
        currency: "USD",
        stops: 0,
        availability: "available",
        source: { provider: "mock-transport", providerId: "flight_1", fetchedAt: new Date().toISOString(), isEstimate: true, confidence: 0.9 },
      },
    ];

    const scored = TransportScorer.scoreCandidates(mockCandidates, "train");
    const trainScored = scored.rankedOptions.find((o) => o.option.mode === "train");
    const flightScored = scored.rankedOptions.find((o) => o.option.mode === "flight");
    const passed =
      trainScored !== undefined &&
      trainScored.scoreBreakdown.preferenceWeight === 60 &&
      flightScored !== undefined &&
      flightScored.scoreBreakdown.preferenceWeight === 0 &&
      scored.bestOption?.mode === "train";
    results.push({
      testId: 23,
      name: "TransportScorer gives +60 preference boost and selects train when preferred",
      passed,
      details: { bestMode: scored.bestOption?.mode, trainScore: trainScored?.score },
    });
  } catch (err) {
    results.push({ testId: 23, name: "TransportScorer train scoring", passed: false, message: String(err) });
  }

  // Test 24: TransportScorer marks preferredModeAvailable = false when train is preferred but only flights exist
  try {
    const flightOnlyCandidate: TransportOption[] = [
      {
        id: "flight_only",
        mode: "flight",
        provider: "Delta",
        origin: "Mumbai",
        destination: "New York",
        departureTime: "02:00",
        arrivalTime: "18:00",
        durationMinutes: 960,
        price: 850,
        currency: "USD",
        stops: 1,
        availability: "available",
        source: { provider: "mock-transport", providerId: "flight_only", fetchedAt: new Date().toISOString(), isEstimate: true, confidence: 0.9 },
      },
    ];

    const scored = TransportScorer.scoreCandidates(flightOnlyCandidate, "train");
    const passed =
      scored.preferredModeAvailable === false &&
      scored.preferredModeCount === 0 &&
      scored.bestOption !== null &&
      scored.bestOption.mode === "flight";
    results.push({
      testId: 24,
      name: "TransportScorer marks preferredModeAvailable = false and falls back to flight when preferred mode has 0 candidates",
      passed,
      details: { preferredModeAvailable: scored.preferredModeAvailable, bestOptionMode: scored.bestOption?.mode },
    });
  } catch (err) {
    results.push({ testId: 24, name: "TransportScorer strict mode zero-candidate check", passed: false, message: String(err) });
  }

  // Test 25: TransportScorer returns truthful fallbackReason explaining no substitute was forced
  try {
    const flightOnlyCandidate: TransportOption[] = [
      {
        id: "flight_only",
        mode: "flight",
        provider: "Delta",
        origin: "Mumbai",
        destination: "New York",
        departureTime: "02:00",
        arrivalTime: "18:00",
        durationMinutes: 960,
        price: 850,
        currency: "USD",
        stops: 1,
        availability: "available",
        source: { provider: "mock-transport", providerId: "flight_only", fetchedAt: new Date().toISOString(), isEstimate: true, confidence: 0.9 },
      },
    ];

    const scored = TransportScorer.scoreCandidates(flightOnlyCandidate, "train");
    const passed =
      Boolean(scored.fallbackReason) &&
      scored.fallbackReason!.toLowerCase().includes("train") &&
      scored.fallbackReason!.includes("was requested");
    results.push({
      testId: 25,
      name: "TransportScorer provides truthful fallbackReason explaining fallback",
      passed,
      details: { fallbackReason: scored.fallbackReason },
    });
  } catch (err) {
    results.push({ testId: 25, name: "TransportScorer fallbackReason check", passed: false, message: String(err) });
  }

  // Helper to construct fully conforming TripWithPreferences
  const makeTrip = (
    id: string,
    origin: string,
    destination: string,
    pref: "auto" | "flight" | "train" | "bus" | "car" = "train",
  ): TripWithPreferences => ({
    id,
    userId: "user_test",
    title: `Trip ${id}`,
    origin,
    destination,
    days: 3,
    travellers: 1,
    budget: "moderate",
    status: "planning",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      id: `pref_${id}`,
      tripId: id,
      transportPreference: pref,
      interests: ["Culture"],
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  // Test 26: TransportationAgent returns status 'partial' with data: null when candidates are empty
  try {
    const travelService = new TravelService();
    const trip = makeTrip("trip_transoceanic_train", "Mumbai", "New York, USA", "train");

    const ctx = await travelService.prepareTripContext(trip);
    const emptyCtx = { ...ctx, candidateTransport: [] };
    const agent = new TransportationAgent();
    const res = await agent.run(emptyCtx, 1);

    const passed = res.status === "partial" && res.data === null;
    results.push({
      testId: 26,
      name: "TransportationAgent returns partial status with null data when candidate transport is empty",
      passed,
      details: { status: res.status, data: res.data, reasoning: res.reasoning },
    });
  } catch (err) {
    results.push({ testId: 26, name: "TransportationAgent partial status check", passed: false, message: String(err) });
  }

  // Test 27: FeasibilityEngine detects PREFERENCE_MODE_MISMATCH when transport mode does not match preference
  try {
    const mismatchedOption: TransportOption = {
      id: "opt_flight_1",
      mode: "flight",
      provider: "Air India",
      origin: "Bhopal",
      destination: "Goa",
      departureTime: "09:00",
      arrivalTime: "12:00",
      durationMinutes: 180,
      price: 100,
      currency: "USD",
      stops: 0,
      availability: "available",
      source: { provider: "mock-transport", providerId: "flight_1", fetchedAt: new Date().toISOString(), isEstimate: true, confidence: 0.9 },
    };

    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "dest_goa",
      stay: null,
      transport: mismatchedOption,
      places: [],
      restaurants: [],
      transportPreference: "train",
    });

    const hasMismatch = issues.some((i) => i.code === "PREFERENCE_MODE_MISMATCH");
    results.push({
      testId: 27,
      name: "FeasibilityEngine flags PREFERENCE_MODE_MISMATCH when transport mode violates user preference",
      passed: hasMismatch,
      details: { issuesCount: issues.length, codes: issues.map((i) => i.code) },
    });
  } catch (err) {
    results.push({ testId: 27, name: "FeasibilityEngine mode mismatch test", passed: false, message: String(err) });
  }

  // Test 28: FeasibilityEngine passes with zero errors when transport mode matches requested preference
  try {
    const matchedOption: TransportOption = {
      id: "opt_train_1",
      mode: "train",
      provider: "Indian Railways",
      origin: "Bhopal",
      destination: "Goa",
      departureTime: "08:00",
      arrivalTime: "20:00",
      durationMinutes: 720,
      price: 45,
      currency: "USD",
      stops: 2,
      availability: "available",
      source: { provider: "mock-transport", providerId: "train_1", fetchedAt: new Date().toISOString(), isEstimate: true, confidence: 0.9 },
    };

    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "dest_goa",
      stay: null,
      transport: matchedOption,
      places: [],
      restaurants: [],
      transportPreference: "train",
    });

    const passed = issues.length === 0;
    results.push({
      testId: 28,
      name: "FeasibilityEngine passes with zero issues when transport mode matches user preference",
      passed,
      details: { issuesCount: issues.length },
    });
  } catch (err) {
    results.push({ testId: 28, name: "FeasibilityEngine matching mode test", passed: false, message: String(err) });
  }

  // Test 29: TripContextAssembler forwards transport preference to searchTransport
  try {
    const travelService = new TravelService();
    const domesticTripWithTrain = makeTrip("trip_domestic_train", "Bhopal", "Goa, India", "train");

    const ctx = await travelService.prepareTripContext(domesticTripWithTrain);
    const passed =
      ctx.candidateTransport.length > 0 &&
      ctx.candidateTransport.every((t) => t.mode === "train");
    results.push({
      testId: 29,
      name: "TripContextAssembler retrieves only train candidates when user prefers train",
      passed,
      details: { candidateCount: ctx.candidateTransport.length, modes: ctx.candidateTransport.map((t) => t.mode) },
    });
  } catch (err) {
    results.push({ testId: 29, name: "TripContextAssembler preference forwarding", passed: false, message: String(err) });
  }

  // Test 30: TravelOrchestrator generates journey plan with train transit and no flight substitution
  try {
    const domesticTrainTrip = makeTrip("trip_orch_train", "Bhopal", "Goa, India", "train");

    const orchestrator = new TravelOrchestrator();
    const result = await orchestrator.planTrip(domesticTrainTrip);
    const passed =
      result.status === "completed" &&
      result.transportation !== null &&
      result.transportation.mode === "train";
    results.push({
      testId: 30,
      name: "TravelOrchestrator plans complete journey with train transit when train is requested",
      passed,
      details: { status: result.status, mode: result.transportation?.mode },
    });
  } catch (err) {
    results.push({ testId: 30, name: "TravelOrchestrator train journey plan", passed: false, message: String(err) });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  return NextResponse.json({
    status: passedCount === totalCount ? "passed" : "failed",
    summary: {
      total: totalCount,
      passed: passedCount,
      failed: totalCount - passedCount,
    },
    results,
  });
}
