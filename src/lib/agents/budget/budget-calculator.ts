/**
 * @file src/lib/agents/budget/budget-calculator.ts
 *
 * Deterministic Budget & Cost Calculation Engine.
 *
 * CRITICAL ARCHITECTURAL PRINCIPLE:
 * The LLM must NEVER calculate arithmetic, totals, or budget deductions.
 * This deterministic calculator handles all calculations and flags budget status.
 */

import { BudgetTier } from "@/types";
import { Stay, TransportOption, Place, Restaurant } from "@/lib/travel";
import { FXService } from "@/lib/travel/services/fx-service";

export interface BudgetBreakdown {
  accommodationCost: number;
  transportationCost: number;
  activityFeesEstimate: number;
  dailyFoodEstimate: number;
  totalEstimatedCost: number;
  currency: string;
  currencySymbol: string;
  budgetStatus: "within_budget" | "borderline" | "exceeds_budget";
  tierReferenceEstimate: number;
  isEstimate: boolean;
  hasEstimatedActivityFees?: boolean;
  hasEstimatedFoodCosts?: boolean;
  hasEstimatedAccommodationFees?: boolean;
  numberOfNights?: number;
}

// Estimated daily baseline allowance per traveler by budget tier (USD)
const DAILY_ALLOWANCE_BY_TIER: Record<BudgetTier, { food: number; activities: number; maxStay: number }> = {
  budget: { food: 35, activities: 15, maxStay: 75 },
  moderate: { food: 75, activities: 35, maxStay: 250 },
  premium: { food: 160, activities: 75, maxStay: 550 },
  luxury: { food: 350, activities: 150, maxStay: 1200 },
};

