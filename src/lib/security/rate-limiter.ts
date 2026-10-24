/**
 * @file src/lib/security/rate-limiter.ts
 *
 * Production-Grade Multi-Tiered Distributed Rate Limiting Architecture.
 *
 * Implements fine-grained rate-limit tiers:
 * - AUTH: strict brute-force protection (5 req/min)
 * - AI_PLANNING: strict high-cost orchestration protection (3 req/min)
 * - PROVIDER_SEARCH: moderate external geocoding/places protection (30 req/min)
 * - MUTATION: moderate trip/profile state mutation protection (20 req/min)
 * - READ: higher read throughput allowance (100 req/min)
 *
 * Distributed Architecture:
 * - Production: Powered by @upstash/ratelimit and @upstash/redis using UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 * - Strict Production Guard: Fails fast if Upstash credentials are missing in NODE_ENV=production.
 * - Secure Fail-Closed Policy: If Redis is unavailable, security-sensitive categories (AUTH, AI_PLANNING, PROVIDER_SEARCH, MUTATION)
 *   fail closed with HTTP 503 and Retry-After to prevent rate-limit bypass.
 * - Development & Test Fallback: In-process sliding-window memory limiter with automatic garbage collection.
 * - Standard HTTP 429 response with Retry-After header and sanitized JSON error body.
 */

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "./logger";

export type RateLimitCategory =
  | "AUTH"
  | "AI_PLANNING"
  | "PROVIDER_SEARCH"
  | "MUTATION"
  | "READ";

