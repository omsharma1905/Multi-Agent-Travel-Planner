import type { OrchestrationResult } from "./types";

export interface PlanningResultCacheEntry {
  userId: string;
  result: OrchestrationResult;
  expiresAt: number;
}

export class PlanningResultCache {
  constructor(
    private readonly store: Map<string, PlanningResultCacheEntry> = new Map(),
    private readonly ttlMs = 5 * 60_000,
    private readonly maxEntries = 500,
    private readonly now: () => number = Date.now,
  ) {}

  get(tripId: string, userId: string): OrchestrationResult | null {
    const entry = this.store.get(tripId);
    if (!entry) return null;

    if (
      typeof entry.userId !== "string" ||
      typeof entry.expiresAt !== "number" ||
      this.now() >= entry.expiresAt
    ) {
      this.store.delete(tripId);
      return null;
    }

    if (entry.userId !== userId) return null;

    this.store.delete(tripId);
    this.store.set(tripId, entry);
    return entry.result;
  }

  set(tripId: string, userId: string, result: OrchestrationResult): void {
    const now = this.now();
    this.removeExpired(now);
    this.store.delete(tripId);
    this.store.set(tripId, {
      userId,
      result,
      expiresAt: now + this.ttlMs,
    });

    while (this.store.size > this.maxEntries) {
      const oldestTripId = this.store.keys().next().value;
      if (oldestTripId === undefined) break;
      this.store.delete(oldestTripId);
    }
  }

  invalidateTrip(tripId: string): void {
    this.store.delete(tripId);
  }

  invalidateUser(userId: string): void {
    for (const [tripId, entry] of this.store) {
      if (entry.userId === userId) this.store.delete(tripId);
    }
  }

  private removeExpired(now: number): void {
    for (const [tripId, entry] of this.store) {
      if (now >= entry.expiresAt) this.store.delete(tripId);
    }
  }
}

declare global {
  var __tripPlanningCache: Map<string, PlanningResultCacheEntry> | undefined;
}

// This cache is process-local; invalidation does not propagate across server instances.
const processStore = (global.__tripPlanningCache ??= new Map<string, PlanningResultCacheEntry>());

export const planningResultCache = new PlanningResultCache(processStore);
