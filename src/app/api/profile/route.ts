/**
 * @file src/app/api/profile/route.ts
 *
 * User Profile API endpoint.
 * Allows authenticated travelers to inspect and update their account profile.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UsersRepository } from "@/features/auth/user-repository";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

const updateProfileSchema = z.object({
  name: z
    .string({ required_error: "Full name is required" })
    .trim()
    .min(2, "Full name must be at least 2 characters long")
    .max(100, "Full name cannot exceed 100 characters"),
}).strict();

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const rlBlock = await enforceRateLimit(req, {
      category: "READ",
      userId: user.id,
    });
    if (rlBlock) return rlBlock;

    const profile = await UsersRepository.getUserById(user.id);
    return NextResponse.json(profile || user, { status: 200 });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve profile." },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  // 1. Cross-Origin Mutation Defense
  const csrfBlock = assertCsrfAllowed(req);
  if (csrfBlock) return csrfBlock;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // 2. Mutation Rate Limiting
    const rlBlock = await enforceRateLimit(req, {
      category: "MUTATION",
      userId: user.id,
    });
    if (rlBlock) return rlBlock;

    const body = await req.json().catch(() => ({}));
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updated = await UsersRepository.updateUserName(user.id, parsed.data.name);
    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update profile." },
        { status: 500 },
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/profile error:", err);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 },
    );
  }
}
