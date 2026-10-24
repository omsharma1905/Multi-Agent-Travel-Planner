/**
 * @file src/lib/agents/food/scoring.ts
 *
 * Deterministic Food & Dining Scoring Engine.
 *
 * Architectural Principle:
 * "Agents reason over dining options. Providers retrieve culinary facts."
 *
 * Enforces strict, documented weights:
 * 1. Cuisine & Preference Match (0–35 pts)
 * 2. Budget Fit (0–20 pts)
 * 3. Geographic Proximity to Places & Center (0–20 pts)
 * 4. Meal Compatibility (0–10 pts)
 * 5. Operational Availability (0–10 pts)
 * 6. Quality & Reputation (0–5 pts)
 * Total possible: 100 points
 */

import { Restaurant } from "@/lib/travel/types/restaurant";
import { TripWithPreferences } from "@/features/trips/types";
import { BudgetTier } from "@/types";
import { calculateHaversineDistance } from "@/lib/travel/normalizers";

export interface ScoredRestaurant {
  restaurant: Restaurant;
  score: number;
  reasons: string[];
  distanceToCentroidKm?: number;
  scoreBreakdown: {
    cuisineScore: number;
    budgetScore: number;
    geographicScore: number;
    mealTypeScore: number;
    availabilityScore: number;
    qualityScore: number;
  };
  breakdown: {
    cuisineScore: number;
    budgetScore: number;
    geographicScore: number;
    mealTypeScore: number;
    availabilityScore: number;
    qualityScore: number;
  };
}

export interface FoodScoringResult {
  rankedRestaurants: ScoredRestaurant[];
  topPicks: Restaurant[];
  cuisineCoverage: Record<string, number>;
  warnings: string[];
}

// Interest to cuisine / dining keyword mapping
const CUISINE_KEYWORDS: Record<string, string[]> = {
  "food & wine": ["wine", "dining", "tasting", "gourmet", "traditional", "regional", "bistro", "culinary"],
  "culture & arts": ["heritage", "traditional", "tea", "ceremony", "royal", "historic"],
  "street food": ["street food", "snack", "tandoori", "noodles", "ramen", "bazaar", "chaat", "mithai"],
  "vegetarian": ["vegetarian", "vegan", "shojin", "organic", "farm-to-table", "thali"],
  "seafood": ["seafood", "fish", "prawn", "crab", "coastal", "sushi", "grill"],
  "budget": ["budget", "street food", "casual", "warung", "counter"],
  "luxury": ["luxury", "fine dining", "kaiseki", "omakase", "palatial"],
  "nature & outdoors": ["garden", "organic", "courtyard", "waterfront", "farm-to-table"],
};

