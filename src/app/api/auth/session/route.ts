/**
 * @file src/app/api/auth/session/route.ts
 *
 * Current session status endpoint.
 * Allows client state (AuthProvider) to synchronize with verified server session.
 * Never leaks password hashes or tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Rate Limiting
  const rlBlock = await enforceRateLimit(req, { category: "READ" });
  if (rlBlock) return rlBlock;

  try {
    const user = await getAuthenticatedUser(req);
    return NextResponse.json(
      { user },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  } catch (err) {
    console.error("[Auth API] Session query error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { user: null },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );
  }
}
