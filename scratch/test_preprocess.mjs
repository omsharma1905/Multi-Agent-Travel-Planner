import { z } from "zod";

const baseItem = z.object({
  type: z.enum(["transport", "stay", "activity", "food", "free_time"]),
  referenceId: z.string().min(1),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  reasoning: z.string().min(1),
});

const baseDay = z.object({
  dayNumber: z.number().int().positive(),
  theme: z.string().min(1),
  items: z.array(baseItem).min(1),
});

const baseSchema = z.object({
  days: z.array(baseDay).min(1),
  orchestrationNotes: z.string().min(1),
});

export const tolerantItinerarySchema = z.preprocess((val) => {
  if (!val || typeof val !== "object") return val;
  let candidateDays;
  let notes;

  if (Array.isArray(val)) {
    candidateDays = val;
    notes = `Synthesized ${val.length}-day expedition.`;
  } else {
    const obj = val;
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

  const normalizedDays = candidateDays.map((day, idx) => {
    const dayNumber = typeof day.dayNumber === "number" ? day.dayNumber : idx + 1;
    const theme = typeof day.theme === "string" && day.theme.trim().length > 0 ? day.theme.trim() : `Day ${dayNumber} Highlights`;
    const rawItems = Array.isArray(day.items) ? day.items : Array.isArray(day.schedule) ? day.schedule : Array.isArray(day.activities) ? day.activities : [];

    const items = rawItems.map((item, itemIdx) => {
      let type = item.type;
      if (!["transport", "stay", "activity", "food", "free_time"].includes(type)) {
        if (type === "meal" || type === "restaurant" || type === "dining") type = "food";
        else if (type === "hotel" || type === "lodging" || type === "accommodation") type = "stay";
        else if (type === "flight" || type === "transit" || type === "train" || type === "bus") type = "transport";
        else type = "activity";
      }

      const referenceId = typeof item.referenceId === "string" ? item.referenceId.trim() : `item_${itemIdx + 1}`;
      let startTime = typeof item.startTime === "string" ? item.startTime.trim() : "";
      let endTime = typeof item.endTime === "string" ? item.endTime.trim() : "";

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime)) {
        const h = 9 + Math.min(itemIdx * 3, 11);
        startTime = `${String(h).padStart(2, "0")}:00`;
      }
      if (!timeRegex.test(endTime)) {
        const [sh, sm] = startTime.split(":").map(Number);
        const eh = Math.min(sh + 2, 23);
        endTime = `${String(eh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
      }

      const reasoning = typeof item.reasoning === "string" && item.reasoning.trim().length > 0
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
      items: items.length > 0 ? items : [{
        type: "activity",
        referenceId: "item_orientation",
        startTime: "10:00",
        endTime: "12:00",
        reasoning: "Orientation sightseeing."
      }]
    };
  });

  return {
    days: normalizedDays,
    orchestrationNotes: notes || `Synthesized balanced ${normalizedDays.length}-day schedule.`
  };
}, baseSchema);

// Test with root array
const testArray = [
  {
    dayNumber: 1,
    theme: "Arrival & Orientation",
    schedule: [
      { type: "sightseeing", referenceId: "place_1", startTime: "10:00", endTime: "12:00", reasoning: "Visit place" }
    ]
  }
];

const res1 = tolerantItinerarySchema.safeParse(testArray);
console.log("Test 1 (Array with schedule & sightseeing type):", res1.success);
if (!res1.success) console.error(res1.error);
else console.log("Parsed:", JSON.stringify(res1.data, null, 2));
