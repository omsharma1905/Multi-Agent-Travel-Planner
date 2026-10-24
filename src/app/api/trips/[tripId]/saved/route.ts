/**
 * @file src/app/api/trips/[tripId]/saved/route.ts
 *
 * Saved (bookmarked) status update API endpoint.
 * Allows authenticated travelers to save or unsave journeys.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TripsService } from "@/features/trips/service";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

const savedSchema = z.object({
  saved: z.boolean({ required_error: "saved flag is required" }),
}).strict();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
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

    const { tripId } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = savedSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify ownership
    const existingTrip = await TripsService.getTrip(tripId, user.id);
    if (!existingTrip) {
      return NextResponse.json(
        { error: "Journey not found or you do not have permission to modify it." },
        { status: 404 },
      );
    }

    const updated = await TripsService.setTripSaved(tripId, user.id, parsed.data.saved);
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/trips/[tripId]/saved error:", err);
    return NextResponse.json(
      { error: "Failed to update saved status." },
      { status: 500 },
    );
  }
}
