/**
 * @file src/app/api/internal/transport-test/route.ts
 *
 * Automated verification test suite for Phase 10.1:
 * Transport Preference + Multi-Agent Transport Foundation.
 *
 * Covers 20 required verification scenarios:
 * 1. Default preference is "auto"
 * 2. Valid transport preference values accepted (auto, flight, train, bus, car)
 * 3. Invalid transport preference value rejected by Zod schema
 * 4. Legacy trip without transportPreference defaults safely to "auto"
 * 5. TripContext properly assembles transportPreference
 * 6. TransportScorer gives +60 preference boost to preferred mode
 * 7. TransportScorer auto mode balances cost and duration without bias
 * 8. TransportScorer penalizes or rejects sold-out options
 * 9. TransportScorer correctly scores duration (faster = higher duration score)
 * 10. TransportScorer correctly scores cost (cheaper = higher cost score)
 * 11. Preferred mode unavailable: marks preferredModeUnavailable = true with fallbackReason
 * 12. Preferred mode unavailable: never hallucinates fake transport, selects real alternative
 * 13. Domestic route evaluates multiple candidate modes (flight, train, bus, car)
 * 14. Transoceanic international route returns only flights (zero fake trains or buses)
 * 15. Transportation Agent output strictly satisfies transportationOutputSchema
 * 16. Selected transport option contains required fields (provider, price, duration, isEstimate)
 * 17. Selected transport option flows accurately to BudgetCalculator
 * 18. FeasibilityEngine validates transport candidate without false errors
 * 19. Full orchestrator execution with transport preference succeeds end-to-end
 * 20. Transoceanic route with train preference falls back to flight gracefully without crash
 */

import { NextResponse } from "next/server";
import { travelService } from "@/lib/travel";
import { TripWithPreferences, TransportPreference } from "@/features/trips/types";
import { createTripSchema } from "@/features/trips/schemas";
import { TransportScorer } from "@/lib/agents/transportation/scoring";
import { TransportationAgent } from "@/lib/agents/transportation/transportation-agent";
import { transportationOutputSchema } from "@/lib/agents/transportation/schemas";
import { BudgetCalculator } from "@/lib/agents/budget/budget-calculator";
import { FeasibilityEngine } from "@/lib/agents/validator/feasibility-engine";
import { TravelOrchestrator } from "@/lib/orchestration/orchestrator";
import { TransportOption } from "@/lib/travel";
import { assertInternalRouteAllowed } from "@/lib/security/internal-guard";

export interface TransportTestCaseResult {
  testId: number;
  name: string;
  passed: boolean;
  message?: string;
  details?: unknown;
}

