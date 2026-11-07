import assert from "node:assert/strict";
import { PlanningResultCache } from "../src/lib/orchestration/planning-result-cache";
import type { OrchestrationResult } from "../src/lib/orchestration/types";

function result(tripId: string): OrchestrationResult {
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
    assembledAt: new Date(0).toISOString(),
  };
}

let now = 1_000;
const cache = new PlanningResultCache(new Map(), 100, 2, () => now);
const first = result("trip-a");
const second = result("trip-b");
const third = result("trip-c");

cache.set("trip-a", "user-a", first);
assert.equal(cache.get("trip-a", "user-b"), null, "cache entries are owner-scoped");
assert.equal(cache.get("trip-a", "user-a"), first, "owner can retrieve cached result");

cache.set("trip-b", "user-b", second);
assert.equal(cache.get("trip-a", "user-a"), first, "read refreshes the LRU position");
cache.set("trip-c", "user-c", third);
assert.equal(cache.get("trip-b", "user-b"), null, "capacity evicts the least-recently-used entry");

cache.invalidateTrip("trip-c");
assert.equal(cache.get("trip-c", "user-c"), null, "trip invalidation removes its entry");

cache.set("trip-c", "user-c", third);
cache.set("trip-a", "user-a", first);
cache.invalidateUser("user-a");
assert.equal(cache.get("trip-a", "user-a"), null, "account invalidation removes owned entries");

cache.set("trip-b", "user-b", second);
now += 100;
assert.equal(cache.get("trip-b", "user-b"), null, "expired entries are not returned");

console.log("Planning result cache checks: 7 passed, 0 failed.");
