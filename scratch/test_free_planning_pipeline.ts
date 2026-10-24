/**
 * Comprehensive verification script for SafariX Free-Only Provider Pipeline.
 * Tests real OSM places, OSM restaurants, OSM lodging, outbound flights, Wikimedia images,
 * and the complete TravelOrchestrator planning pipeline.
 */

import { travelService } from "../src/lib/travel";
import { TripContextAssembler } from "../src/lib/travel/services/trip-context-assembler";
import { TravelOrchestrator } from "../src/lib/orchestration/orchestrator";
import { TripWithPreferences } from "../src/features/trips/types";

async function main() {
  console.log("=== SAFARIX FREE-ONLY API MIGRATION VERIFICATION ===");

  // 1. Test Free Places Provider
  console.log("\n[1] Testing OsmPlaceProvider (Attractions)...");
  const places = await travelService.searchPlaces({ destinationId: "Tokyo", limit: 6 });
  console.log(`✓ Places returned: ${places.length}`);
  if (places.length === 0) throw new Error("FAIL: OsmPlaceProvider returned 0 places.");
  console.log(`  Sample: "${places[0].name}" (${places[0].type}) at [${places[0].latitude}, ${places[0].longitude}] - Source: ${places[0].source.provider}`);

  // 2. Test Free Food Provider
  console.log("\n[2] Testing OsmFoodProvider (Restaurants)...");
  const restaurants = await travelService.searchRestaurants({ destinationId: "Tokyo", limit: 6 });
  console.log(`✓ Restaurants returned: ${restaurants.length}`);
  if (restaurants.length === 0) throw new Error("FAIL: OsmFoodProvider returned 0 restaurants.");
  console.log(`  Sample: "${restaurants[0].name}" (${restaurants[0].cuisine.join(", ")}) at [${restaurants[0].latitude}, ${restaurants[0].longitude}]`);

  // 3. Test Free Stay Provider
  console.log("\n[3] Testing OsmStayProvider (Accommodations)...");
  const stays = await travelService.searchStays({ destinationId: "Tokyo", nights: 3, limit: 5 });
  console.log(`✓ Stays returned: ${stays.length}`);
  if (stays.length === 0) throw new Error("FAIL: OsmStayProvider returned 0 stays.");
  console.log(`  Sample: "${stays[0].name}" (${stays[0].category}) - Price: ${stays[0].priceType} - Outbound: ${stays[0].bookingUrl?.slice(0, 60)}...`);

  // 4. Test Outbound Flight Provider
  console.log("\n[4] Testing OutboundTransportProvider (Flights)...");
  const flights = await travelService.searchTransport({ origin: "London", destination: "Tokyo", travellers: 2 });
  console.log(`✓ Flights returned: ${flights.length}`);
  if (flights.length === 0) throw new Error("FAIL: OutboundTransportProvider returned 0 flights.");
  console.log(`  Sample: [${flights[0].origin} -> ${flights[0].destination}] (${flights[0].mode}) - Price: ${flights[0].price === null ? "unknown (outbound link)" : flights[0].price} - Outbound: ${flights[0].bookingUrl?.slice(0, 60)}...`);

  // 5. Test Wikimedia Image Provider
  console.log("\n[5] Testing WikimediaImageProvider (Destination Imagery)...");
  const image = await travelService.getDestinationImage("Tokyo");
  console.log(`✓ Image resolved: ${Boolean(image?.url)}`);
  if (!image) throw new Error("FAIL: WikimediaImageProvider returned null.");
  console.log(`  Photo URL: ${image.url.slice(0, 65)}...`);
  console.log(`  Attribution: ${image.source.attribution}`);

  // 6. Test End-to-End Orchestrator Execution
  console.log("\n[6] Running Complete TravelOrchestrator AI Planning Pipeline...");
  const dummyTrip: TripWithPreferences = {
    id: `trip_free_test_${Date.now()}`,
    userId: "usr_test_verification_01",
    title: "Tokyo Cultural Expedition",
    destination: "Tokyo",
    origin: "London",
    days: 3,
    travellers: 2,
    budget: "moderate",
    status: "planning",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      id: "pref-1",
      tripId: "trip-free-verify-1",
      interests: ["culture", "sightseeing", "food"],
      transportPreference: "flight",
      notes: "First time visiting Tokyo, excited to see authentic historical landmarks and try local cuisine.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  const orchestrator = new TravelOrchestrator();
  const planResult = await orchestrator.planTrip(dummyTrip, (stage, msg) => {
    console.log(`  [Orchestrator Stage: ${stage}] ${msg}`);
  });

  console.log("\n[7] Plan Result Summary:");
  console.log(`  - Status: ${planResult.status}`);
  console.log(`  - Stage: ${planResult.stage}`);
  console.log(`  - Attempts: ${planResult.attempts}`);
  console.log(`  - Completeness isComplete: ${planResult.completeness?.isComplete}`);
  console.log(`  - Transportation: ${planResult.transportation?.mode} (Option: ${planResult.transportation?.recommendedOptionId})`);
  console.log(`  - Stay: ${planResult.selectedStayDetails?.name} (${planResult.selectedStayDetails?.category})`);
  console.log(`  - Activities Selected: ${planResult.activities?.selectedPlaceIds.length}`);
  console.log(`  - Dining Selected: ${planResult.food?.selectedRestaurantIds.length}`);
  console.log(`  - Itinerary Days: ${planResult.itinerary?.days.length}`);
  console.log(`  - Budget Status: ${planResult.budget?.budgetStatus}`);
  console.log(`  - Total Estimated Cost: ${planResult.budget?.totalEstimatedCost} ${planResult.budget?.currency}`);
  console.log(`  - Has Estimated Accommodation Fees: ${planResult.budget?.hasEstimatedAccommodationFees}`);

  if (planResult.status !== "completed") {
    console.error("Plan failed with error:", planResult.error);
    throw new Error(`FAIL: Orchestrator did not achieve status 'completed': ${planResult.error}`);
  }

  console.log("\n=== ALL FREE-ONLY INTEGRATIONS & PLANNING PIPELINE VERIFIED SUCCESSFULLY! ===");
}

main().catch((err) => {
  console.error("\nFATAL TEST ERROR:", err);
  process.exit(1);
});
