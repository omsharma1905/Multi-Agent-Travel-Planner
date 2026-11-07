import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { TripsRepository } from "../src/features/trips/repository";
import { TripsService } from "../src/features/trips/service";
import { UsersRepository } from "../src/features/auth/user-repository";
import { db, isDatabaseConfigured } from "../src/lib/db";
import { planningResultCache } from "../src/lib/orchestration/planning-result-cache";
import type { OrchestrationResult } from "../src/lib/orchestration/types";
import { runScratchTest, type ScratchTestFixtures } from "./test-safety";

function plan(tripId: string, assembledAt: string): OrchestrationResult {
  return {
    tripId,
    status: "completed",
    stage: "completed",
    attempts: 1,
    transportation: null,
    stay: null,
    activities: null,
    food: null,
    budget: null,
    itinerary: null,
    validation: { passed: true, issues: [], criticalCount: 0, warningCount: 0 },
    assembledAt,
  };
}

function versionInput(
  tripId: string,
  userId: string,
  snapshot: OrchestrationResult,
  scope: string,
  totalCost = 0,
) {
  return {
    tripId,
    userId,
    scope,
    snapshot,
    totalCost,
    currency: "USD",
    currencySymbol: "$",
  };
}

function injectTransactionFailure(): () => void {
  const originalDescriptor = Object.getOwnPropertyDescriptor(db, "transaction");
  Object.defineProperty(db, "transaction", {
    configurable: true,
    writable: true,
    value: async () => {
      throw new Error("Injected transaction failure.");
    },
  });

  return () => {
    if (originalDescriptor) {
      Object.defineProperty(db, "transaction", originalDescriptor);
    } else {
      Reflect.deleteProperty(db, "transaction");
    }
  };
}

