/**
 * @file src/lib/agents/transportation/schemas.ts
 */

import { z } from "zod";

export const transportOptionSummarySchema = z.object({
  id: z.string().min(1),
  mode: z.string().min(1),
  provider: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureTime: z.string().nullable().optional(),
  arrivalTime: z.string().nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  price: z.number().nonnegative().nullable(),
  currency: z.string().min(1),
  stops: z.number().int().nonnegative().nullable().optional(),
  bookingUrl: z.string().url().nullable().optional(),
  isEstimate: z.boolean().default(true),
});

export const rawTransportationOutputSchema = z.object({
  recommendedOptionId: z.string().min(1),
  alternativeOptionIds: z.array(z.string()).default([]),
  mode: z.enum(["flight", "train", "bus", "car", "taxi", "metro", "ferry", "walk"]).default("train"),
  preference: z.enum(["auto", "flight", "train", "bus", "car"]).default("auto"),
  selectedOption: transportOptionSummarySchema.nullable().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  estimatedCost: z.number().nonnegative().nullable().optional(),
  currency: z.string().optional(),
  isEstimate: z.boolean().default(true),
  preferredModeUnavailable: z.boolean().default(false),
  fallbackReason: z.string().optional(),
  reasoning: z.string().min(1),
  tradeoffs: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type TransportationAgentOutput = z.infer<typeof rawTransportationOutputSchema>;

export const transportationOutputSchema: z.ZodType<TransportationAgentOutput, any, any> = z.preprocess((val) => {
  if (!val || typeof val !== "object") return val;
  const obj = val as Record<string, any>;
  if (obj.recommendation && typeof obj.recommendation === "object") {
    const rec = obj.recommendation;
    return {
      recommendedOptionId:
        rec.selectedOptionId ||
        rec.selectedCandidateId ||
        rec.recommendedOptionId ||
        rec.candidateId ||
        rec.optionId ||
        rec.id,
      alternativeOptionIds: rec.alternativeOptionIds || obj.alternativeOptionIds || [],
      mode: rec.mode || obj.mode || "train",
      preference: obj.preference || "auto",
      selectedOption: rec.selectedOption || obj.selectedOption,
      durationMinutes: rec.durationMinutes || obj.durationMinutes,
      estimatedCost: rec.price || rec.estimatedCost || obj.estimatedCost,
      currency: rec.currency || obj.currency,
      isEstimate: rec.isEstimate ?? obj.isEstimate ?? true,
      reasoning: rec.reasoning || obj.reasoning || "Transport option evaluated and selected.",
      tradeoffs: obj.tradeoffs || [],
      warnings: obj.warnings || [],
    };
  }
  const recId =
    obj.recommendedOptionId ||
    obj.recommendedTransportId ||
    obj.selectedOptionId ||
    obj.transportId ||
    obj.optionId;

  if (recId && !obj.recommendedOptionId) {
    return {
      ...obj,
      recommendedOptionId: recId,
    };
  }
  return val;
}, rawTransportationOutputSchema);

export type TransportOptionSummary = z.infer<typeof transportOptionSummarySchema>;

