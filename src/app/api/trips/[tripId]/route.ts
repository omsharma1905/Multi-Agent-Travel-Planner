import { NextRequest, NextResponse } from "next/server";
import { TripsService } from "@/features/trips/service";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { assertCsrfAllowed } from "@/lib/security/csrf";
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

    return NextResponse.json(trip, { status: 200 });
  } catch (err) {
    console.error("API GET /api/trips/[tripId] error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve journey." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    // 2. Rate Limiting
    const rlBlock = await enforceRateLimit(req, {
      category: "MUTATION",
      userId: user.id,
    });
    if (rlBlock) return rlBlock;

    const { tripId } = await params;
    const existing = await TripsService.getTrip(tripId, user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Journey not found or you do not have permission to delete it." },
        { status: 404 },
      );
    }

    const success = await TripsService.deleteTrip(tripId, user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete journey." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: "Journey deleted successfully." },
      { status: 200 },
    );
  } catch (err) {
    console.error("API DELETE /api/trips/[tripId] error:", err);
    return NextResponse.json(
      { error: "Failed to delete journey." },
      { status: 500 },
    );
  }
}