export class FoodScorer {
  /**
   * Deterministically scores and ranks candidate restaurants against trip specifications
   * and spatial proximity to itinerary places / destination centroid.
   */
  static scoreCandidates(
    candidates: Restaurant[],
    trip?: TripWithPreferences | null,
    placesOrCenter?:
      | Array<{ latitude: number; longitude: number }>
      | { latitude: number; longitude: number }
      | null,
  ): FoodScoringResult {
    const warnings: string[] = [];
    const userInterests = (trip?.preferences?.interests || []).map((i) => i.toLowerCase().trim());
    const budgetTier =
      (trip as unknown as { budgetTier?: BudgetTier })?.budgetTier || trip?.budget || "moderate";

    // Determine geographic anchor (centroid of selected places, or single destination center)
    let anchorLat: number | null = null;
    let anchorLng: number | null = null;

    if (Array.isArray(placesOrCenter) && placesOrCenter.length > 0) {
      const sumLat = placesOrCenter.reduce((acc, p) => acc + p.latitude, 0);
      const sumLng = placesOrCenter.reduce((acc, p) => acc + p.longitude, 0);
      anchorLat = sumLat / placesOrCenter.length;
      anchorLng = sumLng / placesOrCenter.length;
    } else if (placesOrCenter && "latitude" in placesOrCenter && "longitude" in placesOrCenter) {
      anchorLat = placesOrCenter.latitude;
      anchorLng = placesOrCenter.longitude;
    }

    const cuisineCoverage: Record<string, number> = {};

    const scoredRestaurants: ScoredRestaurant[] = candidates.map((restaurant) => {
      const reasons: string[] = [];

      // 1. Cuisine & Preference Match (0–35 pts)
      let cuisineScore = 0;
      const combinedText = [
        ...restaurant.cuisine,
        ...(restaurant.tags || []),
        restaurant.category || "",
        restaurant.name,
      ].join(" ").toLowerCase();

      // Check user interests overlap
      let matchedInterests = 0;
      for (const interest of userInterests) {
        const keywords = CUISINE_KEYWORDS[interest] || [interest];
        if (keywords.some((kw) => combinedText.includes(kw))) {
          matchedInterests++;
          cuisineScore += 12;
          cuisineCoverage[interest] = (cuisineCoverage[interest] || 0) + 1;
        }
      }

      // Base variety / gastronomy credit
      if (restaurant.cuisine.length >= 2) {
        cuisineScore += 8;
      } else if (restaurant.cuisine.length === 1) {
        cuisineScore += 5;
      }

      // Dietary match if user has vegetarian interest
      if (userInterests.some((i) => i.includes("veg")) && restaurant.dietaryOptions?.includes("Vegetarian")) {
        cuisineScore += 10;
        reasons.push("Vegetarian dietary options verified");
      }

      cuisineScore = Math.min(35, Math.max(5, cuisineScore));
      if (matchedInterests > 0) {
        reasons.push(`Matched ${matchedInterests} trip interest preferences`);
      }

      // 2. Budget Fit (0–20 pts)
      let budgetScore = 15;
      const priceLevel = restaurant.priceLevel;
      const priceType = restaurant.priceType;

      if (budgetTier === "budget") {
        if (priceLevel === "budget" || priceLevel === "free" || priceType === "budget" || priceType === "free") {
          budgetScore = 20;
          reasons.push("Ideal budget fit");
        } else if (priceLevel === "moderate") {
          budgetScore = 14;
        } else {
          budgetScore = 6;
        }
      } else if (budgetTier === "moderate") {
        if (priceLevel === "moderate" || priceType === "moderate") {
          budgetScore = 20;
          reasons.push("Ideal moderate tier dining fit");
        } else if (priceLevel === "budget" || priceLevel === "free") {
          budgetScore = 18;
          reasons.push("Cost-effective dining stop");
        } else {
          budgetScore = 12;
        }
      } else if (budgetTier === "premium") {
        if (priceLevel === "expensive" || priceLevel === "moderate" || priceType === "premium" || priceType === "moderate") {
          budgetScore = 20;
          reasons.push("Well matched to premium dining expectations");
        } else {
          budgetScore = 16;
        }
      } else if (budgetTier === "luxury") {
        if (priceLevel === "luxury" || priceLevel === "expensive" || priceType === "premium") {
          budgetScore = 20;
          reasons.push("Exceptional fine dining standard");
        } else {
          budgetScore = 14;
        }
      }

      // 3. Geographic Proximity (0–20 pts)
      let geographicScore = 14; // default if no coordinates provided
      let distKm: number | undefined;

      if (anchorLat !== null && anchorLng !== null) {
        distKm = calculateHaversineDistance(
          { latitude: anchorLat, longitude: anchorLng },
          { latitude: restaurant.latitude, longitude: restaurant.longitude },
        );

        if (distKm <= 2.0) {
          geographicScore = 20;
          reasons.push(`Under 2 km (${distKm.toFixed(1)} km) from core itinerary hub`);
        } else if (distKm <= 5.0) {
          geographicScore = 16;
          reasons.push(`Within 5 km (${distKm.toFixed(1)} km) of activities`);
        } else if (distKm <= 10.0) {
          geographicScore = 10;
        } else {
          geographicScore = 4;
        }
      }

      // 4. Meal Compatibility (0–10 pts)
      let mealTypeScore = 6;
      if (restaurant.mealTypes && restaurant.mealTypes.length > 0) {
        if (restaurant.mealTypes.includes("lunch") || restaurant.mealTypes.includes("dinner")) {
          mealTypeScore = 10;
          reasons.push(`Covers key meal slots: ${restaurant.mealTypes.join(", ")}`);
        } else {
          mealTypeScore = 8;
        }
      }

      // 5. Availability & Opening Hours (0–10 pts)
      let availabilityScore = 7;
      if (
        restaurant.openingHours &&
        !restaurant.openingHours.isUnknown &&
        (Boolean(restaurant.openingHours.text) || Boolean(restaurant.openingHours.isAlwaysOpen))
      ) {
        availabilityScore = 10;
      }

      // 6. Quality & Reputation (0–5 pts)
      let qualityScore = 0;
      if (restaurant.rating >= 4.7) {
        qualityScore += 3;
      } else if (restaurant.rating >= 4.2) {
        qualityScore += 2;
      } else {
        qualityScore += 1;
      }

      if (restaurant.reviewCount >= 1000) {
        qualityScore += 2;
      } else if (restaurant.reviewCount >= 200) {
        qualityScore += 1;
      }
      qualityScore = Math.min(5, qualityScore);

      const totalScore = Number(
        (cuisineScore + budgetScore + geographicScore + mealTypeScore + availabilityScore + qualityScore).toFixed(1),
      );

      const scoreBreakdown = {
        cuisineScore,
        budgetScore,
        geographicScore,
        mealTypeScore,
        availabilityScore,
        qualityScore,
      };

      return {
        restaurant,
        score: totalScore,
        reasons,
        distanceToCentroidKm: distKm !== undefined ? Number(distKm.toFixed(2)) : undefined,
        scoreBreakdown,
        breakdown: scoreBreakdown,
      };
    });

    // Rank descending by score
    scoredRestaurants.sort((a, b) => b.score - a.score);

    return {
      rankedRestaurants: scoredRestaurants,
      topPicks: scoredRestaurants.map((s) => s.restaurant),
      cuisineCoverage,
      warnings,
    };
  }
}
