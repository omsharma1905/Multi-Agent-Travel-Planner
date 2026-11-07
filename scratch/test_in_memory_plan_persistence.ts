import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { TripsRepository } from "../src/features/trips/repository";
import { TripsService } from "../src/features/trips/service";
import { isDatabaseConfigured } from "../src/lib/db";
import { planningResultCache } from "../src/lib/orchestration/planning-result-cache";
import type { OrchestrationResult } from "../src/lib/orchestration/types";

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

async function main(): Promise<void> {
  assert.equal(isDatabaseConfigured, false, "test requires database configuration to be disabled");

  const fixtureId = randomUUID();
  const user = {
    id: `usr_memory_plan_${fixtureId}`,
    name: "Memory Plan Test",
    email: `memory_plan_${fixtureId}@safarix.test`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const trip = await TripsService.createTrip(user, {
    destination: "Oslo",
    days: 2,
    travellers: 1,
    budget: "moderate",
    interests: ["culture"],
  });

  const stalePlan = plan(trip.id, "stale");
  const updatedPlan = plan(trip.id, "updated");
  planningResultCache.set(trip.id, user.id, stalePlan);

  const version = await TripsRepository.updateTripPlanAndRecordVersion({
    tripId: trip.id,
    userId: user.id,
    status: "upcoming",
    scope: "journey",
    snapshot: updatedPlan,
    totalCost: 0,
    currency: "USD",
    currencySymbol: "$",
  });

  assert.ok(version, "in-memory plan update records its version");
  assert.equal(version.snapshot.assembledAt, "updated");
  assert.equal(
    planningResultCache.get(trip.id, user.id),
    null,
    "successful in-memory plan update invalidates its stale cache entry",
  );
  const persistedTrip = await TripsRepository.getTripById(trip.id, user.id);
  assert.equal(persistedTrip?.plan?.assembledAt, "updated");

  const seedTrip = await TripsService.createTrip(user, {
    destination: "Bergen",
    days: 2,
    travellers: 1,
    budget: "moderate",
    interests: ["nature"],
  });
  await TripsRepository.updateTripPlan(seedTrip.id, user.id, plan(seedTrip.id, "seed"), "upcoming");
  const [seedReadA, seedReadB] = await Promise.all([
    TripsRepository.listTripVersions(seedTrip.id, user.id),
    TripsRepository.listTripVersions(seedTrip.id, user.id),
  ]);
  assert.equal(seedReadA[0]?.id, seedReadB[0]?.id);

  console.log("In-memory plan persistence checks: 6 passed, 0 failed.");
}

main().catch((error) => {
  console.error("In-memory plan persistence checks failed:", error);
  process.exitCode = 1;
});
