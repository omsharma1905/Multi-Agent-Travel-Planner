/**
 * @file src/app/api/trips/[tripId]/versions/route.ts
 *
 * Itinerary Version History API (Phase 20).
 * Lists all immutable version snapshots for a trip (newest first).
 *
 * Invariants:
 * - Server-side authentication enforced.
 * - Strict IDOR ownership validation.
 * - Auto-seeds Version 1 baseline if trip has a completed plan but no prior versions.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { TripsService } from "@/features/trips/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to view journey history.",
          },
          message: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const { tripId } = await params;

    // Strict ownership check
    const trip = await TripsService.getTrip(tripId, user.id);
    if (!trip) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Journey not found or you do not have permission to view it.",
          },
          message: "Journey not found.",
        },
        { status: 404 },
      );
    }

    const versions = await TripsService.listTripVersions(tripId, user.id);

    return NextResponse.json(
      {
        success: true,
        tripId,
        versions,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("GET /api/trips/[tripId]/versions fatal error:", err);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve journey version history.",
        },
        message: "Failed to retrieve journey version history.",
      },
      { status: 500 },
    );
  }
}
