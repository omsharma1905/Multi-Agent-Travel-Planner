/**
 * @file src/lib/travel/cache/memory-cache.ts
 *
 * In-memory TTL cache implementation.
 */

import { TravelCache, CacheEntry } from "./cache-interface";

declare global {
  var __travelMemoryCache: Map<string, CacheEntry<unknown>> | undefined;
}

const store = (global.__travelMemoryCache ??= new Map<string, CacheEntry<unknown>>());

export class MemoryTravelCache implements TravelCache {
  private defaultTtlMs: number;

  constructor(defaultTtlSeconds = 300) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttlMs = ttlSeconds !== undefined ? ttlSeconds * 1000 : this.defaultTtlMs;
    store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async invalidate(key: string): Promise<void> {
    store.delete(key);
  }

  async clear(): Promise<void> {
    store.clear();
  }
}

export const travelCache = new MemoryTravelCache();
