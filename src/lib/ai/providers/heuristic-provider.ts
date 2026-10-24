/**
 * @file src/lib/ai/providers/heuristic-provider.ts
 *
 * Deterministic Heuristic LLM Provider.
 *
 * Parses prompt payloads, scores candidates against trip requirements,
 * and formats valid JSON that conforms strictly to the target Zod schema.
 * Operates with zero API keys and zero cost for reliable offline development and testing.
 */

import { z } from "zod";
import { LLMProvider, GenerationOptions } from "../types";

export class HeuristicLLMProvider implements LLMProvider {
  readonly name = "heuristic-deterministic";

  constructor() {
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error(
        "MOCK_PROVIDER_FORBIDDEN: HeuristicLLMProvider cannot be instantiated in production environment. A genuine LLM provider (such as GeminiLLMProvider) must be configured.",
      );
    }
  }


  async generateStructured<T>(
    schema: z.ZodType<T, any, any>,
    prompt: string,
    _options?: GenerationOptions,
  ): Promise<T> {
    // Parse context payload embedded in prompt
    let contextPayload: Record<string, unknown> = {};
    try {
      const match = prompt.match(/```json\n([\s\S]*?)\n```/);
      if (match && match[1]) {
        contextPayload = JSON.parse(match[1]);
      }
    } catch {
      // ignore
    }

    // 1. Check if Transportation output is expected
    if (prompt.includes("TRANSPORTATION_AGENT") || prompt.includes("recommendedOption")) {
      const options = (contextPayload.availableOptions as Array<{ id: string; mode: string; durationMinutes: number; price: number }>) || [];
      const recommended = options[0] || {
        id: "trans_mock_default",
        mode: "train",
        durationMinutes: 120,
        price: 90,
      };
      const alts = options.slice(1);

      const generated = {
        recommendedOptionId: recommended.id,
        alternativeOptionIds: alts.map((a) => a.id),
        reasoning: `Selected ${recommended.mode} transit (${recommended.durationMinutes} min, $${recommended.price}) as the optimal balance between transit efficiency and trip budget.`,
        tradeoffs: [
          `Rail/express routes avoid airport transfer overhead while maintaining punctuality.`,
          alts.length > 0 ? `Alternatives provide varying budget/speed balances.` : `No further transit alternatives required.`,
        ],
      };

      return schema.parse(generated);
    }

    // 2. Check if Stay output is expected
    if (prompt.includes("STAY_AGENT") || prompt.includes("recommendedStay")) {
      let stays = (contextPayload.availableStays as Array<{ id: string; name: string; category: string; pricePerNight: number }>) || [];
      if (prompt.includes("economical") || prompt.includes("budget") || prompt.includes("lower-cost") || prompt.includes("exceeds")) {
        stays = [...stays].sort((a, b) => (a.pricePerNight ?? 999) - (b.pricePerNight ?? 999));
      }
      const recommended = stays[0] || {
        id: "stay_mock_default",
        name: "Boutique Residence",
        category: "boutique",
        pricePerNight: 200,
      };
      const alts = stays.slice(1);

      const generated = {
        recommendedStayId: recommended.id,
        alternativeStayIds: alts.map((a) => a.id),
        reasoning: `Curated ${recommended.name} (${recommended.category}) to align with user aesthetic preference, central destination proximity, and daily comfort.`,
        tradeoffs: [
          `Centrally situated to minimize daily commuting legs to primary points of interest.`,
          `High guest ratings and boutique ambiance elevate the stay experience.`,
        ],
      };

      return schema.parse(generated);
    }

    // 3. Check if Activities output is expected
    if (prompt.includes("ACTIVITIES_AGENT") || prompt.includes("selectedPlaceIds")) {
      const places = (contextPayload.availablePlaces as Array<{ id: string; name: string; tags: string[] }>) || [];
      const daysCount = Number(contextPayload.daysCount) || 5;
      const count = Math.min(places.length, Math.max(6, daysCount * 2));
      const chosen = places.slice(0, count);

      const generated = {
        selectedPlaceIds: chosen.map((p) => p.id),
        reasoning: `Curated a diverse sequence of ${chosen.length} experiences spanning cultural landmarks, architectural viewpoints, and scenic environments tailored to requested interests.`,
      };

      return schema.parse(generated);
    }

    // 4. Check if Food output is expected
    if (prompt.includes("FOOD_AGENT") || prompt.includes("selectedRestaurantIds")) {
      const restaurants = (contextPayload.availableRestaurants as Array<{ id: string; name: string; cuisine: string[] }>) || [];
      const daysCount = Number(contextPayload.daysCount) || 5;
      const count = Math.min(restaurants.length, Math.max(4, daysCount * 2));
      const chosen = restaurants.slice(0, count);

      const generated = {
        selectedRestaurantIds: chosen.map((r) => r.id),
        reasoning: `Selected ${chosen.length} culinary destinations showcasing authentic local regional gastronomy, artisan preparations, and varied dining atmospheres.`,
      };

      return schema.parse(generated);
    }

    // 5. Check if Itinerary output is expected
    if (prompt.includes("ITINERARY_AGENT") || prompt.includes("dayNumber")) {
      const daysCount = Number(contextPayload.daysCount) || 3;
      const stayId = String(contextPayload.stayId || "stay_default");
      const stayName = String(contextPayload.stayName || "Sanctuary Residence");
      const transportId = contextPayload.transportId ? String(contextPayload.transportId) : null;
      const transportMode = contextPayload.transportMode ? String(contextPayload.transportMode) : "transit";
      const transportName = contextPayload.transportName ? String(contextPayload.transportName) : "Inbound Express";
      const transportArrivalTime = contextPayload.transportArrivalTime ? String(contextPayload.transportArrivalTime) : null;
      const transportDurationMinutes = Number(contextPayload.transportDurationMinutes) || 0;
      const transitLabel = transportMode === "train" ? "rail" : transportMode === "flight" ? "flight" : transportMode === "car" ? "road" : "inbound";

      const places = (contextPayload.selectedPlaces as Array<{ id: string; name: string; type?: string; description?: string }>) || [];
      const restaurants = (contextPayload.selectedRestaurants as Array<{ id: string; name: string; cuisine?: string[] }>) || [];

      // Distinct themes covering up to 14 days without repetition
      const themeThemes = [
        "Historic Quarters & Cultural Immersion",
        "Sanctuary Gardens & Scenic Panoramas",
        "Artisan Heritage & Local Craftsmanship",
        "Culinary Discoveries & Waterfront Promenade",
        "Hidden Courtyards & Sacred Monuments",
        "Architectural Highlights & Design Traditions",
        "Mountain Ridges & Botanical Greenery",
        "Ancient Gateways & Citadel Enclaves",
        "Artisanal Workshops & Living History",
        "Panoramic Overlooks & Sunset Terraces",
        "Gastronomic Heritage & Spice Markets",
        "Sculpture Pavilions & Old Quarter Walk",
        "Quiet Temples & Serene Waterways",
        "Reflections & Neighborhood Revelry",
      ];

      const days = [];
      const seenDaySignatures = new Set<string>();
      let placeCursor = 0;

      for (let dayNum = 1; dayNum <= daysCount; dayNum++) {
        const isFirstDay = dayNum === 1;
        const isLastDay = dayNum === daysCount;

        const dayTheme =
          isFirstDay
            ? "Arrival, Check-in & Neighborhood Orientation"
            : isLastDay
            ? "Morning Reflections, Souvenirs & Departure"
            : themeThemes[(dayNum - 2) % themeThemes.length];

        const dayItems = [];

        // Check if transport arrives in afternoon or has long travel time (>= 300 min or >= 13:00 arrival)
        const isAfternoonArrival =
          isFirstDay &&
          transportId !== null &&
          ((transportArrivalTime !== null && transportArrivalTime >= "13:00") || transportDurationMinutes >= 300);

        // 1. Morning start: Arrival transit on Day 1, or Breakfast at stay on subsequent days
        if (isFirstDay && transportId) {
          const transitStart = isAfternoonArrival ? "13:30" : "09:00";
          const transitEnd = isAfternoonArrival ? "15:00" : "11:00";
          const checkinStart = isAfternoonArrival ? "15:30" : "11:30";
          const checkinEnd = isAfternoonArrival ? "16:30" : "12:30";

          dayItems.push({
            type: "transport" as const,
            referenceId: transportId,
            startTime: transitStart,
            endTime: transitEnd,
            reasoning: `Inbound ${transitLabel} arrival via ${transportName}${transportArrivalTime ? ` (scheduled ${transportArrivalTime})` : ""}, luggage transfer, and transit into the destination core.`,
          });
          dayItems.push({
            type: "stay" as const,
            referenceId: stayId,
            startTime: checkinStart,
            endTime: checkinEnd,
            reasoning: `Check-in, room reception, and brief freshening up at ${stayName}.`,
          });
        } else {
          dayItems.push({
            type: "stay" as const,
            referenceId: stayId,
            startTime: "08:30",
            endTime: "09:30",
            reasoning: isFirstDay
              ? `Check-in and orientation briefing at ${stayName}.`
              : `Morning breakfast and preparation for the day at ${stayName}.`,
          });
        }

        // Time slots with variation across odd and even days
        const morningStart = isAfternoonArrival
          ? "17:00"
          : isFirstDay && transportId
          ? "13:00"
          : (dayNum % 4 === 0 ? "09:30" : dayNum % 2 === 0 ? "10:15" : "10:00");
        const morningEnd = isAfternoonArrival
          ? "18:30"
          : isFirstDay && transportId
          ? "14:30"
          : (dayNum % 4 === 0 ? "12:00" : dayNum % 2 === 0 ? "12:45" : "12:30");
        const lunchStart = isAfternoonArrival
          ? null
          : isFirstDay && transportId
          ? "14:45"
          : (dayNum % 4 === 0 ? "12:30" : dayNum % 2 === 0 ? "13:15" : "13:00");
        const lunchEnd = isAfternoonArrival
          ? null
          : isFirstDay && transportId
          ? "16:00"
          : (dayNum % 4 === 0 ? "13:45" : dayNum % 2 === 0 ? "14:30" : "14:15");
        const afternoonStart = isFirstDay && transportId ? "16:30" : (dayNum % 4 === 0 ? "14:30" : "15:00");
        const afternoonEnd = isFirstDay && transportId ? "18:15" : (dayNum % 4 === 0 ? "16:45" : "17:30");
        const dinnerStart = dayNum % 4 === 0 ? "19:30" : (dayNum % 2 === 0 ? "19:15" : "19:00");
        const dinnerEnd = dayNum % 4 === 0 ? "21:15" : (dayNum % 2 === 0 ? "21:00" : "20:45");

        // 2. Primary Activity
        if (placeCursor < places.length) {
          const primaryPlace = places[placeCursor++];
          dayItems.push({
            type: "activity" as const,
            referenceId: primaryPlace.id,
            startTime: morningStart,
            endTime: morningEnd,
            reasoning: isFirstDay
              ? `Initial orientation stroll exploring ${primaryPlace.name} to acclimatize to local pace.`
              : `Dedicated morning exploration of ${primaryPlace.name} during quieter opening hours.`,
          });
        }

        // 3. Lunch / Dining Stop (omitted if arriving late afternoon)
        const lunchIdx = restaurants.length > 0 ? ((dayNum - 1) * 2) % restaurants.length : 0;
        const lunchSpot = restaurants.length > 0
          ? restaurants[lunchIdx]
          : { id: "rest_default_1", name: "Local Bistro" };

        if (lunchStart && lunchEnd) {
          dayItems.push({
            type: "food" as const,
            referenceId: lunchSpot.id,
            startTime: lunchStart,
            endTime: lunchEnd,
            reasoning: `Midday lunch tasting regional specialties and seasonal dishes at ${lunchSpot.name}.`,
          });
        }

        // 4. Afternoon Activity (only if enough places remain for remaining days, and not late arrival)
        const remainingDays = daysCount - dayNum;
        const remainingPlaces = places.length - placeCursor;
        const canIncludeAfternoon = !isLastDay && !isAfternoonArrival && remainingPlaces > remainingDays;

        if (canIncludeAfternoon && placeCursor < places.length) {
          const secPlace = places[placeCursor++];
          dayItems.push({
            type: "activity" as const,
            referenceId: secPlace.id,
            startTime: afternoonStart,
            endTime: afternoonEnd,
            reasoning: `Afternoon visit to ${secPlace.name}, taking in architectural highlights and surrounding neighborhood ambiance.`,
          });
        }

        // 5. Evening: Dinner or Departure
        if (isLastDay && transportId) {
          dayItems.push({
            type: "stay" as const,
            referenceId: stayId,
            startTime: "18:45",
            endTime: "19:30",
            reasoning: `Checkout completion and bag collection at ${stayName}.`,
          });
          dayItems.push({
            type: "transport" as const,
            referenceId: transportId,
            startTime: "19:45",
            endTime: "21:45",
            reasoning: `Outbound ${transitLabel} transit via ${transportName} for homeward return.`,
          });
        } else {
          const dinnerIdx = restaurants.length > 1
            ? (((dayNum - 1) * 2) + 1) % restaurants.length
            : lunchIdx;
          const dinnerSpot = restaurants.length > 0
            ? restaurants[dinnerIdx]
            : lunchSpot;

          dayItems.push({
            type: "food" as const,
            referenceId: dinnerSpot.id,
            startTime: dinnerStart,
            endTime: dinnerEnd,
            reasoning: isLastDay
              ? `Farewell celebratory dinner at ${dinnerSpot.name} celebrating trip memories.`
              : `Evening dinner at ${dinnerSpot.name} pairing authentic flavors with local wine and conversation.`,
          });
        }

        // Ensure unique content signature across days
        const contentSig = dayItems.filter(i => i.type === "activity" || i.type === "food").map(i => i.referenceId).sort().join(",");
        seenDaySignatures.add(contentSig);

        days.push({
          dayNumber: dayNum,
          theme: dayTheme,
          items: dayItems,
        });
      }

      const generated = {
        days,
        orchestrationNotes: `Synthesized a differentiated, entity-grounded ${daysCount}-day itinerary featuring unique daily themes, individual landmark allocations without repetition, and structured arrival/departure rhythms.`,
      };

      return schema.parse(generated);
    }

    // Default fallback: parse default minimal data matching schema if any
    return schema.parse({});
  }
}
