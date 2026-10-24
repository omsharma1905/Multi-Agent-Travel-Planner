/**
 * @file src/lib/orchestration/editing/schemas.ts
 *
 * Schemas and types for SafariX Journey Editing & Regeneration.
 */

import { z } from "zod";
import { OrchestrationResult } from "../types";
import { ValidationReport } from "@/lib/agents/validator/itinerary-validator";

export const journeyEditScopeSchema = z.enum([
  "journey",
  "day",
  "transport",
  "stay",
  "activity",
  "restaurant",
  "natural_language",
  "cost_reduction",
]);


export const journeyEditTargetSchema = z.object({
  dayNumber: z.number().int().positive().optional(),
  itemId: z.string().optional(), // Reference ID of the activity, stay, or restaurant to replace
  candidateId: z.string().optional(), // Specific replacement candidate ID chosen
  transportPreference: z.enum(["auto", "flight", "train", "bus", "car"]).optional(),
});

export const journeyEditRequestSchema = z.object({
  scope: journeyEditScopeSchema,
  target: journeyEditTargetSchema.optional(),
  instruction: z.string().max(500).optional(),
  constraints: z.record(z.unknown()).optional(),
});

export type JourneyEditScope = z.infer<typeof journeyEditScopeSchema>;
export type JourneyEditTarget = z.infer<typeof journeyEditTargetSchema>;
export type JourneyEditRequest = z.infer<typeof journeyEditRequestSchema>;

export interface EditChangeSummary {
  scope: JourneyEditScope;
  summary: string;
  description?: string;
  changedItems: string[];
  oldBudget?: number;
  newBudget?: number;
  budgetBefore?: number;
  budgetAfter?: number;
  currency?: string;
  currencySymbol?: string;
}

export interface JourneyEditResult {
  success: boolean;
  tripId: string;
  plan: OrchestrationResult;
  changeSummary?: EditChangeSummary;
  error?: string;
  validationReport?: ValidationReport;
}
