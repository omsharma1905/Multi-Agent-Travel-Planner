/**
 * @file src/lib/agents/itinerary/itinerary-agent.ts
 *
 * Specialized Itinerary Planning Agent.
 * Synthesizes selected transport, stay, activities, and dining into an exact N-day schedule.
 */

import { LLMProvider } from "@/lib/ai/types";
import { getDefaultLLMProvider } from "@/lib/ai";
import { TripContext, Place, Restaurant, Stay, TransportOption } from "@/lib/travel";
import { AgentResult } from "../core/agent-contract";
import { ItineraryAgentOutput, itineraryOutputSchema } from "./schemas";

export type ItineraryFailureCategory =
  | "MISSING_PREREQUISITES"
  | "NO_CANDIDATES"
  | "LLM_PROVIDER_ERROR"
  | "LLM_OUTPUT_PARSE_ERROR"
  | "LLM_SCHEMA_VALIDATION_ERROR"
  | "SCHEDULE_GENERATION_ERROR"
  | "ITINERARY_VALIDATION_ERROR"
  | "UNKNOWN_ERROR";

export interface ItineraryAgentInput {
  stay: Stay | null;
  transport: TransportOption | null;
  selectedPlaces: Place[];
  selectedRestaurants: Restaurant[];
}

export class ItineraryAgent {
  private llm: LLMProvider;

  constructor(llm: LLMProvider = getDefaultLLMProvider()) {
    this.llm = llm;
  }

