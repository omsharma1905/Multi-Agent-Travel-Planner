/**
 * @file src/app/api/auth/sign-up/route.ts
 *
 * Server-side user registration endpoint.
 * Validates input, hashes password with bcrypt (cost 12), persists user to database,
 * issues signed HttpOnly session cookie, and returns safe user information.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UsersRepository } from "@/features/auth/user-repository";
import { hashPassword } from "@/lib/auth/passwords";
import { createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

const signUpSchema = z.object({
  name: z
    .string({ required_error: "Full name is required" })
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name cannot exceed 100 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Please provide a valid email address")
    .max(150, "Email cannot exceed 150 characters"),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters long")
    .max(100, "Password cannot exceed 100 characters"),
}).strict();

export async function POST(req: NextRequest) {
  // 1. Cross-Origin Mutation Defense
  const csrfBlock = assertCsrfAllowed(req);
  if (csrfBlock) return csrfBlock;

  try {
    const body = await req.json().catch(() => ({}));

    // 2. Rate Limiting (Brute-Force & Abuse Protection)
    const rawEmail = typeof body?.email === "string" ? body.email.trim() : undefined;
    const rlBlock = await enforceRateLimit(req, {
      category: "AUTH",
      identifier: rawEmail,
    });
    if (rlBlock) return rlBlock;
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existing = await UsersRepository.getUserRecordByEmail(normalizedEmail);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 400 },
      );
    }

    // Hash password on server with bcrypt
    const passwordHash = await hashPassword(password);

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=1769FF&textColor=ffffff`;

    // Persist user record
    const user = await UsersRepository.createUser({
      id: userId,
      name,
      email: normalizedEmail,
      passwordHash,
      avatarUrl,
    });

    // Create signed session token and set HttpOnly cookie
    const token = await createSessionToken(user.id, user.email);
    const cookieOpts = getSessionCookieOptions();

    const response = NextResponse.json(
      { success: true, user },
      {
        status: 201,
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
    console.error("[Auth API] Sign-up error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: "Unable to create account. Please try again later." },
      { status: 500 },
    );
  }
}
