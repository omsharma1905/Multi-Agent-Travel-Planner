/**
 * @file src/app/api/trips/[tripId]/status/route.ts
 *
 * Status update API endpoint.
 * Allows authenticated travelers to transition trip status (e.g., mark journey as completed).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TripsService } from "@/features/trips/service";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";
import { TripStatus } from "@/types";

const statusSchema = z.object({
  status: z.enum(["planning", "upcoming", "ongoing", "completed", "failed"], {
    errorMap: () => ({ message: "Invalid status provided. Allowed: planning, upcoming, ongoing, completed, failed" }),
  }),
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
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const newStatus = parsed.data.status as TripStatus;

    // Verify ownership
    const existingTrip = await TripsService.getTrip(tripId, user.id);
    if (!existingTrip) {
      return NextResponse.json(
        { error: "Journey not found or you do not have permission to modify it." },
        { status: 404 },
      );
    }

    const updated = await TripsService.updateTripStatus(tripId, user.id, newStatus);
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/trips/[tripId]/status error:", err);
    return NextResponse.json(
      { error: "Failed to update journey status." },
      { status: 500 },
    );
  }
}
