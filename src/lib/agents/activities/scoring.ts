/**
 * @file src/lib/agents/activities/scoring.ts
 *
 * Deterministic Place & Activity Scoring Engine.
 *
 * Architectural Principle:
 * "Agents reason over places. Providers retrieve place facts."
 *
 * Enforces strict, documented weights:
 * 1. User Interest Relevance (0–40 pts)
 * 2. Quality & Rating Confidence (0–25 pts)
 * 3. Budget Compatibility (0–15 pts)
 * 4. Destination & Spatial Match (0–10 pts)
 * 5. Operational Availability (0–10 pts)
 * Total possible: 100 points
 *
 * Also provides deterministic spatial clustering to prevent erratic zig-zagging
 * across days in the final itinerary.
 */

import { Place } from "@/lib/travel/types/place";
import { TripWithPreferences } from "@/features/trips/types";
import { BudgetTier } from "@/types";
import { calculateHaversineDistance } from "@/lib/travel/normalizers";

export interface ScoredPlace {
  place: Place;
  score: number;
  reasons: string[];
  clusterId?: number;
  scoreBreakdown: {
    interestScore: number;
    ratingScore: number;
    budgetScore: number;
    destinationScore: number;
    availabilityScore: number;
  };
  breakdown: {
    interestScore: number;
    ratingScore: number;
    budgetScore: number;
    destinationScore: number;
    availabilityScore: number;
  };
}

export interface PlaceCluster {
  clusterId: number;
  center: { latitude: number; longitude: number };
  placeIds: string[];
}

export interface PlaceScoringResult {
  rankedPlaces: ScoredPlace[];
  topPicks: Place[];
  interestCoverage: Record<string, number>;
  clusters: PlaceCluster[];
  warnings: string[];
}

// Interest to place tag / type relevance mapping
const INTEREST_KEYWORDS: Record<string, string[]> = {
  "nature & outdoors": ["nature", "outdoors", "park", "garden", "lake", "river", "beach", "forest", "falls", "scenic"],
  "culture & arts": ["culture", "art", "museum", "temple", "monument", "historic", "heritage", "theatre", "artisan"],
  "history & heritage": ["history", "heritage", "temple", "ancient", "monument", "citadel", "palace", "fort", "shrine"],
  "architecture & design": ["architecture", "design", "citadel", "palace", "fort", "monument", "tower", "skyline"],
  "beaches & islands": ["beach", "island", "coastal", "coast", "waterfront", "marine", "surf", "sand"],
  "food & wine": ["food", "market", "bazaar", "culinary", "dining", "tasting", "wine", "specialty"],
  "active adventure": ["adventure", "active", "hiking", "trek", "falls", "walk", "climb", "outdoor", "cycling"],
  "photography": ["photography", "scenic", "viewpoint", "panoramic", "terrace", "overlook", "sunset", "promenade"],
  "shopping & markets": ["shopping", "market", "bazaar", "artisan", "craft", "boutique", "quarter"],
  "wellness & spa": ["wellness", "spa", "garden", "tranquil", "serene", "meditation", "sanctuary", "peaceful"],
  "nightlife & music": ["nightlife", "music", "evening", "entertainment", "club", "bar", "performance"],
  "scenic road trips": ["scenic", "road", "promenade", "drive", "viewpoint", "coastal", "lake"],
};

