/**
 * @file src/app/api/trips/[tripId]/versions/[versionId]/restore/route.ts
 *
 * Itinerary Version Restoration API (Phase 20).
 * Atomically restores an immutable historical version snapshot.
 *
 * Invariants:
 * - CSRF origin validation.
 * - Server-side authentication enforced.
 * - Strict IDOR ownership validation.
 * - Concurrency protection via PlanningLockManager.
 * - Non-destructive restoration: appends a new version record with scope 'restore'
 *   without removing any intermediate historical versions.
 * - Returns the restored active plan.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";
import { TripsService } from "@/features/trips/service";
import { PlanningLockManager } from "@/lib/orchestration/planning-lock";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; versionId: string }> },
) {
  // 1. Cross-Origin Mutation Defense
  const csrfBlock = assertCsrfAllowed(req);
  if (csrfBlock) return csrfBlock;

  try {
    // 2. Authentication Verification
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to restore journey version.",
          },
          message: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const { tripId, versionId } = await params;

    // 3. Rate Limiting under MUTATION tier
    const rlBlock = await enforceRateLimit(req, {
      category: "MUTATION",
      userId: user.id,
    });
    if (rlBlock) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please wait a moment before restoring.",
          },
          message: "Too many requests. Please wait a moment before restoring.",
        },
        { status: 429, headers: rlBlock.headers },
      );
    }

    // 4. Strict Ownership Check (IDOR Defense)
    const trip = await TripsService.getTrip(tripId, user.id);
    if (!trip) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Journey not found or you do not have permission to restore it.",
          },
          message: "Journey not found.",
        },
        { status: 404 },
      );
    }

    // 5. Concurrency Protection
    const acquired = PlanningLockManager.acquire(tripId);
    if (!acquired) {
      return NextResponse.json(
        {
          error: {
            code: "EDIT_IN_PROGRESS",
            message: "Another operation is in progress on this journey. Please wait.",
          },
          message: "Modification already in progress.",
        },
        { status: 409 },
      );
    }

    try {
      const result = await TripsService.restoreTripVersion(tripId, versionId, user.id);

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "RESTORE_FAILED",
              message: result.error || "Failed to restore version.",
            },
            message: result.error || "Failed to restore version.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          plan: result.plan,
          restoredVersion: result.restoredVersion,
          newVersion: result.newVersion,
          message: `Journey successfully restored to Version ${result.restoredVersion.versionNumber}.`,
        },
        { status: 200 },
      );
    } finally {
      PlanningLockManager.release(tripId);
    }
  } catch (err) {
    console.error("POST /api/trips/[tripId]/versions/[versionId]/restore fatal error:", err);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to execute version restoration.",
        },
        message: "Failed to execute version restoration.",
      },
      { status: 500 },
    );
  }
}