async function runLifecycleChecks(fixtures: ScratchTestFixtures): Promise<void> {
  assert.ok(isDatabaseConfigured, "an isolated PostgreSQL test database is configured");

  const fixtureId = randomUUID();
  const user = {
    id: `usr_lifecycle_${fixtureId}`,
    name: "Lifecycle Test",
    email: `lifecycle_${fixtureId}@safarix.test`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fixtures.trackUser(user.id);

  const trip = await TripsService.createTrip(user, {
    destination: "Oslo",
    days: 2,
    travellers: 1,
    budget: "moderate",
    interests: ["culture"],
  });
  fixtures.trackTrip(trip.id, user.id);

  const firstPlan = plan(trip.id, "first");
  planningResultCache.set(trip.id, user.id, plan(trip.id, "stale-cache"));
  const firstVersion = await TripsRepository.updateTripPlanAndRecordVersion({
    ...versionInput(trip.id, user.id, firstPlan, "journey"),
    status: "upcoming",
  });
  assert.ok(firstVersion, "plan edit persists its first history snapshot");
  assert.equal(firstVersion.scope, "journey");
  assert.equal(firstVersion.snapshot.assembledAt, "first");
  assert.equal(
    planningResultCache.get(trip.id, user.id),
    null,
    "successful durable plan edit invalidates cached planning data",
  );

  const secondPlan = plan(trip.id, "second");
  const secondVersion = await TripsRepository.updateTripPlanAndRecordVersion({
    ...versionInput(trip.id, user.id, secondPlan, "day"),
    status: "upcoming",
  });
  assert.ok(secondVersion, "subsequent edit persists a new history snapshot");

  const beforeFailedEdit = await TripsRepository.getTripById(trip.id, user.id);
  const beforeFailedVersions = await TripsRepository.listTripVersions(trip.id, user.id);
  await assert.rejects(
    TripsRepository.updateTripPlanAndRecordVersion({
      ...versionInput(trip.id, user.id, plan(trip.id, "must-rollback"), "day", 2_147_483_648),
      status: "upcoming",
    }),
    /PERSISTENCE_ERROR/,
    "an invalid version row rejects the edit transaction",
  );
  const afterFailedEdit = await TripsRepository.getTripById(trip.id, user.id);
  const afterFailedVersions = await TripsRepository.listTripVersions(trip.id, user.id);
  assert.equal(afterFailedEdit?.plan?.assembledAt, beforeFailedEdit?.plan?.assembledAt);
  assert.deepEqual(
    afterFailedVersions.map((version) => version.id),
    beforeFailedVersions.map((version) => version.id),
    "failed version insertion rolls back the plan and leaves prior history intact",
  );

  const cachedPriorResult = plan(trip.id, "cached-prior");
  planningResultCache.set(trip.id, user.id, cachedPriorResult);
  const failedTransactionPlan = plan(trip.id, "must-not-commit");
  const restoreFailedEditTransaction = injectTransactionFailure();
  try {
    await assert.rejects(
      TripsRepository.updateTripPlanAndRecordVersion({
        ...versionInput(trip.id, user.id, failedTransactionPlan, "journey"),
        status: "upcoming",
      }),
      /PERSISTENCE_ERROR/,
      "database transaction failure propagates from plan persistence",
    );
    const unchangedTrip = await TripsRepository.getTripById(trip.id, user.id);
    assert.equal(
      unchangedTrip?.plan?.assembledAt,
      beforeFailedEdit?.plan?.assembledAt,
      "database failure does not mutate the in-memory active plan",
    );
    assert.equal(
      planningResultCache.get(trip.id, user.id),
      cachedPriorResult,
      "failed persistence does not invalidate the cache before commit",
    );
  } finally {
    restoreFailedEditTransaction();
  }

  const concurrentVersions = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      TripsRepository.recordTripVersion(
        versionInput(trip.id, user.id, plan(trip.id, `concurrent-${index}`), "test"),
      ),
    ),
  );
  assert.equal(
    new Set(concurrentVersions.map((version) => version.versionNumber)).size,
    concurrentVersions.length,
    "concurrent version writes receive distinct sequence numbers",
  );

  const seedTrip = await TripsService.createTrip(user, {
    destination: "Bergen",
    days: 2,
    travellers: 1,
    budget: "moderate",
    interests: ["nature"],
  });
  fixtures.trackTrip(seedTrip.id, user.id);
  await TripsRepository.updateTripPlan(seedTrip.id, user.id, plan(seedTrip.id, "seed"), "upcoming");
  const [seedReadA, seedReadB] = await Promise.all([
    TripsRepository.listTripVersions(seedTrip.id, user.id),
    TripsRepository.listTripVersions(seedTrip.id, user.id),
  ]);
  assert.equal(seedReadA.length, 1, "first concurrent lazy-seed call returns Version 1");
  assert.equal(seedReadB.length, 1, "second concurrent lazy-seed call returns Version 1");
  assert.equal(
    seedReadA[0].id,
    seedReadB[0].id,
    "concurrent lazy-seed calls return the same persisted version ID",
  );
  assert.equal(seedReadA[0].versionNumber, 1);

  assert.ok(firstVersion && secondVersion);
  const restoreResult = await TripsRepository.restoreTripVersion(trip.id, firstVersion.id, user.id);
  if (!restoreResult.success) throw new Error(restoreResult.error);
  assert.equal(restoreResult.success, true, "version restore succeeds");
  const restoredTrip = await TripsRepository.getTripById(trip.id, user.id);
  assert.equal(restoredTrip?.plan?.assembledAt, firstPlan.assembledAt);
  assert.equal(restoreResult.newVersion.scope, "restore");

  const restoreTransaction = injectTransactionFailure();
  try {
    assert.equal(await TripsRepository.deleteTrip(trip.id, user.id), false);
    assert.ok(
      await TripsRepository.getTripById(trip.id, user.id),
      "failed trip deletion retains its in-memory trip state",
    );
    assert.equal(await UsersRepository.deleteAccount(user.id), false);
    assert.ok(
      await UsersRepository.getUserById(user.id),
      "failed account deletion retains its in-memory user state",
    );
  } finally {
    restoreTransaction();
  }

  console.log("Lifecycle integration checks completed successfully.");
}

runScratchTest(runLifecycleChecks).catch((error) => {
  console.error("Lifecycle remediation checks failed:", error);
  process.exitCode = 1;
});
