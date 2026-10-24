/**
 * @file src/lib/agents/stay/stay-agent.ts
 *
 * Specialized Stay Planning Agent.
 * Curates accommodations based on budget tier, location, style, and traveler comfort.
 */

import { LLMProvider } from "@/lib/ai/types";
import { getDefaultLLMProvider } from "@/lib/ai";
import { TripContext, Place } from "@/lib/travel";
import { AgentResult } from "../core/agent-contract";
import { StayAgentOutput, stayOutputSchema } from "./schemas";
import { StayScorer } from "./scoring";

export class StayAgent {
  private llm: LLMProvider;

  constructor(llm: LLMProvider = getDefaultLLMProvider()) {
    this.llm = llm;
  }

  async run(
    context: TripContext,
    _attempt = 1,
    replanFeedback?: string,
    selectedPlaces?: Place[],
  ): Promise<AgentResult<StayAgentOutput>> {
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();

    const candidates = context.candidateStays;

    if (candidates.length === 0) {
      return {
        agentName: "StayAgent",
        status: "failed",
        data: null,
        reasoning: "No accommodation candidates found in the destination.",
        warnings: ["No stays matched query criteria."],
        sourceReferences: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }

    // 1. Calculate centroid for proximity scoring
    const centroid =
      selectedPlaces && selectedPlaces.length > 0
        ? {
            latitude:
              selectedPlaces.reduce((sum, p) => sum + p.latitude, 0) / selectedPlaces.length,
            longitude:
              selectedPlaces.reduce((sum, p) => sum + p.longitude, 0) / selectedPlaces.length,
          }
        : {
            latitude: context.destination.latitude,
            longitude: context.destination.longitude,
          };

    // 2. Deterministic stay ranking
    const scoringResult = StayScorer.rankStays({
      stays: candidates,
      budgetTier: context.trip.budget,
      centroid,
    });

    const buildFallback = (reasonNotice: string): StayAgentOutput => {
      const topPick = scoringResult.topPicks[0] || candidates[0];
      const alternatives = scoringResult.topPicks
        .filter((s) => s.id !== topPick.id)
        .slice(0, 2);

      return {
        recommendedStayId: topPick.id,
        alternativeStayIds: alternatives.map((s) => s.id),
        reasoning: `Deterministic stay scoring selected ${topPick.name} (${reasonNotice}). Matches ${context.trip.budget} budget tier with verified availability and proximity.`,
        tradeoffs: [
          `Optimized for ${context.trip.budget} comfort tier and destination connectivity`,
          `${alternatives.length} verified alternative properties available in destination`,
        ],
        selectedStay: {
          stayId: topPick.id,
          name: topPick.name,
          comfortLevel: topPick.comfortLevel || "standard",
          roomType: topPick.roomType,
        },
        stayAlternatives: alternatives.map((s) => ({
          stayId: s.id,
          name: s.name,
          comfortLevel: s.comfortLevel || "standard",
          roomType: s.roomType,
        })),
      };
    };

    const prompt = `
[ROLE: STAY_AGENT]
You are the SafariX Stay Planning Agent.
Review available accommodations and select the ideal stay for the traveler.

USER SPECIFICATIONS:
- Destination: ${context.destination.name}, ${context.destination.country}
- Duration: ${context.trip.days} Days
- Travelers: ${context.trip.travellers}
- Budget Tier: ${context.trip.budget}
- Travel Notes: ${context.trip.preferences?.notes || "None"}
${replanFeedback ? `- REPLAN FEEDBACK: ${replanFeedback}` : ""}

AVAILABLE CANDIDATES (Ranked by Grounded Stay & Spatial Scoring):
\`\`\`json
${JSON.stringify(
  {
    availableStays: scoringResult.rankedStays.map((s) => ({
      id: s.stay.id,
      name: s.stay.name,
      category: s.stay.category,
      comfortLevel: s.stay.comfortLevel || "standard",
      pricePerNight: s.stay.pricePerNight,
      currency: s.stay.currency,
      priceType: s.stay.priceType || (s.stay.pricePerNight !== null ? "exact" : "unknown"),
      availability: s.stay.availability || "available",
      roomType: s.stay.roomType || undefined,
      rating: s.stay.rating,
      reviewCount: s.stay.reviewCount,
      amenities: s.stay.amenities,
      address: s.stay.address,
      distanceToCentroidKm: s.distanceToCentroidKm !== undefined ? Number(s.distanceToCentroidKm.toFixed(1)) : null,
      groundedScore: s.score,
    })),
  },
  null,
  2,
)}
\`\`\`

RULES:
1. Every selected accommodation MUST reference an actual Candidate ID from the list above.
2. DO NOT invent hotels, rooms, or rates.
3. Align with the budget tier: ${context.trip.budget}.
4. Return strictly valid JSON conforming to the schema.
`;

    try {
      const output = await this.llm.generateStructured(stayOutputSchema, prompt, {
        systemPrompt: "You are the SafariX Stay Agent. Reason over available accommodations and return strictly valid JSON.",
        temperature: 0.2,
      });

      // Anti-hallucination check
      const recommendedExists = candidates.some((s) => s.id === output.recommendedStayId);
      if (!recommendedExists) {
        const fallback = buildFallback(`LLM hallucinated stay ID "${output.recommendedStayId}"`);
        return {
          agentName: "StayAgent",
          status: "success",
          data: fallback,
          reasoning: fallback.reasoning,
          warnings: [`LLM hallucinated ID "${output.recommendedStayId}"; used deterministic scoring fallback.`],
          sourceReferences: [fallback.recommendedStayId, ...fallback.alternativeStayIds],
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTimeMs,
        };
      }

      // Filter alternatives to strictly valid IDs and ensure up to 2 distinct valid candidates
      let validAlternatives = output.alternativeStayIds
        .filter((id) => id !== output.recommendedStayId && candidates.some((s) => s.id === id))
        .slice(0, 2);

      if (validAlternatives.length < 2) {
        const supplemental = scoringResult.topPicks
          .filter((s) => s.id !== output.recommendedStayId && !validAlternatives.includes(s.id))
          .map((s) => s.id)
          .slice(0, 2 - validAlternatives.length);
        validAlternatives = [...validAlternatives, ...supplemental];
      }

      const chosenStay = candidates.find((s) => s.id === output.recommendedStayId);
      const alternativeStays = validAlternatives
        .map((id) => candidates.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s));

      const enrichedOutput: StayAgentOutput = {
        ...output,
        alternativeStayIds: validAlternatives,
        selectedStay: {
          stayId: output.recommendedStayId,
          name: chosenStay?.name,
          comfortLevel: chosenStay?.comfortLevel || "standard",
          roomType: chosenStay?.roomType,
        },
        stayAlternatives: alternativeStays.map((s) => ({
          stayId: s.id,
          name: s.name,
          comfortLevel: s.comfortLevel || "standard",
          roomType: s.roomType,
        })),
      };

      return {
        agentName: "StayAgent",
        status: "success",
        data: enrichedOutput,
        reasoning: enrichedOutput.reasoning,
        warnings: [],
        sourceReferences: [enrichedOutput.recommendedStayId, ...enrichedOutput.alternativeStayIds],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("Simulated LLM")) {
        return {
          agentName: "StayAgent",
          status: "failed",
          data: null,
          reasoning: errMsg,
          warnings: [errMsg],
          sourceReferences: [],
          startedAt,
          completedAt: new Date().toISOString(),
          durationMs: Date.now() - startTimeMs,
        };
      }

      // Deterministic fallback on LLM failure
      const fallback = buildFallback(`LLM call failed: ${errMsg}`);
      return {
        agentName: "StayAgent",
        status: "success",
        data: fallback,
        reasoning: fallback.reasoning,
        warnings: [`LLM generation failed; used deterministic scoring fallback: ${errMsg}`],
        sourceReferences: [fallback.recommendedStayId, ...fallback.alternativeStayIds],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }
  }
}
