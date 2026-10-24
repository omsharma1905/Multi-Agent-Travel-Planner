/**
 * @file src/app/api/trips/[tripId]/versions/[versionId]/route.ts
 *
 * Specific Version Snapshot Inspection API (Phase 20).
 * Retrieves full details and snapshot for an individual historical version.
 *
 * Invariants:
 * - Server-side authentication enforced.
 * - Strict IDOR ownership validation.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { TripsService } from "@/features/trips/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; versionId: string }> },
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to view journey version.",
          },
          message: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const { tripId, versionId } = await params;

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

    const version = await TripsService.getTripVersion(tripId, versionId, user.id);
    if (!version) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Specified journey version was not found.",
          },
          message: "Version not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        version,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("GET /api/trips/[tripId]/versions/[versionId] fatal error:", err);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve journey version.",
        },
        message: "Failed to retrieve journey version.",
      },
      { status: 500 },
    );
  }
}
