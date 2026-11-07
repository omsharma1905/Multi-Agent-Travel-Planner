import assert from "node:assert/strict";
import { PlanningResultCache } from "../src/lib/orchestration/planning-result-cache";
import { persistPlanningResult } from "../src/lib/orchestration/planning-persistence-response";
import type { OrchestrationResult } from "../src/lib/orchestration/types";

function result(tripId: string, assembledAt: string): OrchestrationResult {
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
    validation: null,
    assembledAt,
  };
}

async function main(): Promise<void> {
  const cache = new PlanningResultCache();
  const plan = result("trip-response", "new");
  const stalePlan = result("trip-response", "stale");
  const input = {
    tripId: plan.tripId,
    userId: "user-response",
    status: "upcoming" as const,
    scope: "journey",
    snapshot: plan,
    totalCost: 0,
    currency: "USD",
    currencySymbol: "$",
  };

  cache.set(input.tripId, input.userId, stalePlan);
  let persistenceCompleted = false;
  const successResponse = await persistPlanningResult(
    input,
    plan,
    async () => {
      assert.equal(cache.get(input.tripId, input.userId), stalePlan);
      persistenceCompleted = true;
      return { id: "version-1" };
    },
    cache,
  );
  assert.equal(persistenceCompleted, true);
  assert.equal(successResponse.status, 200);
  assert.equal(cache.get(input.tripId, input.userId), plan);

  cache.set(input.tripId, input.userId, stalePlan);
  const failureResponse = await persistPlanningResult(
    input,
    plan,
    async () => {
      throw new Error("Injected persistence failure.");
    },
    cache,
  );
  assert.equal(failureResponse.status, 500);
  assert.equal(cache.get(input.tripId, input.userId), stalePlan);

  const missingResponse = await persistPlanningResult(input, plan, async () => null, cache);
  assert.equal(missingResponse.status, 404);
  assert.equal(cache.get(input.tripId, input.userId), null);

  console.log("Planning persistence response checks: 3 passed, 0 failed.");
}

main().catch((error) => {
  console.error("Planning persistence response checks failed:", error);
  process.exitCode = 1;
});
