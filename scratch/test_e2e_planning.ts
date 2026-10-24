/**
 * @file scratch/test_e2e_planning.ts
 * End-to-end verification of SafariX Trip Planning, PostgreSQL persistence, and honest status reporting.
 */

import { TripsService } from "../src/features/trips/service";
import { TripsRepository } from "../src/features/trips/repository";
import { TravelOrchestrator } from "../src/lib/orchestration/orchestrator";
import { db, schema } from "../src/lib/db";
import { eq } from "drizzle-orm";

async function runE2EPlanningTest() {
  console.log("=== SAFARIX END-TO-END AI PLANNING & PERSISTENCE VERIFICATION ===");

  const user = {
    id: "usr_veora_demo_01",
    name: "Elena Rostova",
    email: "demo@safarix.travel",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Create a trip
  console.log("\n[1] Creating trip via TripsService for user:", user.email);
  const trip = await TripsService.createTrip(user, {
    destination: "London",
    origin: "Bhopal",
    days: 3,
    travellers: 1,
    budget: "premium",
    transportPreference: "flight",
    interests: ["architecture", "culture", "cuisine"],
    notes: "E2E Planning verification expedition",
  });
  console.log("✓ Trip created with ID:", trip.id, "Title:", trip.title);

  // 2. Direct PostgreSQL Query to prove physical persistence
  console.log("\n[2] Verifying physical PostgreSQL database persistence...");
  const dbTrip = await db.query.trips.findFirst({
    where: eq(schema.trips.id, trip.id),
    with: { preferences: true },
  });
  if (!dbTrip) {
    throw new Error("FAIL: Trip was not found in PostgreSQL trips table!");
  }
  console.log("✓ Verified trip in PostgreSQL table 'trips':", {
    id: dbTrip.id,
    userId: dbTrip.userId,
    destination: dbTrip.destination,
    days: dbTrip.days,
    budget: dbTrip.budget,
    status: dbTrip.status,
    hasPreferences: Boolean(dbTrip.preferences),
  });

  // 3. User Ownership Enforcement
  console.log("\n[3] Testing user ownership security...");
  const unauthorizedUserTrip = await TripsService.getTrip(trip.id, "usr_hacker_999");
  if (unauthorizedUserTrip !== null) {
    throw new Error("SECURITY VIOLATION: Unauthorized user accessed private trip!");
  }
  const unauthorizedDelete = await TripsService.deleteTrip(trip.id, "usr_hacker_999");
  if (unauthorizedDelete !== false) {
    throw new Error("SECURITY VIOLATION: Unauthorized user deleted private trip!");
  }
  console.log("✓ User ownership strictly enforced: Unauthorized access and deletion rejected.");

  // 4. Trigger AI Planning via TravelOrchestrator
  console.log("\n[4] Triggering TravelOrchestrator AI Planning pipeline...");
  const orchestrator = new TravelOrchestrator();
  const planResult = await orchestrator.planTrip(trip, (stage, msg) => {
    console.log(`  [Orchestrator Stage: ${stage}] ${msg}`);
  });

  console.log("\n[5] Evaluating AI Planning Result & Completeness:");
  console.log("  - Status:", planResult.status);
  console.log("  - Stage:", planResult.stage);
  console.log("  - Attempts:", planResult.attempts);
  console.log("  - Completeness isComplete:", planResult.completeness?.isComplete);
  console.log("  - Completeness reason:", planResult.completeness?.hollowReason || "Complete");
  console.log("  - Transport selected:", Boolean(planResult.transportation));
  console.log("  - Stays selected:", Boolean(planResult.stay));
  console.log("  - Activities selected:", planResult.activities?.selectedPlaceIds?.length || 0);
  console.log("  - Dining selected:", planResult.food?.selectedRestaurantIds?.length || 0);

  // In real mode with Google Places (403) and Duffel Stays (403):
  // ZERO-MOCK GUARANTEE: The orchestrator MUST NOT report status: "completed" when core domains are 0!
  if (planResult.status === "completed" && !planResult.completeness?.isComplete) {
    throw new Error("FAIL: Orchestrator reported false success on hollow/incomplete plan!");
  }
  console.log("✓ Zero-Mock Production Enforcement: Hollow plan was NOT marked as successfully completed.");

  // 6. Update trip plan and record version in PostgreSQL
  console.log("\n[6] Persisting plan result and trip version to PostgreSQL...");
  const updatedTrip = await TripsService.updateTripPlan(trip.id, user.id, planResult, planResult.status);
  if (!updatedTrip) {
    throw new Error("FAIL: Failed to update trip plan in database!");
  }

  const versionRecord = await TripsService.recordTripVersion({
    tripId: trip.id,
    userId: user.id,
    scope: "full_journey",
    instruction: "Initial automated plan synthesis",
    changeSummary: {
      transport: planResult.transportation ? "Selected Duffel flight" : "Unavailable",
      stays: planResult.stay ? "Selected Stay" : "Unavailable (403)",
      activities: `${planResult.activities?.selectedPlaceIds?.length || 0} activities`,
    },
    snapshot: planResult,
    totalCost: planResult.budget?.totalEstimatedCost || 0,
    currency: planResult.budget?.currency || "USD",
    currencySymbol: planResult.budget?.currencySymbol || "$",
  });
  console.log("✓ Version recorded in PostgreSQL with ID:", versionRecord.id, "Version number:", versionRecord.versionNumber);

  // 7. Verify version in PostgreSQL directly
  const dbVersion = await db.query.tripVersions.findFirst({
    where: eq(schema.tripVersions.tripId, trip.id),
  });
  if (!dbVersion) {
    throw new Error("FAIL: Version snapshot was not found in PostgreSQL trip_versions table!");
  }
  console.log("✓ Verified trip version in PostgreSQL table 'trip_versions':", {
    id: dbVersion.id,
    versionNumber: dbVersion.versionNumber,
    scope: dbVersion.scope,
    totalCost: dbVersion.totalCost,
  });

  // 8. Test Browser Refresh / Retrieval
  console.log("\n[7] Simulating browser refresh: retrieving saved trip from PostgreSQL...");
  const refreshedTrip = await TripsService.getTrip(trip.id, user.id);
  if (!refreshedTrip || !refreshedTrip.plan) {
    throw new Error("FAIL: Failed to retrieve saved plan after refresh!");
  }
  console.log("✓ Retrieved saved trip and plan successfully. Status:", refreshedTrip.status);

  // 9. Clean up test trip
  console.log("\n[8] Cleaning up test trip from PostgreSQL...");
  const deleted = await TripsService.deleteTrip(trip.id, user.id);
  if (!deleted) {
    throw new Error("FAIL: Failed to delete trip from PostgreSQL!");
  }
  const checkDeleted = await db.query.trips.findFirst({
    where: eq(schema.trips.id, trip.id),
  });
  if (checkDeleted) {
    throw new Error("FAIL: Trip still exists in PostgreSQL after deletion!");
  }
  const checkVersionsDeleted = await db.query.tripVersions.findFirst({
    where: eq(schema.tripVersions.tripId, trip.id),
  });
  if (checkVersionsDeleted) {
    throw new Error("FAIL: Cascading deletion failed: trip_versions rows still exist in PostgreSQL!");
  }
  console.log("✓ Trip and cascading trip_versions successfully purged from PostgreSQL.");

  console.log("\n=== ALL END-TO-END PLANNING & PERSISTENCE TESTS PASSED! ===");
}

runE2EPlanningTest().catch((err) => {
  console.error("E2E Planning Test Failed:", err);
  process.exit(1);
});