export async function runAllTransportTests(): Promise<TransportTestCaseResult[]> {
  const results: TransportTestCaseResult[] = [];

  const baseTrip: TripWithPreferences = {
    id: "test_transport_trip_1",
    userId: "user_test_tp",
    title: "Tokyo from Kyoto Transit Test",
    origin: "Kyoto",
    destination: "Tokyo, Japan",
    days: 4,
    travellers: 2,
    budget: "moderate",
    status: "planning",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      id: "pref_tp_1",
      tripId: "test_transport_trip_1",
      transportPreference: "auto",
      interests: ["Culture & Arts"],
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  // Test 1: Default preference is "auto"
  try {
    const parsed = createTripSchema.parse({
      destination: "Tokyo, Japan",
      days: 3,
      travellers: 1,
      budget: "moderate",
      interests: ["Culture & Arts"],
    });
    const passed = parsed.transportPreference === "auto";
    results.push({
      testId: 1,
      name: 'Default transport preference is "auto"',
      passed,
      details: { transportPreference: parsed.transportPreference },
    });
  } catch (err) {
    results.push({ testId: 1, name: 'Default transport preference is "auto"', passed: false, message: String(err) });
  }

  // Test 2: Valid transport preference values accepted
  try {
    const validValues: TransportPreference[] = ["auto", "flight", "train", "bus", "car"];
    const allValid = validValues.every((val) => {
      const res = createTripSchema.safeParse({
        destination: "Paris",
        days: 3,
        travellers: 1,
        budget: "budget",
        transportPreference: val,
        interests: ["Culture & Arts"],
      });
      return res.success && res.data.transportPreference === val;
    });
    results.push({
      testId: 2,
      name: "Valid transport preference values accepted (auto, flight, train, bus, car)",
      passed: allValid,
      details: { testedValues: validValues },
    });
  } catch (err) {
    results.push({ testId: 2, name: "Valid transport preference values accepted", passed: false, message: String(err) });
  }

  // Test 3: Invalid transport preference value rejected by Zod schema
  try {
    const invalidResult = createTripSchema.safeParse({
      destination: "Paris",
      days: 3,
      travellers: 1,
      budget: "budget",
      transportPreference: "spaceship",
    });
    const passed = !invalidResult.success;
    results.push({
      testId: 3,
      name: "Invalid transport preference value rejected by Zod schema",
      passed,
      details: { success: invalidResult.success },
    });
  } catch (err) {
    results.push({ testId: 3, name: "Invalid transport preference value rejected", passed: false, message: String(err) });
  }

  // Test 4: Legacy trip without transportPreference defaults safely to "auto"
  try {
    const legacyTrip = {
      ...baseTrip,
      preferences: {
        id: "pref_legacy",
        tripId: "test_legacy",
        interests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any,
    };
    const ctx = await travelService.prepareTripContext(legacyTrip);
    const passed = ctx.transportPreference === "auto";
    results.push({
      testId: 4,
      name: 'Legacy trip without transportPreference defaults safely to "auto"',
      passed,
      details: { resolvedPreference: ctx.transportPreference },
    });
  } catch (err) {
    results.push({ testId: 4, name: "Legacy trip defaults safely to auto", passed: false, message: String(err) });
  }

  // Test 5: TripContext properly assembles transportPreference
  try {
    const trainTrip: TripWithPreferences = {
      ...baseTrip,
      preferences: {
        ...baseTrip.preferences!,
        transportPreference: "train",
      },
    };
    const ctx = await travelService.prepareTripContext(trainTrip);
    const passed = ctx.transportPreference === "train";
    results.push({
      testId: 5,
      name: "TripContext properly assembles transportPreference",
      passed,
      details: { transportPreference: ctx.transportPreference },
    });
  } catch (err) {
    results.push({ testId: 5, name: "TripContext assembles transportPreference", passed: false, message: String(err) });
  }

  // Mock candidates for deterministic scoring tests
  const candidates: TransportOption[] = [
    {
      id: "opt_train_shinkansen",
      mode: "train",
      provider: "JR Shinkansen Nozomi",
      origin: "Kyoto",
      destination: "Tokyo",
      departureTime: "08:00",
      arrivalTime: "10:15",
      durationMinutes: 135,
      price: 130,
      currency: "USD",
      bookingUrl: "https://mock.jr.co.jp",
      availability: "available",
      stops: 0,
      source: { provider: "mock", fetchedAt: new Date().toISOString(), isEstimate: true },
    },
    {
      id: "opt_flight_ana",
      mode: "flight",
      provider: "ANA Domestic",
      origin: "Kyoto (ITM)",
      destination: "Tokyo (HND)",
      departureTime: "09:00",
      arrivalTime: "10:20",
      durationMinutes: 80,
      price: 160,
      currency: "USD",
      bookingUrl: "https://mock.ana.co.jp",
      availability: "available",
      stops: 0,
      source: { provider: "mock", fetchedAt: new Date().toISOString(), isEstimate: true },
    },
    {
      id: "opt_bus_willer",
      mode: "bus",
      provider: "Willer Express Highway Bus",
      origin: "Kyoto",
      destination: "Tokyo",
      departureTime: "23:00",
      arrivalTime: "06:30",
      durationMinutes: 450,
      price: 35,
      currency: "USD",
      bookingUrl: "https://mock.willer.co.jp",
      availability: "available",
      stops: 0,
      source: { provider: "mock", fetchedAt: new Date().toISOString(), isEstimate: true },
    },
    {
      id: "opt_car_rental",
      mode: "car",
      provider: "Toyota Rent-A-Car",
      origin: "Kyoto",
      destination: "Tokyo",
      departureTime: "08:00",
      arrivalTime: "14:00",
      durationMinutes: 360,
      price: 110,
      currency: "USD",
      bookingUrl: "https://mock.toyota.co.jp",
      availability: "available",
      stops: 0,
      source: { provider: "mock", fetchedAt: new Date().toISOString(), isEstimate: true },
    },
  ];

  // Test 6: TransportScorer gives +60 preference boost to preferred mode
  try {
    const trainResult = TransportScorer.scoreCandidates(candidates, "train");
    const topTrain = trainResult.rankedOptions[0];
    const passed =
      topTrain.option.mode === "train" &&
      topTrain.scoreBreakdown.preferenceWeight === 60 &&
      trainResult.preferredModeAvailable === true;
    results.push({
      testId: 6,
      name: "TransportScorer gives +60 preference boost to preferred mode",
      passed,
      details: { topMode: topTrain.option.mode, prefScore: topTrain.scoreBreakdown.preferenceWeight },
    });
  } catch (err) {
    results.push({ testId: 6, name: "TransportScorer preference boost", passed: false, message: String(err) });
  }

  // Test 7: TransportScorer auto mode balances cost and duration without bias
  try {
    const autoResult = TransportScorer.scoreCandidates(candidates, "auto");
    const autoAllZeroBias = autoResult.rankedOptions.every((s) => s.scoreBreakdown.preferenceWeight === 0);
    const passed = autoAllZeroBias && autoResult.rankedOptions.length === 4;
    results.push({
      testId: 7,
      name: "TransportScorer auto mode balances cost and duration without bias",
      passed,
      details: { zeroBiasForAll: autoAllZeroBias, scoredCount: autoResult.rankedOptions.length },
    });
  } catch (err) {
    results.push({ testId: 7, name: "TransportScorer auto mode", passed: false, message: String(err) });
  }

  // Test 8: TransportScorer penalizes or rejects sold-out options
  try {
    const soldOutCandidate: TransportOption = {
      ...candidates[0],
      id: "opt_sold_out",
      availability: "sold_out",
    };
    const scored = TransportScorer.scoreCandidates([soldOutCandidate, candidates[1]], "train");
    const passed = scored.rankedOptions[0].option.id !== "opt_sold_out";
    results.push({
      testId: 8,
      name: "TransportScorer rejects sold-out options",
      passed,
      details: { topId: scored.rankedOptions[0].option.id },
    });
  } catch (err) {
    results.push({ testId: 8, name: "TransportScorer sold-out handling", passed: false, message: String(err) });
  }

  // Test 9: TransportScorer correctly scores duration (faster = higher duration score)
  try {
    const scored = TransportScorer.scoreCandidates(candidates, "auto");
    const flightScore = scored.rankedOptions.find((s) => s.option.mode === "flight")!;
    const busScore = scored.rankedOptions.find((s) => s.option.mode === "bus")!;
    const passed = flightScore.scoreBreakdown.durationScore > busScore.scoreBreakdown.durationScore;
    results.push({
      testId: 9,
      name: "TransportScorer correctly scores duration (faster = higher score)",
      passed,
      details: { flightDurationScore: flightScore.scoreBreakdown.durationScore, busDurationScore: busScore.scoreBreakdown.durationScore },
    });
  } catch (err) {
    results.push({ testId: 9, name: "TransportScorer duration scoring", passed: false, message: String(err) });
  }

  // Test 10: TransportScorer correctly scores cost (cheaper = higher cost score)
  try {
    const scored = TransportScorer.scoreCandidates(candidates, "auto");
    const busScore = scored.rankedOptions.find((s) => s.option.mode === "bus")!;
    const flightScore = scored.rankedOptions.find((s) => s.option.mode === "flight")!;
    const passed = busScore.scoreBreakdown.costScore > flightScore.scoreBreakdown.costScore;
    results.push({
      testId: 10,
      name: "TransportScorer correctly scores cost (cheaper = higher score)",
      passed,
      details: { busCostScore: busScore.scoreBreakdown.costScore, flightCostScore: flightScore.scoreBreakdown.costScore },
    });
  } catch (err) {
    results.push({ testId: 10, name: "TransportScorer cost scoring", passed: false, message: String(err) });
  }

  // Test 11: Preferred mode unavailable: marks preferredModeUnavailable = true with fallbackReason
  try {
    const flightsOnly: TransportOption[] = [candidates[1]];
    const scored = TransportScorer.scoreCandidates(flightsOnly, "train");
    const passed =
      scored.preferredModeAvailable === false &&
      Boolean(scored.fallbackReason) &&
      scored.fallbackReason!.toLowerCase().includes("train");
    results.push({
      testId: 11,
      name: "Preferred mode unavailable: marks preferredModeUnavailable = true with fallbackReason",
      passed,
      details: { preferredModeAvailable: scored.preferredModeAvailable, fallbackReason: scored.fallbackReason },
    });
  } catch (err) {
    results.push({ testId: 11, name: "Preferred mode unavailable marking", passed: false, message: String(err) });
  }

  // Test 12: Preferred mode unavailable: never hallucinates fake transport, selects real alternative
  try {
    const flightsOnly: TransportOption[] = [candidates[1]];
    const scored = TransportScorer.scoreCandidates(flightsOnly, "bus");
    const passed = scored.rankedOptions.length === 1 && scored.rankedOptions[0].option.id === candidates[1].id;
    results.push({
      testId: 12,
      name: "Preferred mode unavailable: selects real alternative without hallucinating",
      passed,
      details: { selectedId: scored.rankedOptions[0]?.option.id },
    });
  } catch (err) {
    results.push({ testId: 12, name: "Anti-hallucination fallback", passed: false, message: String(err) });
  }

  // Test 13: Domestic route evaluates multiple candidate modes (flight, train, bus, car)
  try {
    const domesticTrip: TripWithPreferences = {
      ...baseTrip,
      origin: "Mumbai",
      destination: "Goa, India",
    };
    const ctx = await travelService.prepareTripContext(domesticTrip);
    const modes = new Set(ctx.candidateTransport.map((t) => t.mode));
    const passed = modes.has("train") && modes.has("flight") && modes.has("bus");
    results.push({
      testId: 13,
      name: "Domestic route evaluates multiple candidate modes (flight, train, bus)",
      passed,
      details: { candidateModes: Array.from(modes) },
    });
  } catch (err) {
    results.push({ testId: 13, name: "Domestic multi-modal evaluation", passed: false, message: String(err) });
  }

  // Test 14: Transoceanic international route returns only flights (zero fake trains or buses)
  try {
    const transoceanicTrip: TripWithPreferences = {
      ...baseTrip,
      origin: "Bhopal",
      destination: "Tokyo, Japan",
    };
    const ctx = await travelService.prepareTripContext(transoceanicTrip);
    const nonFlights = ctx.candidateTransport.filter((t) => t.mode !== "flight");
    const passed = ctx.candidateTransport.length > 0 && nonFlights.length === 0;
    results.push({
      testId: 14,
      name: "Transoceanic international route returns only flights (zero fake trains/buses)",
      passed,
      details: { totalCandidates: ctx.candidateTransport.length, nonFlightCount: nonFlights.length },
    });
  } catch (err) {
    results.push({ testId: 14, name: "Transoceanic flight-only enforcement", passed: false, message: String(err) });
  }

  // Test 15: Transportation Agent output strictly satisfies transportationOutputSchema
  try {
    const agent = new TransportationAgent();
    const ctx = await travelService.prepareTripContext(baseTrip);
    const agentRes = await agent.run(ctx, 1);
    const passed = agentRes.status === "success" && Boolean(agentRes.data);
    if (agentRes.data) {
      transportationOutputSchema.parse(agentRes.data);
    }
    results.push({
      testId: 15,
      name: "Transportation Agent output strictly satisfies transportationOutputSchema",
      passed,
      details: { status: agentRes.status, mode: agentRes.data?.mode },
    });
  } catch (err) {
    results.push({ testId: 15, name: "Transportation Agent schema compliance", passed: false, message: String(err) });
  }

  // Test 16: Selected transport option contains required fields (provider, price, duration, isEstimate)
  try {
    const agent = new TransportationAgent();
    const ctx = await travelService.prepareTripContext(baseTrip);
    const agentRes = await agent.run(ctx, 1);
    const sel = agentRes.data?.selectedOption;
    const passed =
      Boolean(sel) &&
      Boolean(sel?.provider) &&
      typeof sel?.price === "number" &&
      typeof sel?.durationMinutes === "number" &&
      typeof sel?.isEstimate === "boolean";
    results.push({
      testId: 16,
      name: "Selected transport option contains required fields (provider, price, duration, isEstimate)",
      passed,
      details: { provider: sel?.provider, price: sel?.price, duration: sel?.durationMinutes },
    });
  } catch (err) {
    results.push({ testId: 16, name: "Selected transport option field completeness", passed: false, message: String(err) });
  }

  // Test 17: Selected transport option flows accurately to BudgetCalculator
  try {
    const option = candidates[0]; // $130
    const travellers = 3;
    const budget = BudgetCalculator.calculate({
      days: 5,
      travellers,
      budgetTier: "moderate",
      transport: option,
      currency: "USD",
    });
    // Expected transport cost = 130 * 3 = 390
    const passed = budget.transportationCost === 390;
    results.push({
      testId: 17,
      name: "Selected transport option flows accurately to BudgetCalculator ($130 * 3 = $390)",
      passed,
      details: { transportationCost: budget.transportationCost, expected: 390 },
    });
  } catch (err) {
    results.push({ testId: 17, name: "Transport to BudgetCalculator flow", passed: false, message: String(err) });
  }

  // Test 18: FeasibilityEngine validates transport candidate without false errors
  try {
    const issues = FeasibilityEngine.verifyCandidates({
      destinationId: "dest_tokyo",
      stay: null,
      transport: candidates[0],
      places: [],
      restaurants: [],
    });
    const hasFatal = issues.some((i) => i.severity === "error");
    const passed = !hasFatal;
    results.push({
      testId: 18,
      name: "FeasibilityEngine validates transport candidate without false errors",
      passed,
      details: { issuesCount: issues.length, fatalCount: issues.filter((i) => i.severity === "error").length },
    });
  } catch (err) {
    results.push({ testId: 18, name: "FeasibilityEngine transport validation", passed: false, message: String(err) });
  }

  // Test 19: Full orchestrator execution with transport preference succeeds end-to-end
  try {
    const orchestrator = new TravelOrchestrator();
    const trainTrip: TripWithPreferences = {
      ...baseTrip,
      preferences: {
        ...baseTrip.preferences!,
        transportPreference: "train",
      },
    };
    const orchResult = await orchestrator.planTrip(trainTrip);
    const passed =
      orchResult.status === "completed" &&
      Boolean(orchResult.transportation) &&
      orchResult.transportation?.mode === "train";
    results.push({
      testId: 19,
      name: "Full orchestrator execution with train preference succeeds end-to-end",
      passed,
      details: { status: orchResult.status, selectedMode: orchResult.transportation?.mode },
    });
  } catch (err) {
    results.push({ testId: 19, name: "Full orchestrator execution", passed: false, message: String(err) });
  }

  // Test 20: Transoceanic route with train preference falls back to flight gracefully without crash
  try {
    const transoceanicTrainTrip: TripWithPreferences = {
      ...baseTrip,
      origin: "Bhopal",
      destination: "Tokyo, Japan",
      preferences: {
        ...baseTrip.preferences!,
        transportPreference: "train",
      },
    };
    const orchestrator = new TravelOrchestrator();
    const orchResult = await orchestrator.planTrip(transoceanicTrainTrip);
    const passed =
      orchResult.status === "completed" &&
      Boolean(orchResult.transportation) &&
      orchResult.transportation?.mode === "flight" &&
      orchResult.transportation?.preferredModeUnavailable === true &&
      Boolean(orchResult.transportation?.fallbackReason);
    results.push({
      testId: 20,
      name: "Transoceanic route with train preference falls back to flight with clear explanation and zero crash",
      passed,
      details: {
        status: orchResult.status,
        mode: orchResult.transportation?.mode,
        preferredModeUnavailable: orchResult.transportation?.preferredModeUnavailable,
        fallbackReason: orchResult.transportation?.fallbackReason,
        error: (orchResult as any).error,
      },
    });
  } catch (err) {
    results.push({ testId: 20, name: "Transoceanic fallback without crash", passed: false, message: String(err) });
  }

  return results;
}

export async function GET() {
  const guard = assertInternalRouteAllowed();
  if (guard) return guard;

  const results = await runAllTransportTests();
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return NextResponse.json({
    suite: "Phase 10.1: Transport Preference + Multi-Agent Transport Foundation",
    totalTests: results.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0,
    results,
  });
}
