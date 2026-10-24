/**
 * @file src/app/api/trips/[tripId]/plan/route.ts
 *
 * Starts or queries planning orchestration for an authenticated trip.
 * Enforces strict user ownership and prevents accidental duplicate runs.
 */

import { NextRequest, NextResponse } from "next/server";
import { TripsService } from "@/features/trips/service";
import { travelOrchestrator, OrchestrationResult } from "@/lib/orchestration";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

import { PlanningLockManager } from "@/lib/orchestration/planning-lock";

declare global {
  var __tripPlanningCache: Map<string, OrchestrationResult> | undefined;
}

const planningCache = (global.__tripPlanningCache ??= new Map<string, OrchestrationResult>());

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  // 1. Cross-Origin Mutation Defense
  const csrfBlock = assertCsrfAllowed(req);
  if (csrfBlock) return csrfBlock;

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to plan journey.",
          },
          message: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    // 2. Strict Rate Limiting for High-Cost AI Orchestration
    const rlBlock = await enforceRateLimit(req, {
      category: "AI_PLANNING",
      userId: user.id,
    });
    if (rlBlock) return rlBlock;

    const { tripId } = await params;

    // Ownership check
    const trip = await TripsService.getTrip(tripId, user.id);
    if (!trip) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Journey not found or you do not have permission to plan it.",
          },
          message: "Journey not found or you do not have permission to plan it.",
        },
        { status: 404 },
      );
    }

    const shouldForce = req.nextUrl.searchParams.get("force") === "true";

    // Authoritative backend status check
    if (trip.status === "completed" && !shouldForce) {
      return NextResponse.json(
        {
          error: {
            code: "JOURNEY_ALREADY_COMPLETED",
            message: "This journey has already been completed and cannot be replanned unless forced.",
          },
          message: "Journey already completed.",
        },
        { status: 400 },
      );
    }

    // Centralized concurrency protection (shared with journey editing/regeneration)
    if (!PlanningLockManager.acquire(tripId)) {
      return NextResponse.json(
        {
          error: {
            code: "PLANNING_IN_PROGRESS",
            message: "Journey planning is already in progress. Please wait for completion.",
          },
          status: "in_progress",
          message: "Journey planning is already in progress.",
        },
        { status: 409 },
      );
    }

    // Return cached result if already completed and not forced
    const existing = planningCache.get(tripId);
    if (existing && !shouldForce && existing.status === "completed") {
      PlanningLockManager.release(tripId);
      return NextResponse.json(existing, { status: 200 });
    }

    if (trip.plan && !shouldForce && trip.plan.status === "completed") {
      planningCache.set(tripId, trip.plan);
      PlanningLockManager.release(tripId);
      return NextResponse.json(trip.plan, { status: 200 });
    }

    try {
      const result = await travelOrchestrator.planTrip(trip);
      planningCache.set(tripId, result);

      // Persist plan and update trip status
      if (result.status === "completed") {
        await TripsService.updateTripPlan(tripId, user.id, result, "upcoming");
      } else {
        await TripsService.updateTripPlan(tripId, user.id, result, "failed");
      }

      return NextResponse.json(result, { status: 200 });
    } finally {
      PlanningLockManager.release(tripId);
    }
  } catch (err) {
    console.error("POST /api/trips/[tripId]/plan error:", err);
    return NextResponse.json(
      {
        error: {
          code: "AGENT_PROVIDER_ERROR",
          message: err instanceof Error ? err.message : "Failed to orchestrate journey planning.",
        },
        message: "Failed to orchestrate journey planning.",
      },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { tripId } = await params;
    const trip = await TripsService.getTrip(tripId, user.id);
    if (!trip) {
      return NextResponse.json({ error: "Journey not found." }, { status: 404 });
    }

    if (PlanningLockManager.isLocked(tripId)) {
      return NextResponse.json({ status: "in_progress", stage: "running_agents" }, { status: 200 });
    }

    const cached = planningCache.get(tripId);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    if (trip.plan) {
      planningCache.set(tripId, trip.plan);
      return NextResponse.json(trip.plan, { status: 200 });
    }

    return NextResponse.json({ status: "not_started" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to load planning status." }, { status: 500 });
  }
}
