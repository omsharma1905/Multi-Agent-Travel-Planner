/**
 * @file src/lib/agents/food/food-agent.ts
 *
 * Specialized Food & Dining Experiences Agent.
 * Curates grounded restaurants and culinary stops based on cuisine preferences,
 * budget feasibility, and geographic proximity to daily activities.
 */

import { LLMProvider } from "@/lib/ai/types";
import { getDefaultLLMProvider } from "@/lib/ai";
import { TripContext, Place } from "@/lib/travel";
import { AgentResult } from "../core/agent-contract";
import { FoodAgentOutput, foodOutputSchema } from "./schemas";
import { FoodScorer } from "./scoring";

export class FoodAgent {
  private llm: LLMProvider;

  constructor(llm: LLMProvider = getDefaultLLMProvider()) {
    this.llm = llm;
  }

  async run(
    context: TripContext,
    _attempt = 1,
    replanFeedback?: string,
    selectedPlaces?: Place[],
  ): Promise<AgentResult<FoodAgentOutput>> {
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();

    const candidates = context.candidateRestaurants;

    if (candidates.length === 0) {
      return {
        agentName: "FoodAgent",
        status: "partial",
        data: null,
        reasoning: "No specific restaurant candidates found; local dining exploration recommended.",
        warnings: ["No restaurants matched in destination."],
        sourceReferences: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }

    // 1. Run deterministic scoring with geographic anchor
    const spatialAnchor =
      selectedPlaces && selectedPlaces.length > 0
        ? selectedPlaces.map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
        : { latitude: context.destination.latitude, longitude: context.destination.longitude };

    const scoringResult = FoodScorer.scoreCandidates(candidates, context.trip, spatialAnchor);
    const targetCount = Math.min(candidates.length, Math.max(context.trip.days * 2, 2));

    const buildFallback = (_reasonNotice: string): FoodAgentOutput => {
      const picks = scoringResult.rankedRestaurants.slice(0, targetCount);
      return {
        selectedRestaurantIds: picks.map((p) => p.restaurant.id),
        selectedRestaurants: picks.map((p, idx) => {
          const mealType =
            idx % 2 === 0
              ? (p.restaurant.mealTypes?.find((m) => m === "lunch") || "lunch")
              : (p.restaurant.mealTypes?.find((m) => m === "dinner") || "dinner");
          return {
            restaurantId: p.restaurant.id,
            mealType,
            reason: `Top scoring dining venue (${p.score.toFixed(1)}/100) matching destination gastronomy and proximity`,
            priority: idx + 1,
          };
        }),
        reasoning: `Curated ${picks.length} grounded dining venues matching destination gastronomy and proximity.`,
      };
    };

    const prompt = `
[ROLE: FOOD_AGENT]
You are the SafariX Food Planning Agent.
Select authentic, high-quality restaurants and culinary experiences for the journey.

USER SPECIFICATIONS:
- Destination: ${context.destination.name}
- Duration: ${context.trip.days} Days (target approx ${targetCount} restaurants)
- Budget Tier: ${context.trip.budget}
- Interests: ${(context.trip.preferences?.interests || []).join(", ")}
${replanFeedback ? `- REPLAN FEEDBACK: ${replanFeedback}` : ""}

AVAILABLE CANDIDATES (Ranked by Grounded Culinary & Spatial Scoring):
\`\`\`json
${JSON.stringify(
  {
    availableRestaurants: scoringResult.rankedRestaurants.map((s) => ({
      id: s.restaurant.id,
      name: s.restaurant.name,
      cuisine: s.restaurant.cuisine,
      category: s.restaurant.category || "Dining",
      rating: s.restaurant.rating,
      priceLevel: s.restaurant.priceLevel,
      averagePricePerPerson: s.restaurant.averagePricePerPerson ?? null,
      priceType: s.restaurant.priceType ?? "unknown",
      currency: s.restaurant.currency ?? "INR",
      mealTypes: s.restaurant.mealTypes || ["lunch", "dinner"],
      address: s.restaurant.address,
      distanceToCentroidKm: s.distanceToCentroidKm ?? null,
      groundedScore: s.score,
    })),
  },
  null,
  2,
)}
\`\`\`

RULES:
1. Every selected restaurant MUST reference an actual Candidate ID from the list above.
2. DO NOT invent restaurants, menus, coordinates, or prices.
3. Select approximately ${targetCount} distinct dining stops.
4. Return strictly valid JSON conforming to the schema.
`;

    try {
      const output = await this.llm.generateStructured(foodOutputSchema, prompt, {
        systemPrompt: "You are the SafariX Food Agent. Reason over available dining candidates and return strictly valid JSON.",
        temperature: 0.2,
      });

      // Verify all IDs exist (anti-hallucination check)
      const hallucinatedIds = output.selectedRestaurantIds.filter((id) => !candidates.some((c) => c.id === id));
      if (hallucinatedIds.length > 0) {
        const fallback = buildFallback(`LLM hallucinated restaurant IDs: ${hallucinatedIds.join(", ")}`);
        return {
          agentName: "FoodAgent",
          status: "success",
          data: fallback,
          reasoning: fallback.reasoning,
          warnings: [`LLM hallucinated IDs: ${hallucinatedIds.join(", ")}; used deterministic scoring fallback.`],
          sourceReferences: fallback.selectedRestaurantIds,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTimeMs,
        };
      }

      // Ensure selectedRestaurants structure is populated
      const enrichedOutput: FoodAgentOutput = {
        ...output,
        selectedRestaurants:
          output.selectedRestaurants && output.selectedRestaurants.length > 0
            ? output.selectedRestaurants
            : output.selectedRestaurantIds.map((id, idx) => {
                const found = candidates.find((c) => c.id === id);
                const mealType =
                  idx % 2 === 0
                    ? (found?.mealTypes?.find((m) => m === "lunch") || "lunch")
                    : (found?.mealTypes?.find((m) => m === "dinner") || "dinner");
                return {
                  restaurantId: id,
                  mealType,
                  reason: `Curated culinary stop for ${found?.cuisine.join(", ") || "regional dining"}`,
                  priority: idx + 1,
                };
              }),
      };

      return {
        agentName: "FoodAgent",
        status: "success",
        data: enrichedOutput,
        reasoning: enrichedOutput.reasoning,
        warnings: [],
        sourceReferences: enrichedOutput.selectedRestaurantIds,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    } catch (err) {
      // Deterministic fallback on LLM failure
      const fallback = buildFallback(`LLM call failed: ${err instanceof Error ? err.message : String(err)}`);
      return {
        agentName: "FoodAgent",
        status: "success",
        data: fallback,
        reasoning: fallback.reasoning,
        warnings: [`LLM generation failed; used deterministic scoring fallback: ${String(err)}`],
        sourceReferences: fallback.selectedRestaurantIds,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }
  }
}
