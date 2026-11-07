import type { OrchestrationResult } from "./types";
import type { TripStatus } from "@/types";
import type { PlanningResultCache } from "./planning-result-cache";

export interface PlanningPersistenceInput {
  tripId: string;
  userId: string;
  status: TripStatus;
  scope: string;
  instruction?: string | null;
  changeSummary?: Record<string, unknown> | null;
  snapshot: OrchestrationResult;
  totalCost: number;
  currency: string;
  currencySymbol: string;
}

export async function persistPlanningResult(
  input: PlanningPersistenceInput,
  result: OrchestrationResult,
  persist: (input: PlanningPersistenceInput) => Promise<unknown | null>,
  cache: PlanningResultCache,
): Promise<Response> {
  try {
    const persistedVersion = await persist(input);
    if (!persistedVersion) {
      cache.invalidateTrip(input.tripId);
      return Response.json({ error: "Journey not found." }, { status: 404 });
    }

    cache.set(input.tripId, input.userId, result);
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("POST /api/trips/[tripId]/plan error:", err);
    return Response.json(
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
