/**
 * @file src/lib/travel/cache/cache-interface.ts
 *
 * Lightweight server-side caching interface.
 * Decouples caching logic so in-memory can easily transition to Redis in the future.
 */

export interface CacheEntry<T> {
  value: T;
  expiresAt: number; // epoch ms
}

export interface TravelCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
  clear(): Promise<void>;
}
