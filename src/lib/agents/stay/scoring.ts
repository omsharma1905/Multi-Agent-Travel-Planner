/**
 * @file src/lib/agents/stay/scoring.ts
 *
 * Deterministic Stay & Accommodation Scoring Engine.
 *
 * Architectural Principle:
 * "Agents reason over stays. Providers retrieve accommodation facts."
 *
 * Enforces strict, documented weights:
 * 1. Budget Fit (0–30 pts)
 * 2. Comfort Match (0–25 pts)
 * 3. Geographic Proximity to Places & Destination (0–20 pts)
 * 4. Price Efficiency & Value (0–10 pts)
 * 5. Operational Availability (0–10 pts)
 * 6. Quality Metadata & Reputation (0–5 pts)
 * Total possible: 100 points
 */

import { Stay, StayComfortLevel } from "@/lib/travel/types/stay";
import { BudgetTier } from "@/types";
import { calculateHaversineDistance } from "@/lib/travel/normalizers";

export interface StayScoreBreakdown {
  budgetScore: number;
  comfortScore: number;
  proximityScore: number;
  valueScore: number;
  availabilityScore: number;
  qualityScore: number;
}

export interface ScoredStay {
  stay: Stay;
  score: number;
  reasons: string[];
  distanceToCentroidKm?: number;
  scoreBreakdown: StayScoreBreakdown;
  breakdown: StayScoreBreakdown; // Alias for convenience
}

export interface StayScoringResult {
  rankedStays: ScoredStay[];
  topPicks: Stay[];
  warnings: string[];
}

export interface CentroidCoordinates {
  latitude: number;
  longitude: number;
}

