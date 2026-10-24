/**
 * @file src/app/api/internal/food-test/route.ts
 *
 * Automated verification test suite for Phase 10.3:
 * Food Intelligence Foundation.
 *
 * Covers 26 required verification scenarios:
 * 1. candidate_retrieval_static: Static fixture retrieval for known destinations
 * 2. candidate_retrieval_dynamic: Dynamic restaurant generation for arbitrary destinations
 * 3. restaurant_coordinates_realistic: Dynamic coordinates close to destination center
 * 4. restaurant_opening_hours_structure: Opening hours presence and format
 * 5. restaurant_meal_types_structure: Populated mealTypes (breakfast, lunch, dinner, cafe)
 * 6. restaurant_pricing_free_distinction: Free dining has priceType="free" and averagePricePerPerson=0
 * 7. restaurant_pricing_paid_distinction: Paid dining has averagePricePerPerson > 0 and priceType in ("budget", "moderate", "premium")
 * 8. restaurant_pricing_unknown_distinction: Unknown dining has priceType="unknown" and averagePricePerPerson=null (not 0)
 * 9. restaurant_pricing_flag_estimate: Dynamic restaurants flagged with isPriceEstimate=true
 * 10. food_scorer_weights_sum: FoodScorer breakdown sums correctly to final score
 * 11. food_scorer_cuisine_relevance: Cuisine match scores higher than non-match
 * 12. food_scorer_budget_alignment: Budget tier awards highest points to matching price levels
 * 13. food_scorer_geographic_proximity: Proximity (<2km) scores higher than distant (>15km)
 * 14. food_scorer_meal_compatibility: Explicit mealTypes award compatibility points
 * 15. feasibility_valid_restaurant_coordinates: Valid coordinates pass feasibility check
 * 16. feasibility_invalid_coordinates_rejected: Invalid latitude/longitude rejected with INVALID_RESTAURANT_COORDINATES
 * 17. feasibility_destination_mismatch_rejected: Destination mismatch rejected with RESTAURANT_DESTINATION_MISMATCH
 * 18. feasibility_negative_price_rejected: Negative average price rejected with INVALID_RESTAURANT_PRICE
 * 19. food_agent_grounded_candidates: FoodAgent produces grounded candidate selection
 * 20. food_agent_anti_hallucination_reject: Hallucinated ID rejected with deterministic fallback
 * 21. food_agent_deterministic_fallback: LLM failure triggers deterministic top picks
 * 22. itinerary_validator_duplicate_restaurant_same_day_rejected: Repeating same restaurant on same day rejected when alternatives exist
 * 23. itinerary_validator_distinct_restaurants_passed: Distinct restaurants on same day passes validation
 * 24. budget_calculator_free_dining: Free dining incurs 0 cost
 * 25. budget_calculator_known_dining_pricing: Known dining prices properly converted & multiplied by travellers
 * 26. budget_calculator_unknown_dining_estimate: Unknown dining prices fallback to tier baseline with estimate flag
 */

import { NextResponse } from "next/server";
import { assertInternalRouteAllowed } from "@/lib/security/internal-guard";
import { MockFoodProvider } from "@/lib/travel/providers/mock/mock-food-provider";
import { FoodScorer } from "@/lib/agents/food/scoring";
import { FoodAgent } from "@/lib/agents/food/food-agent";
import { FeasibilityEngine } from "@/lib/agents/validator/feasibility-engine";
import { ItineraryValidator } from "@/lib/agents/validator/itinerary-validator";
import { BudgetCalculator } from "@/lib/agents/budget/budget-calculator";
import { Restaurant, travelService } from "@/lib/travel";
import { TripWithPreferences } from "@/features/trips/types";
import { LLMProvider } from "@/lib/ai/types";
import { z } from "zod";

export interface FoodTestCaseResult {
  testId: number;
  name: string;
  passed: boolean;
  message?: string;
  details?: unknown;
}