export class PlaceScorer {
  /**
   * Deterministically scores and ranks candidate places against trip specifications.
   */
  static scoreCandidates(
    candidates: Place[],
    trip?: TripWithPreferences | null,
    destinationCenter?: { latitude: number; longitude: number; destinationId?: string } | null,
  ): PlaceScoringResult {
    const warnings: string[] = [];
    const userInterests = (trip?.preferences?.interests || []).map((i) => i.toLowerCase().trim());
    const budgetTier = (trip as unknown as { budgetTier?: BudgetTier })?.budgetTier || trip?.budget || "moderate";

    const interestCoverage: Record<string, number> = {};
    for (const interest of userInterests) {
      interestCoverage[interest] = 0;
    }

    const scoredPlaces: ScoredPlace[] = candidates.map((place) => {
      const reasons: string[] = [];

      // 1. Interest Relevance (0–40 pts)
      let interestScore = 0;
      const placeText = [
        (place.name || "").toLowerCase(),
        (place.type || "").toLowerCase(),
        (place.description || "").toLowerCase(),
        ...(place.tags || []).map((t) => (t || "").toLowerCase()),
      ].join(" ");

      for (const interest of userInterests) {
        const keywords = INTEREST_KEYWORDS[interest] || [interest];
        const matchCount = keywords.filter((kw) => placeText.includes(kw)).length;
        if (matchCount > 0) {
          const points = Math.min(20, matchCount * 10);
          interestScore += points;
          reasons.push(`Matches interest "${interest}"`);
          interestCoverage[interest] = (interestCoverage[interest] || 0) + 1;
        }
      }
      interestScore = Math.min(40, interestScore);

      // Baseline relevance if no explicit interests or no match
      if (userInterests.length === 0) {
        interestScore = 20; // neutral baseline
      }

      // 2. Quality & Rating Score (0–25 pts)
      const rawRating = Math.max(0, Math.min(5, place.rating || 4.0));
      const ratingScore = Number(((rawRating / 5) * 20).toFixed(1));
      const reviewBonus = Math.min(5, Math.floor(Math.log10(Math.max(10, place.reviewCount || 100))));
      const qualityScore = Math.min(25, ratingScore + reviewBonus);
      if (rawRating >= 4.7) {
        reasons.push(`Highly rated attraction (${rawRating}★)`);
      }

      // 3. Budget Compatibility (0–15 pts)
      let budgetScore = 10; // default
      const isFree = place.priceLevel === "free" || place.priceType === "free" || place.ticketPrice === 0;

      if (budgetTier === "budget") {
        if (isFree) {
          budgetScore = 15;
          reasons.push("Free admission (budget-friendly)");
        } else if (place.priceLevel === "budget") {
          budgetScore = 12;
        } else if (place.priceLevel === "moderate") {
          budgetScore = 5;
        } else {
          budgetScore = 0;
        }
      } else if (budgetTier === "moderate") {
        if (place.priceLevel === "moderate") {
          budgetScore = 15;
        } else if (place.priceLevel === "budget" || isFree) {
          budgetScore = 13;
        } else {
          budgetScore = 8;
        }
      } else {
        // premium / luxury
        budgetScore = 15;
      }

      // 4. Destination & Spatial Match (0–10 pts)
      let destinationScore = 10;
      if (destinationCenter) {
        if (
          destinationCenter.destinationId &&
          place.destinationId &&
          place.destinationId !== destinationCenter.destinationId
        ) {
          // Normalize prefix check
          const normA = place.destinationId.toLowerCase().replace(/^(dest_|om_|geo_|city_)/, "");
          const normB = destinationCenter.destinationId.toLowerCase().replace(/^(dest_|om_|geo_|city_)/, "");
          if (normA !== normB) {
            destinationScore = 0;
            warnings.push(`Place "${place.name}" (${place.id}) destinationId "${place.destinationId}" does not match target "${destinationCenter.destinationId}".`);
          }
        }

        // Haversine distance check
        if (destinationCenter.latitude && destinationCenter.longitude && place.latitude && place.longitude) {
          const distKm = calculateHaversineDistance(
            { latitude: place.latitude, longitude: place.longitude },
            { latitude: destinationCenter.latitude, longitude: destinationCenter.longitude },
          );
          if (distKm > 100) {
            destinationScore = Math.max(0, destinationScore - 10);
            warnings.push(`Place "${place.name}" is ${distKm}km away from destination center.`);
          } else if (distKm > 40) {
            destinationScore = Math.max(3, destinationScore - 4);
          }
        }
      }

      // 5. Operational Availability (0–10 pts)
      let availabilityScore = 10;
      if (place.openingHours && (place.openingHours as any).isClosedAllWeek) {
        availabilityScore = 0;
      }

      const rawTotal = interestScore + qualityScore + budgetScore + destinationScore + availabilityScore;
      const totalScore = Number(rawTotal.toFixed(1));

      const scoreBreakdown = {
        interestScore,
        ratingScore: qualityScore,
        budgetScore,
        destinationScore,
        availabilityScore,
      };

      return {
        place,
        score: totalScore,
        reasons,
        scoreBreakdown,
        breakdown: scoreBreakdown,
      };
    });

    // Sort descending by score
    scoredPlaces.sort((a, b) => b.score - a.score);

    // Compute simple spatial clusters for sequencing
    const clusters = PlaceScorer.computeSpatialClusters(scoredPlaces.map((s) => s.place));

    // Assign clusterIds back to scoredPlaces
    for (const scored of scoredPlaces) {
      const cluster = clusters.find((c) => c.placeIds.includes(scored.place.id));
      if (cluster) {
        scored.clusterId = cluster.clusterId;
      }
    }

    const targetPicksCount = Math.max(4, Math.min(scoredPlaces.length, (trip?.days || 3) * 3));
    const topPicks = scoredPlaces.slice(0, targetPicksCount).map((s) => s.place);

    return {
      rankedPlaces: scoredPlaces,
      topPicks,
      interestCoverage,
      clusters,
      warnings,
    };
  }

  /**
   * Deterministically groups places into geographic clusters (radius ~5-8km)
   * to assist the Itinerary Agent in chronological daily proximity scheduling.
   */
  static computeSpatialClusters(places: Place[], maxClusterRadiusKm = 7.5): PlaceCluster[] {
    const clusters: PlaceCluster[] = [];
    const assigned = new Set<string>();

    for (let i = 0; i < places.length; i++) {
      const root = places[i];
      if (assigned.has(root.id) || !root.latitude || !root.longitude) continue;

      const clusterPlaceIds: string[] = [root.id];
      assigned.add(root.id);

      let sumLat = root.latitude;
      let sumLng = root.longitude;

      for (let j = i + 1; j < places.length; j++) {
        const other = places[j];
        if (assigned.has(other.id) || !other.latitude || !other.longitude) continue;

        const dist = calculateHaversineDistance(
          { latitude: root.latitude, longitude: root.longitude },
          { latitude: other.latitude, longitude: other.longitude },
        );

        if (dist <= maxClusterRadiusKm) {
          clusterPlaceIds.push(other.id);
          assigned.add(other.id);
          sumLat += other.latitude;
          sumLng += other.longitude;
        }
      }

      clusters.push({
        clusterId: clusters.length + 1,
        center: {
          latitude: Number((sumLat / clusterPlaceIds.length).toFixed(4)),
          longitude: Number((sumLng / clusterPlaceIds.length).toFixed(4)),
        },
        placeIds: clusterPlaceIds,
      });
    }

    return clusters;
  }
}
