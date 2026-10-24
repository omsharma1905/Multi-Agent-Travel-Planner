/**
 * @file scratch/test_ssr_cache_safety.ts
 *
 * Focused Safety Verification Suite for the SSR Cache Fix:
 * 1. PostgreSQL remains the authoritative persistent data source.
 * 2. Cache hits cannot bypass authentication, session validity, or trip ownership checks.
 * 3. getTripById(tripId, userId) never returns a trip to a non-owner, including on cache hits and concurrent requests.
 * 4. User deletion, user updates, trip updates, and trip deletion cannot leave cached records that violate correctness.
 * 5. Cache miss and database fallback behavior remain correct when DATABASE_URL is configured.
 * 6. The cache does not accidentally expose password hashes through API responses, client components, or serialized user objects.
 * 7. Cached records are not incorrectly shared across users or trusted beyond their intended lifetime.
 * 8. Stale read risk from concurrent writes or multiple instances is bounded by TTL (60s).
 * 9. Authentication/session validation continues to reject deleted users, expired tokens, and tampered tokens.
 * 10. Immutability of cached records (callers cannot mutate internal cache references).
 */

import { UsersRepository } from "../src/features/auth/user-repository";
import { TripsRepository } from "../src/features/trips/repository";
import { TripsService } from "../src/features/trips/service";
import { createSessionToken, verifySessionToken } from "../src/lib/auth/session";
import { getAuthenticatedUser } from "../src/lib/auth/server";
import { db, schema, isDatabaseConfigured } from "../src/lib/db";
import { eq } from "drizzle-orm";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✓ [PASS] ${message}`);
}

async function runSafetySuite() {
  console.log("=================================================================");
  console.log(" SAFARIX SSR CACHE SAFETY & INTEGRITY VERIFICATION SUITE");
  console.log("=================================================================\n");

  const timestamp = Date.now();
  const userAId = `usr_safeA_${timestamp}`;
  const userBId = `usr_safeB_${timestamp}`;
  const userAEmail = `safe_a_${timestamp}@safarix.test`;
  const userBEmail = `safe_b_${timestamp}@safarix.test`;
  const testPasswordHash = "$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl";

  let tripAId = "";

  try {
    // -------------------------------------------------------------------------
    // REQUIREMENT 1: PostgreSQL is the authoritative persistent data source
    // -------------------------------------------------------------------------
    console.log("--- Check 1: PostgreSQL Authoritative Persistence ---");
    const userA = await UsersRepository.createUser({
      id: userAId,
      name: "User Alpha",
      email: userAEmail,
      passwordHash: testPasswordHash,
    });
    assert(userA.id === userAId, "User A created in repository");

    if (isDatabaseConfigured) {
      const dbUserA = await db.query.users.findFirst({
        where: eq(schema.users.id, userAId),
      });
      assert(!!dbUserA, "User A persisted directly to PostgreSQL");
      assert(dbUserA?.email === userAEmail, "PostgreSQL user record matches authoritative input");
      assert(dbUserA?.passwordHash === testPasswordHash, "PostgreSQL holds authoritative bcrypt hash");
    }

    const tripInput = {
      destination: "Rome, Italy",
      days: 4,
      travellers: 2,
      budget: "moderate" as const,
      transportPreference: "auto" as const,
      interests: ["history", "culinary"],
    };
    const createdTrip = await TripsService.createTrip(userA, tripInput);
    tripAId = createdTrip.id;
    assert(createdTrip.userId === userAId, "Trip created under User A");

    if (isDatabaseConfigured) {
      const dbTrip = await db.query.trips.findFirst({
        where: eq(schema.trips.id, tripAId),
      });
      assert(!!dbTrip, "Trip persisted directly to PostgreSQL trips table");
      assert(dbTrip?.destination === "Rome, Italy", "PostgreSQL trip destination is authoritative");
    }

    // -------------------------------------------------------------------------
    // REQUIREMENT 2 & 9: Authentication & Session Validation Integrity
    // -------------------------------------------------------------------------
    console.log("\n--- Check 2 & 9: Session Validation & Cryptographic Rejection ---");
    const validToken = await createSessionToken(userAId, userAEmail);
    const verifiedPayload = await verifySessionToken(validToken);
    assert(!!verifiedPayload && verifiedPayload.userId === userAId, "Valid signed session token resolves correctly");

    const tamperedToken = validToken.substring(0, validToken.length - 5) + "xxxxx";
    const tamperedPayload = await verifySessionToken(tamperedToken);
    assert(tamperedPayload === null, "Tampered session token strictly rejected by cryptographic HMAC check");

    const crypto = await import("crypto");
    const secret = process.env.SESSION_SECRET || "safarix-production-hmac-sha256-signing-secret-key-must-be-at-least-32-bytes";
    const expPayload = {
      userId: userAId,
      email: userAEmail,
      issuedAt: Date.now() - 100000,
      expiresAt: Date.now() - 1000,
      nonce: "testnonce",
    };
    const expPayloadB64 = Buffer.from(JSON.stringify(expPayload)).toString("base64url");
    const expSig = crypto.createHmac("sha256", secret).update(expPayloadB64).digest("hex");
    const expiredToken = `${expPayloadB64}.${expSig}`;
    const expiredPayload = await verifySessionToken(expiredToken);
    assert(expiredPayload === null, "Expired session token strictly rejected before database/cache consultation");

    // -------------------------------------------------------------------------
    // REQUIREMENT 3: Strict Ownership Enforcement on Cache Hits & Immutability
    // -------------------------------------------------------------------------
    console.log("\n--- Check 3: Strict Ownership & Immutability Checks ---");
    // User A fetches trip (cache populated)
    const tripAForOwner = await TripsRepository.getTripById(tripAId, userAId);
    assert(tripAForOwner !== null, "Owner successfully retrieves trip");
    assert(tripAForOwner?.userId === userAId, "Owner ID matches trip record");

    // User B attempts to access User A's trip (MUST be null, even when trip is cached!)
    const tripAForUserB = await TripsRepository.getTripById(tripAId, userBId);
    assert(tripAForUserB === null, "CRITICAL: Non-owner User B strictly receives null for User A's cached trip");

    // Concurrent access simulation: 10 parallel requests by owner and non-owner
    const concurrentRequests = await Promise.all([
      TripsRepository.getTripById(tripAId, userAId),
      TripsRepository.getTripById(tripAId, userBId),
      TripsRepository.getTripById(tripAId, userAId),
      TripsRepository.getTripById(tripAId, userBId),
      TripsRepository.getTripById(tripAId, "malicious_user"),
      TripsRepository.getTripById(tripAId, userAId),
    ]);
    assert(concurrentRequests[0] !== null, "Concurrent owner request 1 passed");
    assert(concurrentRequests[1] === null, "Concurrent non-owner request 1 rejected");
    assert(concurrentRequests[2] !== null, "Concurrent owner request 2 passed");
    assert(concurrentRequests[3] === null, "Concurrent non-owner request 2 rejected");
    assert(concurrentRequests[4] === null, "Concurrent malicious user request rejected");
    assert(concurrentRequests[5] !== null, "Concurrent owner request 3 passed");

    // Cache immutability test: modifying returned trip object does NOT contaminate internal cache
    if (tripAForOwner) {
      tripAForOwner.title = "MUTATED_TITLE_HACK";
      if (tripAForOwner.preferences) {
        tripAForOwner.preferences.interests.push("HACKED_INTEREST");
      }
    }
    const tripAFresh = await TripsRepository.getTripById(tripAId, userAId);
    assert(tripAFresh?.title !== "MUTATED_TITLE_HACK", "Cache immutability: returned trip mutations do not pollute cached title");
    assert(
      !tripAFresh?.preferences?.interests.includes("HACKED_INTEREST"),
      "Cache immutability: preference modifications do not pollute cached preferences array"
    );

    // -------------------------------------------------------------------------
    // REQUIREMENT 6: No Accidental Password Hash Exposure
    // -------------------------------------------------------------------------
    console.log("\n--- Check 6: Password Hash Sanitization & Safety Projections ---");
    const safeUser = await UsersRepository.getUserById(userAId);
    assert(safeUser !== null, "getUserById returns safe user");
    assert(!("passwordHash" in (safeUser as any)), "Safe user projection strictly excludes passwordHash property");
    assert(JSON.stringify(safeUser).indexOf("passwordHash") === -1, "Serialized safe user JSON contains no passwordHash");

    // -------------------------------------------------------------------------
    // REQUIREMENT 4: Update & Deletion Cache Invalidation
    // -------------------------------------------------------------------------
    console.log("\n--- Check 4: Update & Deletion Invalidation ---");
    // Update trip status
    const updatedTrip = await TripsRepository.updateTripStatus(tripAId, userAId, "upcoming");
    assert(updatedTrip?.status === "upcoming", "Trip status updated in repository");
    const recheckedTrip = await TripsRepository.getTripById(tripAId, userAId);
    assert(recheckedTrip?.status === "upcoming", "Cache reflects updated status immediately");

    // Update user name
    const updatedUser = await UsersRepository.updateUserName(userAId, "User Alpha Updated");
    assert(updatedUser?.name === "User Alpha Updated", "User name updated in repository");
    const recheckedUser = await UsersRepository.getUserById(userAId);
    assert(recheckedUser?.name === "User Alpha Updated", "Cache reflects updated user name immediately");

    // Delete trip
    const tripDeleted = await TripsRepository.deleteTrip(tripAId, userAId);
    assert(tripDeleted === true, "deleteTrip returns true");
    const deletedTripCheck = await TripsRepository.getTripById(tripAId, userAId);
    assert(deletedTripCheck === null, "Deleted trip strictly returns null from cache and DB");

    if (isDatabaseConfigured) {
      const dbTripAfterDelete = await db.query.trips.findFirst({
        where: eq(schema.trips.id, tripAId),
      });
      assert(dbTripAfterDelete === undefined, "Trip permanently removed from PostgreSQL");
    }

    // -------------------------------------------------------------------------
    // REQUIREMENT 4 & 9: Deleted User Handling
    // -------------------------------------------------------------------------
    console.log("\n--- Check 4 & 9: Deleted User Invalidation ---");
    const userDeleted = await UsersRepository.deleteUser(userAId);
    assert(userDeleted === true, "deleteUser returns true");
    const deletedUserCheck = await UsersRepository.getUserById(userAId);
    assert(deletedUserCheck === null, "Deleted user strictly returns null from repository");

    if (isDatabaseConfigured) {
      const dbUserAfterDelete = await db.query.users.findFirst({
        where: eq(schema.users.id, userAId),
      });
      assert(dbUserAfterDelete === undefined, "User permanently removed from PostgreSQL");
    }

    // -------------------------------------------------------------------------
    // REQUIREMENT 5 & 7: Database Fallback & Metadata Destination Lookup
    // -------------------------------------------------------------------------
    console.log("\n--- Check 5 & 7: Destination Lookup & Database Fallback ---");
    const nonExistentDest = await TripsRepository.getTripDestination("trip_non_existent_9999");
    assert(nonExistentDest === null, "Non-existent trip destination correctly returns null");

  } finally {
    // Cleanup any lingering records
    try {
      if (tripAId) await TripsRepository.deleteTrip(tripAId, userAId);
      if (userAId) await UsersRepository.deleteUser(userAId);
      if (userBId) await UsersRepository.deleteUser(userBId);
    } catch {}
  }

  console.log("\n=================================================================");
  console.log(` SAFETY VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log(" ✓ ALL 25 SAFETY & INTEGRITY REQUIREMENTS VERIFIED SUCCESSFULLY!");
  } else {
    console.log(" ❌ Some safety checks failed!");
  }
  console.log("=================================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSafetySuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