function makeTestRestaurant(
  partial: Partial<Restaurant> & {
    id: string;
    name: string;
    destinationId: string;
    latitude: number;
    longitude: number;
  },
): Restaurant {
  return {
    cuisine: ["Regional"],
    priceLevel: "moderate",
    rating: 4.6,
    reviewCount: 500,
    address: "Culinary Boulevard",
    openingHours: { text: "12:00 - 23:00 daily" },
    tags: ["Food & Wine"],
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

export async function runAllFoodTests(): Promise<FoodTestCaseResult[]> {
  const results: FoodTestCaseResult[] = [];
  const mockProvider = new MockFoodProvider();

  // Test 1: candidate_retrieval_static
  try {
    const restaurants = await mockProvider.searchRestaurants({ destinationId: "tokyo" });
    const passed = restaurants.length > 0 && restaurants.some((r) => r.id === "rest_ginza_kyubey");
    results.push({
      testId: 1,
      name: "candidate_retrieval_static",
      passed,
      message: passed ? `Retrieved ${restaurants.length} static restaurants for Tokyo.` : "Failed to retrieve Tokyo restaurants.",
    });
  } catch (err) {
    results.push({ testId: 1, name: "candidate_retrieval_static", passed: false, message: String(err) });
  }

  // Test 2: candidate_retrieval_dynamic
  try {
    const dynamicRestaurants = await mockProvider.searchRestaurants({ destinationId: "dest_reykjavik" });
    const passed = dynamicRestaurants.length >= 6 && dynamicRestaurants.every((r) => r.id.startsWith("dyn_res_dest_reykjavik_"));
    results.push({
      testId: 2,
      name: "candidate_retrieval_dynamic",
      passed,
      message: passed ? `Generated ${dynamicRestaurants.length} dynamic restaurants for arbitrary destination.` : "Failed dynamic restaurant generation.",
    });
  } catch (err) {
    results.push({ testId: 2, name: "candidate_retrieval_dynamic", passed: false, message: String(err) });
  }

  // Test 3: restaurant_coordinates_realistic
  try {
    const centerLat = 52.3676;
    const centerLng = 4.9041;
    const amsterdamRestaurants = await mockProvider.searchRestaurants({
      destinationId: "amsterdam",
      latitude: centerLat,
      longitude: centerLng,
    });
    const passed =
      amsterdamRestaurants.length > 0 &&
      amsterdamRestaurants.every(
        (r) => Math.abs(r.latitude - centerLat) < 0.05 && Math.abs(r.longitude - centerLng) < 0.05,
      );
    results.push({
      testId: 3,
      name: "restaurant_coordinates_realistic",
      passed,
      message: passed
        ? "Dynamic restaurants generated within 0.05 degrees of destination center."
        : "Dynamic restaurant coordinates deviated from destination center.",
    });
  } catch (err) {
    results.push({ testId: 3, name: "restaurant_coordinates_realistic", passed: false, message: String(err) });
  }

  // Test 4: restaurant_opening_hours_structure
  try {
    const restaurants = await mockProvider.searchRestaurants({ destinationId: "tokyo" });
    const passed = restaurants.every((r) => r.openingHours && typeof r.openingHours === "object");
    results.push({
      testId: 4,
      name: "restaurant_opening_hours_structure",
      passed,
      message: passed ? "All candidate restaurants have structured opening hours." : "Missing opening hours structure.",
    });
  } catch (err) {
    results.push({ testId: 4, name: "restaurant_opening_hours_structure", passed: false, message: String(err) });
  }

  // Test 5: restaurant_meal_types_structure
  try {
    const restaurants = await mockProvider.searchRestaurants({ destinationId: "tokyo" });
    const passed = restaurants.some((r) => r.mealTypes && r.mealTypes.length > 0 && r.mealTypes.includes("dinner"));
    results.push({
      testId: 5,
      name: "restaurant_meal_types_structure",
      passed,
      message: passed ? "Candidate restaurants contain structured mealTypes." : "Missing mealTypes structure.",
    });
  } catch (err) {
    results.push({ testId: 5, name: "restaurant_meal_types_structure", passed: false, message: String(err) });
  }

  // Test 6: restaurant_pricing_free_distinction
  try {
    const kyotoRestaurants = await mockProvider.searchRestaurants({ destinationId: "kyoto" });
    const freeSpot = kyotoRestaurants.find((r) => r.priceType === "free");
    const passed = !!freeSpot && freeSpot.averagePricePerPerson === 0;
    results.push({
      testId: 6,
      name: "restaurant_pricing_free_distinction",
      passed,
      message: passed
        ? `Free dining spot verified: "${freeSpot?.name}" with averagePricePerPerson=0.`
        : "Failed to identify free dining spot with averagePricePerPerson=0.",
    });
  } catch (err) {
    results.push({ testId: 6, name: "restaurant_pricing_free_distinction", passed: false, message: String(err) });
  }

  // Test 7: restaurant_pricing_paid_distinction
  try {
    const tokyoRestaurants = await mockProvider.searchRestaurants({ destinationId: "tokyo" });
    const paidSpot = tokyoRestaurants.find((r) => r.priceType === "premium" && typeof r.averagePricePerPerson === "number");
    const passed = !!paidSpot && (paidSpot.averagePricePerPerson ?? 0) > 0;
    results.push({
      testId: 7,
      name: "restaurant_pricing_paid_distinction",
      passed,
      message: passed
        ? `Paid dining verified: "${paidSpot?.name}" with price ${paidSpot?.currency} ${paidSpot?.averagePricePerPerson}.`
        : "Failed to identify paid dining spot with averagePricePerPerson > 0.",
    });
  } catch (err) {
    results.push({ testId: 7, name: "restaurant_pricing_paid_distinction", passed: false, message: String(err) });
  }

  // Test 8: restaurant_pricing_unknown_distinction
  try {
    const dynRestaurants = await mockProvider.searchRestaurants({ destinationId: "dest_zurich" });
    const unknownSpot = dynRestaurants.find((r) => r.priceType === "unknown");
    const passed = !!unknownSpot && unknownSpot.averagePricePerPerson === null;
    results.push({
      testId: 8,
      name: "restaurant_pricing_unknown_distinction",
      passed,
      message: passed
        ? `Zero fake pricing verified: unknown spot "${unknownSpot?.name}" has averagePricePerPerson=null (not 0).`
        : "Unknown price spot was improperly formatted or defaulted to 0.",
    });
  } catch (err) {
    results.push({ testId: 8, name: "restaurant_pricing_unknown_distinction", passed: false, message: String(err) });
  }

  // Test 9: restaurant_pricing_flag_estimate
  try {
    const dynRestaurants = await mockProvider.searchRestaurants({ destinationId: "dest_seoul" });
    const paidDyn = dynRestaurants.find((r) => r.priceType === "premium" || r.priceType === "budget");
    const passed = !!paidDyn && paidDyn.isPriceEstimate === true;
    results.push({
      testId: 9,
      name: "restaurant_pricing_flag_estimate",
      passed,
      message: passed
        ? `Dynamic restaurant "${paidDyn?.name}" correctly flagged with isPriceEstimate=true.`
        : "Dynamic restaurant failed to flag isPriceEstimate=true.",
    });
  } catch (err) {
    results.push({ testId: 9, name: "restaurant_pricing_flag_estimate", passed: false, message: String(err) });
  }

  // Test 10: food_scorer_weights_sum
  try {
    const testRes = makeTestRestaurant({
      id: "res_weight_test",
      name: "Weights Bistro",
      destinationId: "tokyo",
      latitude: 35.6762,
      longitude: 139.6503,
      mealTypes: ["lunch", "dinner"],
      priceLevel: "moderate",
      rating: 4.8,
      reviewCount: 1200,
    });
    const result = FoodScorer.scoreCandidates([testRes], null, { latitude: 35.6762, longitude: 139.6503 });
    const scored = result.rankedRestaurants[0];
    const b = scored.scoreBreakdown;
    const computedSum = Number((b.cuisineScore + b.budgetScore + b.geographicScore + b.mealTypeScore + b.availabilityScore + b.qualityScore).toFixed(1));
    const passed = Math.abs(scored.score - computedSum) < 0.05 && scored.score <= 100;
    results.push({
      testId: 10,
      name: "food_scorer_weights_sum",
      passed,
      message: passed
        ? `Scorer breakdown sum (${computedSum}) matches final score (${scored.score}).`
        : `Sum mismatch: breakdown=${computedSum}, score=${scored.score}.`,
    });
  } catch (err) {
    results.push({ testId: 10, name: "food_scorer_weights_sum", passed: false, message: String(err) });
  }

  // Test 11: food_scorer_cuisine_relevance
  try {
    const seafoodRes = makeTestRestaurant({
      id: "res_sea",
      name: "Harbor Seafood Catch",
      destinationId: "goa",
      cuisine: ["Seafood", "Coastal"],
      latitude: 15.2,
      longitude: 73.9,
    });
    const bakeryRes = makeTestRestaurant({
      id: "res_bakery",
      name: "Highland Confectionery",
      destinationId: "goa",
      cuisine: ["Bakery", "High Tea"],
      latitude: 15.2,
      longitude: 73.9,
    });
    const mockTrip: TripWithPreferences = {
      id: "trip_test",
      userId: "u1",
      destination: "Goa",
      days: 3,
      budget: "moderate",
      travellers: 2,
      preferences: { interests: ["Seafood", "Food & Wine"] },
    } as unknown as TripWithPreferences;
    const result = FoodScorer.scoreCandidates([seafoodRes, bakeryRes], mockTrip, { latitude: 15.2, longitude: 73.9 });
    const seaScore = result.rankedRestaurants.find((r) => r.restaurant.id === "res_sea")?.scoreBreakdown.cuisineScore || 0;
    const bakScore = result.rankedRestaurants.find((r) => r.restaurant.id === "res_bakery")?.scoreBreakdown.cuisineScore || 0;
    const passed = seaScore > bakScore;
    results.push({
      testId: 11,
      name: "food_scorer_cuisine_relevance",
      passed,
      message: passed
        ? `Seafood cuisine score (${seaScore}) exceeded non-matching bakery score (${bakScore}).`
        : `Cuisine score failed: sea=${seaScore}, bak=${bakScore}.`,
    });
  } catch (err) {
    results.push({ testId: 11, name: "food_scorer_cuisine_relevance", passed: false, message: String(err) });
  }

  // Test 12: food_scorer_budget_alignment
  try {
    const budgetRes = makeTestRestaurant({
      id: "res_bud",
      name: "Local Street Stall",
      destinationId: "delhi",
      priceLevel: "budget",
      priceType: "budget",
      latitude: 28.6,
      longitude: 77.2,
    });
    const luxuryRes = makeTestRestaurant({
      id: "res_lux",
      name: "Royal Palace Silver Dining",
      destinationId: "delhi",
      priceLevel: "luxury",
      priceType: "premium",
      latitude: 28.6,
      longitude: 77.2,
    });
    const budgetTrip: TripWithPreferences = {
      id: "trip_bud",
      userId: "u1",
      destination: "Delhi",
      days: 2,
      budget: "budget",
      travellers: 1,
    } as unknown as TripWithPreferences;
    const result = FoodScorer.scoreCandidates([budgetRes, luxuryRes], budgetTrip, { latitude: 28.6, longitude: 77.2 });
    const budBudgetScore = result.rankedRestaurants.find((r) => r.restaurant.id === "res_bud")?.scoreBreakdown.budgetScore || 0;
    const luxBudgetScore = result.rankedRestaurants.find((r) => r.restaurant.id === "res_lux")?.scoreBreakdown.budgetScore || 0;
    const passed = budBudgetScore > luxBudgetScore;
    results.push({
      testId: 12,
      name: "food_scorer_budget_alignment",
      passed,
      message: passed
        ? `Budget tier correctly prioritized budget dining (${budBudgetScore} vs ${luxBudgetScore}).`
        : "Budget scoring failed to prioritize matching tier.",
    });
  } catch (err) {
    results.push({ testId: 12, name: "food_scorer_budget_alignment", passed: false, message: String(err) });
  }

  // Test 13: food_scorer_geographic_proximity
  try {
    const nearRes = makeTestRestaurant({
      id: "res_near",
      name: "Next Door Cafe",
      destinationId: "tokyo",
      latitude: 35.6762,
      longitude: 139.6503, // 0 km from anchor
    });
    const farRes = makeTestRestaurant({
      id: "res_far",
      name: "Distant Outpost Diner",
      destinationId: "tokyo",
      latitude: 35.45,
      longitude: 139.6503, // ~25 km away
    });
    const result = FoodScorer.scoreCandidates([nearRes, farRes], null, { latitude: 35.6762, longitude: 139.6503 });
    const nearGeo = result.rankedRestaurants.find((r) => r.restaurant.id === "res_near")?.scoreBreakdown.geographicScore || 0;
    const farGeo = result.rankedRestaurants.find((r) => r.restaurant.id === "res_far")?.scoreBreakdown.geographicScore || 0;
    const passed = nearGeo === 20 && nearGeo > farGeo;
    results.push({
      testId: 13,
      name: "food_scorer_geographic_proximity",
      passed,
      message: passed
        ? `Nearby restaurant awarded max geo score (20 vs ${farGeo}).`
        : `Geographic proximity scoring failed: near=${nearGeo}, far=${farGeo}.`,
    });
  } catch (err) {
    results.push({ testId: 13, name: "food_scorer_geographic_proximity", passed: false, message: String(err) });
  }

  // Test 14: food_scorer_meal_compatibility
  try {
    const fullMealRes = makeTestRestaurant({
      id: "res_full",
      name: "Complete Course Bistro",
      destinationId: "tokyo",
      mealTypes: ["lunch", "dinner"],
      latitude: 35.6762,
      longitude: 139.6503,
    });
    const noMealRes = makeTestRestaurant({
      id: "res_none",
      name: "Unspecified Kiosk",
      destinationId: "tokyo",
      mealTypes: [],
      latitude: 35.6762,
      longitude: 139.6503,
    });
    const result = FoodScorer.scoreCandidates([fullMealRes, noMealRes], null, null);
    const fullScore = result.rankedRestaurants.find((r) => r.restaurant.id === "res_full")?.scoreBreakdown.mealTypeScore || 0;
    const noneScore = result.rankedRestaurants.find((r) => r.restaurant.id === "res_none")?.scoreBreakdown.mealTypeScore || 0;
    const passed = fullScore === 10 && fullScore > noneScore;
    results.push({
      testId: 14,
      name: "food_scorer_meal_compatibility",
      passed,
      message: passed
        ? `Meal compatibility awarded full points to lunch/dinner restaurant (${fullScore} vs ${noneScore}).`
        : `Meal compatibility score failed: full=${fullScore}, none=${noneScore}.`,
    });
  } catch (err) {
    results.push({ testId: 14, name: "food_scorer_meal_compatibility", passed: false, message: String(err) });
  }

  // Test 15: feasibility_valid_restaurant_coordinates
  try {
    const validRes = makeTestRestaurant({
      id: "res_v",
      name: "Valid Restaurant",
      destinationId: "dest_tokyo",
      latitude: 35.6895,
      longitude: 139.6917,
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "dest_tokyo",
      stay: null,
      transport: null,
      places: [],
      restaurants: [validRes],
    });
    const passed = issues.filter((i) => i.severity === "error").length === 0;
    results.push({
      testId: 15,
      name: "feasibility_valid_restaurant_coordinates",
      passed,
      message: passed ? "Valid restaurant coordinates passed feasibility check." : "Valid restaurant failed feasibility.",
    });
  } catch (err) {
    results.push({ testId: 15, name: "feasibility_valid_restaurant_coordinates", passed: false, message: String(err) });
  }

  // Test 16: feasibility_invalid_coordinates_rejected
  try {
    const invalidRes = makeTestRestaurant({
      id: "res_inv",
      name: "Invalid Coordinates Diner",
      destinationId: "dest_tokyo",
      latitude: 145.0, // Invalid latitude > 90
      longitude: 139.6917,
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "dest_tokyo",
      stay: null,
      transport: null,
      places: [],
      restaurants: [invalidRes],
    });
    const passed = issues.some((i) => i.code === "INVALID_RESTAURANT_COORDINATES");
    results.push({
      testId: 16,
      name: "feasibility_invalid_coordinates_rejected",
      passed,
      message: passed
        ? "FeasibilityEngine correctly rejected out-of-bounds latitude with INVALID_RESTAURANT_COORDINATES."
        : "Failed to reject invalid coordinates.",
    });
  } catch (err) {
    results.push({ testId: 16, name: "feasibility_invalid_coordinates_rejected", passed: false, message: String(err) });
  }

  // Test 17: feasibility_destination_mismatch_rejected
  try {
    const mismatchRes = makeTestRestaurant({
      id: "res_paris_in_tokyo",
      name: "Paris Bistro",
      destinationId: "dest_paris",
      latitude: 48.8566,
      longitude: 2.3522,
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "dest_tokyo",
      stay: null,
      transport: null,
      places: [],
      restaurants: [mismatchRes],
    });
    const passed = issues.some((i) => i.code === "RESTAURANT_DESTINATION_MISMATCH");
    results.push({
      testId: 17,
      name: "feasibility_destination_mismatch_rejected",
      passed,
      message: passed
        ? "FeasibilityEngine correctly caught RESTAURANT_DESTINATION_MISMATCH."
        : "Failed to catch destination mismatch.",
    });
  } catch (err) {
    results.push({ testId: 17, name: "feasibility_destination_mismatch_rejected", passed: false, message: String(err) });
  }

  // Test 18: feasibility_negative_price_rejected
  try {
    const negPriceRes = makeTestRestaurant({
      id: "res_neg",
      name: "Negative Price Grill",
      destinationId: "dest_tokyo",
      latitude: 35.6895,
      longitude: 139.6917,
      averagePricePerPerson: -500,
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "dest_tokyo",
      stay: null,
      transport: null,
      places: [],
      restaurants: [negPriceRes],
    });
    const passed = issues.some((i) => i.code === "INVALID_RESTAURANT_PRICE");
    results.push({
      testId: 18,
      name: "feasibility_negative_price_rejected",
      passed,
      message: passed
        ? "FeasibilityEngine correctly rejected negative dining price with INVALID_RESTAURANT_PRICE."
        : "Failed to reject negative dining price.",
    });
  } catch (err) {
    results.push({ testId: 18, name: "feasibility_negative_price_rejected", passed: false, message: String(err) });
  }

  // Test 19: food_agent_grounded_candidates
  try {
    const trip = {
      id: "trip_food_test_1",
      userId: "u1",
      title: "Tokyo Dining",
      origin: "Kyoto",
      destination: "Tokyo, Japan",
      days: 3,
      travellers: 2,
      budget: "moderate",
      preferences: { id: "p1", tripId: "trip_food_test_1", interests: ["Food & Wine"], notes: null, createdAt: "", updatedAt: "" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as TripWithPreferences;
    const context = await travelService.prepareTripContext(trip);
    const agent = new FoodAgent();
    const agentRes = await agent.run(context);
    const passed =
      agentRes.status === "success" &&
      !!agentRes.data &&
      agentRes.data.selectedRestaurantIds.length > 0 &&
      agentRes.data.selectedRestaurantIds.every((id) => context.candidateRestaurants.some((c) => c.id === id));
    results.push({
      testId: 19,
      name: "food_agent_grounded_candidates",
      passed,
      message: passed
        ? `FoodAgent selected ${agentRes.data?.selectedRestaurantIds.length} grounded restaurants from candidate pool.`
        : "FoodAgent failed grounded candidate selection.",
    });
  } catch (err) {
    results.push({ testId: 19, name: "food_agent_grounded_candidates", passed: false, message: String(err) });
  }

  // Test 20: food_agent_anti_hallucination_reject
  try {
    // Mock LLM that returns a hallucinated restaurant ID
    const hallucinatingLLM: LLMProvider = {
      name: "hallucinating-mock",
      generateStructured: async <T>(_schema: z.ZodType<T>): Promise<T> => {
        return {
          selectedRestaurantIds: ["hallucinated_tokyo_bistro_999"],
          reasoning: "Hallucinated restaurant selection",
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
    const agent = new FoodAgent(hallucinatingLLM);
    const agentRes = await agent.run(context);
    const passed =
      agentRes.status === "success" &&
      !!agentRes.data &&
      !agentRes.data.selectedRestaurantIds.includes("hallucinated_tokyo_bistro_999") &&
      agentRes.data.selectedRestaurantIds.every((id) => context.candidateRestaurants.some((c) => c.id === id));
    results.push({
      testId: 20,
      name: "food_agent_anti_hallucination_reject",
      passed,
      message: passed
        ? "FoodAgent detected hallucinated restaurant ID and safely reverted to deterministic picks."
        : "FoodAgent permitted hallucinated restaurant ID.",
    });
  } catch (err) {
    results.push({ testId: 20, name: "food_agent_anti_hallucination_reject", passed: false, message: String(err) });
  }

  // Test 21: food_agent_deterministic_fallback
  try {
    const failingLLM: LLMProvider = {
      name: "failing-mock",
      generateStructured: async (): Promise<never> => {
        throw new Error("Simulated LLM Provider Timeout / API Down");
      },
    };
    const trip = {
      id: "trip_failing_llm",
      userId: "u1",
      title: "Tokyo Trip",
      origin: "Kyoto",
      destination: "Tokyo, Japan",
      days: 2,
      travellers: 2,
      budget: "moderate",
      preferences: { id: "p", tripId: "trip_failing_llm", interests: [], notes: null, createdAt: "", updatedAt: "" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as TripWithPreferences;
    const context = await travelService.prepareTripContext(trip);
    const agent = new FoodAgent(failingLLM);
    const agentRes = await agent.run(context);
    const passed =
      agentRes.status === "success" &&
      !!agentRes.data &&
      agentRes.data.selectedRestaurantIds.length > 0 &&
      agentRes.warnings.length > 0;
    results.push({
      testId: 21,
      name: "food_agent_deterministic_fallback",
      passed,
      message: passed
        ? "FoodAgent gracefully fell back to deterministic ranking on LLM failure."
        : "FoodAgent crashed on LLM failure.",
    });
  } catch (err) {
    results.push({ testId: 21, name: "food_agent_deterministic_fallback", passed: false, message: String(err) });
  }

  // Test 22: itinerary_validator_duplicate_restaurant_same_day_rejected
  try {
    const invalidItinerary = {
      days: [
        {
          dayNumber: 1,
          theme: "Orientation",
          items: [
            { type: "stay" as const, referenceId: "stay_1", startTime: "08:30", endTime: "09:30", reasoning: "Breakfast" },
            { type: "food" as const, referenceId: "rest_kyubey", startTime: "12:30", endTime: "14:00", reasoning: "Lunch" },
            { type: "food" as const, referenceId: "rest_kyubey", startTime: "19:00", endTime: "20:30", reasoning: "Dinner repeated on same day" },
          ],
        },
      ],
      orchestrationNotes: "Test itinerary",
    };
    const validReferenceIds = new Set(["stay_1", "rest_kyubey", "rest_rokurinsha"]);
    const report = ItineraryValidator.validate({
      expectedDays: 1,
      itinerary: invalidItinerary,
      validReferenceIds,
    });
    const passed = report.issues.some((i) => i.code === "DUPLICATE_RESTAURANT_SAME_DAY");
    results.push({
      testId: 22,
      name: "itinerary_validator_duplicate_restaurant_same_day_rejected",
      passed,
      message: passed
        ? "ItineraryValidator correctly rejected duplicate restaurant visits on the same day."
        : "Validator failed to flag duplicate restaurant on same day.",
    });
  } catch (err) {
    results.push({ testId: 22, name: "itinerary_validator_duplicate_restaurant_same_day_rejected", passed: false, message: String(err) });
  }

  // Test 23: itinerary_validator_distinct_restaurants_passed
  try {
    const validItinerary = {
      days: [
        {
          dayNumber: 1,
          theme: "Orientation",
          items: [
            { type: "stay" as const, referenceId: "stay_1", startTime: "08:30", endTime: "09:30", reasoning: "Breakfast" },
            { type: "food" as const, referenceId: "rest_rokurinsha", startTime: "12:30", endTime: "14:00", reasoning: "Lunch" },
            { type: "food" as const, referenceId: "rest_kyubey", startTime: "19:00", endTime: "20:30", reasoning: "Dinner" },
          ],
        },
      ],
      orchestrationNotes: "Test itinerary",
    };
    const validReferenceIds = new Set(["stay_1", "rest_kyubey", "rest_rokurinsha"]);
    const report = ItineraryValidator.validate({
      expectedDays: 1,
      itinerary: validItinerary,
      validReferenceIds,
    });
    const passed = report.passed && report.criticalCount === 0;
    results.push({
      testId: 23,
      name: "itinerary_validator_distinct_restaurants_passed",
      passed,
      message: passed
        ? "ItineraryValidator approved distinct lunch and dinner scheduling on the same day."
        : "Validator failed valid distinct restaurant schedule.",
    });
  } catch (err) {
    results.push({ testId: 23, name: "itinerary_validator_distinct_restaurants_passed", passed: false, message: String(err) });
  }

  // Test 24: budget_calculator_free_dining
  try {
    const freeRes1 = makeTestRestaurant({
      id: "res_f1",
      name: "Community Langar",
      destinationId: "delhi",
      priceType: "free",
      averagePricePerPerson: 0,
      latitude: 28.6,
      longitude: 77.2,
    });
    const freeRes2 = makeTestRestaurant({
      id: "res_f2",
      name: "Temple Feast",
      destinationId: "delhi",
      priceType: "free",
      averagePricePerPerson: 0,
      latitude: 28.6,
      longitude: 77.2,
    });
    const breakdown = BudgetCalculator.calculate({
      days: 1,
      travellers: 2,
      budgetTier: "budget",
      restaurants: [freeRes1, freeRes2],
      currency: "USD",
    });
    const passed = breakdown.dailyFoodEstimate === 0;
    results.push({
      testId: 24,
      name: "budget_calculator_free_dining",
      passed,
      message: passed
        ? "BudgetCalculator accurately computed $0 food expense for free community dining."
        : `Expected $0 food cost, got ${breakdown.dailyFoodEstimate}.`,
    });
  } catch (err) {
    results.push({ testId: 24, name: "budget_calculator_free_dining", passed: false, message: String(err) });
  }

  // Test 25: budget_calculator_known_dining_pricing
  try {
    const lunchRes = makeTestRestaurant({
      id: "res_l",
      name: "Lunch Bistro",
      destinationId: "tokyo",
      averagePricePerPerson: 20,
      currency: "USD",
      latitude: 35.6,
      longitude: 139.7,
    });
    const dinnerRes = makeTestRestaurant({
      id: "res_d",
      name: "Dinner Restaurant",
      destinationId: "tokyo",
      averagePricePerPerson: 50,
      currency: "USD",
      latitude: 35.6,
      longitude: 139.7,
    });
    // 1 day, 2 travellers, 2 meals: (20 + 50) * 2 = $140
    const breakdown = BudgetCalculator.calculate({
      days: 1,
      travellers: 2,
      budgetTier: "moderate",
      restaurants: [lunchRes, dinnerRes],
      currency: "USD",
    });
    const expected = 140;
    const passed = breakdown.dailyFoodEstimate === expected;
    results.push({
      testId: 25,
      name: "budget_calculator_known_dining_pricing",
      passed,
      message: passed
        ? `BudgetCalculator precisely computed known dining costs: $${breakdown.dailyFoodEstimate} (expected $${expected}).`
        : `Expected $${expected}, got $${breakdown.dailyFoodEstimate}.`,
    });
  } catch (err) {
    results.push({ testId: 25, name: "budget_calculator_known_dining_pricing", passed: false, message: String(err) });
  }

  // Test 26: budget_calculator_unknown_dining_estimate
  try {
    const unknownRes = makeTestRestaurant({
      id: "res_u",
      name: "Secret Supper Club",
      destinationId: "tokyo",
      averagePricePerPerson: null,
      priceType: "unknown",
      latitude: 35.6,
      longitude: 139.7,
    });
    const breakdown = BudgetCalculator.calculate({
      days: 1,
      travellers: 2,
      budgetTier: "moderate", // moderate baseline = $75/day ($37.5 per meal)
      restaurants: [unknownRes],
      currency: "USD",
    });
    const passed = breakdown.hasEstimatedFoodCosts === true && breakdown.dailyFoodEstimate > 0;
    results.push({
      testId: 26,
      name: "budget_calculator_unknown_dining_estimate",
      passed,
      message: passed
        ? `BudgetCalculator safely estimated unknown dining costs ($${breakdown.dailyFoodEstimate}) and set hasEstimatedFoodCosts=true.`
        : "Failed to estimate unknown dining cost or set estimate flag.",
    });
  } catch (err) {
    results.push({ testId: 26, name: "budget_calculator_unknown_dining_estimate", passed: false, message: String(err) });
  }

  return results;
}

export async function GET(): Promise<NextResponse> {
  const guard = assertInternalRouteAllowed();
  if (guard) return guard;

  const tests = await runAllFoodTests();
  const passedCount = tests.filter((t) => t.passed).length;
  const totalCount = tests.length;
  const allPassed = passedCount === totalCount;

  return NextResponse.json({
    suite: "Phase 10.3: Food Intelligence Foundation",
    timestamp: new Date().toISOString(),
    totalTests: totalCount,
    passedTests: passedCount,
    failedTests: totalCount - passedCount,
    status: allPassed ? "ALL_TESTS_PASSED" : "TESTS_FAILED",
    tests,
  });
}
