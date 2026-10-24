/**
 * @file src/lib/security/internal-guard.ts
 *
 * Strict protection guard for internal diagnostic and verification test endpoints.
 * In production environments (NODE_ENV === "production"), internal test endpoints
 * must return a clean 404 Not Found without executing diagnostics, mutating state,
 * or exposing system architecture.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Asserts that the internal test endpoint is allowed to execute.
 * Returns a 404 NextResponse if accessed in production without a valid internal secret;
 * otherwise returns null.
 */
export function assertInternalRouteAllowed(req?: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret && req?.headers.get("x-internal-secret") === internalSecret) {
      return null; // Authorized internal diagnostic caller
    }
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

