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
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/passwords";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

const updateProfileSchema = z.object({
  name: z
    .string({ required_error: "Full name is required" })
    .trim()
    .min(2, "Full name must be at least 2 characters long")
    .max(100, "Full name cannot exceed 100 characters"),
}).strict();

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE", {
    errorMap: () => ({ message: "Type DELETE to confirm account deletion." }),
  }),
  password: z.string().optional(),
});

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

export async function DELETE(req: NextRequest) {
  // 1. Cross-Origin Mutation Defense
  const csrfBlock = assertCsrfAllowed(req);
  if (csrfBlock) return csrfBlock;

  try {
    // 2. Authoritative Server-Side Authentication (NEVER trust client user ID)
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // 3. Mutation Rate Limiting
    const rlBlock = await enforceRateLimit(req, {
      category: "MUTATION",
      userId: user.id,
    });
    if (rlBlock) return rlBlock;

    // 4. Validate explicit DELETE confirmation
    const body = await req.json().catch(() => ({}));
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Confirmation keyword 'DELETE' is required to permanently delete your account.",
        },
        { status: 400 },
      );
    }

    // 5. Re-authentication password verification (if password supplied)
    if (parsed.data.password) {
      const userRecord = await UsersRepository.getUserRecordById(user.id);
      if (userRecord?.passwordHash) {
        const isMatch = await verifyPassword(parsed.data.password, userRecord.passwordHash);
        if (!isMatch) {
          return NextResponse.json(
            { error: "Invalid account password. Re-authentication failed." },
            { status: 403 },
          );
        }
      }
    }

    // 6. Transactional deletion of user account and all associated relational records
    const deleted = await UsersRepository.deleteAccount(user.id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to delete account. Please try again." },
        { status: 500 },
      );
    }

    // 7. Success response + Invalidate session cookie immediately
    const response = NextResponse.json(
      {
        success: true,
        message: "Your account and all associated data have been permanently deleted.",
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
  } catch (err) {
    console.error("DELETE /api/profile error:", err);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again later." },
      { status: 500 },
    );
  }
}
