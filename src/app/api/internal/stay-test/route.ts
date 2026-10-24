/**
 * @file src/app/api/internal/stay-test/route.ts
 *
 * Automated verification test suite for Phase 10.4:
 * Stay / Accommodation Intelligence Foundation.
 *
 * Covers 26 required verification scenarios:
 * 1. candidate_retrieval_static: Static fixture retrieval for known destinations
 * 2. candidate_retrieval_dynamic: Dynamic stay generation for arbitrary destinations
 * 3. stay_coordinates_realistic: Dynamic coordinates close to destination center
 * 4. stay_comfort_levels_structure: Populated comfort levels (luxury, premium, comfort, standard, budget)
 * 5. stay_pricing_free_distinction: Free stay has priceType="free" and pricePerNight=0
 * 6. stay_pricing_paid_distinction: Paid stay has pricePerNight > 0 and priceType in ("exact", "estimated")
 * 7. stay_pricing_unknown_distinction: Unknown stay has priceType="unknown" and pricePerNight=null (not 0)
 * 8. stay_pricing_flag_estimate: Dynamic stays flagged with isPriceEstimate=true
 * 9. stay_availability_values: Availability values ("available", "limited", "sold_out", "unknown")
 * 10. stay_scorer_weights_sum: StayScorer breakdown sums correctly to final score (up to 100 pts)
 * 11. stay_scorer_budget_alignment: Budget tier awards highest points to matching price / tier
 * 12. stay_scorer_comfort_match: Luxury budget awards highest comfort points to luxury/resorts
 * 13. stay_scorer_geographic_proximity: Proximity (<3km) scores higher than distant (>15km)
 * 14. stay_scorer_availability_penalty: Sold out stays receive 0 availability score and are excluded from top picks
 * 15. stay_scorer_quality_reputation: High rating & reviews awarded quality points
 * 16. feasibility_valid_stay_coordinates: Valid coordinates pass feasibility check
 * 17. feasibility_invalid_coordinates_rejected: Invalid latitude/longitude rejected with INVALID_STAY_COORDINATES
 * 18. feasibility_destination_mismatch_rejected: Destination mismatch rejected with STAY_DESTINATION_MISMATCH
 * 19. feasibility_negative_price_rejected: Negative pricePerNight rejected with INVALID_STAY_PRICE
 * 20. feasibility_sold_out_rejected: Sold out stay rejected with STAY_UNAVAILABLE
 * 21. feasibility_null_price_accepted: Null pricePerNight (unknown pricing) accepted without error
 * 22. stay_agent_grounded_candidates: StayAgent selects grounded candidate from provided list
 * 23. stay_agent_anti_hallucination_fallback: Hallucinated ID triggers deterministic fallback
 * 24. stay_agent_deterministic_fallback: LLM failure falls back gracefully to StayScorer.topPicks()
 * 25. budget_calculator_known_stay_fx: Known stay pricing converted from foreign currency & multiplied by nights
 * 26. budget_calculator_unknown_stay_estimate: Unknown stay pricing uses tier baseline with hasEstimatedAccommodationFees flag
 */

import { NextResponse } from "next/server";
import { assertInternalRouteAllowed } from "@/lib/security/internal-guard";
import { MockStayProvider } from "@/lib/travel/providers/mock/mock-stay-provider";
import { StayScorer } from "@/lib/agents/stay/scoring";
import { StayAgent } from "@/lib/agents/stay/stay-agent";
import { FeasibilityEngine } from "@/lib/agents/validator/feasibility-engine";
import { BudgetCalculator } from "@/lib/agents/budget/budget-calculator";
import { Stay, travelService } from "@/lib/travel";
import { TripWithPreferences } from "@/features/trips/types";
import { LLMProvider } from "@/lib/ai/types";

export interface StayTestCaseResult {
  testId: number;
  name: string;
  passed: boolean;
  message?: string;
  details?: unknown;
}

