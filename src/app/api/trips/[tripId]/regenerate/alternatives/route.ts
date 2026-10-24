/**
 * @file src/app/api/trips/[tripId]/regenerate/alternatives/route.ts
 *
 * Provides alternative candidates for Stay, Transport, Activities (Places), and Food (Restaurants)
 * to support user-driven selective journey editing and replacements.
 *
 * Enforces:
 * - Authentication & IDOR ownership
 * - Rate limiting
 * - Real provider candidate extraction via TravelService
 */

import { NextRequest, NextResponse } from "next/server";
import { TripsService } from "@/features/trips/service";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { enforceRateLimit } from "@/lib/security/rate-limiter";
import { travelService } from "@/lib/travel";
import { OrchestrationResult } from "@/lib/orchestration/types";

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
            message: "Authentication required to view alternatives.",
          },
        },
        { status: 401 },
      );
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
        {
          error: {
            code: "NOT_FOUND",
            message: "Journey not found or you do not have permission to view it.",
          },
        },
        { status: 404 },
      );
    }

    const domain = req.nextUrl.searchParams.get("domain") || "all";
    const plan = trip.plan as OrchestrationResult | undefined;

    // Retrieve fresh candidates for the trip
    const context = await travelService.prepareTripContext(trip);

    // Extract currently selected IDs to prevent suggesting duplicates
    const currentStayId = plan?.stay?.recommendedStayId || plan?.selectedStayDetails?.id;
    const currentTransportId = plan?.transportation?.recommendedOptionId;

    const currentPlaceIds = new Set<string>();
    const currentRestaurantIds = new Set<string>();

    if (plan?.itinerary?.days) {
      for (const day of plan.itinerary.days) {
        for (const item of day.items) {
          if (item.type === "activity") {
            currentPlaceIds.add(item.referenceId);
          } else if (item.type === "food") {
            currentRestaurantIds.add(item.referenceId);
          }
        }
      }
    }

    let result: Record<string, unknown> = {};

    if (domain === "stay" || domain === "all") {
      result.stays = (context.candidateStays || []).map((s) => ({
        ...s,
        isSelected: s.id === currentStayId,
      }));
      result.stayAvailability = context.availability.stays;
    }

    if (domain === "transport" || domain === "all") {
      result.transports = (context.candidateTransport || []).map((t) => ({
        ...t,
        isSelected: t.id === currentTransportId,
      }));
      result.transportAvailability = context.availability.transport;
    }

    if (domain === "activity" || domain === "places" || domain === "all") {
      result.places = (context.candidatePlaces || []).map((p) => ({
        ...p,
        isSelected: currentPlaceIds.has(p.id),
      }));
      result.placesAvailability = context.availability.places;
    }

    if (domain === "restaurant" || domain === "food" || domain === "all") {
      result.restaurants = (context.candidateRestaurants || []).map((r) => ({
        ...r,
        isSelected: currentRestaurantIds.has(r.id),
      }));
      result.foodAvailability = context.availability.food;
    }

    return NextResponse.json(
      {
        success: true,
        tripId,
        domain,
        availability: context.availability,
        ...result,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("GET /api/trips/[tripId]/regenerate/alternatives error:", err);
    return NextResponse.json(
      {
        error: {
          code: "PROVIDER_ERROR",
          message: err instanceof Error ? err.message : "Failed to load candidate alternatives.",
        },
      },
      { status: 500 },
    );
  }
}
