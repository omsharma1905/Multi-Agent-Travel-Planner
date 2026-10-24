/**
 * @file src/lib/agents/validator/itinerary-validator.ts
 *
 * Deterministic Itinerary Validator.
 * Enforces exact day count, prevents hallucinated IDs, and ensures time feasibility.
 */

import { ItineraryAgentOutput } from "../itinerary/schemas";
import { FeasibilityIssue } from "./feasibility-engine";

export interface ValidationReport {
  passed: boolean;
  issues: FeasibilityIssue[];
  criticalCount: number;
  warningCount: number;
}

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export class ItineraryValidator {
  /**
   * Deterministically validates complete itinerary structure against trip invariants.
   */
  static validate(params: {
    expectedDays: number;
    itinerary: ItineraryAgentOutput;
    validReferenceIds: Set<string>;
  }): ValidationReport {
    const issues: FeasibilityIssue[] = [];
    const { expectedDays, itinerary, validReferenceIds } = params;

    // 1. Exact Day Count Enforcement
    if (itinerary.days.length !== expectedDays) {
      issues.push({
        code: "INVALID_DAY_COUNT",
        message: `Itinerary generated ${itinerary.days.length} days, but user requested exactly ${expectedDays} days.`,
        severity: "error",
      });
    }

    // 2. Chronological Ordering, Anti-Hallucination & Deduplication across all days
    const seenFullDaySignatures = new Map<string, number>();
    const seenContentSignatures = new Map<string, number>();
    const seenThemes = new Map<string, number>();

    for (const day of itinerary.days) {
      let previousEndMinutes = 0;

      // A. Full schedule fingerprint check across all days
      const fullSig = day.items.map((i) => `${i.type}:${i.referenceId}:${i.startTime}-${i.endTime}`).join("|");
      if (fullSig) {
        if (seenFullDaySignatures.has(fullSig)) {
          issues.push({
            code: "DUPLICATE_DAY_STRUCTURE",
            message: `Day ${day.dayNumber} has an identical schedule and item selection as Day ${seenFullDaySignatures.get(fullSig)}. Each day must be uniquely curated.`,
            severity: "error",
          });
        } else {
          seenFullDaySignatures.set(fullSig, day.dayNumber);
        }
      }

      // B. Content-level deduplication: distinct set of activities and restaurants
      const contentItemIds = day.items
        .filter((i) => i.type === "activity" || i.type === "food")
        .map((i) => i.referenceId)
        .sort()
        .join(",");

      const availableCandidatesCount = Array.from(validReferenceIds).filter(
        (id) =>
          !id.startsWith("stay_") &&
          !id.startsWith("trans_") &&
          !id.startsWith("dyn_stay_") &&
          !id.startsWith("dyn_trans_"),
      ).length;

      if (contentItemIds && contentItemIds.includes(",")) {
        if (seenContentSignatures.has(contentItemIds)) {
          if (availableCandidatesCount >= expectedDays) {
            issues.push({
              code: "DUPLICATE_DAY_ITEMS",
              message: `Day ${day.dayNumber} repeats the exact set of activities and dining spots as Day ${seenContentSignatures.get(contentItemIds)}. Each day must explore distinct attractions and experiences.`,
              severity: "error",
            });
          } else {
            issues.push({
              code: "DUPLICATE_DAY_ITEMS",
              message: `Day ${day.dayNumber} repeats items from Day ${seenContentSignatures.get(contentItemIds)} due to limited candidates (${availableCandidatesCount} items for ${expectedDays} days).`,
              severity: "warning",
            });
          }
        } else {
          seenContentSignatures.set(contentItemIds, day.dayNumber);
        }
      }

      // C. Theme diversity check
      const normalizedTheme = (day.theme || "").trim().toLowerCase();
      if (normalizedTheme) {
        if (seenThemes.has(normalizedTheme)) {
          issues.push({
            code: "DUPLICATE_DAY_THEME",
            message: `Day ${day.dayNumber} has the same theme ('${day.theme}') as Day ${seenThemes.get(normalizedTheme)}. Each day should have a distinct thematic focus.`,
            severity: "warning",
          });
        } else {
          seenThemes.set(normalizedTheme, day.dayNumber);
        }
      }

      for (const item of day.items) {
        // Anti-hallucination check
        if (!validReferenceIds.has(item.referenceId)) {
          issues.push({
            code: "HALLUCINATED_REFERENCE_ID",
            message: `Item references nonexistent ID "${item.referenceId}" which was not supplied in candidate data.`,
            severity: "error",
          });
        }

        const startMin = timeToMinutes(item.startTime);
        const endMin = timeToMinutes(item.endTime);

        // Valid start/end duration
        if (endMin <= startMin) {
          issues.push({
            code: "INVALID_ITEM_DURATION",
            message: `Day ${day.dayNumber} item (${item.referenceId}) ends at ${item.endTime} before or at start ${item.startTime}.`,
            severity: "error",
          });
        }

        // Timing overlap check
        if (startMin < previousEndMinutes) {
          issues.push({
            code: "SCHEDULE_OVERLAP",
            message: `Day ${day.dayNumber} item starts at ${item.startTime} before previous event ended at ${previousEndMinutes} min.`,
            severity: "error",
          });
        }

        previousEndMinutes = endMin;
      }
    }

    // 3. Duplicate Place Prevention Across Days (one selected place = one itinerary visit)
    const activityDayMap = new Map<string, number>();
    for (const day of itinerary.days) {
      for (const item of day.items) {
        if (item.type === "activity") {
          const prevDay = activityDayMap.get(item.referenceId);
          if (prevDay !== undefined && prevDay !== day.dayNumber) {
            issues.push({
              code: "DUPLICATE_PLACE_VISIT",
              message: `Place "${item.referenceId}" is scheduled on Day ${day.dayNumber} but was already visited on Day ${prevDay}. Each selected place must only be visited once.`,
              severity: "error",
            });
          } else if (prevDay === day.dayNumber) {
            issues.push({
              code: "DUPLICATE_PLACE_VISIT",
              message: `Place "${item.referenceId}" is scheduled multiple times on Day ${day.dayNumber}. Each place must only be visited once.`,
              severity: "error",
            });
          } else {
            activityDayMap.set(item.referenceId, day.dayNumber);
          }
        }
      }
    }

    // 4. Duplicate Restaurant on Same Day Prevention
    const totalFoodCandidates = Array.from(validReferenceIds).filter(
      (id) => id.startsWith("rest_") || id.startsWith("dyn_res_"),
    ).length;

    for (const day of itinerary.days) {
      const dayFoodSeen = new Set<string>();
      for (const item of day.items) {
        if (item.type === "food") {
          if (dayFoodSeen.has(item.referenceId)) {
            if (totalFoodCandidates >= 2) {
              issues.push({
                code: "DUPLICATE_RESTAURANT_SAME_DAY",
                message: `Day ${day.dayNumber} schedules restaurant "${item.referenceId}" multiple times on the same day. Each meal slot should feature distinct dining spots when alternatives exist.`,
                severity: "error",
              });
            } else {
              issues.push({
                code: "DUPLICATE_RESTAURANT_SAME_DAY",
                message: `Day ${day.dayNumber} repeats restaurant "${item.referenceId}" due to limited candidate availability.`,
                severity: "warning",
              });
            }
          }
          dayFoodSeen.add(item.referenceId);
        }
      }
    }

    const criticalCount = issues.filter((i) => i.severity === "error").length;
    const warningCount = issues.filter((i) => i.severity === "warning").length;

    return {
      passed: criticalCount === 0,
      issues,
      criticalCount,
      warningCount,
    };
  }
}
