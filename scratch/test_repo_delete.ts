/**
 * @file scratch/test_repo_delete.ts
 * Verification of TripsRepository.deleteTrip functionality, ownership checks, and memory resilience.
 */

import { TripsRepository } from "../src/features/trips/repository";

async function testRepositoryDelete() {
  console.log("=== REPOSITORY DELETE JOURNEY TEST ===");

  const userId = "usr_test_verification_01";
  const otherUserId = "usr_unauthorized_99";

  // Ensure test users exist in database
  await TripsRepository.ensureUser({
    id: userId,
    name: "Verification User",
    email: "verification_test@safarix.travel",
    createdAt: new Date().toISOString(),
  });

  await TripsRepository.ensureUser({
    id: otherUserId,
    name: "Unauthorized User",
    email: "unauthorized_test@safarix.travel",
    createdAt: new Date().toISOString(),
  });

  // 1. Create a disposable trip
  const trip = await TripsRepository.createTrip(userId, "Disposable Test Expedition", {
    destination: "Reykjavik, Iceland",
    origin: "London",
    days: 4,
    travellers: 2,
    budget: "moderate",
    transportPreference: "flight",
    interests: ["nature", "hiking"],
    notes: "Disposable test trip"
  });

  console.log("Created disposable trip:", trip.id);

  // 2. Verify trip exists
  const retrieved = await TripsRepository.getTripById(trip.id, userId);
  if (!retrieved || retrieved.id !== trip.id) {
    throw new Error("Failed to retrieve created trip");
  }
  console.log("[PASS] Disposable trip retrieved successfully");

  // 3. Attempt delete by unauthorized user -> MUST FAIL (return false)
  const unauthorizedDelete = await TripsRepository.deleteTrip(trip.id, otherUserId);
  if (unauthorizedDelete !== false) {
    throw new Error("Security violation: unauthorized user was able to delete trip!");
  }
  console.log("[PASS] Unauthorized deletion correctly rejected (returned false)");

  // Verify trip still exists after unauthorized attempt
  const stillExists = await TripsRepository.getTripById(trip.id, userId);
  if (!stillExists) {
    throw new Error("Trip was improperly removed during unauthorized delete attempt!");
  }
  console.log("[PASS] Trip remains intact after unauthorized attempt");

  // 4. Authorized delete -> MUST SUCCEED (return true)
  const authorizedDelete = await TripsRepository.deleteTrip(trip.id, userId);
  if (authorizedDelete !== true) {
    throw new Error("Authorized deletion failed (returned false)!");
  }
  console.log("[PASS] Authorized deletion succeeded (returned true)");

  // 5. Verify trip is gone
  const afterDelete = await TripsRepository.getTripById(trip.id, userId);
  if (afterDelete !== null) {
    throw new Error("Trip still exists after deletion!");
  }
  console.log("[PASS] Trip is confirmed deleted (getTripById returned null)");

  // 6. Second delete attempt (idempotency check) -> returns false or handles safely
  const secondDelete = await TripsRepository.deleteTrip(trip.id, userId);
  console.log("[PASS] Subsequent delete attempt completed safely without throwing, returned:", secondDelete);

  console.log("\nALL REPOSITORY DELETE TESTS PASSED SUCCESSFULLY!");
}

testRepositoryDelete().catch(err => {
  console.error("Repository delete test failed:", err);
  process.exit(1);
});
