/**
 * @file src/lib/security/csrf.ts
 *
 * Production Cross-Origin Mutation Defense & CSRF Validation.
 *
 * Enforces strict origin and host validation on all state-changing HTTP methods
 * (POST, PUT, PATCH, DELETE) to protect cookie-authenticated endpoints.
 *
 * Security Invariants:
 * - Uses exact normalized URL origin comparisons (NEVER endsWith, includes, or regex substring matching).
 * - Validates Origin against NEXT_PUBLIC_APP_URL, req.nextUrl.origin, and the Host header.
 * - Inspects Sec-Fetch-Site headers to detect cross-site requests even when Origin is omitted.
 * - Immediately rejects malicious cross-origin requests with HTTP 403 Forbidden.
 */

import { NextRequest, NextResponse } from "next/server";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Normalizes an origin string to standard origin representation (lowercase protocol + host + port).
 */
function normalizeOrigin(originStr: string): string | null {
  try {
    const url = new URL(originStr);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Retrieves the set of trusted first-party origins for the application.
 */
function getTrustedOrigins(req: NextRequest): Set<string> {
  const trusted = new Set<string>();

  // 1. Current request URL origin
  const reqOrigin = normalizeOrigin(req.nextUrl.origin);
  if (reqOrigin) trusted.add(reqOrigin);

  // 2. Request host header origin (both http and https variants for local/proxy environments)
  const host = req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
    const hostOrigin = normalizeOrigin(`${proto}://${host}`);
    if (hostOrigin) trusted.add(hostOrigin);
    // Also add http/https specifically if in development
    if (process.env.NODE_ENV !== "production") {
      const httpOrigin = normalizeOrigin(`http://${host}`);
      const httpsOrigin = normalizeOrigin(`https://${host}`);
      if (httpOrigin) trusted.add(httpOrigin);
      if (httpsOrigin) trusted.add(httpsOrigin);
    }
  }

  // 3. Configured environment application URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl) {
    const configuredOrigin = normalizeOrigin(appUrl);
    if (configuredOrigin) trusted.add(configuredOrigin);
  }

  return trusted;
}

/**
 * Asserts that the request does not violate cross-origin mutation restrictions.
 * Returns null if allowed; returns a 403 Forbidden NextResponse if rejected.
 */
export function assertCsrfAllowed(req: NextRequest): NextResponse | null {
  // Safe read methods are not subject to CSRF mutation validation
  if (!MUTATION_METHODS.has(req.method.toUpperCase())) {
    return null;
  }

  const rawOrigin = req.headers.get("origin");
  const secFetchSite = req.headers.get("sec-fetch-site");
  const trustedOrigins = getTrustedOrigins(req);

  // Case 1: Browser provided an Origin header
  if (rawOrigin) {
    const normalizedClientOrigin = normalizeOrigin(rawOrigin);
    if (!normalizedClientOrigin || !trustedOrigins.has(normalizedClientOrigin)) {
      return NextResponse.json(
        { error: "Cross-origin request forbidden. Invalid origin." },
        { status: 403 },
      );
    }
    return null;
  }

  // Case 2: Origin is absent, but Sec-Fetch-Site indicates cross-site navigation
  if (secFetchSite === "cross-site") {
    return NextResponse.json(
      { error: "Cross-origin request forbidden." },
      { status: 403 },
    );
  }

  // Case 3: Origin is absent, but Referer is present
  const referer = req.headers.get("referer");
  if (referer) {
    const normalizedRefererOrigin = normalizeOrigin(referer);
    if (!normalizedRefererOrigin || !trustedOrigins.has(normalizedRefererOrigin)) {
      return NextResponse.json(
        { error: "Cross-origin request forbidden. Invalid referer." },
        { status: 403 },
      );
    }
    return null;
  }

  // Case 4: Non-browser clients (direct cURL, server-to-server, or test runners without Origin)
  // Allowed if not explicitly cross-site
  return null;
}
