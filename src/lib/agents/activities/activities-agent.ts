/**
 * @file src/lib/agents/activities/activities-agent.ts
 *
 * Specialized Activities & Experiences Agent.
 * Curates points of interest without repetitive clustering.
 */

import { LLMProvider } from "@/lib/ai/types";
import { getDefaultLLMProvider } from "@/lib/ai";
import { TripContext } from "@/lib/travel";
import { AgentResult } from "../core/agent-contract";
import { ActivitiesAgentOutput, activitiesOutputSchema } from "./schemas";
import { PlaceScorer } from "./scoring";

export class ActivitiesAgent {
  private llm: LLMProvider;

  constructor(llm: LLMProvider = getDefaultLLMProvider()) {
    this.llm = llm;
  }

  async run(
    context: TripContext,
    _attempt = 1,
    replanFeedback?: string,
  ): Promise<AgentResult<ActivitiesAgentOutput>> {
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();

    const candidates = context.candidatePlaces;

    if (candidates.length === 0) {
      return {
        agentName: "ActivitiesAgent",
        status: "failed",
        data: null,
        reasoning: "No activity or attraction candidates found for this destination.",
        warnings: ["Candidate places list was empty."],
        sourceReferences: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }

    // 1. Run deterministic scoring
    const destinationCenter = {
      latitude: context.destination.latitude,
      longitude: context.destination.longitude,
    };
    const scoringResult = PlaceScorer.scoreCandidates(candidates, context.trip, destinationCenter);
    const targetCount = Math.min(candidates.length, Math.max(context.trip.days * 2, 2));

    const buildFallback = (_reasonNotice?: string): ActivitiesAgentOutput => {
      const picks = scoringResult.rankedPlaces.slice(0, targetCount);
      return {
        selectedPlaceIds: picks.map((p) => p.place.id),
        selectedPlaces: picks.map((p, idx) => ({
          placeId: p.place.id,
          reason: `High scoring attraction (${p.score.toFixed(1)}/100) aligned with destination and interests`,
          priority: idx + 1,
        })),
        reasoning: `Curated top ${picks.length} grounded attractions and cultural highlights aligned with traveler preferences.`,
      };
    };

    const prompt = `
[ROLE: ACTIVITIES_AGENT]
You are the SafariX Activities Planning Agent.
Select a diverse and meaningful sequence of attractions and experiences for the journey.

USER SPECIFICATIONS:
- Destination: ${context.destination.name}
- Duration: ${context.trip.days} Days (target approx ${targetCount} places)
- Preferred Interests: ${(context.trip.preferences?.interests || []).join(", ")}
${replanFeedback ? `- REPLAN FEEDBACK: ${replanFeedback}` : ""}

AVAILABLE CANDIDATES (Ranked by Grounded Feasibility & Interest Scoring):
\`\`\`json
${JSON.stringify(
  {
    availablePlaces: scoringResult.rankedPlaces.map((s) => ({
      id: s.place.id,
      name: s.place.name,
      type: s.place.type,
      rating: s.place.rating,
      priceLevel: s.place.priceLevel,
      ticketPrice: s.place.ticketPrice ?? null,
      priceType: s.place.priceType ?? "unknown",
      currency: s.place.currency ?? "INR",
      estimatedDurationMinutes: s.place.estimatedDurationMinutes ?? 60,
      tags: s.place.tags,
      description: s.place.description,
      groundedScore: s.score,
    })),
  },
  null,
  2,
)}
\`\`\`

REQUIRED JSON OUTPUT SHAPE:
{
  "selectedPlaceIds": [${scoringResult.rankedPlaces.slice(0, Math.min(2, targetCount)).map((p) => `"${p.place.id}"`).join(", ")}],
  "selectedPlaces": [
    {
      "placeId": "${scoringResult.rankedPlaces[0]?.place.id || "place_id"}",
      "reason": "Iconic cultural highlight matching traveler preferences.",
      "priority": 1
    }
  ],
  "reasoning": "Curated selection balancing iconic destination landmarks, cultural immersion, and traveler preferences."
}

RULES:
1. Every selected place MUST reference an actual Candidate ID from the list above.
2. DO NOT invent places, attractions, ticket prices, or coordinates.
3. Select approximately ${targetCount} places to support a ${context.trip.days}-day itinerary.
4. Return strictly valid JSON conforming to the schema.
`;

    try {
      const output = await this.llm.generateStructured(activitiesOutputSchema, prompt, {
        systemPrompt: "You are the SafariX Activities Agent. Reason over available attractions and return strictly valid JSON.",
        temperature: 0.2,
      });

      // Verify all IDs exist (anti-hallucination check)
      const hallucinatedIds = output.selectedPlaceIds.filter((id) => !candidates.some((c) => c.id === id));
      if (hallucinatedIds.length > 0) {
        // Fallback deterministically if LLM hallucinated
        const fallback = buildFallback(`LLM hallucinated place IDs: ${hallucinatedIds.join(", ")}`);
        return {
          agentName: "ActivitiesAgent",
          status: "success",
          data: fallback,
          reasoning: fallback.reasoning,
          warnings: [`LLM hallucinated IDs: ${hallucinatedIds.join(", ")}; used deterministic scoring fallback.`],
          sourceReferences: fallback.selectedPlaceIds,
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTimeMs,
        };
      }

      // Ensure selectedPlaces is populated if LLM omitted it
      const enrichedOutput: ActivitiesAgentOutput = {
        ...output,
        selectedPlaces:
          output.selectedPlaces && output.selectedPlaces.length > 0
            ? output.selectedPlaces
            : output.selectedPlaceIds.map((id, idx) => ({
                placeId: id,
                reason: `Selected attraction for itinerary`,
                priority: idx + 1,
              })),
      };

      return {
        agentName: "ActivitiesAgent",
        status: "success",
        data: enrichedOutput,
        reasoning: enrichedOutput.reasoning,
        warnings: [],
        sourceReferences: enrichedOutput.selectedPlaceIds,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    } catch (err) {
      // Deterministic fallback on LLM failure
      console.warn("[ActivitiesAgent] Falling back to deterministic scoring due to LLM failure:", err);
      const fallback = buildFallback();
      return {
        agentName: "ActivitiesAgent",
        status: "success",
        data: fallback,
        reasoning: fallback.reasoning,
        warnings: [`LLM generation failed; used deterministic scoring fallback: ${String(err)}`],
        sourceReferences: fallback.selectedPlaceIds,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }
  }
}