export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMIT_POLICIES: Record<RateLimitCategory, RateLimitPolicy> = {
  AUTH: { limit: 5, windowSeconds: 60 },
  AI_PLANNING: { limit: 3, windowSeconds: 60 },
  PROVIDER_SEARCH: { limit: 30, windowSeconds: 60 },
  MUTATION: { limit: 20, windowSeconds: 60 },
  READ: { limit: 100, windowSeconds: 60 },
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export interface RateLimiterProvider {
  check(key: string, category: RateLimitCategory): Promise<RateLimitResult>;
  reset?(key: string): Promise<void>;
}

// -----------------------------------------------------------------------------
// In-Memory Sliding Window Rate Limiter (Dev / Local Test Fallback)
// -----------------------------------------------------------------------------

interface SlidingWindowRecord {
  timestamps: number[];
  lastEviction: number;
}

class MemoryRateLimiter implements RateLimiterProvider {
  private store: Map<string, SlidingWindowRecord>;

  constructor() {
    this.store = new Map();
  }

  async check(key: string, category: RateLimitCategory): Promise<RateLimitResult> {
    const policy = RATE_LIMIT_POLICIES[category];
    const { limit, windowSeconds } = policy;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [], lastEviction: now };
      this.store.set(key, record);
    }

    // Filter out timestamps outside the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
    record.lastEviction = now;

    const currentCount = record.timestamps.length;
    const allowed = currentCount < limit;

    let resetSeconds = windowSeconds;
    if (record.timestamps.length > 0) {
      const oldestInWindow = record.timestamps[0];
      const expiryMs = oldestInWindow + windowMs;
      resetSeconds = Math.max(1, Math.ceil((expiryMs - now) / 1000));
    }

    if (allowed) {
      record.timestamps.push(now);
      const remaining = Math.max(0, limit - record.timestamps.length);
      return { allowed: true, limit, remaining, resetSeconds };
    }

    return { allowed: false, limit, remaining: 0, resetSeconds };
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    for (const [key, record] of this.store.entries()) {
      if (now - record.lastEviction > maxAge) {
        this.store.delete(key);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Upstash Redis Distributed Provider (@upstash/ratelimit & @upstash/redis)
// -----------------------------------------------------------------------------

class UpstashDistributedRateLimiter implements RateLimiterProvider {
  private redis: Redis;
  private limiters: Map<RateLimitCategory, Ratelimit>;

  constructor(url: string, token: string) {
    this.redis = new Redis({
      url: url.replace(/\/+$/, ""),
      token: token.trim(),
    });

    this.limiters = new Map();
    // Initialize sliding-window limiters per category
    for (const [cat, policy] of Object.entries(RATE_LIMIT_POLICIES) as [RateLimitCategory, RateLimitPolicy][]) {
      const limiter = new Ratelimit({
        redis: this.redis,
        limiter: Ratelimit.slidingWindow(policy.limit, `${policy.windowSeconds} s`),
        prefix: `safarix:rl:${cat.toLowerCase()}`,
      });
      this.limiters.set(cat, limiter);
    }
  }

  async check(key: string, category: RateLimitCategory): Promise<RateLimitResult> {
    const limiter = this.limiters.get(category);
    const policy = RATE_LIMIT_POLICIES[category];
    if (!limiter) {
      return { allowed: true, limit: policy.limit, remaining: policy.limit, resetSeconds: policy.windowSeconds };
    }

    const { success, limit, remaining, reset } = await limiter.limit(key);
    const now = Date.now();
    const resetSeconds = Math.max(1, Math.ceil((reset - now) / 1000));

    return {
      allowed: success,
      limit,
      remaining: Math.max(0, remaining),
      resetSeconds,
    };
  }

  async reset(key: string): Promise<void> {
    try {
      await this.redis.del(`safarix:rl:*:${key}`);
    } catch {
      // Ignored
    }
  }
}

// -----------------------------------------------------------------------------
// Provider Selection & Fail-Fast Architecture
// -----------------------------------------------------------------------------

declare global {
  var __safarixRateLimiterInstance: RateLimiterProvider | undefined;
}

const memoryFallbackProvider = new MemoryRateLimiter();

export function getRateLimiter(): RateLimiterProvider {
  if (global.__safarixRateLimiterInstance) {
    return global.__safarixRateLimiterInstance;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Production requirement: fail fast if Upstash credentials are missing
  if (isProduction && (!redisUrl || !redisToken)) {
    throw new Error(
      "[RateLimiter] CRITICAL CONFIGURATION ERROR: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured in production (NODE_ENV=production). In-memory rate limiting fallback is strictly forbidden in production to prevent distributed bypass across horizontal instances.",
    );
  }

  if (redisUrl && redisToken) {
    try {
      global.__safarixRateLimiterInstance = new UpstashDistributedRateLimiter(redisUrl, redisToken);
      return global.__safarixRateLimiterInstance;
    } catch (err) {
      if (isProduction) {
        throw new Error(`[RateLimiter] CRITICAL CONFIGURATION ERROR: Failed to initialize Upstash Redis distributed rate limiter: ${String(err)}`);
      }
      logger.warn("[RateLimiter] Failed to initialize Upstash Redis in development, falling back to in-memory limiter:", err);
    }
  }

  // Development and test mode fallback
  global.__safarixRateLimiterInstance = memoryFallbackProvider;
  return global.__safarixRateLimiterInstance;
}

/**
 * Extracts normalized client IP safely from request headers
 */
export function extractClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp && cfConnectingIp.trim()) {
    return cfConnectingIp.trim();
  }

  return "127.0.0.1";
}

export interface CheckRateLimitOptions {
  userId?: string;
  identifier?: string;
  category: RateLimitCategory;
}

/**
 * Enforces rate limiting against the current request.
 * Returns null if allowed; returns a 429 or 503 NextResponse if throttled or unavailable.
 */
export async function enforceRateLimit(
  req: NextRequest,
  options: CheckRateLimitOptions,
): Promise<NextResponse | null> {
  const clientIp = extractClientIp(req);

  // Scoped key formatting per Part 3 specifications:
  // - Authenticated: user:<userId>:<category>
  // - Anonymous: ip:<normalizedIp>:<category>
  // - Auth: auth:<normalizedEmail || clientIp>:<category>
  let key: string;
  if (options.userId) {
    key = `user:${options.userId}:${options.category}`;
  } else if (options.identifier) {
    key = `auth:${options.identifier.toLowerCase().trim()}:${options.category}`;
  } else {
    key = `ip:${clientIp}:${options.category}`;
  }

  let limiter: RateLimiterProvider;
  try {
    limiter = getRateLimiter();
  } catch (err) {
    logger.error("[RateLimiter] Rate limiter initialization failure:", err);
    return NextResponse.json(
      { error: "Service configuration error. Rate limiting unavailable." },
      { status: 503 },
    );
  }

  let result: RateLimitResult;
  try {
    result = await limiter.check(key, options.category);
  } catch (err) {
    logger.error(`[RateLimiter] Rate limit evaluation failure for ${key}:`, err);

    // Part 4 Upstash Failure Behavior:
    // Security-sensitive categories fail closed with HTTP 503 and Retry-After
    if (options.category === "AUTH" || options.category === "AI_PLANNING" || options.category === "MUTATION" || options.category === "PROVIDER_SEARCH") {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again shortly." },
        {
          status: 503,
          headers: { "Retry-After": "30" },
        },
      );
    }

    // READ category: Fail safe using local memory check in emergencies to preserve read availability
    result = await memoryFallbackProvider.check(key, options.category);
  }

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": result.resetSeconds.toString(),
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": (Math.floor(Date.now() / 1000) + result.resetSeconds).toString(),
        },
      },
    );
  }

  return null;
}
