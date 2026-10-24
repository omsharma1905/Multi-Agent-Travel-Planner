/**
 * @file src/lib/agents/activities/schemas.ts
 */

import { z } from "zod";

export const placeSelectionItemSchema = z.preprocess((val: any) => {
  if (typeof val === "string") {
    return {
      placeId: val.trim(),
      reason: "Curated destination activity.",
      priority: 1,
    };
  }
  if (val && typeof val === "object") {
    return {
      placeId: val.placeId || val.id || val.candidateId || val.place_id || String(val.place || ""),
      reason: val.reason || val.name || val.description || "Curated destination activity.",
      priority: val.priority ?? val.day ?? 1,
    };
  }
  return val;
}, z.object({
  placeId: z.string().min(1),
  reason: z.string().min(1),
  priority: z.number().optional(),
}));

export const activitiesOutputSchema = z.preprocess((val: any) => {
  if (val && typeof val === "object") {
    const rawList = Array.isArray(val)
      ? val
      : (val.selectedPlaceIds || val.selectedAttractions || val.selectedPlaces || val.places || val.placeIds || val.recommendations || val.activities || val.items);
    let selectedPlaceIds: string[] = [];
    if (Array.isArray(rawList)) {
      selectedPlaceIds = rawList
        .map((item: any) => (typeof item === "string" ? item.trim() : (item.placeId || item.id || item.candidateId || item.place_id || String(item.place || ""))))
        .filter((id) => typeof id === "string" && id.length > 0);
    }

    let selectedPlaces: any[] | undefined = undefined;
    if (Array.isArray(val.selectedPlaces)) {
      selectedPlaces = val.selectedPlaces;
    } else if (Array.isArray(val.selectedAttractions)) {
      selectedPlaces = val.selectedAttractions;
    } else if (Array.isArray(val.places)) {
      selectedPlaces = val.places;
    } else if (Array.isArray(val)) {
      selectedPlaces = val;
    } else if (selectedPlaceIds.length > 0) {
      selectedPlaces = selectedPlaceIds.map((id, idx) => ({
        placeId: id,
        reason: "Curated destination attraction.",
        priority: idx + 1,
      }));
    }

    return {
      selectedPlaceIds,
      selectedPlaces,
      reasoning: (typeof val === "object" && !Array.isArray(val) && typeof val.reasoning === "string" && val.reasoning.trim().length > 0)
        ? val.reasoning.trim()
        : "Selected prominent destination attractions and cultural landmarks matching traveler preferences.",
    };
  }
  return val;
}, z.object({
  selectedPlaceIds: z.array(z.string()).min(1),
  selectedPlaces: z.array(placeSelectionItemSchema).optional(),
  reasoning: z.string().min(1),
}));

export type PlaceSelectionItem = z.infer<typeof placeSelectionItemSchema>;
export type ActivitiesAgentOutput = z.infer<typeof activitiesOutputSchema>;