  async run(
    context: TripContext,
    input: ItineraryAgentInput,
    _attempt = 1,
    replanFeedback?: string,
  ): Promise<AgentResult<ItineraryAgentOutput>> {
    const startedAt = new Date().toISOString();
    const startTimeMs = Date.now();

    // 1. Diagnostics: Missing Prerequisites Check
    if (!context?.trip || typeof context.trip.days !== "number" || context.trip.days <= 0) {
      return {
        agentName: "ItineraryAgent",
        status: "failed",
        data: null,
        errorCategory: "MISSING_PREREQUISITES",
        reasoning: "Invalid trip duration or missing trip configuration. Trip duration must be at least 1 day.",
        warnings: ["Trip days count is invalid or missing."],
        sourceReferences: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }

    const daysCount = context.trip.days;

    // 2. Diagnostics: Candidate Pool Check
    const totalCandidates =
      (input.stay ? 1 : 0) +
      (input.transport ? 1 : 0) +
      input.selectedPlaces.length +
      input.selectedRestaurants.length;

    if (totalCandidates === 0) {
      return {
        agentName: "ItineraryAgent",
        status: "failed",
        data: null,
        errorCategory: "NO_CANDIDATES",
        reasoning: "No candidate options (places, dining, stay, or transit) were provided to synthesize an itinerary.",
        warnings: ["Candidate pool is empty."],
        sourceReferences: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }

    if (input.selectedPlaces.length === 0 && !input.stay && input.selectedRestaurants.length === 0) {
      return {
        agentName: "ItineraryAgent",
        status: "failed",
        data: null,
        errorCategory: "NO_CANDIDATES",
        reasoning: "No destination experiences, accommodations, or dining options were available from travel providers to synthesize a daily itinerary schedule.",
        warnings: ["Destination candidate pool is empty."],
        sourceReferences: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }

    // Build valid candidate reference list
    const candidateReferences: string[] = [];
    if (input.stay) {
      candidateReferences.push(`- Stay ID: "${input.stay.id}" (${input.stay.name})`);
    }
    if (input.transport) {
      candidateReferences.push(`- Transport ID: "${input.transport.id}" (${input.transport.mode} via ${input.transport.provider || "transit"})`);
    }
    if (input.selectedPlaces.length > 0) {
      candidateReferences.push(
        `- Place IDs:\n${input.selectedPlaces.map((p) => `    * "${p.id}" (${p.name}) [Duration: ${p.estimatedDurationMinutes ?? 60}m]`).join("\n")}`,
      );
    }
    if (input.selectedRestaurants.length > 0) {
      candidateReferences.push(
        `- Restaurant IDs:\n${input.selectedRestaurants.map((r) => `    * "${r.id}" (${r.name}) [Cuisine: ${r.cuisine}]`).join("\n")}`,
      );
    }

    const prompt = `
[ROLE: ITINERARY_AGENT]
You are the SafariX Itinerary Planning Agent.
Synthesize the selected recommendations into an exact ${daysCount}-day itinerary.

CRITICAL INVARIANTS:
1. You MUST generate EXACTLY ${daysCount} days in the "days" array (dayNumber: 1 through ${daysCount}).
2. Every item's referenceId MUST strictly equal one of the IDs provided below:
${candidateReferences.join("\n")}
3. ZERO HALLUCINATED IDS: DO NOT invent IDs. Never output "item_orientation", "item_1", or any unverified ID.
4. Schedule items chronologically (startTime strictly before endTime, no overlapping events) using 24h "HH:MM" format.
5. ZERO DUPLICATE SCHEDULE STRUCTURES: Each day MUST have a distinct schedule, timing, and unique daily theme. Do not repeat identical start and end times across days.
6. ONE VISIT PER PLACE: Each candidate place must be scheduled at most ONCE across the entire trip.
${replanFeedback ? `7. PREVIOUS ATTEMPT FEEDBACK TO RESOLVE: ${replanFeedback}` : ""}

REQUIRED OUTPUT JSON SCHEMA:
You MUST return a JSON object with this exact shape:
{
  "days": [
    {
      "dayNumber": 1,
      "theme": "Unique theme for Day 1",
      "items": [
        {
          "type": "transport" | "stay" | "activity" | "food" | "free_time",
          "referenceId": "exact_matching_id_from_candidates",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "reasoning": "Clear explanation citing the entity name"
        }
      ]
    }
  ],
  "orchestrationNotes": "High-level summary of the synthesized schedule"
}

INPUT PAYLOAD:
\`\`\`json
${JSON.stringify(
  {
    daysCount,
    destination: context.destination.name,
    country: context.destination.country,
    stay: input.stay
      ? {
          id: input.stay.id,
          name: input.stay.name,
          category: input.stay.category,
          comfortLevel: input.stay.comfortLevel,
          address: input.stay.address,
          checkIn: input.stay.checkIn,
          checkOut: input.stay.checkOut,
          pricePerNight: input.stay.pricePerNight,
          currency: input.stay.currency,
          roomType: input.stay.roomType,
        }
      : null,
    transport: input.transport
      ? {
          id: input.transport.id,
          mode: input.transport.mode,
          name: input.transport.provider || input.transport.mode,
          departureTime: input.transport.departureTime,
          arrivalTime: input.transport.arrivalTime,
          durationMinutes: input.transport.durationMinutes,
        }
      : null,
    selectedPlaces: input.selectedPlaces.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      address: p.address,
      estimatedDurationMinutes: p.estimatedDurationMinutes ?? 60,
      ticketPrice: p.ticketPrice ?? null,
      priceType: p.priceType ?? "unknown",
      currency: p.currency ?? "INR",
      openingHours: p.openingHours ?? null,
      tags: p.tags,
      description: p.description,
    })),
    selectedRestaurants: input.selectedRestaurants.map((r) => ({
      id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      category: r.category,
      address: r.address,
      mealTypes: r.mealTypes,
      averagePricePerPerson: r.averagePricePerPerson ?? null,
      priceType: r.priceType ?? "unknown",
      currency: r.currency ?? "INR",
      openingHours: r.openingHours ?? null,
    })),
  },
  null,
  2,
)}
\`\`\`

INVARIANTS FOR DIVERSITY & PROGRESSION:
- DIVERSE DAILY THEMES: Every day MUST have a unique theme reflecting its focus.
- ONE VISIT PER PLACE: Each selected place MUST be scheduled at most ONCE across the entire journey. Do NOT schedule the same place on multiple days.
- DISTINCT RESTAURANTS PER DAY: Never schedule the same restaurant more than once on the same day. Use distinct restaurants for lunch and dinner.
- TRANSIT ARRIVAL TIMING: If inbound transport arrives in the afternoon (>= 13:00) or has a long travel duration (>= 300 minutes), Day 1 schedule MUST start with transit arrival and hotel check-in. Do NOT schedule morning activities before arrival.
- DURATION REALISM: Allocate scheduling windows consistent with each place's \`estimatedDurationMinutes\` (typically 45–120 minutes).
- DAY PROGRESSION:
  * Day 1 is arrival & orientation (transport arrival, check-in, orientation landmark, welcome dinner).
  * Intermediate days are thematic immersion (distinct architectural, cultural, or scenic sights with matched dining).
  * Final day is farewell & departure (morning scenic/cafe, souvenir walk, checkout, departure transit).
- ENTITY GROUNDING: The reasoning for every activity or food item must explicitly cite the entity name and why it fits that specific day.
- OPERATING HOURS TRUTHFULNESS: If a place or restaurant has unknown opening hours ('isUnknown: true' or 'openingHours: null'), never invent specific opening/closing schedules in the reasoning. Schedule logically around daylight or standard meal times and note that exact operating hours should be checked locally.

Return strictly valid JSON conforming to the schema above.
`;

    try {
      const output = await this.llm.generateStructured(itineraryOutputSchema, prompt, {
        systemPrompt: `You are the SafariX Itinerary Agent. Generate an exact ${daysCount}-day schedule and return strictly valid JSON with top-level "days" array and "orchestrationNotes" string.`,
        temperature: 0.2,
      });

      // Post-generation constraint safeguard: Guarantee place and dining uniqueness across candidates
      if (output && Array.isArray(output.days)) {
        const availableRestIds = input.selectedRestaurants.map((r) => r.id);
        const availablePlaceIds = input.selectedPlaces.map((p) => p.id);
        const scheduledPlaces = new Set<string>();

        for (const day of output.days) {
          const dayRestIds = new Set<string>();
          for (const item of day.items) {
            if (item.type === "food" && availableRestIds.length >= 2) {
              if (dayRestIds.has(item.referenceId)) {
                const altRest = availableRestIds.find((id) => !dayRestIds.has(id));
                if (altRest) {
                  item.referenceId = altRest;
                  item.reasoning = `Distinct dining selection (${altRest}) on Day ${day.dayNumber}.`;
                }
              }
              dayRestIds.add(item.referenceId);
            } else if (item.type === "activity") {
              if (scheduledPlaces.has(item.referenceId)) {
                const altPlace = availablePlaceIds.find((id) => !scheduledPlaces.has(id));
                if (altPlace) {
                  item.referenceId = altPlace;
                  item.reasoning = `Distinct curated attraction (${altPlace}) on Day ${day.dayNumber}.`;
                  scheduledPlaces.add(altPlace);
                } else if (input.stay) {
                  // Fallback to relaxing at stay if available places are exhausted
                  item.type = "free_time";
                  item.referenceId = input.stay.id;
                  item.reasoning = `Leisure and relaxation at ${input.stay.name} on Day ${day.dayNumber}.`;
                }
              } else {
                scheduledPlaces.add(item.referenceId);
              }
            }
          }
        }

        // Post-generation schedule structure deduplication safeguard:
        // Ensure day schedule fingerprints are unique by disambiguating identical schedules
        const seenSignatures = new Set<string>();
        for (let i = 0; i < output.days.length; i++) {
          const day = output.days[i];
          let sig = day.items.map((it) => `${it.type}:${it.referenceId}:${it.startTime}-${it.endTime}`).join("|");
          if (seenSignatures.has(sig)) {
            day.items.forEach((it, itemIndex) => {
              const [h, m] = it.startTime.split(":").map(Number);
              const [eh, em] = it.endTime.split(":").map(Number);
              const shiftMinutes = ((i * 30 + itemIndex * 15) % 60);
              const newStartH = Math.min(21, h + Math.floor((m + shiftMinutes) / 60));
              const newStartM = (m + shiftMinutes) % 60;
              const newEndH = Math.min(23, eh + Math.floor((em + shiftMinutes) / 60));
              const newEndM = (em + shiftMinutes) % 60;
              it.startTime = `${String(newStartH).padStart(2, "0")}:${String(newStartM).padStart(2, "0")}`;
              it.endTime = `${String(newEndH).padStart(2, "0")}:${String(newEndM).padStart(2, "0")}`;
            });
            sig = day.items.map((it) => `${it.type}:${it.referenceId}:${it.startTime}-${it.endTime}`).join("|");
          }
          seenSignatures.add(sig);
        }
      }

      return {
        agentName: "ItineraryAgent",
        status: "success",
        data: output,
        reasoning: output.orchestrationNotes,
        warnings: [],
        sourceReferences: output.days.flatMap((d) => d.items.map((i) => i.referenceId)),
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : String(err);
      // Clean sensitive details
      const sanitizedMsg = rawMsg.replace(/key=[a-zA-Z0-9_\-]+/gi, "key=[REDACTED]");

      let errorCategory: ItineraryFailureCategory = "SCHEDULE_GENERATION_ERROR";
      if (
        sanitizedMsg.includes("GOOGLE_GENERATIVE_AI_API_KEY") ||
        sanitizedMsg.includes("fetch failed") ||
        sanitizedMsg.includes("timeout") ||
        sanitizedMsg.includes("429") ||
        sanitizedMsg.includes("Gemini API error") ||
        sanitizedMsg.includes("rate limit") ||
        sanitizedMsg.includes("quota")
      ) {
        errorCategory = "LLM_PROVIDER_ERROR";
      } else if (sanitizedMsg.includes("Unexpected token") || sanitizedMsg.includes("JSON") || sanitizedMsg.includes("JSON.parse")) {
        errorCategory = "LLM_OUTPUT_PARSE_ERROR";
      } else if (sanitizedMsg.includes("validation failed") || sanitizedMsg.includes("ZodError") || sanitizedMsg.includes("safeParse")) {
        errorCategory = "LLM_SCHEMA_VALIDATION_ERROR";
      }

      return {
        agentName: "ItineraryAgent",
        status: "failed",
        data: null,
        errorCategory,
        reasoning: sanitizedMsg,
        warnings: [sanitizedMsg],
        sourceReferences: [],
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTimeMs,
      };
    }
  }
}
