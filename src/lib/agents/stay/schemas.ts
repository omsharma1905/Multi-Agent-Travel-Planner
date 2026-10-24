/**
 * @file src/lib/agents/stay/schemas.ts
 */

import { z } from "zod";

export const staySelectionItemSchema = z.preprocess((val: any) => {
  if (val && typeof val === "object") {
    return {
      stayId: val.stayId || val.id,
      name: val.name,
      comfortLevel: val.comfortLevel,
      roomType: val.roomType,
    };
  }
  return val;
}, z.object({
  stayId: z.string().min(1),
  name: z.string().optional(),
  comfortLevel: z.string().optional(),
  roomType: z.string().optional(),
}));

export const stayOutputSchema = z.preprocess((val: any) => {
  if (val && typeof val === "object") {
    const recommendedStayId =
      val.recommendedStayId ||
      val.selectedStayId ||
      val.stayId ||
      val.selectedStay?.stayId ||
      val.selectedStay?.id ||
      val.recommendedStay?.stayId ||
      val.recommendedStay?.id;

    return {
      recommendedStayId,
      alternativeStayIds: Array.isArray(val.alternativeStayIds) ? val.alternativeStayIds : [],
      reasoning: val.reasoning || "Selected lodging based on location and budget suitability.",
      tradeoffs: Array.isArray(val.tradeoffs) ? val.tradeoffs : [],
      selectedStay: val.selectedStay,
      stayAlternatives: Array.isArray(val.stayAlternatives) ? val.stayAlternatives : [],
    };
  }
  return val;
}, z.object({
  recommendedStayId: z.string().min(1),
  alternativeStayIds: z.array(z.string()),
  reasoning: z.string().min(1),
  tradeoffs: z.array(z.string()),
  selectedStay: staySelectionItemSchema.optional(),
  stayAlternatives: z.array(staySelectionItemSchema).optional(),
}));

export type StaySelectionItem = z.infer<typeof staySelectionItemSchema>;
export type StayAgentOutput = z.infer<typeof stayOutputSchema>;
