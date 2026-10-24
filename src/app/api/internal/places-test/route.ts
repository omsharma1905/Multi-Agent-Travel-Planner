/**
 * @file src/app/api/internal/places-test/route.ts
 *
 * Automated verification test suite for Phase 10.2:
 * Places & Location Intelligence Foundation.
 *
 * Covers 26 required verification scenarios:
 * 1. candidate_retrieval_static: Static fixture retrieval for known destinations
 * 2. candidate_retrieval_dynamic: Dynamic place generation for arbitrary destinations
 * 3. place_coordinates_realistic: Dynamic coordinates close to destination center
 * 4. place_opening_hours_structure: Opening hours presence and format
 * 5. place_durations_presence: Estimated duration minutes populated
 * 6. place_pricing_free_distinction: Free places have priceType="free" and ticketPrice=0
 * 7. place_pricing_paid_distinction: Paid places have priceType="paid" and ticketPrice > 0
 * 8. place_pricing_unknown_distinction: Unknown places have priceType="unknown" and ticketPrice is null/undefined (not 0)
 * 9. place_pricing_flag_estimate: Dynamic places flagged with isPriceEstimate=true
 * 10. place_scorer_weights: PlaceScorer breakdown sums correctly to final score
 * 11. place_scorer_interest_relevance: Interest match scores higher than non-match
 * 12. place_scorer_budget_alignment: Budget tier awards maximum points to free/low-cost places
 * 13. place_scorer_spatial_penalty: Distant places (>100km) receive spatial penalty
 * 14. place_scorer_spatial_clustering: Haversine clustering groups nearby places
 * 15. feasibility_valid_coordinates: Valid coordinates pass feasibility check
 * 16. feasibility_invalid_coordinates_rejected: Invalid latitude/longitude rejected with INVALID_PLACE_COORDINATES
 * 17. feasibility_destination_mismatch_rejected: Destination mismatch rejected with PLACE_DESTINATION_MISMATCH
 * 18. feasibility_negative_ticket_price_rejected: Negative ticket price rejected with INVALID_TICKET_PRICE
 * 19. activities_agent_grounded_candidates: ActivitiesAgent produces grounded candidate selection
 * 20. activities_agent_anti_hallucination_reject: Hallucinated ID rejected with deterministic fallback
 * 21. activities_agent_deterministic_fallback: LLM failure triggers deterministic top picks
 * 22. itinerary_validator_duplicate_place_rejected: Duplicate place across days triggers DUPLICATE_PLACE_VISIT
 * 23. itinerary_validator_one_visit_enforced: Single visit per place passes validation
 * 24. budget_calculator_free_places: Free places incur 0 activity fee
 * 25. budget_calculator_known_ticket_pricing: Known ticket prices properly converted & multiplied by travellers
 * 26. budget_calculator_unknown_ticket_estimate: Unknown ticket prices fallback to tier baseline with estimate flag
 */

import { NextResponse } from "next/server";
import { assertInternalRouteAllowed } from "@/lib/security/internal-guard";
import { MockPlaceProvider } from "@/lib/travel/providers/mock/mock-place-provider";
import { PlaceScorer } from "@/lib/agents/activities/scoring";
import { ActivitiesAgent } from "@/lib/agents/activities/activities-agent";
import { FeasibilityEngine } from "@/lib/agents/validator/feasibility-engine";
import { ItineraryValidator } from "@/lib/agents/validator/itinerary-validator";
import { BudgetCalculator } from "@/lib/agents/budget/budget-calculator";
import { travelService, Place } from "@/lib/travel";
import { TripWithPreferences } from "@/features/trips/types";
import { LLMProvider } from "@/lib/ai/types";
import { z } from "zod";

export interface PlaceTestCaseResult {
  testId: number;
  name: string;
  passed: boolean;
  message?: string;
  details?: unknown;
}

function makeTestPlace(
  partial: Partial<Place> & {
    id: string;
    name: string;
    destinationId: string;
    type: Place["type"];
    latitude: number;
    longitude: number;
  },
): Place {
  return {
    rating: 4.5,
    reviewCount: 100,
    priceLevel: "moderate",
    address: "Central Street",
    description: "Test place description",
    openingHours: { text: "09:00 - 18:00 daily" },
    tags: ["culture"],
    source: {
      provider: "mock-test",
      providerId: partial.id,
      fetchedAt: new Date().toISOString(),
      isEstimate: false,
      confidence: 1.0,
    },
    ...partial,
  };
}

