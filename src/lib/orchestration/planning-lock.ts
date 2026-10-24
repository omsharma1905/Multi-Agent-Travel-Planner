/**
 * @file src/lib/orchestration/planning-lock.ts
 *
 * Centralized planning and regeneration concurrency control.
 * Prevents simultaneous AI orchestration or editing runs on the same trip.
 * Automatically evicts stale locks after STALE_LOCK_TIMEOUT_MS.
 */

declare global {
  var __globalTripPlanningLockMap: Map<string, number> | undefined;
}

const lockMap = (global.__globalTripPlanningLockMap ??= new Map<string, number>());
const STALE_LOCK_TIMEOUT_MS = 60_000; // 60 seconds

export class PlanningLockManager {
  /**
   * Checks if a trip currently has an active planning or regeneration lock.
   */
  static isLocked(tripId: string): boolean {
    const lockTime = lockMap.get(tripId);
    if (!lockTime) return false;

    if (Date.now() - lockTime > STALE_LOCK_TIMEOUT_MS) {
      // Evict stale lock
      lockMap.delete(tripId);
      return false;
    }

    return true;
  }

  /**
   * Attempts to acquire the lock for a trip. Returns true if acquired, false if conflict.
   */
  static acquire(tripId: string): boolean {
    if (this.isLocked(tripId)) {
      return false;
    }
    lockMap.set(tripId, Date.now());
    return true;
  }

  /**
   * Releases the lock for a trip.
   */
  static release(tripId: string): void {
    lockMap.delete(tripId);
  }

  /**
   * For testing or maintenance: clears all locks.
   */
  static clearAll(): void {
    lockMap.clear();
  }
}
