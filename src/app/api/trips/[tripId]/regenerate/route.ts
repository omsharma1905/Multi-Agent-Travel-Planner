/**
 * @file src/app/api/trips/[tripId]/regenerate/route.ts
 *
 * Protected API endpoint for SafariX Journey Editing & Regeneration.
 *
 * Supported Actions:
 * - Whole journey regeneration
 * - Single day regeneration
 * - Change transport (hard preference enforcement)
 * - Change stay
 * - Replace activity / attraction
 * - Replace restaurant / dining
 * - Natural-language journey modification
 *
 * Security & Reliability Invariants:
 * - Authentication required (server-side identity only).
 * - Strict journey ownership check (IDOR protected).
 * - CSRF origin check.
 * - Rate limited under AI_PLANNING category.
 * - Concurrency protection (PlanningLockManager).
 * - Zod request body validation.
 * - Atomic persistence: If regeneration or validation fails, old journey remains intact.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { assertCsrfAllowed } from "@/lib/security/csrf";
import { enforceRateLimit } from "@/lib/security/rate-limiter";
import { TripsService } from "@/features/trips/service";
import { PlanningLockManager } from "@/lib/orchestration/planning-lock";
import { journeyEditRequestSchema } from "@/lib/orchestration/editing/schemas";
import { journeyEditor } from "@/lib/orchestration/editing/journey-editor";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> },
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
            message: "Authentication required to modify journey.",
          },
          message: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const { tripId } = await params;

    // 3. Parse & Normalize Request Body
    const rawBody = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const scopeRaw = String(rawBody.scope || "");
    const scope = scopeRaw === "whole_journey" ? "journey" : scopeRaw;

    // Rate Limiting: full journey regeneration uses high-cost AI_PLANNING tier;
    // targeted single-domain edits and cost reductions use MUTATION tier.
    const isFullRegeneration = scope === "journey" && !rawBody.instruction && !rawBody.prompt;
    const rlBlock = await enforceRateLimit(req, {
      category: isFullRegeneration ? "AI_PLANNING" : "MUTATION",
      userId: user.id,
    });
    if (rlBlock) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many modification requests. Please wait a moment before trying again.",
          },
          message: "Too many modification requests. Please wait a moment before trying again.",
        },
        {
          status: 429,
          headers: rlBlock.headers,
        },
      );
    }

    // 4. Strict Ownership Check (IDOR Defense)
    const trip = await TripsService.getTrip(tripId, user.id);
    if (!trip) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Journey not found or you do not have permission to modify it.",
          },
          message: "Journey not found.",
        },
        { status: 404 },
      );
    }

    const rawTarget = (rawBody.target && typeof rawBody.target === "object" ? rawBody.target : {}) as Record<string, unknown>;
    const rawDetails = (rawBody.details && typeof rawBody.details === "object" ? rawBody.details : {}) as Record<string, unknown>;


    const dayNumber =
      typeof rawTarget.dayNumber === "number"
        ? rawTarget.dayNumber
        : typeof rawBody.targetDay === "number"
        ? rawBody.targetDay
        : undefined;

    const itemId =
      typeof rawTarget.itemId === "string"
        ? rawTarget.itemId
        : typeof rawBody.targetId === "string"
        ? rawBody.targetId
        : undefined;

    const candidateId =
      typeof rawTarget.candidateId === "string"
        ? rawTarget.candidateId
        : typeof rawBody.replacementId === "string"
        ? rawBody.replacementId
        : typeof rawDetails.stayId === "string"
        ? rawDetails.stayId
        : undefined;

    const transportPreference =
      typeof rawTarget.transportPreference === "string"
        ? rawTarget.transportPreference
        : typeof rawDetails.transportMode === "string"
        ? rawDetails.transportMode
        : typeof rawBody.transportPreference === "string"
        ? rawBody.transportPreference
        : undefined;

    const instruction =
      typeof rawBody.instruction === "string" && rawBody.instruction.trim()
        ? rawBody.instruction.trim()
        : typeof rawBody.prompt === "string" && rawBody.prompt.trim()
        ? rawBody.prompt.trim()
        : undefined;

    const normalizedBody = {
      scope,
      target: {
        dayNumber,
        itemId,
        candidateId,
        transportPreference,
      },
      instruction,
      constraints: rawBody.constraints,
    };

    const parseResult = journeyEditRequestSchema.safeParse(normalizedBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Malformed journey edit request payload.",
            details: parseResult.error.flatten(),
          },
          message: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const editRequest = parseResult.data;

    // Day bounds validation
    if (
      editRequest.scope === "day" &&
      editRequest.target?.dayNumber !== undefined &&
      (editRequest.target.dayNumber < 1 || editRequest.target.dayNumber > trip.days)
    ) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_TARGET",
            message: `Day ${editRequest.target.dayNumber} is outside the range for this ${trip.days}-day journey.`,
          },
          message: `Day ${editRequest.target.dayNumber} is outside the range for this ${trip.days}-day journey.`,
        },
        { status: 400 },
      );
    }

    // 6. Concurrency Protection
    const acquired = PlanningLockManager.acquire(tripId);
    if (!acquired) {
      return NextResponse.json(
        {
          error: {
            code: "EDIT_IN_PROGRESS",
            message: "A modification or planning operation is already running for this journey. Please wait.",
          },
          status: "in_progress",
          message: "Modification already in progress.",
        },
        { status: 409 },
      );
    }

    try {
      // 7. Execute Journey Edit with Fail-Safe Protection
      const result = await journeyEditor.executeEdit(trip, user.id, editRequest);

      if (!result.success) {
        const errMsg = result.error || "Could not complete journey modification.";
        const isOutOfScope =
          errMsg.includes("account") ||
          errMsg.includes("bookings") ||
          errMsg.includes("cannot manage") ||
          errMsg.includes("official travel providers") ||
          errMsg.includes("credit card") ||
          errMsg.includes("Unsupported modification");

        const isInvalidTarget =
          errMsg.includes("invalid") ||
          errMsg.includes("not in the verified candidate pool") ||
          errMsg.includes("could not be located");

        const statusCode = isOutOfScope || isInvalidTarget ? 400 : 422;
        const errorCode = isOutOfScope
          ? "REJECTED_OUT_OF_SCOPE"
          : isInvalidTarget
          ? "INVALID_TARGET"
          : "REGENERATION_FAILED";

        return NextResponse.json(
          {
            success: false,
            error: {
              code: errorCode,
              message: errMsg,
            },
            message: `${errMsg} Your previous journey is still intact.`,
            currentPlan: trip.plan,
            validationReport: result.validationReport,
          },
          { status: statusCode },
        );
      }

      return NextResponse.json(
        {
          success: true,
          plan: result.plan,
          changeSummary: result.changeSummary,
        },
        { status: 200 },
      );
    } finally {
      PlanningLockManager.release(tripId);
    }
  } catch (err) {
    console.error("POST /api/trips/[tripId]/regenerate fatal error:", err);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to execute journey modification.",
        },
        message: "Failed to execute journey modification.",
      },
      { status: 500 },
    );
  }
}