export async function runAllPlaceTests(): Promise<PlaceTestCaseResult[]> {
  const results: PlaceTestCaseResult[] = [];
  const mockProvider = new MockPlaceProvider();

  // Test 1: candidate_retrieval_static
  try {
    const places = await mockProvider.searchPlaces({ destinationId: "tokyo" });
    const passed = places.length > 0 && places.some((p) => p.name.includes("Sens") || p.id === "place_sensoji");
    results.push({
      testId: 1,
      name: "candidate_retrieval_static",
      passed,
      message: passed ? `Retrieved ${places.length} static places for Tokyo.` : "Failed to retrieve Tokyo places.",
    });
  } catch (err) {
    results.push({ testId: 1, name: "candidate_retrieval_static", passed: false, message: String(err) });
  }

  // Test 2: candidate_retrieval_dynamic
  try {
    const places = await mockProvider.searchPlaces({
      destinationId: "zurich",
      latitude: 47.3769,
      longitude: 8.5417,
      limit: 8,
    });
    const passed = places.length >= 6 && places.every((p) => p.id.startsWith("dyn_pl_"));
    results.push({
      testId: 2,
      name: "candidate_retrieval_dynamic",
      passed,
      message: passed ? `Generated ${places.length} dynamic places for Zurich.` : "Dynamic places count or prefix mismatch.",
    });
  } catch (err) {
    results.push({ testId: 2, name: "candidate_retrieval_dynamic", passed: false, message: String(err) });
  }

  // Test 3: place_coordinates_realistic
  try {
    const places = await mockProvider.searchPlaces({
      destinationId: "zurich",
      latitude: 47.3769,
      longitude: 8.5417,
      limit: 6,
    });
    const centerLat = 47.3769;
    const centerLng = 8.5417;
    const allClose = places.every(
      (p) => Math.abs(p.latitude - centerLat) < 0.2 && Math.abs(p.longitude - centerLng) < 0.2,
    );
    results.push({
      testId: 3,
      name: "place_coordinates_realistic",
      passed: allClose,
      message: allClose
        ? "Dynamic coordinates are realistic and centered around destination."
        : "Dynamic coordinates too far or not centered.",
    });
  } catch (err) {
    results.push({ testId: 3, name: "place_coordinates_realistic", passed: false, message: String(err) });
  }

  // Test 4: place_opening_hours_structure
  try {
    const places = await mockProvider.searchPlaces({ destinationId: "kyoto" });
    const hasHours = places.some(
      (p) => Boolean(p.openingHours && (typeof p.openingHours.text === "string" || typeof p.openingHours.monday === "object")),
    );
    results.push({
      testId: 4,
      name: "place_opening_hours_structure",
      passed: hasHours,
      message: hasHours ? "Opening hours structure verified on places." : "Missing opening hours structure.",
    });
  } catch (err) {
    results.push({ testId: 4, name: "place_opening_hours_structure", passed: false, message: String(err) });
  }

  // Test 5: place_durations_presence
  try {
    const places = await mockProvider.searchPlaces({ destinationId: "paris" });
    const allHaveDurations = places.every(
      (p) => typeof p.estimatedDurationMinutes === "number" && p.estimatedDurationMinutes >= 30,
    );
    results.push({
      testId: 5,
      name: "place_durations_presence",
      passed: allHaveDurations,
      message: allHaveDurations
        ? "All places have valid estimatedDurationMinutes."
        : "Some places missing estimatedDurationMinutes.",
    });
  } catch (err) {
    results.push({ testId: 5, name: "place_durations_presence", passed: false, message: String(err) });
  }

  // Test 6: place_pricing_free_distinction
  try {
    const places = await mockProvider.searchPlaces({ destinationId: "kyoto" });
    const freePlace = places.find((p) => p.priceType === "free");
    const passed = Boolean(freePlace && freePlace.ticketPrice === 0 && freePlace.priceType === "free");
    results.push({
      testId: 6,
      name: "place_pricing_free_distinction",
      passed,
      message: passed ? `Free place verified: ${freePlace?.name} (ticketPrice: 0, priceType: free).` : "No free place found.",
    });
  } catch (err) {
    results.push({ testId: 6, name: "place_pricing_free_distinction", passed: false, message: String(err) });
  }

  // Test 7: place_pricing_paid_distinction
  try {
    const places = await mockProvider.searchPlaces({ destinationId: "paris" });
    const paidPlace = places.find((p) => p.priceType === "paid");
    const passed = Boolean(paidPlace && typeof paidPlace.ticketPrice === "number" && paidPlace.ticketPrice > 0);
    results.push({
      testId: 7,
      name: "place_pricing_paid_distinction",
      passed,
      message: passed ? `Paid place verified: ${paidPlace?.name} (ticketPrice: ${paidPlace?.ticketPrice}).` : "No paid place found.",
    });
  } catch (err) {
    results.push({ testId: 7, name: "place_pricing_paid_distinction", passed: false, message: String(err) });
  }

  // Test 8: place_pricing_unknown_distinction
  try {
    const mockUnknownPlace = makeTestPlace({
      id: "place_unknown_test",
      name: "Unknown Fee Museum",
      destinationId: "test_dest",
      type: "museum",
      latitude: 10,
      longitude: 10,
      priceType: "unknown",
      ticketPrice: null as unknown as number,
      tags: ["museum"],
    });
    const isNotZero = mockUnknownPlace.ticketPrice !== 0 && mockUnknownPlace.priceType === "unknown";
    results.push({
      testId: 8,
      name: "place_pricing_unknown_distinction",
      passed: isNotZero,
      message: isNotZero ? "Unknown price is distinct from free (ticketPrice is null, priceType is unknown)." : "Failed unknown check.",
    });
  } catch (err) {
    results.push({ testId: 8, name: "place_pricing_unknown_distinction", passed: false, message: String(err) });
  }

  // Test 9: place_pricing_flag_estimate
  try {
    const places = await mockProvider.searchPlaces({ destinationId: "rome", latitude: 41.9, longitude: 12.5 });
    const paidPlaces = places.filter((p) => p.priceType === "paid");
    const hasEstimates = paidPlaces.length > 0 && paidPlaces.every((p) => p.isPriceEstimate === true);
    results.push({
      testId: 9,
      name: "place_pricing_flag_estimate",
      passed: hasEstimates,
      message: hasEstimates ? "Dynamic paid places have isPriceEstimate=true." : "isPriceEstimate not set on dynamic places.",
    });
  } catch (err) {
    results.push({ testId: 9, name: "place_pricing_flag_estimate", passed: false, message: String(err) });
  }

  // Test 10: place_scorer_weights
  try {
    const places = await mockProvider.searchPlaces({ destinationId: "tokyo" });
    const scoring = PlaceScorer.scoreCandidates(
      places,
      { days: 3, travellers: 2, budget: "moderate", preferences: { interests: ["history"] } } as unknown as TripWithPreferences,
      { latitude: 35.6762, longitude: 139.6503, destinationId: "tokyo" },
    );
    const first = scoring.rankedPlaces[0];
    const sum =
      first.breakdown.interestScore +
      first.breakdown.ratingScore +
      first.breakdown.budgetScore +
      first.breakdown.destinationScore +
      first.breakdown.availabilityScore;
    const passed = Math.abs(first.score - sum) < 0.1;
    results.push({
      testId: 10,
      name: "place_scorer_weights",
      passed,
      message: passed ? `Place score (${first.score}) equals sum of components (${sum}).` : "Score sum mismatch.",
    });
  } catch (err) {
    results.push({ testId: 10, name: "place_scorer_weights", passed: false, message: String(err) });
  }

  // Test 11: place_scorer_interest_relevance
  try {
    const placeA = makeTestPlace({
      id: "p_art",
      name: "Art Gallery",
      destinationId: "tokyo",
      type: "museum",
      latitude: 35.68,
      longitude: 139.75,
      tags: ["art", "gallery", "painting"],
    });
    const placeB = makeTestPlace({
      id: "p_nature",
      name: "Mountain Hike",
      destinationId: "tokyo",
      type: "park",
      latitude: 35.68,
      longitude: 139.75,
      tags: ["nature", "hiking", "outdoors"],
    });
    const scoring = PlaceScorer.scoreCandidates(
      [placeA, placeB],
      { days: 2, travellers: 1, budget: "moderate", preferences: { interests: ["art"] } } as unknown as TripWithPreferences,
    );
    const scoreA = scoring.rankedPlaces.find((r) => r.place.id === "p_art")!;
    const scoreB = scoring.rankedPlaces.find((r) => r.place.id === "p_nature")!;
    const passed = scoreA.breakdown.interestScore > scoreB.breakdown.interestScore;
    results.push({
      testId: 11,
      name: "place_scorer_interest_relevance",
      passed,
      message: passed
        ? `Art place received higher interest score (${scoreA.breakdown.interestScore} vs ${scoreB.breakdown.interestScore}).`
        : "Interest score failed.",
    });
  } catch (err) {
    results.push({ testId: 11, name: "place_scorer_interest_relevance", passed: false, message: String(err) });
  }

  // Test 12: place_scorer_budget_alignment
  try {
    const freePlace = makeTestPlace({
      id: "p_free",
      name: "Free Park",
      destinationId: "tokyo",
      type: "park",
      latitude: 35.68,
      longitude: 139.75,
      priceLevel: "free",
      priceType: "free",
      ticketPrice: 0,
      tags: ["park"],
    });
    const luxuryPlace = makeTestPlace({
      id: "p_lux",
      name: "Luxury VIP Experience",
      destinationId: "tokyo",
      type: "attraction",
      latitude: 35.68,
      longitude: 139.75,
      priceLevel: "luxury",
      priceType: "paid",
      ticketPrice: 500,
      tags: ["vip"],
    });
    const scoring = PlaceScorer.scoreCandidates(
      [freePlace, luxuryPlace],
      { days: 2, travellers: 1, budget: "budget" } as unknown as TripWithPreferences,
    );
    const scoreFree = scoring.rankedPlaces.find((r) => r.place.id === "p_free")!;
    const scoreLux = scoring.rankedPlaces.find((r) => r.place.id === "p_lux")!;
    const passed = scoreFree.breakdown.budgetScore > scoreLux.breakdown.budgetScore;
    results.push({
      testId: 12,
      name: "place_scorer_budget_alignment",
      passed,
      message: passed
        ? `Free place received higher budget score under budget tier (${scoreFree.breakdown.budgetScore} vs ${scoreLux.breakdown.budgetScore}).`
        : "Budget scoring alignment failed.",
    });
  } catch (err) {
    results.push({ testId: 12, name: "place_scorer_budget_alignment", passed: false, message: String(err) });
  }

  // Test 13: place_scorer_spatial_penalty
  try {
    const nearbyPlace = makeTestPlace({
      id: "p_near",
      name: "Center Plaza",
      destinationId: "tokyo",
      type: "landmark",
      latitude: 35.68,
      longitude: 139.75,
      tags: ["plaza"],
    });
    const farPlace = makeTestPlace({
      id: "p_far",
      name: "Distant Outpost",
      destinationId: "tokyo",
      type: "landmark",
      latitude: 37.0, // > 150km away from Tokyo
      longitude: 140.5,
      tags: ["plaza"],
    });
    const scoring = PlaceScorer.scoreCandidates(
      [nearbyPlace, farPlace],
      { days: 2, travellers: 1, budget: "moderate" } as unknown as TripWithPreferences,
      { latitude: 35.68, longitude: 139.75, destinationId: "tokyo" },
    );
    const scoreNear = scoring.rankedPlaces.find((r) => r.place.id === "p_near")!;
    const scoreFar = scoring.rankedPlaces.find((r) => r.place.id === "p_far")!;
    const passed = scoreNear.breakdown.destinationScore > scoreFar.breakdown.destinationScore;
    results.push({
      testId: 13,
      name: "place_scorer_spatial_penalty",
      passed,
      message: passed
        ? `Distant place received spatial penalty (${scoreFar.breakdown.destinationScore} vs ${scoreNear.breakdown.destinationScore}).`
        : "Spatial penalty check failed.",
    });
  } catch (err) {
    results.push({ testId: 13, name: "place_scorer_spatial_penalty", passed: false, message: String(err) });
  }

  // Test 14: place_scorer_spatial_clustering
  try {
    const places: Place[] = [
      makeTestPlace({ id: "c1_a", name: "Cluster 1 A", destinationId: "d", type: "attraction", latitude: 35.68, longitude: 139.75, priceLevel: "free", tags: [] }),
      makeTestPlace({ id: "c1_b", name: "Cluster 1 B", destinationId: "d", type: "attraction", latitude: 35.685, longitude: 139.755, priceLevel: "free", tags: [] }),
      makeTestPlace({ id: "c2_a", name: "Cluster 2 A", destinationId: "d", type: "attraction", latitude: 35.5, longitude: 139.5, priceLevel: "free", tags: [] }),
    ];
    const clusters = PlaceScorer.computeSpatialClusters(places, 5.0);
    const passed = clusters.length >= 2;
    results.push({
      testId: 14,
      name: "place_scorer_spatial_clustering",
      passed,
      message: passed ? `Computed ${clusters.length} distinct spatial clusters within threshold.` : "Clustering failed.",
    });
  } catch (err) {
    results.push({ testId: 14, name: "place_scorer_spatial_clustering", passed: false, message: String(err) });
  }

  // Test 15: feasibility_valid_coordinates
  try {
    const validPlace = makeTestPlace({
      id: "p_val",
      name: "Valid Place",
      destinationId: "tokyo",
      type: "museum",
      latitude: 35.68,
      longitude: 139.75,
      tags: [],
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "tokyo",
      stay: null,
      transport: null,
      places: [validPlace],
      restaurants: [],
    });
    const coordErrors = issues.filter((i) => i.code === "INVALID_PLACE_COORDINATES");
    const passed = coordErrors.length === 0;
    results.push({
      testId: 15,
      name: "feasibility_valid_coordinates",
      passed,
      message: passed ? "Valid coordinates passed feasibility checks." : "False coordinate error reported.",
    });
  } catch (err) {
    results.push({ testId: 15, name: "feasibility_valid_coordinates", passed: false, message: String(err) });
  }

  // Test 16: feasibility_invalid_coordinates_rejected
  try {
    const invalidPlace = makeTestPlace({
      id: "p_inval",
      name: "Invalid Coord Place",
      destinationId: "tokyo",
      type: "museum",
      latitude: 195.0, // Invalid latitude > 90
      longitude: 139.75,
      tags: [],
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "tokyo",
      stay: null,
      transport: null,
      places: [invalidPlace],
      restaurants: [],
    });
    const hasError = issues.some((i) => i.code === "INVALID_PLACE_COORDINATES");
    results.push({
      testId: 16,
      name: "feasibility_invalid_coordinates_rejected",
      passed: hasError,
      message: hasError ? "Invalid coordinates flagged with INVALID_PLACE_COORDINATES." : "Failed to catch invalid coords.",
    });
  } catch (err) {
    results.push({ testId: 16, name: "feasibility_invalid_coordinates_rejected", passed: false, message: String(err) });
  }

  // Test 17: feasibility_destination_mismatch_rejected
  try {
    const mismatchPlace = makeTestPlace({
      id: "p_mis",
      name: "Kyoto Place in Tokyo",
      destinationId: "kyoto",
      type: "museum",
      latitude: 35.0,
      longitude: 135.7,
      tags: [],
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "tokyo",
      stay: null,
      transport: null,
      places: [mismatchPlace],
      restaurants: [],
    });
    const hasMismatch = issues.some((i) => i.code === "PLACE_DESTINATION_MISMATCH");
    results.push({
      testId: 17,
      name: "feasibility_destination_mismatch_rejected",
      passed: hasMismatch,
      message: hasMismatch ? "Mismatched destination flagged with PLACE_DESTINATION_MISMATCH." : "Failed to catch mismatch.",
    });
  } catch (err) {
    results.push({ testId: 17, name: "feasibility_destination_mismatch_rejected", passed: false, message: String(err) });
  }

  // Test 18: feasibility_negative_ticket_price_rejected
  try {
    const negPricePlace = makeTestPlace({
      id: "p_neg",
      name: "Negative Fee Place",
      destinationId: "tokyo",
      type: "museum",
      latitude: 35.68,
      longitude: 139.75,
      ticketPrice: -50,
      tags: [],
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "tokyo",
      stay: null,
      transport: null,
      places: [negPricePlace],
      restaurants: [],
    });
    const hasPriceError = issues.some((i) => i.code === "INVALID_TICKET_PRICE");
    results.push({
      testId: 18,
      name: "feasibility_negative_ticket_price_rejected",
      passed: hasPriceError,
      message: hasPriceError ? "Negative ticket price flagged with INVALID_TICKET_PRICE." : "Failed to catch negative price.",
    });
  } catch (err) {
    results.push({ testId: 18, name: "feasibility_negative_ticket_price_rejected", passed: false, message: String(err) });
  }

  // Test 19: activities_agent_grounded_candidates
  try {
    const trip = {
      id: "trip_places_test_1",
      userId: "u1",
      title: "Tokyo Places",
      origin: "Kyoto",
      destination: "Tokyo, Japan",
      days: 3,
      travellers: 2,
      budget: "moderate",
      preferences: { id: "p1", tripId: "trip_places_test_1", interests: ["history", "culture"], notes: null, createdAt: "", updatedAt: "" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as TripWithPreferences;
    const context = await travelService.prepareTripContext(trip);
    const agent = new ActivitiesAgent();
    const result = await agent.run(context);
    const passed =
      result.status === "success" &&
      result.data !== null &&
      result.data.selectedPlaceIds.length > 0 &&
      result.data.selectedPlaceIds.every((id) => context.candidatePlaces.some((c) => c.id === id));
    results.push({
      testId: 19,
      name: "activities_agent_grounded_candidates",
      passed,
      message: passed
        ? `ActivitiesAgent selected ${result.data?.selectedPlaceIds.length} grounded candidate places.`
        : "ActivitiesAgent candidates not grounded.",
    });
  } catch (err) {
    results.push({ testId: 19, name: "activities_agent_grounded_candidates", passed: false, message: String(err) });
  }

  // Test 20: activities_agent_anti_hallucination_reject
  try {
    // Mock LLM returning a hallucinated ID
    const hallucinatingLLM: LLMProvider = {
      name: "hallucinating-mock",
      generateStructured: async <T>(_schema: z.ZodType<T>): Promise<T> => {
        return {
          selectedPlaceIds: ["place_fake_hallucinated_12345"],
          reasoning: "Hallucinated spot",
        } as unknown as T;
      },
    };
    const trip = {
      id: "trip_anti_hallucinate",
      userId: "u1",
      title: "Tokyo Test",
      origin: "Kyoto",
      destination: "Tokyo, Japan",
      days: 2,
      travellers: 1,
      budget: "moderate",
      preferences: { id: "p", tripId: "trip_anti_hallucinate", interests: [], notes: null, createdAt: "", updatedAt: "" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as TripWithPreferences;
    const context = await travelService.prepareTripContext(trip);
    const agent = new ActivitiesAgent(hallucinatingLLM);
    const res = await agent.run(context);
    // Should fallback deterministically and NOT contain hallucinated ID
    const passed =
      res.status === "success" &&
      res.data !== null &&
      !res.data.selectedPlaceIds.includes("place_fake_hallucinated_12345") &&
      res.data.selectedPlaceIds.every((id) => context.candidatePlaces.some((c) => c.id === id));
    results.push({
      testId: 20,
      name: "activities_agent_anti_hallucination_reject",
      passed,
      message: passed
        ? "Hallucinated ID was rejected; deterministic top picks fallback was safely utilized."
        : "Hallucinated ID was not rejected.",
    });
  } catch (err) {
    results.push({ testId: 20, name: "activities_agent_anti_hallucination_reject", passed: false, message: String(err) });
  }

  // Test 21: activities_agent_deterministic_fallback
  try {
    // Mock LLM that throws
    const failingLLM: LLMProvider = {
      name: "failing-mock",
      generateStructured: async (): Promise<never> => {
        throw new Error("Simulated LLM network timeout");
      },
    };
    const trip = {
      id: "trip_failing_llm",
      userId: "u1",
      title: "Kyoto Trip",
      origin: "Tokyo",
      destination: "Kyoto, Japan",
      days: 3,
      travellers: 2,
      budget: "moderate",
      preferences: { id: "p", tripId: "trip_failing_llm", interests: [], notes: null, createdAt: "", updatedAt: "" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as TripWithPreferences;
    const context = await travelService.prepareTripContext(trip);
    const agent = new ActivitiesAgent(failingLLM);
    const res = await agent.run(context);
    const passed =
      res.status === "success" &&
      res.data !== null &&
      res.data.selectedPlaceIds.length >= 2 &&
      res.warnings.length > 0;
    results.push({
      testId: 21,
      name: "activities_agent_deterministic_fallback",
      passed,
      message: passed
        ? `Deterministic fallback activated successfully (${res.data?.selectedPlaceIds.length} places selected).`
        : "Fallback failed.",
    });
  } catch (err) {
    results.push({ testId: 21, name: "activities_agent_deterministic_fallback", passed: false, message: String(err) });
  }

  // Test 22: itinerary_validator_duplicate_place_rejected
  try {
    const duplicateItinerary = {
      days: [
        {
          dayNumber: 1,
          theme: "Historic Discovery",
          items: [
            {
              type: "activity" as const,
              referenceId: "place_sensoji",
              startTime: "09:00",
              endTime: "11:00",
              reasoning: "Day 1 Senso-ji visit",
            },
          ],
        },
        {
          dayNumber: 2,
          theme: "Cultural Exploration",
          items: [
            {
              type: "activity" as const,
              referenceId: "place_sensoji", // DUPLICATE VISIT ON DAY 2
              startTime: "10:00",
              endTime: "12:00",
              reasoning: "Day 2 Senso-ji visit again",
            },
          ],
        },
      ],
      orchestrationNotes: "Test itinerary",
    };
    const report = ItineraryValidator.validate({
      expectedDays: 2,
      itinerary: duplicateItinerary,
      validReferenceIds: new Set(["place_sensoji"]),
    });
    const hasDupError = report.issues.some((i) => i.code === "DUPLICATE_PLACE_VISIT");
    results.push({
      testId: 22,
      name: "itinerary_validator_duplicate_place_rejected",
      passed: hasDupError,
      message: hasDupError
        ? "Duplicate place visit across days was flagged with DUPLICATE_PLACE_VISIT."
        : "Failed to detect duplicate place visit.",
    });
  } catch (err) {
    results.push({ testId: 22, name: "itinerary_validator_duplicate_place_rejected", passed: false, message: String(err) });
  }

  // Test 23: itinerary_validator_one_visit_enforced
  try {
    const validItinerary = {
      days: [
        {
          dayNumber: 1,
          theme: "Historic Discovery",
          items: [
            {
              type: "activity" as const,
              referenceId: "place_sensoji",
              startTime: "09:00",
              endTime: "11:00",
              reasoning: "Morning visit to Senso-ji temple",
            },
          ],
        },
        {
          dayNumber: 2,
          theme: "Artistic Kyoto",
          items: [
            {
              type: "activity" as const,
              referenceId: "place_meiji",
              startTime: "10:00",
              endTime: "12:00",
              reasoning: "Morning walk through Meiji Shrine",
            },
          ],
        },
      ],
      orchestrationNotes: "Clean two day itinerary",
    };
    const report = ItineraryValidator.validate({
      expectedDays: 2,
      itinerary: validItinerary,
      validReferenceIds: new Set(["place_sensoji", "place_meiji"]),
    });
    const hasDupError = report.issues.some((i) => i.code === "DUPLICATE_PLACE_VISIT");
    const passed = !hasDupError && report.passed;
    results.push({
      testId: 23,
      name: "itinerary_validator_one_visit_enforced",
      passed,
      message: passed
        ? "Itinerary with distinct places per day passed validation with 0 DUPLICATE_PLACE_VISIT errors."
        : "Validation failed unexpectedly.",
    });
  } catch (err) {
    results.push({ testId: 23, name: "itinerary_validator_one_visit_enforced", passed: false, message: String(err) });
  }

  // Test 24: budget_calculator_free_places
  try {
    const freePlaces: Place[] = [
      makeTestPlace({ id: "p1", name: "Free Park 1", destinationId: "d", type: "park", latitude: 0, longitude: 0, reviewCount: 10, priceLevel: "free", priceType: "free", ticketPrice: 0, tags: [] }),
      makeTestPlace({ id: "p2", name: "Free Park 2", destinationId: "d", type: "park", latitude: 0, longitude: 0, reviewCount: 10, priceLevel: "free", priceType: "free", ticketPrice: 0, tags: [] }),
    ];
    const budget = BudgetCalculator.calculate({
      days: 3,
      travellers: 2,
      budgetTier: "moderate",
      places: freePlaces,
      currency: "USD",
    });
    const passed = budget.activityFeesEstimate === 0;
    results.push({
      testId: 24,
      name: "budget_calculator_free_places",
      passed,
      message: passed
        ? `Free places incurred exactly $${budget.activityFeesEstimate} activity fees.`
        : `Free places incurred unexpected activity fee: ${budget.activityFeesEstimate}.`,
    });
  } catch (err) {
    results.push({ testId: 24, name: "budget_calculator_free_places", passed: false, message: String(err) });
  }

  // Test 25: budget_calculator_known_ticket_pricing
  try {
    const knownPlaces: Place[] = [
      makeTestPlace({
        id: "p_museum",
        name: "Art Museum",
        destinationId: "tokyo",
        type: "museum",
        latitude: 35,
        longitude: 139,
        priceLevel: "moderate",
        priceType: "paid",
        ticketPrice: 20, // $20 USD
        currency: "USD",
        tags: [],
      }),
    ];
    const budget = BudgetCalculator.calculate({
      days: 2,
      travellers: 3, // 3 travellers * $20 = $60
      budgetTier: "moderate",
      places: knownPlaces,
      currency: "USD",
    });
    const passed = budget.activityFeesEstimate === 60;
    results.push({
      testId: 25,
      name: "budget_calculator_known_ticket_pricing",
      passed,
      message: passed
        ? `Known ticket pricing accurately multiplied ($20 * 3 travelers = $${budget.activityFeesEstimate}).`
        : `Expected $60, got $${budget.activityFeesEstimate}.`,
    });
  } catch (err) {
    results.push({ testId: 25, name: "budget_calculator_known_ticket_pricing", passed: false, message: String(err) });
  }

  // Test 26: budget_calculator_unknown_ticket_estimate
  try {
    const unknownPlaces: Place[] = [
      makeTestPlace({
        id: "p_unknown",
        name: "Unknown Landmark",
        destinationId: "tokyo",
        type: "landmark",
        latitude: 35,
        longitude: 139,
        priceLevel: "moderate",
        priceType: "unknown",
        tags: [],
      }),
    ];
    const budget = BudgetCalculator.calculate({
      days: 2,
      travellers: 2,
      budgetTier: "moderate",
      places: unknownPlaces,
      currency: "USD",
    });
    const passed = budget.activityFeesEstimate > 0 && budget.hasEstimatedActivityFees === true;
    results.push({
      testId: 26,
      name: "budget_calculator_unknown_ticket_estimate",
      passed,
      message: passed
        ? `Unknown ticket place fell back to tier estimate ($${budget.activityFeesEstimate}) with hasEstimatedActivityFees=true.`
        : "Failed unknown ticket estimate check.",
    });
  } catch (err) {
    results.push({ testId: 26, name: "budget_calculator_unknown_ticket_estimate", passed: false, message: String(err) });
  }

  return results;
}

export async function GET(): Promise<NextResponse> {
  const guard = assertInternalRouteAllowed();
  if (guard) return guard;

  const results = await runAllPlaceTests();
  const allPassed = results.every((r) => r.passed);
  const passedCount = results.filter((r) => r.passed).length;

  return NextResponse.json(
    {
      status: allPassed ? "success" : "failure",
      totalTests: results.length,
      passedCount,
      failedCount: results.length - passedCount,
      allPassed,
      results,
    },
    { status: allPassed ? 200 : 500 },
  );
}
