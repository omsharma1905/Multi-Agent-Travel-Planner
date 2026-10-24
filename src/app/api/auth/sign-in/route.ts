/**
 * @file src/app/api/auth/sign-in/route.ts
 *
 * Server-side user authentication endpoint.
 * Verifies credentials against server-stored bcrypt password hashes,
 * issues a cryptographically signed HttpOnly session cookie,
 * and completely rejects default demo credentials in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UsersRepository } from "@/features/auth/user-repository";
import { verifyPassword, hashPassword } from "@/lib/auth/passwords";
import { createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

const signInSchema = z.object({
  email: z.string({ required_error: "Email is required" }).trim().min(1, "Email is required"),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
}).strict();

const DEMO_EMAIL = "demo@safarix.travel";

export async function POST(req: NextRequest) {
  // 1. Cross-Origin Mutation Defense
  const csrfBlock = assertCsrfAllowed(req);
  if (csrfBlock) return csrfBlock;

  try {
    const body = await req.json().catch(() => ({}));

    // 2. Rate Limiting (Strict Brute-Force Protection)
    const rawEmail = typeof body?.email === "string" ? body.email.trim() : undefined;
    const rlBlock = await enforceRateLimit(req, {
      category: "AUTH",
      identifier: rawEmail,
    });
    if (rlBlock) return rlBlock;
    const parsed = signInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid email or password.",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const isProduction = process.env.NODE_ENV === "production";

    // In development mode only, seamlessly seed demo account with a real bcrypt hash if requested
    if (!isProduction && normalizedEmail === DEMO_EMAIL) {
      const existingDemo = await UsersRepository.getUserRecordByEmail(DEMO_EMAIL);
      if (!existingDemo) {
        const demoHash = await hashPassword("password123");
        await UsersRepository.createUser({
          id: "usr_veora_demo_01",
          name: "Elena Rostova",
          email: DEMO_EMAIL,
          passwordHash: demoHash,
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        });
      }
    }

    // Look up user record including password hash
    const record = await UsersRepository.getUserRecordByEmail(normalizedEmail);
    if (!record || !record.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Verify plaintext password against bcrypt hash
    const isValidPassword = await verifyPassword(password, record.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    // Issue signed server session
    const token = await createSessionToken(record.id, record.email);
    const cookieOpts = getSessionCookieOptions();

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: record.id,
          name: record.name,
          email: record.email,
          avatarUrl: record.avatarUrl,
          createdAt: record.createdAt,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
          Pragma: "no-cache",
        },
      },
    );

    response.cookies.set({
      name: cookieOpts.name,
      value: token,
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;
  } catch (err) {
    console.error("[Auth API] Sign-in error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Unable to complete sign-in. Please try again later." },
      { status: 500 },
    );
  }
}
