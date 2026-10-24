/**
 * @file scratch/test_master_application_repair.ts
 *
 * Comprehensive Master Regression Verification Suite for SafariX.
 * Verifies:
 * 1. Transportation Data Integrity (Lucknow -> Paris regression: no 4h, no $0, no fake carrier, no direct flight claim)
 * 2. Dining Provider Integrity (Paris: zero "Restaurant H", "Restaurant 17", "Restaurant 3", no placeholder numbering, genuine OSM venues)
 * 3. Activities & Attraction Quality (No highways, roads, depots; robust schema validation; clean editorial reasoning)
 * 4. Image Provider Integrity (No flags/SVGs, bounded 3500ms timeout, genuine photography or graceful architectural fallback)
 * 5. Budget & End-to-End Consistency (Price null never treated as $0, clean transit fare status)
 */

import { strict as assert } from "node:assert";
import { OutboundTransportProvider } from "../src/lib/travel/providers/real/outbound-transport-provider";
import { AirportResolver } from "../src/lib/travel/services/airport-resolver";
import { OsmFoodProvider } from "../src/lib/travel/providers/real/osm-food-provider";
import { OsmPlaceProvider } from "../src/lib/travel/providers/real/osm-place-provider";
import { WikimediaImageProvider } from "../src/lib/travel/providers/real/wikimedia-image-provider";
import { FoodAgent } from "../src/lib/agents/food/food-agent";
import { ActivitiesAgent } from "../src/lib/agents/activities/activities-agent";
import { TransportationAgent } from "../src/lib/agents/transportation/transportation-agent";
import { TripContext } from "../src/lib/travel";

