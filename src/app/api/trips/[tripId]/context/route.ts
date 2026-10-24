/**
 * @file src/app/api/trips/[tripId]/context/route.ts
 *
 * Protected API endpoint returning the normalized, validated TripContext
 * for an authenticated trip. Strictly enforces user ownership.
 */

import { NextRequest, NextResponse } from "next/server";
import { TripsService } from "@/features/trips/service";
import { tripContextAssembler } from "@/lib/travel/services/trip-context-assembler";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
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

    const { tripId } = await params;
    const trip = await TripsService.getTrip(tripId, user.id);

    if (!trip) {
      return NextResponse.json(
        { error: "Journey not found or you do not have permission to view it." },
        { status: 404 },
      );
    }

    const context = await tripContextAssembler.assembleTripContext(trip);
    return NextResponse.json(context, { status: 200 });
  } catch (err: unknown) {
    console.error("GET /api/trips/[tripId]/context error:", err);
    return NextResponse.json(
      {
        error: "Failed to assemble trip context.",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
