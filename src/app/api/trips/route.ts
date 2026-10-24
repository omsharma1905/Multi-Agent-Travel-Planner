import { NextRequest, NextResponse } from "next/server";
import { createTripSchema } from "@/features/trips/schemas";
import { TripsService } from "@/features/trips/service";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

export async function POST(req: NextRequest) {
  // 1. Cross-Origin Mutation Defense
  const csrfBlock = assertCsrfAllowed(req);
  if (csrfBlock) return csrfBlock;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to create a journey." },
        { status: 401 },
      );
    }

    // 2. Mutation Rate Limiting
    const rlBlock = await enforceRateLimit(req, {
      category: "MUTATION",
      userId: user.id,
    });
    if (rlBlock) return rlBlock;

    const body = await req.json();
    const parsed = createTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const trip = await TripsService.createTrip(user, parsed.data);

    return NextResponse.json(trip, { status: 201 });
  } catch (err) {
    console.error("API /api/trips error:", err);
    return NextResponse.json(
      { error: "Failed to create trip. Please try again later." },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // Rate Limiting (Read Operations)
    const rlBlock = await enforceRateLimit(req, {
      category: "READ",
      userId: user.id,
    });
    if (rlBlock) return rlBlock;

    const trips = await TripsService.listUserTrips(user.id);
    return NextResponse.json(trips, { status: 200 });
  } catch (err) {
    console.error("API GET /api/trips error:", err);
    return NextResponse.json(
      { error: "Failed to fetch journeys." },
      { status: 500 },
    );
  }
}