export class BudgetCalculator {
  /**
   * Deterministically calculates total trip cost and evaluates against user budget tier
   * in the destination's primary currency.
   */
  static calculate(params: {
    days: number;
    travellers: number;
    budgetTier: BudgetTier;
    stay?: Stay | null;
    transport?: TransportOption | null;
    places?: Place[];
    restaurants?: Restaurant[];
    currency?: string;
    currencySymbol?: string;
  }): BudgetBreakdown {
    const {
      days,
      travellers,
      budgetTier,
      stay,
      transport,
      places = [],
      restaurants = [],
      currency = "USD",
      currencySymbol = "$",
    } = params;

    const tierRates = DAILY_ALLOWANCE_BY_TIER[budgetTier] || DAILY_ALLOWANCE_BY_TIER.moderate;

    // 1. Stay total = pricePerNight * (days - 1 or min 1)
    const nights = Math.max(1, days - 1);
    let rawStayCostUSD = 0;
    let hasEstimatedAccommodationFees = false;

    if (stay) {
      if (stay.priceType === "free" || stay.pricePerNight === 0) {
        rawStayCostUSD = 0;
      } else if (typeof stay.pricePerNight === "number" && stay.pricePerNight > 0) {
        const stayCurrency = stay.currency || "USD";
        const nightlyUSD = FXService.convertToUSD(stay.pricePerNight, stayCurrency);
        rawStayCostUSD = nightlyUSD * nights;
        if (stay.isPriceEstimate || stay.priceType === "estimated") {
          hasEstimatedAccommodationFees = true;
        }
      } else {
        // Unknown stay pricing - use tier baseline estimate
        rawStayCostUSD = tierRates.maxStay * nights;
        hasEstimatedAccommodationFees = true;
      }
    } else {
      rawStayCostUSD = tierRates.maxStay * nights;
      hasEstimatedAccommodationFees = true;
    }

    // 2. Transport total = price * travellers
    const rawTransitCostUSD =
      transport && typeof transport.price === "number" ? transport.price * travellers : 0;

    // 3. Activity fees: calculate using real place ticket prices when known, otherwise tier allowance for unknown paid places
    let rawActivitiesCostUSD = 0;
    let hasEstimatedActivityFees = false;

    for (const p of places) {
      if (p.priceType === "free" || p.priceLevel === "free" || p.ticketPrice === 0) {
        // Free entry: 0 fee
        continue;
      }
      if (typeof p.ticketPrice === "number" && p.ticketPrice > 0) {
        // Known ticket price in place's currency
        const placeCurrency = p.currency || "USD";
        const priceUSD = FXService.convertToUSD(p.ticketPrice, placeCurrency);
        rawActivitiesCostUSD += priceUSD * travellers;
        if (p.isPriceEstimate) {
          hasEstimatedActivityFees = true;
        }
      } else {
        // Unknown or unspecified paid entry - use tier baseline estimate
        rawActivitiesCostUSD += tierRates.activities * travellers;
        hasEstimatedActivityFees = true;
      }
    }

    // 4. Food allowance: calculate using grounded restaurant dining prices when known, otherwise tier baseline
    let rawFoodCostUSD = 0;
    let hasEstimatedFoodCosts = false;
    const expectedMealsCount = Math.max(2, days * 2); // default 2 meals/day (lunch + dinner)

    if (restaurants.length > 0) {
      let accountedMeals = 0;
      for (const r of restaurants) {
        if (accountedMeals >= expectedMealsCount) break;

        if (r.priceType === "free" || r.averagePricePerPerson === 0) {
          // Free meal / community kitchen / tasting
          accountedMeals++;
          continue;
        }

        if (typeof r.averagePricePerPerson === "number" && r.averagePricePerPerson > 0) {
          const resCurrency = r.currency || "USD";
          const mealUSD = FXService.convertToUSD(r.averagePricePerPerson, resCurrency);
          rawFoodCostUSD += mealUSD * travellers;
          if (r.isPriceEstimate) {
            hasEstimatedFoodCosts = true;
          }
          accountedMeals++;
        } else {
          // Unknown price - use tier baseline per meal
          const mealTierCostUSD = (tierRates.food / 2) * travellers;
          rawFoodCostUSD += mealTierCostUSD;
          hasEstimatedFoodCosts = true;
          accountedMeals++;
        }
      }

      // If restaurants count is less than expected meals count, supplement with baseline allowance
      if (accountedMeals < expectedMealsCount) {
        const remainingMeals = expectedMealsCount - accountedMeals;
        rawFoodCostUSD += (tierRates.food / 2) * travellers * remainingMeals;
        hasEstimatedFoodCosts = true;
      }
    } else {
      rawFoodCostUSD = tierRates.food * days * travellers;
      hasEstimatedFoodCosts = true;
    }

    // 5. Total USD
    const totalUSD = rawStayCostUSD + rawTransitCostUSD + rawActivitiesCostUSD + rawFoodCostUSD;

    // Benchmark tier ceiling in USD
    const expectedMaxSpendUSD =
      (tierRates.maxStay * nights) +
      (350 * travellers) + // transit benchmark
      (tierRates.food * days * travellers) +
      (tierRates.activities * days * travellers);

    let budgetStatus: "within_budget" | "borderline" | "exceeds_budget" = "within_budget";
    if (totalUSD > expectedMaxSpendUSD * 1.25) {
      budgetStatus = "exceeds_budget";
    } else if (totalUSD > expectedMaxSpendUSD * 1.05) {
      budgetStatus = "borderline";
    }

    // Convert all amounts to target destination currency
    const accommodationCost = FXService.convertFromUSD(rawStayCostUSD, currency);
    const transportationCost = FXService.convertFromUSD(rawTransitCostUSD, currency);
    const activityFeesEstimate = FXService.convertFromUSD(rawActivitiesCostUSD, currency);
    const dailyFoodEstimate = FXService.convertFromUSD(rawFoodCostUSD, currency);
    const totalEstimatedCost = FXService.convertFromUSD(totalUSD, currency);
    const tierReferenceEstimate = FXService.convertFromUSD(expectedMaxSpendUSD, currency);

    return {
      accommodationCost,
      transportationCost,
      activityFeesEstimate,
      dailyFoodEstimate,
      totalEstimatedCost,
      currency,
      currencySymbol,
      budgetStatus,
      tierReferenceEstimate,
      isEstimate: true,
      hasEstimatedActivityFees,
      hasEstimatedFoodCosts,
      hasEstimatedAccommodationFees,
      numberOfNights: nights,
    };
  }
}
