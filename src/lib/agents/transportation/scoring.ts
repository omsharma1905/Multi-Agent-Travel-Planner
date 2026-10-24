/**
 * @file src/lib/agents/transportation/scoring.ts
 *
 * Deterministic Transportation Scoring Engine.
 *
 * Architectural Principle:
 * "User expresses preference → Transportation Agent evaluates real available options
 *  → deterministic services provide facts → agent recommends the best option
 *  → orchestrator uses that decision in the final itinerary."
 *
 * Enforces strict, documented weights:
 * - Preference weighting (+60 pts for matching user preferred mode)
 * - Duration efficiency (0–35 pts)
 * - Cost efficiency (0–30 pts, scaled to budget tier)
 * - Comfort & Stops (0–20 pts)
 * - Availability (0–15 pts, rejects sold_out)
 *
 * If preferred mode is not available for a route:
 * - Marks preferredModeUnavailable = true
 * - Explains why in fallbackReason
 * - Selects best practical alternative from valid candidates
 * - Zero hallucination of nonexistent transit legs
 */

import { TransportOption } from "@/lib/travel/types/transport";
import { TransportPreference, TripWithPreferences } from "@/features/trips/types";

export interface ScoredTransportOption {
  option: TransportOption;
  score: number;
  modeMatch: boolean;
  scoreBreakdown: {
    preferenceWeight: number;
    durationScore: number;
    costScore: number;
    comfortScore: number;
    availabilityScore: number;
  };
  rejectionReason?: string;
}

export interface TransportScoringResult {
  preference: TransportPreference;
  bestOption: TransportOption | null;
  rankedOptions: ScoredTransportOption[];
  preferredModeAvailable: boolean;
  preferredModeCount: number;
  fallbackReason?: string;
  warnings: string[];
}

export class TransportScorer {
  /**
   * Deterministically scores all candidate transport options against user preference,
   * duration, cost, comfort, and availability.
   */
  static scoreCandidates(
    candidates: TransportOption[],
    preference: TransportPreference = "auto",
    trip?: TripWithPreferences | null,
  ): TransportScoringResult {
    const warnings: string[] = [];

    if (!candidates || candidates.length === 0) {
      return {
        preference,
        bestOption: null,
        rankedOptions: [],
        preferredModeAvailable: false,
        preferredModeCount: 0,
        warnings: ["No transport candidates available to evaluate."],
      };
    }

    const budgetTier = trip?.budget || "moderate";

    // 1. Score each candidate option
    const scoredList: ScoredTransportOption[] = candidates.map((opt) => {
      // Rejection check: sold out options cannot be recommended
      if (opt.availability === "sold_out") {
        return {
          option: opt,
          score: -100,
          modeMatch: false,
          scoreBreakdown: {
            preferenceWeight: 0,
            durationScore: 0,
            costScore: 0,
            comfortScore: 0,
            availabilityScore: 0,
          },
          rejectionReason: "sold_out",
        };
      }

      // A. Preference Weighting
      let preferenceWeight = 0;
      const isMatch = preference !== "auto" && opt.mode === preference;
      if (isMatch) {
        // Strong positive weighting for requested mode
        preferenceWeight = 60;
      }

      // B. Duration Score (0 to 35 points)
      // Faster travel earns higher score, with diminishing returns. If duration is unverified, assign neutral baseline.
      const hours = typeof opt.durationMinutes === "number" ? opt.durationMinutes / 60 : null;
      const durationScore = hours !== null ? Math.max(0, Math.min(35, Math.round(35 - hours * 2.5))) : 18;

      // C. Cost Score (0 to 30 points)
      // Scaled by budget tier expectations
      let costScore = 15;
      const optPrice = typeof opt.price === "number" ? opt.price : 100;
      if (budgetTier === "budget") {
        // Highly price sensitive
        if (optPrice <= 40) costScore = 30;
        else if (optPrice <= 80) costScore = 22;
        else if (optPrice <= 150) costScore = 12;
        else costScore = 4;
      } else if (budgetTier === "moderate") {
        if (optPrice <= 80) costScore = 28;
        else if (optPrice <= 150) costScore = 22;
        else if (optPrice <= 250) costScore = 14;
        else costScore = 6;
      } else {
        // Premium / luxury: less price sensitive, comfort matters more
        if (optPrice <= 200) costScore = 25;
        else costScore = 20;
      }

      // D. Comfort & Stops (0 to 20 points)
      let comfortScore = 0;
      if (typeof opt.stops === "number") {
        if (opt.stops === 0) comfortScore += 12;
        else if (opt.stops === 1) comfortScore += 7;
        else comfortScore += 2;
      } else {
        // Unknown stops / external search baseline
        comfortScore += 6;
      }

      // Mode intrinsic comfort bonus
      if (opt.mode === "train") comfortScore += 8;
      else if (opt.mode === "flight") comfortScore += 7;
      else if (opt.mode === "car") comfortScore += 6;
      else if (opt.mode === "bus") comfortScore += 3;
      comfortScore = Math.min(20, comfortScore);

      // E. Availability Score (0 to 15 points)
      let availabilityScore = 5;
      if (opt.availability === "available") availabilityScore = 15;
      else if (opt.availability === "limited") availabilityScore = 8;

      const totalScore = preferenceWeight + durationScore + costScore + comfortScore + availabilityScore;

      return {
        option: opt,
        score: totalScore,
        modeMatch: isMatch,
        scoreBreakdown: {
          preferenceWeight,
          durationScore,
          costScore,
          comfortScore,
          availabilityScore,
        },
      };
    });

    // Sort by score descending (stable secondary sort by duration ascending)
    scoredList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const durA = typeof a.option.durationMinutes === "number" ? a.option.durationMinutes : 99999;
      const durB = typeof b.option.durationMinutes === "number" ? b.option.durationMinutes : 99999;
      return durA - durB;
    });

    // 2. Evaluate preferred mode availability
    const validCandidates = scoredList.filter((s) => !s.rejectionReason);
    const matchingOptions = validCandidates.filter((s) => s.modeMatch);
    const preferredModeCount = matchingOptions.length;

    let preferredModeAvailable = true;
    let fallbackReason: string | undefined;

    if (preference !== "auto" && preferredModeCount === 0) {
      preferredModeAvailable = false;
      const capitalPref = preference.charAt(0).toUpperCase() + preference.slice(1);
      const bestAlt = validCandidates[0];
      const altDesc = bestAlt ? bestAlt.option.mode : "an alternative mode";
      fallbackReason = `${capitalPref} transport was requested, but no valid ${preference} options were available for this route. A ${altDesc} was selected as the practical alternative.`;
      warnings.push(fallbackReason);
    }

    // 3. Select best option
    let bestOption: TransportOption | null = null;
    if (validCandidates.length > 0) {
      if (preference !== "auto" && preferredModeCount > 0) {
        bestOption = matchingOptions[0].option;
      } else {
        bestOption = validCandidates[0].option;
      }
    }

    return {
      preference,
      bestOption,
      rankedOptions: scoredList,
      preferredModeAvailable,
      preferredModeCount,
      fallbackReason,
      warnings,
    };
  }
}