export class StayScorer {
  /**
   * Scores a single stay candidate against user trip criteria.
   */
  static scoreStay(params: {
    stay: Stay;
    budgetTier?: BudgetTier;
    centroid?: CentroidCoordinates | null;
  }): ScoredStay {
    const { stay, budgetTier = "moderate", centroid } = params;
    const reasons: string[] = [];

    // -------------------------------------------------------------------------
    // 1. Budget Fit (0–30 pts)
    // -------------------------------------------------------------------------
    let budgetScore = 0;
    const price = stay.pricePerNight;

    if (stay.priceType === "free" || price === 0) {
      if (budgetTier === "budget") {
        budgetScore = 30;
        reasons.push("Complimentary stay aligns perfectly with budget tier.");
      } else if (budgetTier === "moderate") {
        budgetScore = 24;
        reasons.push("Complimentary stay offers exceptional budget savings.");
      } else {
        budgetScore = 15;
        reasons.push("Complimentary stay available.");
      }
    } else if (price === null || stay.priceType === "unknown") {
      budgetScore = 18;
      reasons.push("Pricing awaiting final quotation; baseline budget compatibility assigned.");
    } else {
      switch (budgetTier) {
        case "budget":
          if (price <= 60) {
            budgetScore = 30;
            reasons.push(`Nightly rate ($${price}) fits budget tier effortlessly.`);
          } else if (price <= 100) {
            budgetScore = 20;
            reasons.push(`Nightly rate ($${price}) is manageable within budget limits.`);
          } else if (price <= 160) {
            budgetScore = 10;
          } else {
            budgetScore = 2;
          }
          break;

        case "moderate":
          if (price >= 70 && price <= 220) {
            budgetScore = 30;
            reasons.push(`Nightly rate ($${price}) matches moderate budget benchmark.`);
          } else if (price > 220 && price <= 320) {
            budgetScore = 24;
            reasons.push(`Nightly rate ($${price}) is an acceptable moderate upgrade.`);
          } else if (price < 70) {
            budgetScore = 22;
            reasons.push(`Nightly rate ($${price}) delivers high budget efficiency.`);
          } else {
            budgetScore = 8;
          }
          break;

        case "premium":
          if (price >= 150 && price <= 450) {
            budgetScore = 30;
            reasons.push(`Nightly rate ($${price}) reflects premium accommodation tier.`);
          } else if (price > 450 && price <= 750) {
            budgetScore = 25;
            reasons.push(`Nightly rate ($${price}) matches top-tier premium expectations.`);
          } else if (price >= 80 && price < 150) {
            budgetScore = 20;
            reasons.push(`Nightly rate ($${price}) offers premium value.`);
          } else {
            budgetScore = 10;
          }
          break;

        case "luxury":
          if (price >= 350) {
            budgetScore = 30;
            reasons.push(`Luxury tariff ($${price}) matches high-end bespoke expectations.`);
          } else if (price >= 200 && price < 350) {
            budgetScore = 22;
            reasons.push(`Nightly rate ($${price}) provides near-luxury comfort.`);
          } else if (price >= 100 && price < 200) {
            budgetScore = 12;
          } else {
            budgetScore = 4;
          }
          break;
      }
    }

    // -------------------------------------------------------------------------
    // 2. Comfort Match (0–25 pts)
    // -------------------------------------------------------------------------
    let comfortScore = 0;
    const comfort: StayComfortLevel =
      stay.comfortLevel ||
      (stay.category === "resort" || stay.category === "villa"
        ? "luxury"
        : stay.category === "boutique"
          ? "premium"
          : stay.category === "hostel"
            ? "budget"
            : "standard");

    switch (budgetTier) {
      case "luxury":
        if (comfort === "luxury" || stay.category === "resort" || stay.category === "villa") {
          comfortScore = 25;
          reasons.push("Opulent hospitality with luxury comfort tier.");
        } else if (comfort === "premium" || stay.category === "boutique") {
          comfortScore = 18;
          reasons.push("Refined boutique atmosphere approaching luxury standards.");
        } else if (comfort === "comfort" || stay.category === "hotel") {
          comfortScore = 12;
        } else {
          comfortScore = 4;
        }
        break;

      case "premium":
        if (comfort === "premium" || comfort === "luxury") {
          comfortScore = 25;
          reasons.push("High-touch comfort level and bespoke property style.");
        } else if (comfort === "comfort" || stay.category === "boutique") {
          comfortScore = 20;
          reasons.push("Comfortable upscale accommodations.");
        } else if (comfort === "standard" || stay.category === "hotel") {
          comfortScore = 14;
        } else {
          comfortScore = 6;
        }
        break;

      case "moderate":
        if (
          comfort === "comfort" ||
          comfort === "standard" ||
          stay.category === "boutique" ||
          stay.category === "hotel"
        ) {
          comfortScore = 25;
          reasons.push("Well-balanced comfort level suited for leisure travelers.");
        } else if (comfort === "premium") {
          comfortScore = 20;
          reasons.push("Elevated comfort tier upgrade.");
        } else if (comfort === "budget" || stay.category === "apartment") {
          comfortScore = 18;
        } else {
          comfortScore = 10;
        }
        break;

      case "budget":
        if (comfort === "budget" || stay.category === "hostel" || stay.category === "apartment") {
          comfortScore = 25;
          reasons.push("Practical, budget-optimized style ideal for independent travelers.");
        } else if (comfort === "standard") {
          comfortScore = 20;
          reasons.push("Solid standard comfort within accessible reach.");
        } else if (comfort === "comfort") {
          comfortScore = 14;
        } else {
          comfortScore = 4;
        }
        break;
    }

    // -------------------------------------------------------------------------
    // 3. Geographic Proximity to Places & Destination (0–20 pts)
    // -------------------------------------------------------------------------
    let proximityScore = 14; // Default if centroid is absent
    let distanceToCentroidKm: number | undefined;

    if (
      centroid &&
      typeof stay.latitude === "number" &&
      typeof stay.longitude === "number" &&
      !isNaN(stay.latitude) &&
      !isNaN(stay.longitude)
    ) {
      distanceToCentroidKm = calculateHaversineDistance(
        { latitude: stay.latitude, longitude: stay.longitude },
        { latitude: centroid.latitude, longitude: centroid.longitude },
      );

      if (distanceToCentroidKm <= 3.0) {
        proximityScore = 20;
        reasons.push(`Centrally located (${distanceToCentroidKm.toFixed(1)} km from itinerary core).`);
      } else if (distanceToCentroidKm <= 7.0) {
        proximityScore = 16;
        reasons.push(`Easily accessible (${distanceToCentroidKm.toFixed(1)} km from destination focal points).`);
      } else if (distanceToCentroidKm <= 15.0) {
        proximityScore = 10;
        reasons.push(`Situated within destination radius (${distanceToCentroidKm.toFixed(1)} km).`);
      } else {
        proximityScore = 4;
        reasons.push(`Suburban or peripheral retreat (${distanceToCentroidKm.toFixed(1)} km out).`);
      }
    }

    // -------------------------------------------------------------------------
    // 4. Price Efficiency & Value (0–10 pts)
    // -------------------------------------------------------------------------
    let valueScore = 0;
    const amenityCount = stay.amenities ? stay.amenities.length : 0;
    if (amenityCount >= 4) {
      valueScore += 5;
    } else if (amenityCount >= 2) {
      valueScore += 3;
    } else {
      valueScore += 1;
    }

    if (stay.rating >= 4.7) {
      valueScore += 5;
    } else if (stay.rating >= 4.4) {
      valueScore += 3;
    } else {
      valueScore += 2;
    }
    valueScore = Math.min(10, valueScore);

    // -------------------------------------------------------------------------
    // 5. Operational Availability (0–10 pts)
    // -------------------------------------------------------------------------
    let availabilityScore = 10;
    if (stay.availability === "sold_out") {
      availabilityScore = 0;
      reasons.push("Property currently has no vacant inventory.");
    } else if (stay.availability === "limited") {
      availabilityScore = 7;
      reasons.push("Limited room allotment remaining.");
    } else if (stay.availability === "unknown") {
      availabilityScore = 5;
    } else {
      availabilityScore = 10;
      reasons.push("Instant booking availability confirmed.");
    }

    // -------------------------------------------------------------------------
    // 6. Quality Metadata & Reputation (0–5 pts)
    // -------------------------------------------------------------------------
    let qualityScore = 0;
    if (stay.rating >= 4.8) {
      qualityScore = 5;
    } else if (stay.rating >= 4.5) {
      qualityScore = 4;
    } else if (stay.rating >= 4.0) {
      qualityScore = 3;
    } else {
      qualityScore = 1;
    }

    const totalScore = Math.min(
      100,
      budgetScore + comfortScore + proximityScore + valueScore + availabilityScore + qualityScore,
    );

    const breakdown: StayScoreBreakdown = {
      budgetScore,
      comfortScore,
      proximityScore,
      valueScore,
      availabilityScore,
      qualityScore,
    };

    return {
      stay,
      score: totalScore,
      reasons,
      distanceToCentroidKm,
      scoreBreakdown: breakdown,
      breakdown,
    };
  }

  /**
   * Scores and ranks all stay candidates deterministically.
   */
  static rankStays(params: {
    stays: Stay[];
    budgetTier?: BudgetTier;
    centroid?: CentroidCoordinates | null;
  }): StayScoringResult {
    const { stays, budgetTier = "moderate", centroid } = params;
    const warnings: string[] = [];

    if (!stays || stays.length === 0) {
      return {
        rankedStays: [],
        topPicks: [],
        warnings: ["No stays provided for scoring."],
      };
    }

    const scored = stays.map((s) =>
      StayScorer.scoreStay({
        stay: s,
        budgetTier,
        centroid,
      }),
    );

    // Sort descending by score, tie-break by rating and review count
    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.stay.rating !== a.stay.rating) {
        return b.stay.rating - a.stay.rating;
      }
      return b.stay.reviewCount - a.stay.reviewCount;
    });

    const topPicks = scored.filter((s) => s.stay.availability !== "sold_out").map((s) => s.stay);

    if (topPicks.length === 0 && scored.length > 0) {
      warnings.push("All available properties are currently sold out.");
    }

    return {
      rankedStays: scored,
      topPicks,
      warnings,
    };
  }
}