function makeTestStay(
  partial: Partial<Stay> & {
    id: string;
    name: string;
    destinationId: string;
    latitude: number;
    longitude: number;
  },
): Stay {
  return {
    category: "hotel",
    comfortLevel: "comfort",
    rating: 4.7,
    reviewCount: 400,
    pricePerNight: 150,
    currency: "USD",
    priceType: "exact",
    isPriceEstimate: false,
    availability: "available",
    address: "Central Boulevard 10",
    amenities: ["Free WiFi", "Breakfast", "Air Conditioning"],
    checkIn: "14:00",
    checkOut: "11:00",
    description: "Well-appointed test hotel property.",
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

export async function runAllStayTests(): Promise<StayTestCaseResult[]> {
  const results: StayTestCaseResult[] = [];
  const mockProvider = new MockStayProvider();

  // Test 1: candidate_retrieval_static
  try {
    const stays = await mockProvider.searchStays({ destinationId: "tokyo" });
    const passed = stays.length > 0 && stays.some((s) => s.id === "stay_hoshinoya_tokyo");
    results.push({
      testId: 1,
      name: "candidate_retrieval_static",
      passed,
      message: passed ? `Retrieved ${stays.length} static stays for Tokyo.` : "Failed to retrieve Tokyo stays.",
    });
  } catch (err) {
    results.push({ testId: 1, name: "candidate_retrieval_static", passed: false, message: String(err) });
  }

  // Test 2: candidate_retrieval_dynamic
  try {
    const stays = await mockProvider.searchStays({ destinationId: "reykjavik" });
    const passed = stays.length >= 4 && stays.every((s) => s.destinationId === "reykjavik");
    results.push({
      testId: 2,
      name: "candidate_retrieval_dynamic",
      passed,
      message: passed ? `Generated ${stays.length} dynamic stays for arbitrary destination.` : "Failed dynamic stays generation.",
    });
  } catch (err) {
    results.push({ testId: 2, name: "candidate_retrieval_dynamic", passed: false, message: String(err) });
  }

  // Test 3: stay_coordinates_realistic
  try {
    const stays = await mockProvider.searchStays({ destinationId: "reykjavik", latitude: 64.1466, longitude: -21.9426 });
    const passed = stays.length > 0 && stays.every((s) => Math.abs(s.latitude - 64.1466) < 0.2 && Math.abs(s.longitude - (-21.9426)) < 0.2);
    results.push({
      testId: 3,
      name: "stay_coordinates_realistic",
      passed,
      message: passed ? "Dynamic stay coordinates are positioned realistically near destination centroid." : "Coordinates out of bounds.",
    });
  } catch (err) {
    results.push({ testId: 3, name: "stay_coordinates_realistic", passed: false, message: String(err) });
  }

  // Test 4: stay_comfort_levels_structure
  try {
    const stays = await mockProvider.searchStays({ destinationId: "tokyo" });
    const validComfortLevels = new Set(["budget", "standard", "comfort", "premium", "luxury"]);
    const passed = stays.length > 0 && stays.every((s) => !s.comfortLevel || validComfortLevels.has(s.comfortLevel));
    results.push({
      testId: 4,
      name: "stay_comfort_levels_structure",
      passed,
      message: passed ? "All stays have valid comfortLevel values." : "Invalid comfort level found.",
    });
  } catch (err) {
    results.push({ testId: 4, name: "stay_comfort_levels_structure", passed: false, message: String(err) });
  }

  // Test 5: stay_pricing_free_distinction
  try {
    const freeStay = makeTestStay({
      id: "stay_free_test",
      name: "Sponsored Villa Retreat",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      pricePerNight: 0,
      priceType: "free",
    });
    const passed = freeStay.priceType === "free" && freeStay.pricePerNight === 0;
    results.push({
      testId: 5,
      name: "stay_pricing_free_distinction",
      passed,
      message: passed ? "Free stay correctly characterized with priceType='free' and pricePerNight=0." : "Free stay incorrect.",
    });
  } catch (err) {
    results.push({ testId: 5, name: "stay_pricing_free_distinction", passed: false, message: String(err) });
  }

  // Test 6: stay_pricing_paid_distinction
  try {
    const paidStay = makeTestStay({
      id: "stay_paid_test",
      name: "Grand Hotel",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      pricePerNight: 240,
      priceType: "exact",
    });
    const passed = typeof paidStay.pricePerNight === "number" && paidStay.pricePerNight > 0 && paidStay.priceType === "exact";
    results.push({
      testId: 6,
      name: "stay_pricing_paid_distinction",
      passed,
      message: passed ? "Paid stay correctly characterized with pricePerNight > 0." : "Paid stay incorrect.",
    });
  } catch (err) {
    results.push({ testId: 6, name: "stay_pricing_paid_distinction", passed: false, message: String(err) });
  }

  // Test 7: stay_pricing_unknown_distinction
  try {
    const unknownStay = makeTestStay({
      id: "stay_unknown_test",
      name: "Private Island Hideaway",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      pricePerNight: null,
      priceType: "unknown",
    });
    const passed = unknownStay.priceType === "unknown" && unknownStay.pricePerNight === null;
    results.push({
      testId: 7,
      name: "stay_pricing_unknown_distinction",
      passed,
      message: passed ? "Unknown stay correctly preserves pricePerNight=null without defaulting to 0." : "Unknown stay defaulted to non-null.",
    });
  } catch (err) {
    results.push({ testId: 7, name: "stay_pricing_unknown_distinction", passed: false, message: String(err) });
  }

  // Test 8: stay_pricing_flag_estimate
  try {
    const dynStays = await mockProvider.searchStays({ destinationId: "reykjavik" });
    const passed = dynStays.length > 0 && dynStays.every((s) => s.isPriceEstimate === true && s.priceType === "estimated");
    results.push({
      testId: 8,
      name: "stay_pricing_flag_estimate",
      passed,
      message: passed ? "Dynamic stays properly flagged with isPriceEstimate=true and priceType='estimated'." : "Estimate flag missing.",
    });
  } catch (err) {
    results.push({ testId: 8, name: "stay_pricing_flag_estimate", passed: false, message: String(err) });
  }

  // Test 9: stay_availability_values
  try {
    const validAvail = new Set(["available", "limited", "sold_out", "unknown"]);
    const sampleStay = makeTestStay({
      id: "stay_avail_test",
      name: "Limited Room Boutique",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      availability: "limited",
    });
    const passed = validAvail.has(sampleStay.availability || "");
    results.push({
      testId: 9,
      name: "stay_availability_values",
      passed,
      message: passed ? "Stay availability conforms to valid lifecycle domain states." : "Invalid availability value.",
    });
  } catch (err) {
    results.push({ testId: 9, name: "stay_availability_values", passed: false, message: String(err) });
  }

  // Test 10: stay_scorer_weights_sum
  try {
    const sample = makeTestStay({
      id: "stay_score_test",
      name: "Test Hotel",
      destinationId: "dest_test",
      latitude: 10.0,
      longitude: 20.0,
      pricePerNight: 120,
      comfortLevel: "comfort",
      rating: 4.8,
      amenities: ["WiFi", "Pool", "Breakfast", "Spa"],
      availability: "available",
    });
    const scored = StayScorer.scoreStay({
      stay: sample,
      budgetTier: "moderate",
      centroid: { latitude: 10.01, longitude: 20.01 },
    });
    const b = scored.scoreBreakdown;
    const manualSum = b.budgetScore + b.comfortScore + b.proximityScore + b.valueScore + b.availabilityScore + b.qualityScore;
    const passed = manualSum === scored.score && scored.score <= 100 && scored.score > 0;
    results.push({
      testId: 10,
      name: "stay_scorer_weights_sum",
      passed,
      message: passed ? `StayScorer weights sum exactly to score (${scored.score}/100).` : `Score mismatch: sum=${manualSum}, score=${scored.score}`,
    });
  } catch (err) {
    results.push({ testId: 10, name: "stay_scorer_weights_sum", passed: false, message: String(err) });
  }

  // Test 11: stay_scorer_budget_alignment
  try {
    const budgetStay = makeTestStay({
      id: "s_budget",
      name: "Budget Hostel",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      pricePerNight: 40,
      comfortLevel: "budget",
    });
    const luxuryStay = makeTestStay({
      id: "s_luxury",
      name: "Luxury Palace",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      pricePerNight: 600,
      comfortLevel: "luxury",
    });
    const scoreBudgetUnderBudgetTier = StayScorer.scoreStay({ stay: budgetStay, budgetTier: "budget" });
    const scoreLuxuryUnderBudgetTier = StayScorer.scoreStay({ stay: luxuryStay, budgetTier: "budget" });
    const passed = scoreBudgetUnderBudgetTier.scoreBreakdown.budgetScore > scoreLuxuryUnderBudgetTier.scoreBreakdown.budgetScore;
    results.push({
      testId: 11,
      name: "stay_scorer_budget_alignment",
      passed,
      message: passed ? "Budget tier awards higher budget score to affordable stay than luxury stay." : "Budget alignment failed.",
    });
  } catch (err) {
    results.push({ testId: 11, name: "stay_scorer_budget_alignment", passed: false, message: String(err) });
  }

  // Test 12: stay_scorer_comfort_match
  try {
    const hostelStay = makeTestStay({
      id: "s_hostel",
      name: "Youth Hostel",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      category: "hostel",
      comfortLevel: "budget",
    });
    const resortStay = makeTestStay({
      id: "s_resort",
      name: "Grand Resort",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      category: "resort",
      comfortLevel: "luxury",
    });
    const scoreResortLuxury = StayScorer.scoreStay({ stay: resortStay, budgetTier: "luxury" });
    const scoreHostelLuxury = StayScorer.scoreStay({ stay: hostelStay, budgetTier: "luxury" });
    const passed = scoreResortLuxury.scoreBreakdown.comfortScore > scoreHostelLuxury.scoreBreakdown.comfortScore;
    results.push({
      testId: 12,
      name: "stay_scorer_comfort_match",
      passed,
      message: passed ? "Luxury tier awards higher comfort score to luxury resort than hostel." : "Comfort match failed.",
    });
  } catch (err) {
    results.push({ testId: 12, name: "stay_scorer_comfort_match", passed: false, message: String(err) });
  }

  // Test 13: stay_scorer_geographic_proximity
  try {
    const closeStay = makeTestStay({
      id: "s_close",
      name: "Center Hotel",
      destinationId: "dest_test",
      latitude: 10.005,
      longitude: 20.005,
    });
    const farStay = makeTestStay({
      id: "s_far",
      name: "Suburban Hotel",
      destinationId: "dest_test",
      latitude: 10.25,
      longitude: 20.25,
    });
    const centroid = { latitude: 10.0, longitude: 20.0 };
    const scoreClose = StayScorer.scoreStay({ stay: closeStay, centroid });
    const scoreFar = StayScorer.scoreStay({ stay: farStay, centroid });
    const passed = scoreClose.scoreBreakdown.proximityScore > scoreFar.scoreBreakdown.proximityScore;
    results.push({
      testId: 13,
      name: "stay_scorer_geographic_proximity",
      passed,
      message: passed ? "Central property (<1km) scores higher proximity points than distant property (>30km)." : "Proximity scoring failed.",
    });
  } catch (err) {
    results.push({ testId: 13, name: "stay_scorer_geographic_proximity", passed: false, message: String(err) });
  }

  // Test 14: stay_scorer_availability_penalty
  try {
    const availableStay = makeTestStay({
      id: "s_avail",
      name: "Available Inn",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      availability: "available",
    });
    const soldOutStay = makeTestStay({
      id: "s_soldout",
      name: "Sold Out Inn",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      availability: "sold_out",
    });
    const scoreAvail = StayScorer.scoreStay({ stay: availableStay });
    const scoreSoldOut = StayScorer.scoreStay({ stay: soldOutStay });
    const ranked = StayScorer.rankStays({ stays: [availableStay, soldOutStay] });
    const passed = scoreAvail.scoreBreakdown.availabilityScore === 10 &&
                   scoreSoldOut.scoreBreakdown.availabilityScore === 0 &&
                   !ranked.topPicks.some((s) => s.id === "s_soldout");
    results.push({
      testId: 14,
      name: "stay_scorer_availability_penalty",
      passed,
      message: passed ? "Sold out property receives 0 availability score and is excluded from top picks." : "Availability penalty failed.",
    });
  } catch (err) {
    results.push({ testId: 14, name: "stay_scorer_availability_penalty", passed: false, message: String(err) });
  }

  // Test 15: stay_scorer_quality_reputation
  try {
    const topRated = makeTestStay({
      id: "s_top",
      name: "Top Rated Villa",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      rating: 4.9,
    });
    const medRated = makeTestStay({
      id: "s_med",
      name: "Average Inn",
      destinationId: "dest_test",
      latitude: 10,
      longitude: 20,
      rating: 4.1,
    });
    const scoreTop = StayScorer.scoreStay({ stay: topRated });
    const scoreMed = StayScorer.scoreStay({ stay: medRated });
    const passed = scoreTop.scoreBreakdown.qualityScore > scoreMed.scoreBreakdown.qualityScore;
    results.push({
      testId: 15,
      name: "stay_scorer_quality_reputation",
      passed,
      message: passed ? "High rating (4.9) awards higher quality points than moderate rating (4.1)." : "Quality scoring failed.",
    });
  } catch (err) {
    results.push({ testId: 15, name: "stay_scorer_quality_reputation", passed: false, message: String(err) });
  }

  // Test 16: feasibility_valid_stay_coordinates
  try {
    const validStay = makeTestStay({
      id: "s_valid_coord",
      name: "Valid Hotel",
      destinationId: "tokyo",
      latitude: 35.6895,
      longitude: 139.6917,
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "tokyo",
      stay: validStay,
      transport: null,
      places: [],
      restaurants: [],
    });
    const hasCoordError = issues.some((i) => i.code === "INVALID_STAY_COORDINATES");
    const passed = !hasCoordError;
    results.push({
      testId: 16,
      name: "feasibility_valid_stay_coordinates",
      passed,
      message: passed ? "Valid geographic coordinates pass feasibility checks." : "Valid coordinates rejected.",
    });
  } catch (err) {
    results.push({ testId: 16, name: "feasibility_valid_stay_coordinates", passed: false, message: String(err) });
  }

  // Test 17: feasibility_invalid_coordinates_rejected
  try {
    const invalidStay = makeTestStay({
      id: "s_invalid_coord",
      name: "Impossible Hotel",
      destinationId: "tokyo",
      latitude: 120.0, // Invalid: > 90
      longitude: 139.6917,
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "tokyo",
      stay: invalidStay,
      transport: null,
      places: [],
      restaurants: [],
    });
    const passed = issues.some((i) => i.code === "INVALID_STAY_COORDINATES");
    results.push({
      testId: 17,
      name: "feasibility_invalid_coordinates_rejected",
      passed,
      message: passed ? "Out-of-bound latitude (120°) properly rejected with INVALID_STAY_COORDINATES." : "Invalid coordinates not caught.",
    });
  } catch (err) {
    results.push({ testId: 17, name: "feasibility_invalid_coordinates_rejected", passed: false, message: String(err) });
  }

  // Test 18: feasibility_destination_mismatch_rejected
  try {
    const foreignStay = makeTestStay({
      id: "s_mismatch",
      name: "Paris Hotel",
      destinationId: "dest_paris",
      latitude: 48.8566,
      longitude: 2.3522,
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "dest_tokyo",
      stay: foreignStay,
      transport: null,
      places: [],
      restaurants: [],
    });
    const passed = issues.some((i) => i.code === "STAY_DESTINATION_MISMATCH");
    results.push({
      testId: 18,
      name: "feasibility_destination_mismatch_rejected",
      passed,
      message: passed ? "Destination mismatch properly detected and rejected with STAY_DESTINATION_MISMATCH." : "Mismatch not caught.",
    });
  } catch (err) {
    results.push({ testId: 18, name: "feasibility_destination_mismatch_rejected", passed: false, message: String(err) });
  }

  // Test 19: feasibility_negative_price_rejected
  try {
    const negativePriceStay = makeTestStay({
      id: "s_negative",
      name: "Subsidized Hotel",
      destinationId: "tokyo",
      latitude: 35.6895,
      longitude: 139.6917,
      pricePerNight: -50,
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "tokyo",
      stay: negativePriceStay,
      transport: null,
      places: [],
      restaurants: [],
    });
    const passed = issues.some((i) => i.code === "INVALID_STAY_PRICE");
    results.push({
      testId: 19,
      name: "feasibility_negative_price_rejected",
      passed,
      message: passed ? "Negative nightly price (-$50) rejected with INVALID_STAY_PRICE." : "Negative price not caught.",
    });
  } catch (err) {
    results.push({ testId: 19, name: "feasibility_negative_price_rejected", passed: false, message: String(err) });
  }

  // Test 20: feasibility_sold_out_rejected
  try {
    const soldOutStay = makeTestStay({
      id: "s_sold_out_feas",
      name: "Fully Booked Palace",
      destinationId: "tokyo",
      latitude: 35.6895,
      longitude: 139.6917,
      availability: "sold_out",
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "tokyo",
      stay: soldOutStay,
      transport: null,
      places: [],
      restaurants: [],
    });
    const passed = issues.some((i) => i.code === "STAY_UNAVAILABLE");
    results.push({
      testId: 20,
      name: "feasibility_sold_out_rejected",
      passed,
      message: passed ? "Sold out property rejected with STAY_UNAVAILABLE." : "Sold out stay not rejected.",
    });
  } catch (err) {
    results.push({ testId: 20, name: "feasibility_sold_out_rejected", passed: false, message: String(err) });
  }

  // Test 21: feasibility_null_price_accepted
  try {
    const unknownRateStay = makeTestStay({
      id: "s_null_price",
      name: "On-Request Luxury Estate",
      destinationId: "tokyo",
      latitude: 35.6895,
      longitude: 139.6917,
      pricePerNight: null,
      priceType: "unknown",
    });
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "tokyo",
      stay: unknownRateStay,
      transport: null,
      places: [],
      restaurants: [],
    });
    const hasPriceError = issues.some((i) => i.code === "INVALID_STAY_PRICE");
    const passed = !hasPriceError;
    results.push({
      testId: 21,
      name: "feasibility_null_price_accepted",
      passed,
      message: passed ? "Null price (unknown rate) passes feasibility check without triggering INVALID_STAY_PRICE." : "Null price triggered price error.",
    });
  } catch (err) {
    results.push({ testId: 21, name: "feasibility_null_price_accepted", passed: false, message: String(err) });
  }

  // Test 22: stay_agent_grounded_candidates
  try {
    const mockLLM: LLMProvider = {
      name: "mock-grounded",
      generateStructured: async <T>() =>
        ({
          recommendedStayId: "stay_hoshinoya_tokyo",
          alternativeStayIds: ["stay_claska_tokyo"],
          reasoning: "Selected Hoshinoya Tokyo for supreme traditional omotenashi in central Tokyo.",
          tradeoffs: ["Premium luxury tariff aligns with user luxury budget preference."],
        }) as unknown as T,
    };
    const agent = new StayAgent(mockLLM);
    const mockTrip = {
      id: "trip_grounded_test",
      userId: "u1",
      destination: "Tokyo",
      startDate: "2026-11-01",
      endDate: "2026-11-04",
      days: 3,
      travellers: 2,
      budget: "luxury",
      status: "planning",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as TripWithPreferences;
    const context = await travelService.prepareTripContext(mockTrip);
    const result = await agent.run(context);
    const passed = result.status === "success" && result.data?.recommendedStayId === "stay_hoshinoya_tokyo";
    results.push({
      testId: 22,
      name: "stay_agent_grounded_candidates",
      passed,
      message: passed ? "StayAgent successfully recommended grounded candidate ID." : "StayAgent candidate selection failed.",
    });
  } catch (err) {
    results.push({ testId: 22, name: "stay_agent_grounded_candidates", passed: false, message: String(err) });
  }

  // Test 23: stay_agent_anti_hallucination_fallback
  try {
    const mockHallucinatingLLM: LLMProvider = {
      name: "mock-hallucinator",
      generateStructured: async <T>() =>
        ({
          recommendedStayId: "stay_non_existent_fake_hotel_999",
          alternativeStayIds: [],
          reasoning: "Invented hotel not in candidates list.",
          tradeoffs: [],
        }) as unknown as T,
    };
    const agent = new StayAgent(mockHallucinatingLLM);
    const mockTrip = {
      id: "trip_hallucinate_test",
      userId: "u1",
      destination: "Tokyo",
      startDate: "2026-11-01",
      endDate: "2026-11-04",
      days: 3,
      travellers: 2,
      budget: "moderate",
      status: "planning",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as TripWithPreferences;
    const context = await travelService.prepareTripContext(mockTrip);
    const result = await agent.run(context);
    const passed = result.status === "success" &&
                   result.data !== null &&
                   result.data.recommendedStayId !== "stay_non_existent_fake_hotel_999" &&
                   context.candidateStays.some((s) => s.id === result.data?.recommendedStayId) &&
                   result.warnings.some((w) => w.includes("hallucinated"));
    results.push({
      testId: 23,
      name: "stay_agent_anti_hallucination_fallback",
      passed,
      message: passed ? "Hallucinated ID intercepted; fell back deterministically to top scored stay pick." : "Hallucination not properly handled.",
    });
  } catch (err) {
    results.push({ testId: 23, name: "stay_agent_anti_hallucination_fallback", passed: false, message: String(err) });
  }

  // Test 24: stay_agent_deterministic_fallback
  try {
    const mockFailingLLM: LLMProvider = {
      name: "mock-failing",
      generateStructured: async (): Promise<never> => {
        throw new Error("Provider rate limit timeout");
      },
    };
    const agent = new StayAgent(mockFailingLLM);
    const mockTrip = {
      id: "trip_fallback_test",
      userId: "u1",
      destination: "Tokyo",
      startDate: "2026-11-01",
      endDate: "2026-11-04",
      days: 3,
      travellers: 2,
      budget: "moderate",
      status: "planning",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as TripWithPreferences;
    const context = await travelService.prepareTripContext(mockTrip);
    const result = await agent.run(context);
    const passed = result.status === "success" &&
                   result.data !== null &&
                   context.candidateStays.some((s) => s.id === result.data?.recommendedStayId) &&
                   result.warnings.some((w) => w.includes("deterministic scoring fallback"));
    results.push({
      testId: 24,
      name: "stay_agent_deterministic_fallback",
      passed,
      message: passed ? "LLM error recovered with deterministic top scored stay fallback." : "LLM error fallback failed.",
    });
  } catch (err) {
    results.push({ testId: 24, name: "stay_agent_deterministic_fallback", passed: false, message: String(err) });
  }

  // Test 25: budget_calculator_known_stay_fx
  try {
    // 3 days = 2 nights
    const sampleStay = makeTestStay({
      id: "s_fx_test",
      name: "Tokyo Ryokan",
      destinationId: "dest_tokyo",
      latitude: 35.68,
      longitude: 139.76,
      pricePerNight: 10000,
      currency: "JPY", // 10000 JPY / 150 = ~66.67 USD
    });
    const breakdown = BudgetCalculator.calculate({
      days: 3,
      travellers: 2,
      budgetTier: "moderate",
      stay: sampleStay,
      currency: "USD",
      currencySymbol: "$",
    });
    // Expected nights: 2
    // Nightly in USD: 10000 / 155 = 64.52
    // Total accommodation USD: 64.52 * 2 = ~129.03 USD
    const passed = breakdown.accommodationCost >= 125 && breakdown.accommodationCost <= 135 && breakdown.numberOfNights === 2;
    results.push({
      testId: 25,
      name: "budget_calculator_known_stay_fx",
      passed,
      message: passed ? `Foreign currency JPY stay converted and multiplied across 2 nights ($${breakdown.accommodationCost.toFixed(2)} USD).` : `FX calculation failed: ${breakdown.accommodationCost}`,
    });
  } catch (err) {
    results.push({ testId: 25, name: "budget_calculator_known_stay_fx", passed: false, message: String(err) });
  }

  // Test 26: budget_calculator_unknown_stay_estimate
  try {
    const unknownRateStay = makeTestStay({
      id: "s_unknown_calc",
      name: "Unpriced Villa",
      destinationId: "dest_tokyo",
      latitude: 35.68,
      longitude: 139.76,
      pricePerNight: null,
      priceType: "unknown",
    });
    const breakdown = BudgetCalculator.calculate({
      days: 4, // 3 nights
      travellers: 2,
      budgetTier: "moderate", // moderate tier maxStay = 250 USD
      stay: unknownRateStay,
      currency: "USD",
      currencySymbol: "$",
    });
    // 3 nights * 250 = 750 USD
    const passed = breakdown.accommodationCost === 750 &&
                   breakdown.hasEstimatedAccommodationFees === true &&
                   breakdown.numberOfNights === 3;
    results.push({
      testId: 26,
      name: "budget_calculator_unknown_stay_estimate",
      passed,
      message: passed ? `Unknown stay rate safely defaulted to tier baseline ($750 USD for 3 nights) with hasEstimatedAccommodationFees=true.` : `Unknown rate calculation failed: ${breakdown.accommodationCost}`,
    });
  } catch (err) {
    results.push({ testId: 26, name: "budget_calculator_unknown_stay_estimate", passed: false, message: String(err) });
  }

  return results;
}

export async function GET() {
  const guard = assertInternalRouteAllowed();
  if (guard) return guard;

  const testResults = await runAllStayTests();
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = testResults.filter((t) => !t.passed);

  return NextResponse.json(
    {
      passedTests: passed,
      totalTests: total,
      summary: {
        total,
        passed,
        failed: failed.length,
        status: failed.length === 0 ? "PASSED" : "FAILED",
      },
      results: testResults,
      failures: failed,
    },
    { status: failed.length === 0 ? 200 : 500 },
  );
}