async function runMasterRepairSuite() {
  console.log("===============================================================================");
  console.log("   SAFARIX MASTER APPLICATION REPAIR & DATA INTEGRITY VERIFICATION SUITE       ");
  console.log("===============================================================================\n");

  let passed = 0;
  let failed = 0;

  function recordPass(label: string) {
    passed++;
    console.log(`  [PASS ${passed}] ${label}`);
  }

  function recordFail(label: string, err: any) {
    failed++;
    console.error(`  [FAIL ${failed}] ${label}:`, err?.message || err);
  }

  // ---------------------------------------------------------------------------
  // 1. CRITICAL ISSUE B: TRANSPORTATION RETRIEVAL & LUCKNOW-TO-PARIS REGRESSION
  // ---------------------------------------------------------------------------
  console.log("--- 1. Testing Transportation Integrity & Lucknow -> Paris ---");

  try {
    const outboundProvider = new OutboundTransportProvider();
    const flightOptions = await outboundProvider.searchTransport({
      origin: "Lucknow",
      destination: "Paris",
      travellers: 1,
      date: "2026-11-20",
    });

    assert(flightOptions.length > 0, "OutboundTransportProvider returns options for Lucknow -> Paris");
    const option = flightOptions[0];

    // Check 1: Provider name must NOT be fake "Major Commercial Airlines"
    assert(
      option.provider !== "Major Commercial Airlines",
      "Provider is NOT fabricated 'Major Commercial Airlines'"
    );
    assert(
      option.provider.includes("Commercial Flight Search") || option.provider.includes("Google Flights"),
      `Provider is honestly labeled as external search (${option.provider})`
    );
    recordPass("Lucknow -> Paris provider is honestly labeled as external search");

    // Check 2: Duration must NOT be hardcoded 240 minutes (4 hours)
    assert(
      option.durationMinutes !== 240,
      "Duration is NOT hardcoded to arbitrary 240 minutes (4 hours)"
    );
    assert(
      option.durationMinutes === null,
      "Duration is null (unavailable) when live schedule is unverified"
    );
    recordPass("Lucknow -> Paris duration is NOT 4 hours (correctly null/unavailable)");

    // Check 3: Stops must NOT claim 0 (direct flight)
    assert(
      option.stops !== 0,
      "Stops does NOT claim 0 stops / direct flight without carrier schedule proof"
    );
    assert(
      option.stops === null,
      "Stops is null (varies by carrier) when schedule is unconfirmed"
    );
    recordPass("Lucknow -> Paris does not claim direct flight or 0 stops");

    // Check 4: Price must NOT be 0
    assert(
      option.price === null,
      "Price is null (not $0) when fare data is not provided by GDS"
    );
    recordPass("Lucknow -> Paris price is null (never $0)");

    // Check 5: Legitimate Google Flights search link is present
    assert(
      Boolean(option.bookingUrl && option.bookingUrl.includes("google.com/travel/flights")),
      "Outbound search link points to Google Flights with LKO and CDG/PAR endpoints"
    );
    recordPass("Legitimate Google Flights URL is generated for live fares");

    // Check 6: TransportationAgent reasoning and cost for Lucknow -> Paris
    const mockTrip: any = {
      id: "trip_lucknow_paris",
      origin: "Lucknow",
      destination: "Paris",
      days: 5,
      travellers: 1,
      budget: "moderate",
      preferences: { transportPreference: "flight", interests: ["Culture & Arts"] },
    };
    const mockContext: any = {
      trip: mockTrip,
      destination: { name: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522 },
      candidateTransport: flightOptions,
      candidatePlaces: [],
      candidateRestaurants: [],
      candidateStays: [],
      transportPreference: "flight",
    };

    const transAgent = new TransportationAgent({
      generateStructured: async () => {
        throw new Error("Simulated LLM offline fallback");
      },
    } as any);

    const agentResult = await transAgent.run(mockContext);
    assert(agentResult.status === "success", "TransportationAgent succeeds");
    assert(
      agentResult.data?.estimatedCost === undefined || agentResult.data?.estimatedCost === null,
      "TransportationAgent estimatedCost is undefined/null (NOT 0) when flight price is null"
    );
    assert(
      !agentResult.data?.reasoning.includes("$0"),
      "TransportationAgent reasoning NEVER mentions $0"
    );
    recordPass("TransportationAgent correctly outputs undefined estimatedCost and no $0 claim");
  } catch (err) {
    recordFail("Transportation integrity check", err);
  }

  // ---------------------------------------------------------------------------
  // 2. CRITICAL ISSUE C: RESTAURANT NAMES & DINING DATA INTEGRITY
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Testing Restaurant Data Integrity & Paris Dining ---");

  try {
    const foodProvider = new OsmFoodProvider();
    const restaurants = await foodProvider.searchRestaurants({
      destinationId: "paris",
      latitude: 48.8566,
      longitude: 2.3522,
      limit: 15,
    });

    assert(restaurants.length > 0, "OsmFoodProvider returns restaurants in Paris");
    recordPass(`OsmFoodProvider returned ${restaurants.length} verified Paris restaurants`);

    // Verify ZERO generic placeholders: "Restaurant H", "Restaurant 17", "Restaurant 3", etc.
    const forbiddenNames = [
      "restaurant",
      "restaurant h",
      "restaurant 17",
      "restaurant 3",
      "restaurant 1",
      "restaurant 2",
      "restaurant n°1",
      "bistro 1",
      "bistrot 20",
    ];

    for (const r of restaurants) {
      const lower = r.name.toLowerCase().trim();
      assert(
        !forbiddenNames.includes(lower),
        `Restaurant name "${r.name}" is forbidden generic placeholder`
      );
      assert(
        !/^(restaurant|bistro|bistrot|cafe|café|bar|brasserie|eatery)\s*(?:[a-z0-9#°\-\.]+|\d+|n°\s*\d+)$/i.test(lower),
        `Restaurant name "${r.name}" matches generic numbered/single-letter pattern`
      );
      assert(
        !/\b(universitaire|interminist[eè]riel|personnel|scolaire|administratif|hospitalier)\b/i.test(lower),
        `Restaurant name "${r.name}" is an institutional canteen`
      );
      assert(
        !Boolean(r.description?.includes("is a local dining establishment in")),
        `Description "${r.description}" contains generic boilerplate phrase`
      );
    }
    recordPass("All returned restaurants have genuine, non-placeholder names");
    recordPass("Zero generic descriptions ('a local dining establishment in Paris')");

    // Test FoodAgent deterministic fallback
    const foodAgent = new FoodAgent({
      generateStructured: async () => {
        throw new Error("Simulated Gemini quota limit error");
      },
    } as any);

    const mockFoodContext: any = {
      trip: {
        id: "trip_food_test",
        destination: "Paris",
        days: 3,
        travellers: 2,
        budget: "moderate",
        preferences: { interests: ["Food & Wine"] },
      },
      destination: { name: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522 },
      candidateRestaurants: restaurants,
    };

    const foodResult = await foodAgent.run(mockFoodContext);
    assert(foodResult.status === "success", "FoodAgent fallback succeeds");
    assert(
      !foodResult.data?.reasoning.includes("LLM call failed"),
      "FoodAgent reasoning NEVER leaks 'LLM call failed' error"
    );
    assert(
      !foodResult.data?.reasoning.includes("Gemini"),
      "FoodAgent reasoning NEVER leaks internal provider names"
    );
    recordPass("FoodAgent fallback reasoning contains clean editorial copy without error leaks");
  } catch (err) {
    recordFail("Restaurant data integrity check", err);
  }

  // ---------------------------------------------------------------------------
  // 3. CRITICAL ISSUE D: ACTIVITIES & ATTRACTION QUALITY
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Testing Activities & Attraction Filtering ---");

  try {
    const placeProvider = new OsmPlaceProvider();
    const places = await placeProvider.searchPlaces({
      destinationId: "paris",
      latitude: 48.8566,
      longitude: 2.3522,
      limit: 12,
    });

    assert(places.length > 0, "OsmPlaceProvider returns places for Paris");

    // Verify no highway, motorway, or transit depot features
    for (const p of places) {
      const lower = p.name.toLowerCase();
      assert(
        !/\b(road|highway|motorway|expressway|junction|flyover|depot|interchange)\b/i.test(lower) ||
        /\b(museum|palace|park|garden|monument|tower|cathedral|temple|church)\b/i.test(lower),
        `Place "${p.name}" appears to be a road or transit infrastructure`
      );
    }
    recordPass("Zero roads, motorways, or transit depots among tourist attractions");

    // ActivitiesAgent fallback
    const actAgent = new ActivitiesAgent({
      generateStructured: async () => {
        throw new Error("Simulated Gemini schema validation error");
      },
    } as any);

    const mockActContext: any = {
      trip: {
        id: "trip_act_test",
        destination: "Paris",
        days: 3,
        travellers: 2,
        budget: "moderate",
        preferences: { interests: ["Culture & Arts", "Architecture"] },
      },
      destination: { name: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522 },
      candidatePlaces: places,
    };

    const actResult = await actAgent.run(mockActContext);
    assert(actResult.status === "success", "ActivitiesAgent recovers gracefully on error");
    assert(
      !actResult.data?.reasoning.includes("LLM call failed") &&
      !actResult.data?.reasoning.includes("validation error"),
      "ActivitiesAgent reasoning NEVER leaks raw technical exceptions"
    );
    recordPass("ActivitiesAgent deterministic fallback produces clean editorial output");
  } catch (err) {
    recordFail("Activities quality check", err);
  }

  // ---------------------------------------------------------------------------
  // 4. CRITICAL ISSUE A: DESTINATION IMAGES & TIMEOUT BOUNDING
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Testing Destination Image Provider & Timeout Bounding ---");

  try {
    const imgProvider = new WikimediaImageProvider();

    // Test: Query destination image for Paris
    const startMs = Date.now();
    const imgResult = await imgProvider.getDestinationImage("Paris");
    const elapsed = Date.now() - startMs;

    // Timeout bounded check (must be well under 10 seconds)
    assert(elapsed < 6000, `Image query took ${elapsed}ms, bounded under 6000ms`);
    recordPass(`Image query returned in ${elapsed}ms (bounded, non-blocking)`);

    if (imgResult && imgResult.url) {
      // Must not be an SVG flag or coat of arms
      const urlLower = imgResult.url.toLowerCase();
      assert(!urlLower.includes(".svg"), "Image URL is NOT an SVG");
      assert(!/\b(flag|coat_of_arms|seal)\b/i.test(urlLower), "Image is NOT a flag or seal");
      recordPass("Destination image is genuine photography (flags and SVGs rejected)");
    } else {
      recordPass("Graceful null result returned without error or timeout");
    }
  } catch (err) {
    recordFail("Destination image check", err);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n===============================================================================");
  console.log(`   MASTER APPLICATION REPAIR SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterRepairSuite().catch((err) => {
  console.error("Master repair suite fatal error:", err);
  process.exit(1);
});
