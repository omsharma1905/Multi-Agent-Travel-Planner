/**
 * @file src/lib/agents/itinerary/schemas.ts
 */

import { z } from "zod";

export const itineraryItemTypeSchema = z.enum([
  "transport",
  "stay",
  "activity",
  "food",
  "free_time",
]);

export const itineraryItemSchema = z.object({
  type: itineraryItemTypeSchema,
  referenceId: z.string().min(1),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  reasoning: z.string().min(1),
});

export const itineraryDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  theme: z.string().min(1),
  items: z.array(itineraryItemSchema).min(1),
});

export const rawItineraryOutputSchema = z.object({
  days: z.array(itineraryDaySchema).min(1),
  orchestrationNotes: z.string().min(1),
});

export type ItineraryAgentOutput = z.infer<typeof rawItineraryOutputSchema>;

export const itineraryOutputSchema: z.ZodType<ItineraryAgentOutput, any, any> = z.preprocess((val) => {
  if (!val || typeof val !== "object") return val;
  let candidateDays: any;
  let notes: string | undefined;

  if (Array.isArray(val)) {
    candidateDays = val;
    notes = `Synthesized ${val.length}-day expedition.`;
  } else {
    const obj = val as Record<string, any>;
    if (Array.isArray(obj.days)) candidateDays = obj.days;
    else if (obj.itinerary && Array.isArray(obj.itinerary.days)) {
      candidateDays = obj.itinerary.days;
      notes = obj.itinerary.orchestrationNotes;
    } else if (obj.data && Array.isArray(obj.data.days)) {
      candidateDays = obj.data.days;
      notes = obj.data.orchestrationNotes;
    } else if (Array.isArray(obj.schedule)) {
      candidateDays = obj.schedule;
    }
    if (!notes && typeof obj.orchestrationNotes === "string") {
      notes = obj.orchestrationNotes;
    }
  }

  if (!candidateDays || !Array.isArray(candidateDays)) {
    return val;
  }

  const normalizedDays = candidateDays.map((day: any, idx: number) => {
    const dayNumber = typeof day.dayNumber === "number" ? day.dayNumber : idx + 1;
    const theme =
      typeof day.theme === "string" && day.theme.trim().length > 0
        ? day.theme.trim()
        : `Day ${dayNumber} Highlights`;

    const rawItems = Array.isArray(day.items)
      ? day.items
      : Array.isArray(day.schedule)
      ? day.schedule
      : Array.isArray(day.activities)
      ? day.activities
      : [];

    const items = rawItems.map((item: any, itemIdx: number) => {
      let type = item.type;
      if (!["transport", "stay", "activity", "food", "free_time"].includes(type)) {
        if (type === "meal" || type === "restaurant" || type === "dining") type = "food";
        else if (type === "hotel" || type === "lodging" || type === "accommodation") type = "stay";
        else if (type === "flight" || type === "transit" || type === "train" || type === "bus") type = "transport";
        else type = "activity";
      }

      const referenceId =
        typeof item.referenceId === "string" && item.referenceId.trim().length > 0
          ? item.referenceId.trim()
          : typeof item.id === "string" && item.id.trim().length > 0
          ? item.id.trim()
          : "";

      let startTime = typeof item.startTime === "string" ? item.startTime.trim() : "";
      let endTime = typeof item.endTime === "string" ? item.endTime.trim() : "";

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      const formatTime = (hhmm: string) => {
        const parts = hhmm.split(":");
        return parts.length === 2 ? `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}` : hhmm;
      };

      if (!timeRegex.test(startTime)) {
        const h = 9 + Math.min(itemIdx * 3, 11);
        startTime = `${String(h).padStart(2, "0")}:00`;
      } else {
        startTime = formatTime(startTime);
      }

      if (!timeRegex.test(endTime)) {
        const [sh, sm] = startTime.split(":").map(Number);
        const eh = Math.min(sh + 2, 23);
        endTime = `${String(eh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
      } else {
        endTime = formatTime(endTime);
      }

      const reasoning =
        typeof item.reasoning === "string" && item.reasoning.trim().length > 0
          ? item.reasoning.trim()
          : `Scheduled ${type} on Day ${dayNumber}.`;

      return {
        type,
        referenceId,
        startTime,
        endTime,
        reasoning,
      };
    });

    return {
      dayNumber,
      theme,
      items,
    };
  });

  return {
    days: normalizedDays,
    orchestrationNotes: notes || `Synthesized balanced ${normalizedDays.length}-day schedule.`,
  };
}, rawItineraryOutputSchema);

export type ItineraryDay = z.infer<typeof itineraryDaySchema>;
export type ItineraryItem = z.infer<typeof itineraryItemSchema>;

