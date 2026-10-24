/**
 * @file src/lib/orchestration/editing/intent-classifier.ts
 *
 * Natural-Language Journey Modification Intent Classifier & Safety Guard.
 *
 * Translates free-form user instructions into structured JourneyEditRequests.
 * Strictly prevents out-of-scope operations (e.g. account mutation, direct booking, arbitrary code).
 */

import { JourneyEditRequest } from "./schemas";
import { OrchestrationResult } from "../types";
import { TripWithPreferences } from "@/features/trips/types";

export interface IntentClassificationResult {
  allowed: boolean;
  editRequest?: JourneyEditRequest;
  rejectionReason?: string;
}

export class IntentClassifier {
  /**
   * Evaluates user natural-language modification instruction against safety rules
   * and maps it to a structured JourneyEditRequest.
   */
  static classify(
    instruction: string,
    trip: TripWithPreferences,
    _plan?: OrchestrationResult | null,
  ): IntentClassificationResult {
    const text = instruction.trim().toLowerCase();

    // 1. Safety Guard: Out-of-Scope Account & Security Operations
    if (
      text.includes("delete account") ||
      text.includes("delete my account") ||
      text.includes("remove account") ||
      text.includes("reset password") ||
      text.includes("change password") ||
      text.includes("admin") ||
      text.includes("user id")
    ) {
      return {
        allowed: false,
        rejectionReason:
          "This journey editor can only modify your journey plan. It cannot manage account or security settings.",
      };
    }

    // 2. Safety Guard: Direct Booking Operations
    if (
      text.includes("book me") ||
      text.includes("book this") ||
      text.includes("purchase ticket") ||
      text.includes("buy ticket") ||
      text.includes("reserve my flight") ||
      text.includes("pay for")
    ) {
      return {
        allowed: false,
        rejectionReason:
          "SafariX can modify and regenerate your journey plan, but bookings must be completed directly with official travel providers.",
      };
    }

    // 3. Extract Day Number if specified
    const dayMatch = text.match(/\bday\s*(\d+)\b/i);
    const dayNum = dayMatch ? parseInt(dayMatch[1], 10) : undefined;

    // Validate day number bounds if found
    if (dayNum !== undefined && (dayNum < 1 || dayNum > trip.days)) {
      return {
        allowed: false,
        rejectionReason: `Day ${dayNum} is invalid for this ${trip.days}-day journey. Please specify Day 1 to ${trip.days}.`,
      };
    }

    // 3.5 Dedicated Cost Reduction / Cheaper Replanning (Phase 20)
    const isCostReduction =
      /\bcheap(er)?\b/i.test(text) ||
      /\breduce\s+(overall\s+)?cost(s)?\b/i.test(text) ||
      /\breduce\s+budget\b/i.test(text) ||
      /\blower\s+(overall\s+)?cost(s)?\b/i.test(text) ||
      /\blower\s+(the\s+)?price\b/i.test(text) ||
      /\bbudget[- ]friendly\b/i.test(text) ||
      /\bsave\s+money\b/i.test(text) ||
      /\bcut\s+expense(s)?\b/i.test(text) ||
      /\bmore\s+affordable\b/i.test(text) ||
      /\bless\s+expensive\b/i.test(text) ||
      /\bdecrease\s+(the\s+)?(total\s+)?cost\b/i.test(text) ||
      /\btoo\s+expensive\b/i.test(text);

    if (isCostReduction && dayNum === undefined) {
      return {
        allowed: true,
        editRequest: {
          scope: "cost_reduction",
          instruction,
        },
      };
    }


    // 4. Transport Preference Modifications
    if (text.includes("train") || text.includes("rail")) {
      return {
        allowed: true,
        editRequest: {
          scope: "transport",
          target: { transportPreference: "train" },
          instruction,
        },
      };
    }

    if (text.includes("flight") || text.includes("fly") || text.includes("airplane")) {
      return {
        allowed: true,
        editRequest: {
          scope: "transport",
          target: { transportPreference: "flight" },
          instruction,
        },
      };
    }

    if (text.includes("drive") || text.includes("car") || text.includes("road trip")) {
      return {
        allowed: true,
        editRequest: {
          scope: "transport",
          target: { transportPreference: "car" },
          instruction,
        },
      };
    }

    if (text.includes("bus")) {
      return {
        allowed: true,
        editRequest: {
          scope: "transport",
          target: { transportPreference: "bus" },
          instruction,
        },
      };
    }

    // 5. Stay / Hotel Modifications
    if (
      text.includes("hotel") ||
      text.includes("resort") ||
      text.includes("stay") ||
      text.includes("accommodation") ||
      text.includes("lodging")
    ) {
      return {
        allowed: true,
        editRequest: {
          scope: "stay",
          instruction,
        },
      };
    }

    // 6. Day-Specific Modifications
    if (dayNum !== undefined) {
      // Check if specifically referencing a restaurant on that day
      if (text.includes("restaurant") || text.includes("lunch") || text.includes("dinner") || text.includes("food")) {
        return {
          allowed: true,
          editRequest: {
            scope: "restaurant",
            target: { dayNumber: dayNum },
            instruction,
          },
        };
      }

      // Check if specifically referencing an activity on that day
      if (text.includes("activity") || text.includes("museum") || text.includes("sight") || text.includes("place")) {
        return {
          allowed: true,
          editRequest: {
            scope: "activity",
            target: { dayNumber: dayNum },
            instruction,
          },
        };
      }

      // General single-day regeneration (e.g. "make day 3 more relaxed", "regenerate day 3")
      return {
        allowed: true,
        editRequest: {
          scope: "day",
          target: { dayNumber: dayNum },
          instruction,
        },
      };
    }

    // 7. General Restaurant / Food replacement across plan
    if (text.includes("restaurant") || text.includes("dining") || text.includes("food option") || text.includes("eat")) {
      return {
        allowed: true,
        editRequest: {
          scope: "restaurant",
          instruction,
        },
      };
    }

    // 8. General Activity / Place replacement across plan
    if (text.includes("activity") || text.includes("place") || text.includes("museum") || text.includes("attraction")) {
      return {
        allowed: true,
        editRequest: {
          scope: "activity",
          instruction,
        },
      };
    }

    // 9. Whole Journey optimizations (e.g. "make this trip cheaper", "give me more nature activities", "make it relaxed")
    return {
      allowed: true,
      editRequest: {
        scope: "journey",
        instruction,
      },
    };
  }
}
