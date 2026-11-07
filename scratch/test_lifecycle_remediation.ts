import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { TripsRepository } from "../src/features/trips/repository";
import { TripsService } from "../src/features/trips/service";
import { UsersRepository } from "../src/features/auth/user-repository";
import { db, isDatabaseConfigured } from "../src/lib/db";
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
  const firstVersion = await TripsRepository.updateTripPlanAndRecordVersion({
    ...versionInput(trip.id, user.id, firstPlan, "journey"),
    status: "upcoming",
  });
  assert.ok(firstVersion, "plan edit persists its first history snapshot");

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
