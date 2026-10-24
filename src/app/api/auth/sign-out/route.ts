/**
 * @file src/app/api/auth/sign-out/route.ts
 *
 * Server-side logout endpoint.
 * Clears the authenticated session cookie on the server.
 */

import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

export async function POST(req: NextRequest) {
  // 1. Cross-Origin Mutation Defense
  const csrfBlock = assertCsrfAllowed(req);
  if (csrfBlock) return csrfBlock;

  // 2. Rate Limiting
  const rlBlock = await enforceRateLimit(req, { category: "AUTH" });
  if (rlBlock) return rlBlock;

  const response = NextResponse.json(
    { success: true },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
      },
    },
  );

  // Clear session cookie with explicit expiry in the past
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
