/**
 * @file src/lib/agents/transportation/transportation-agent.ts
 *
 * Specialized Transportation Planning Agent.
 * Evaluates candidate transit legs against traveler count, budget tier,
 * and user transportation preferences using deterministic scoring and LLM synthesis.
 */

import { LLMProvider } from "@/lib/ai/types";
import { getDefaultLLMProvider } from "@/lib/ai";
import { TripContext, TransportOption } from "@/lib/travel";
import { AgentResult } from "../core/agent-contract";
import { TransportationAgentOutput, transportationOutputSchema } from "./schemas";
import { TransportScorer } from "./scoring";

export class TransportationAgent {
  private llm: LLMProvider;

  constructor(llm: LLMProvider = getDefaultLLMProvider()) {
    this.llm = llm;
  }

  async run(
    context: TripContext,
    _attempt = 1,
    replanFeedback?: string,
  ): Promise<AgentResult<TransportationAgentOutput>> {
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();

    const candidates = context.candidateTransport;
    const preference = context.trip.preferences?.transportPreference || context.transportPreference || "auto";

    if (candidates.length === 0) {
      return {
        agentName: "TransportationAgent",
        status: "partial",
        data: null,
        reasoning: "No intercity transport candidates required or found for this destination.",
        warnings: ["Origin unspecified or local destination requires no long-distance transit."],
        sourceReferences: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }

    // 1. Run deterministic scoring across all candidates
    const scoring = TransportScorer.scoreCandidates(candidates, preference, context.trip);
    if (!scoring.bestOption) {
      return {
        agentName: "TransportationAgent",
        status: "partial",
        data: null,
        reasoning: scoring.fallbackReason || `No direct or practical ${preference} options found for this route.`,
        warnings: scoring.warnings.length > 0 ? scoring.warnings : [`No ${preference} options available.`],
        sourceReferences: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }
    const deterministicBest = scoring.bestOption;

    // Build alternative candidate IDs
    const alternativeOptionIds = candidates
      .filter((c) => c.id !== deterministicBest.id && c.availability !== "sold_out")
      .map((c) => c.id);

    // 2. Prepare LLM prompt with candidate facts, scoring, and user preferences
    const prompt = `
[ROLE: TRANSPORTATION_AGENT]
You are the SafariX Transportation Planning Agent.
Your task is to review available transport options and recommend the most practical, brand-consistent option for the traveler.

USER SPECIFICATIONS:
- Origin: ${context.origin?.name || context.trip.origin || "Local hub"}
- Destination: ${context.destination.name}, ${context.destination.country}
- Duration: ${context.trip.days} Days
- Travelers: ${context.trip.travellers}
- Budget Tier: ${context.trip.budget}
- Transportation Preference: ${preference.toUpperCase()} (${preference === "auto" ? "Let SafariX decide" : `User explicitly prefers ${preference}`})
- Preferred Interests: ${(context.trip.preferences?.interests || []).join(", ")}
${replanFeedback ? `- REPLAN FEEDBACK: ${replanFeedback}` : ""}

DETERMINISTIC EVALUATION INSIGHT:
- Preferred mode available: ${scoring.preferredModeAvailable ? "YES" : "NO"}
${scoring.fallbackReason ? `- Fallback reasoning: ${scoring.fallbackReason}` : ""}
- Top-ranked deterministic candidate ID: "${deterministicBest.id}" (${deterministicBest.mode} via ${deterministicBest.provider})

AVAILABLE CANDIDATES:
\`\`\`json
${JSON.stringify(
  {
    availableOptions: candidates.map((c: TransportOption) => ({
      id: c.id,
      mode: c.mode,
      provider: c.provider,
      origin: c.origin,
      destination: c.destination,
      departureTime: c.departureTime,
      durationMinutes: c.durationMinutes,
      price: c.price,
      currency: c.currency,
      stops: c.stops,
      availability: c.availability,
    })),
  },
  null,
  2,
)}
\`\`\`

REQUIRED JSON OUTPUT SHAPE:
{
  "recommendedOptionId": "${deterministicBest.id}",
  "reasoning": "Clear explanation citing candidate provider, mode, duration, and price."
}

RULES:
1. Every selected option MUST reference an actual Candidate ID from the list above (using "recommendedOptionId").
2. DO NOT hallucinate or invent new transit providers, trains, or flights.
3. If preference is "${preference}" and candidates exist for it, prioritize that mode.
4. If preference is "${preference}" and NO candidates exist for it, DO NOT invent one. Recommend the best available alternative and explain why in your reasoning.
5. Return strictly valid JSON conforming to the schema.
`;

    try {
      let recommendedOptionId = deterministicBest.id;
      let reasoning = "";
      let tradeoffs: string[] = [];

      try {
        const llmResult = await this.llm.generateStructured(
          transportationOutputSchema,
          prompt,
          {
            systemPrompt: "You are the SafariX Transportation Agent. Reason over available transport options and return strictly valid JSON.",
            temperature: 0.2,
          },
        );

        // Verify that LLM-recommended option exists in candidates and is not sold out
        const candidateMatch = candidates.find((c) => c.id === llmResult.recommendedOptionId);
        if (candidateMatch && candidateMatch.availability !== "sold_out") {
          recommendedOptionId = candidateMatch.id;
          reasoning = llmResult.reasoning;
          tradeoffs = llmResult.tradeoffs || [];
        } else {
          // If LLM selected invalid/hallucinated ID, enforce deterministic winner
          recommendedOptionId = deterministicBest.id;
          reasoning = scoring.fallbackReason || `Selected ${deterministicBest.provider} (${deterministicBest.mode}) based on optimal travel time and cost balance.`;
          tradeoffs = [`Evaluated ${candidates.length} candidate transit options across available modes.`];
        }
      } catch {
        // Fallback to deterministic synthesis if LLM provider fails
        recommendedOptionId = deterministicBest.id;
        const durDesc =
          typeof deterministicBest.durationMinutes === "number"
            ? `travel in ${Math.round(deterministicBest.durationMinutes / 60)}h ${deterministicBest.durationMinutes % 60}m`
            : "schedules and durations varying by carrier";
        reasoning = scoring.fallbackReason
          ? scoring.fallbackReason
          : preference !== "auto" && scoring.preferredModeAvailable
          ? `${deterministicBest.provider} (${deterministicBest.mode}) was chosen matching your ${preference} preference, offering ${durDesc}.`
          : `${deterministicBest.provider} (${deterministicBest.mode}) was selected as the optimal transport option (${durDesc}) for your expedition.`;
        tradeoffs = [`Evaluated ${candidates.length} candidate options for route efficiency.`];
      }

      const selectedCandidate = candidates.find((c) => c.id === recommendedOptionId) || deterministicBest;

      // Construct enriched structured output
      const output: TransportationAgentOutput = {
        recommendedOptionId: selectedCandidate.id,
        alternativeOptionIds,
        mode: selectedCandidate.mode,
        preference,
        selectedOption: {
          id: selectedCandidate.id,
          mode: selectedCandidate.mode,
          provider: selectedCandidate.provider,
          origin: selectedCandidate.origin,
          destination: selectedCandidate.destination,
          departureTime: selectedCandidate.departureTime ?? null,
          arrivalTime: selectedCandidate.arrivalTime ?? null,
          durationMinutes: selectedCandidate.durationMinutes ?? null,
          price: selectedCandidate.price,
          currency: selectedCandidate.currency,
          stops: selectedCandidate.stops ?? null,
          bookingUrl: selectedCandidate.bookingUrl || null,
          isEstimate: selectedCandidate.source.isEstimate,
        },
        durationMinutes: selectedCandidate.durationMinutes ?? undefined,
        estimatedCost:
          typeof selectedCandidate.price === "number"
            ? selectedCandidate.price * context.trip.travellers
            : undefined,
        currency: selectedCandidate.currency,
        isEstimate: selectedCandidate.source.isEstimate,
        preferredModeUnavailable: !scoring.preferredModeAvailable,
        fallbackReason: scoring.fallbackReason,
        reasoning:
          reasoning ||
          (selectedCandidate.provider.includes("Commercial Flight Search") || selectedCandidate.price === null
            ? `Route search from ${selectedCandidate.origin} to ${selectedCandidate.destination} curated via Google Flights. Live fares, durations, and stopover options depend on carrier schedules.`
            : `${selectedCandidate.provider} selected as the most practical transport.`),
        tradeoffs,
        warnings: scoring.warnings,
      };

      // Strict boundary check
      const validation = transportationOutputSchema.safeParse(output);
      if (!validation.success) {
        throw new Error(`Transportation output failed validation: ${JSON.stringify(validation.error.format())}`);
      }

      return {
        agentName: "TransportationAgent",
        status: "success",
        data: validation.data,
        reasoning: validation.data.reasoning,
        warnings: validation.data.warnings,
        sourceReferences: [selectedCandidate.id, ...alternativeOptionIds],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    } catch (err) {
      return {
        agentName: "TransportationAgent",
        status: "failed",
        data: null,
        reasoning: err instanceof Error ? err.message : "Transportation planning failed.",
        warnings: [String(err)],
        sourceReferences: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }
  }
}
