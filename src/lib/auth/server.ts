/**
 * @file src/lib/auth/server.ts
 *
 * Authoritative server-side identity resolver.
 * Reads cryptographically signed session cookies, verifies token authenticity and expiration,
 * and fetches the authenticated user from the database.
 *
 * CRITICAL SECURITY INVARIANTS:
 * - NEVER trusts client-supplied headers (e.g. x-veora-user).
 * - NEVER trusts client-supplied user IDs or emails.
 * - NEVER defaults to DEMO_USER when unauthenticated.
 * - Returns null for any tampered, expired, or missing session.
 */

import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { UsersRepository } from "@/features/auth/user-repository";
import { User } from "@/features/auth/types";
import { verifySessionToken, SESSION_COOKIE_NAME } from "./session";

/**
 * Extracts and verifies the authenticated user from the server session cookie.
 * Can be called with a NextRequest instance or standalone in App Router contexts.
 */
export async function getAuthenticatedUser(req?: NextRequest): Promise<User | null> {
  let sessionToken: string | undefined;

  if (req) {
    sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // Outside request context
      return null;
    }
  }

  if (!sessionToken) {
    return null;
  }

  const payload = await verifySessionToken(sessionToken);
  if (!payload || !payload.userId) {
    return null;
  }

  // Fetch verified user from database / repository
  const user = await UsersRepository.getUserById(payload.userId);
  if (!user) {
    return null;
  }

  return user;
}
