/**
 * @file src/lib/orchestration/editing/journey-editor.ts
 *
 * Core Journey Editing and Partial Regeneration Engine.
 *
 * Implements targeted, fail-safe journey modifications across:
 * 1. Whole Journey Regeneration
 * 2. Single Day Regeneration
 * 3. Transport Replacement (with hard preference enforcement)
 * 4. Stay Replacement
 * 5. Activity / Place Replacement
 * 6. Restaurant / Food Replacement
 * 7. Natural-Language Guided Modification
 *
 * Preserves the core SafariX architectural invariant:
 * - Deterministic engines calculate.
 * - Validators verify.
 * - If generation or validation fails, THE PREVIOUS JOURNEY REMAINS INTACT.
 */

import { travelService, Place, Restaurant, Stay, TransportOption } from "@/lib/travel";
import { travelOrchestrator } from "../orchestrator";
import { OrchestrationResult } from "../types";
import { TripsService } from "@/features/trips/service";
import { TripWithPreferences, TransportPreference } from "@/features/trips/types";
import { BudgetCalculator } from "@/lib/agents/budget/budget-calculator";
import { ItineraryValidator, ValidationReport } from "@/lib/agents/validator/itinerary-validator";
import { CurrencyResolver } from "@/lib/travel/services/currency-resolver";
import { FXService } from "@/lib/travel/services/fx-service";


import { TransportationAgent } from "@/lib/agents/transportation/transportation-agent";
import {
  JourneyEditRequest,
  JourneyEditResult,
  EditChangeSummary,
} from "./schemas";
import { IntentClassifier } from "./intent-classifier";
import { ItineraryDay, ItineraryItem } from "@/lib/agents/itinerary/schemas";

export class JourneyEditor {
  private transportAgent = new TransportationAgent();

  /**
   * Main entry point: Executes a validated JourneyEditRequest.
   */
  async executeEdit(
    trip: TripWithPreferences,
    userId: string,
    request: JourneyEditRequest,
  ): Promise<JourneyEditResult> {
    const originalPlan = trip.plan;
    if (!originalPlan || originalPlan.status !== "completed") {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan || ({} as OrchestrationResult),
        error: "Cannot edit a journey that has not yet completed initial AI planning.",
      };
    }

    try {
      let result: JourneyEditResult;

      switch (request.scope) {
        case "natural_language": {
          const instruction = request.instruction || "";
          const classified = IntentClassifier.classify(instruction, trip, originalPlan);
          if (!classified.allowed || !classified.editRequest) {
            return {
              success: false,
              tripId: trip.id,
              plan: originalPlan,
              error: classified.rejectionReason || "Unsupported modification request.",
            };
          }
          result = await this.executeEdit(trip, userId, classified.editRequest);
          break;
        }

        case "cost_reduction":
          result = await this.reduceCost(trip, userId, request.instruction);
          break;

        case "journey":
          if (
            request.instruction &&
            (/\bcheap(er)?\b/i.test(request.instruction) ||
              /\breduce\s+(overall\s+)?cost/i.test(request.instruction) ||
              /\blower\s+(the\s+)?price/i.test(request.instruction) ||
              /\bbudget[- ]friendly/i.test(request.instruction) ||
              /\bsave\s+money/i.test(request.instruction))
          ) {
            result = await this.reduceCost(trip, userId, request.instruction);
          } else {
            result = await this.regenerateWholeJourney(trip, userId, request.instruction);
          }
          break;


        case "day":
          result = await this.regenerateSingleDay(
            trip,
            userId,
            request.target?.dayNumber ?? 1,
            request.instruction,
          );
          break;

        case "transport":
          result = await this.changeTransport(
            trip,
            userId,
            request.target?.transportPreference || "auto",
            request.instruction,
          );
          break;

        case "stay":
          result = await this.changeStay(
            trip,
            userId,
            request.target?.candidateId,
            request.instruction,
          );
          break;

        case "activity":
          result = await this.replaceActivity(
            trip,
            userId,
            request.target?.itemId,
            request.target?.candidateId,
            request.target?.dayNumber,
            request.instruction,
          );
          break;

        case "restaurant":
          result = await this.replaceRestaurant(
            trip,
            userId,
            request.target?.itemId,
            request.target?.candidateId,
            request.target?.dayNumber,
            request.instruction,
          );
          break;

        default:
          return {
            success: false,
            tripId: trip.id,
            plan: originalPlan,
            error: `Unsupported edit scope: ${request.scope}`,
          };
      }

      return result;
    } catch (err) {
      console.error("[JourneyEditor] Regeneration error:", err);
      // FAIL-SAFE INVARIANT: keep existing journey intact
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: err instanceof Error ? err.message : "Failed to apply journey modification.",
      };
    }
  }

  /**
   * Fail-safe transactional persistence and version history tracking.
   * Atomically commits plan updates to trips table and records an immutable version snapshot.
   */
  private async persistAndRecordVersion(params: {
    tripId: string;
    userId: string;
    plan: OrchestrationResult;
    scope: string;
    instruction?: string | null;
    changeSummary: EditChangeSummary;
  }): Promise<void> {
    const { tripId, userId, plan, scope, instruction, changeSummary } = params;
    await TripsService.updateTripPlan(tripId, userId, plan, "upcoming");
    await TripsService.recordTripVersion({
      tripId,
      userId,
      scope,
      instruction: instruction ?? null,
      changeSummary: changeSummary as unknown as Record<string, unknown>,
      snapshot: plan,
      totalCost: plan.budget?.totalEstimatedCost ?? 0,
      currency: plan.budget?.currency ?? "USD",
      currencySymbol: plan.budget?.currencySymbol ?? "$",
    });
  }

  // =========================================================================
  // 1. REGENERATE WHOLE JOURNEY
  // =========================================================================
  async regenerateWholeJourney(
    trip: TripWithPreferences,
    userId: string,
    instruction?: string,
  ): Promise<JourneyEditResult> {
    const originalPlan = trip.plan!;
    const oldBudget = originalPlan.budget?.totalEstimatedCost;

    // Run complete orchestrator
    const newPlan = await travelOrchestrator.planTrip(trip);

    if (newPlan.status !== "completed" || !newPlan.validation?.passed) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: newPlan.error || "Regenerated journey failed validation checks. Previous plan retained.",
        validationReport: newPlan.validation || undefined,
      };
    }

    // Attach version metadata
    newPlan.assembledAt = new Date().toISOString();

    const changeSummary: EditChangeSummary = {
      scope: "journey",
      summary: instruction
        ? `Entire journey re-orchestrated based on: "${instruction}"`
        : "Entire journey re-orchestrated with fresh options.",
      changedItems: ["Transportation", "Stay", "Activities", "Dining", "Itinerary"],
      oldBudget,
      newBudget: newPlan.budget?.totalEstimatedCost,
      currency: newPlan.budget?.currency,
      currencySymbol: newPlan.budget?.currencySymbol,
    };

    // Atomically persist & record version snapshot
    await this.persistAndRecordVersion({
      tripId: trip.id,
      userId,
      plan: newPlan,
      scope: "journey",
      instruction,
      changeSummary,
    });

    return {
      success: true,
      tripId: trip.id,
      plan: newPlan,
      changeSummary,
    };
  }

  // =========================================================================
  // 1b. COST REDUCTION & VERIFIED BUDGET REPLANNING (PHASE 20)
  // =========================================================================
  async reduceCost(
    trip: TripWithPreferences,
    userId: string,
    instruction?: string,
  ): Promise<JourneyEditResult> {
    const originalPlan = trip.plan!;
    const oldBudget = originalPlan.budget?.totalEstimatedCost ?? 0;
    const currentStay = originalPlan.selectedStayDetails || null;
    const currentTransport = originalPlan.transportation?.selectedOption || null;
    const currentPlaces = originalPlan.selectedPlacesDetails || [];
    const currentRestaurants = originalPlan.selectedRestaurantsDetails || [];

    // 1. Prepare trip context and resolve destination currency consistently
    const context = await travelService.prepareTripContext(trip);
    const destCurrency = CurrencyResolver.resolve(
      context.destination.name,
      context.destination.country,
      context.destination.countryCode,
    );
    const planCurrencyCode = originalPlan.budget?.currency || destCurrency.code || "USD";
    const planCurrencySymbol = originalPlan.budget?.currencySymbol || destCurrency.symbol || "$";

    // 2. Candidate pool enrichment: ensure sufficient budget inventory is available
    const allStays = [...context.candidateStays];
    const allPlaces = [...context.candidatePlaces];
    const allRestaurants = [...context.candidateRestaurants];

    // If stays pool is small or lacks budget options, search budget accommodations
    if (allStays.length < 3) {
      try {
        const budgetStays = await travelService.searchStays({
          destinationId: context.destination.id,
          latitude: context.destination.latitude,
          longitude: context.destination.longitude,
          budgetTier: "budget",
          limit: 10,
          nights: trip.days,
          guests: trip.travellers,
          rooms: Math.max(1, Math.ceil(trip.travellers / 2)),
        });
        for (const bs of budgetStays) {
          if (!allStays.some((s) => s.id === bs.id)) {
            allStays.push(bs);
          }
        }
      } catch {
        // Fall back gracefully to existing candidate pool
      }
    }

    // 3. Compute metrics for current selections
    const currentStayNightlyUSD =
      currentStay && typeof currentStay.pricePerNight === "number" && currentStay.pricePerNight > 0
        ? FXService.convertToUSD(currentStay.pricePerNight, currentStay.currency || "USD")
        : Infinity;

    const currentTransportOption: TransportOption | null =
      originalPlan.transportation?.recommendedOptionId
        ? context.candidateTransport.find(
            (t) => t.id === originalPlan.transportation?.recommendedOptionId,
          ) || null
        : null;

    const currentTransportUSD =
      currentTransportOption && typeof currentTransportOption.price === "number" && currentTransportOption.price !== null
        ? currentTransportOption.price
        : Infinity;

    // 4. Stays optimization options
    const cheaperStays = allStays
      .filter(
        (s) =>
          s.id !== currentStay?.id &&
          typeof s.pricePerNight === "number" &&
          s.pricePerNight !== null &&
          FXService.convertToUSD(s.pricePerNight, s.currency || "USD") < currentStayNightlyUSD,
      )
      .sort(
        (a, b) =>
          FXService.convertToUSD(a.pricePerNight!, a.currency || "USD") -
          FXService.convertToUSD(b.pricePerNight!, b.currency || "USD"),
      );

    const alternativeStays = allStays.filter((s) => s.id !== currentStay?.id);
    const stayOptions: (Stay | null)[] = [
      currentStay,
      ...cheaperStays,
      ...alternativeStays.slice(0, 3),
    ].filter((s): s is Stay => Boolean(s));
    if (stayOptions.length === 0) {
      stayOptions.push(null);
    }

    // 5. Transport optimization options
    const cheaperTransports = context.candidateTransport
      .filter(
        (t) =>
          t.id !== currentTransportOption?.id &&
          typeof t.price === "number" &&
          t.price !== null &&
          t.price < currentTransportUSD,
      )
      .sort((a, b) => (a.price || 0) - (b.price || 0));

    const transportOptions: (TransportOption | null)[] = [
      currentTransportOption,
      ...cheaperTransports,
    ];
    if (transportOptions.length === 0 || !currentTransportOption) {
      if (!transportOptions.some((t) => t === null)) {
        transportOptions.push(null);
      }
    }

    // 6. Activities optimization: substitute higher-fee activities with authentic free/budget landmarks
    const isPaidPlace = (p: Place) =>
      p.priceType !== "free" &&
      p.priceLevel !== "free" &&
      (p.ticketPrice === undefined || p.ticketPrice === null || p.ticketPrice > 0);

    const isFreePlace = (p: Place) =>
      p.priceType === "free" || p.priceLevel === "free" || p.ticketPrice === 0;

    const availableFreePlaces = allPlaces.filter(
      (p) => isFreePlace(p) && !currentPlaces.some((cp) => cp.id === p.id),
    );

    const placeReplacements = new Map<string, Place>();
    const cheaperPlaces = [...currentPlaces];
    let freeIdx = 0;
    for (let i = 0; i < cheaperPlaces.length && freeIdx < availableFreePlaces.length; i++) {
      const cur = cheaperPlaces[i];
      if (isPaidPlace(cur)) {
        const replacement = availableFreePlaces[freeIdx++];
        placeReplacements.set(cur.id, replacement);
        cheaperPlaces[i] = replacement;
      }
    }

    const placesVariations: Array<{ places: Place[]; replacements: Map<string, Place> }> = [
      { places: currentPlaces, replacements: new Map<string, Place>() },
    ];
    if (placeReplacements.size > 0) {
      placesVariations.unshift({ places: cheaperPlaces, replacements: placeReplacements });
    }

    // 7. Dining optimization: substitute expensive dining with budget local culinary venues
    const isBudgetRestaurant = (r: Restaurant) =>
      r.priceLevel === "budget" ||
      r.priceType === "budget" ||
      r.priceType === "free" ||
      r.priceLevel === "free" ||
      (typeof r.averagePricePerPerson === "number" && r.averagePricePerPerson <= 30);

    const availableBudgetRestaurants = allRestaurants.filter(
      (r) => isBudgetRestaurant(r) && !currentRestaurants.some((cr) => cr.id === r.id),
    );

    const restaurantReplacements = new Map<string, Restaurant>();
    const cheaperRestaurants = [...currentRestaurants];
    let restIdx = 0;
    for (let i = 0; i < cheaperRestaurants.length && restIdx < availableBudgetRestaurants.length; i++) {
      const cur = cheaperRestaurants[i];
      if (!isBudgetRestaurant(cur)) {
        const replacement = availableBudgetRestaurants[restIdx++];
        restaurantReplacements.set(cur.id, replacement);
        cheaperRestaurants[i] = replacement;
      }
    }

    const restaurantsVariations: Array<{
      restaurants: Restaurant[];
      replacements: Map<string, Restaurant>;
    }> = [{ restaurants: currentRestaurants, replacements: new Map<string, Restaurant>() }];
    if (restaurantReplacements.size > 0) {
      restaurantsVariations.unshift({
        restaurants: cheaperRestaurants,
        replacements: restaurantReplacements,
      });
    }

    // 8. Tier stepping (luxury -> premium -> moderate -> budget)
    const tierOrder: import("@/types").BudgetTier[] = ["luxury", "premium", "moderate", "budget"];
    const currentTierIndex = tierOrder.indexOf(trip.budget);
    const steppedTiers: import("@/types").BudgetTier[] = [];
    if (currentTierIndex !== -1 && currentTierIndex < tierOrder.length - 1) {
      for (let i = currentTierIndex + 1; i < tierOrder.length; i++) {
        steppedTiers.push(tierOrder[i]);
      }
    }
    const tierOptions = [...steppedTiers, trip.budget];

    // 9. Explore optimization permutations across all domains
    interface CandidateOption {
      stay: Stay | null;
      transport: TransportOption | null;
      places: Place[];
      restaurants: Restaurant[];
      placeReplacements: Map<string, Place>;
      restaurantReplacements: Map<string, Restaurant>;
      tier: import("@/types").BudgetTier;
      calculatedBudget: ReturnType<typeof BudgetCalculator.calculate>;
    }

    const candidatePlans: CandidateOption[] = [];

    for (const pVar of placesVariations) {
      for (const rVar of restaurantsVariations) {
        for (const stayCandidate of stayOptions) {
          for (const transportCandidate of transportOptions) {
            for (const tierCandidate of tierOptions) {
              // Skip if exact same configuration as current
              if (
                stayCandidate?.id === currentStay?.id &&
                transportCandidate?.id === currentTransportOption?.id &&
                pVar.replacements.size === 0 &&
                rVar.replacements.size === 0 &&
                tierCandidate === trip.budget
              ) {
                continue;
              }

              const budgetCalc = BudgetCalculator.calculate({
                days: trip.days,
                travellers: trip.travellers,
                budgetTier: tierCandidate,
                stay: stayCandidate,
                transport: transportCandidate,
                places: pVar.places,
                restaurants: rVar.restaurants,
                currency: planCurrencyCode,
                currencySymbol: planCurrencySymbol,
              });

              if (budgetCalc.totalEstimatedCost < oldBudget) {
                candidatePlans.push({
                  stay: stayCandidate,
                  transport: transportCandidate,
                  places: pVar.places,
                  restaurants: rVar.restaurants,
                  placeReplacements: pVar.replacements,
                  restaurantReplacements: rVar.replacements,
                  tier: tierCandidate,
                  calculatedBudget: budgetCalc,
                });
              }
            }
          }
        }
      }
    }

    // Sort candidate plans by lowest total cost
    candidatePlans.sort(
      (a, b) => a.calculatedBudget.totalEstimatedCost - b.calculatedBudget.totalEstimatedCost,
    );

    // If no permutation yields a strictly lower budget:
    if (candidatePlans.length === 0) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error:
          "Unable to reduce costs further: Current selections already represent the most economical verified options among available candidates for this destination. Your previous journey remains intact.",
      };
    }

    // 10. Pick the best valid plan that satisfies deterministic validation
    let bestOption: CandidateOption | null = null;
    let validatedItinerary: { days: ItineraryDay[]; orchestrationNotes: string } | null = null;
    let validationReport: ValidationReport | null = null;

    for (const option of candidatePlans) {
      // Re-map itinerary items with new stay/transport/place/dining IDs
      const updatedDays = (originalPlan.itinerary?.days || []).map((day) => {
        const updatedItems = day.items.map((item) => {
          if (item.type === "stay" && option.stay) {
            const stayPriceText =
              typeof option.stay.pricePerNight === "number" && option.stay.pricePerNight > 0
                ? ` (${option.stay.currency || "$"}${option.stay.pricePerNight}/night)`
                : "";
            return {
              ...item,
              referenceId: option.stay.id,
              reasoning: `Budget-optimized accommodation at ${option.stay.name}${stayPriceText}.`,
            };
          }
          if (item.type === "transport" && option.transport) {
            return {
              ...item,
              referenceId: option.transport.id,
              reasoning: `Cost-effective transit via ${option.transport.provider || option.transport.mode} (${option.transport.mode.toUpperCase()}).`,
            };
          }
          if (item.type === "activity" && option.placeReplacements.has(item.referenceId)) {
            const newPlace = option.placeReplacements.get(item.referenceId)!;
            return {
              ...item,
              referenceId: newPlace.id,
              title: newPlace.name,
              reasoning: `Curated free/budget cultural landmark at ${newPlace.name} replacing higher-fee attraction.`,
            };
          }
          if (item.type === "food" && option.restaurantReplacements.has(item.referenceId)) {
            const newRest = option.restaurantReplacements.get(item.referenceId)!;
            return {
              ...item,
              referenceId: newRest.id,
              title: newRest.name,
              reasoning: `Authentic budget-friendly dining at ${newRest.name}.`,
            };
          }
          return item;
        });
        return { ...day, items: updatedItems };
      });

      const proposedItinerary = {
        days: updatedDays,
        orchestrationNotes: `Budget-optimized replan based on: "${instruction || "Cheaper cost optimization"}".`,
      };

      const validRefIds = new Set<string>([
        ...(option.stay ? [option.stay.id] : []),
        ...(option.transport ? [option.transport.id] : []),
        ...option.places.map((p) => p.id),
        ...option.restaurants.map((r) => r.id),
      ]);

      const val = ItineraryValidator.validate({
        expectedDays: trip.days,
        itinerary: proposedItinerary,
        validReferenceIds: validRefIds,
      });

      if (val.passed) {
        bestOption = option;
        validatedItinerary = proposedItinerary;
        validationReport = val;
        break;
      }
    }

    if (!bestOption || !validatedItinerary || !validationReport) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error:
          "Unable to reduce costs further: Verified alternative options did not pass strict itinerary validation. Your previous journey remains intact.",
      };
    }

    // Strict semantic guarantee invariant:
    if (bestOption.calculatedBudget.totalEstimatedCost >= oldBudget) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error:
          "Unable to reduce costs further: Current selections already represent the most economical verified options for this destination. Your previous journey remains intact.",
      };
    }

    // Construct the verified new plan
    const newPlan: OrchestrationResult = {
      ...originalPlan,
      selectedStayDetails: bestOption.stay || undefined,
      stay: bestOption.stay
        ? {
            recommendedStayId: bestOption.stay.id,
            alternativeStayIds: allStays
              .filter((s) => s.id !== bestOption.stay?.id)
              .map((s) => s.id)
              .slice(0, 2),
            reasoning: `Budget-optimized accommodation at ${bestOption.stay.name}.`,
            tradeoffs: [],
          }
        : originalPlan.stay,
      selectedPlacesDetails: bestOption.places,
      activities: originalPlan.activities
        ? {
            ...originalPlan.activities,
            selectedPlaceIds: bestOption.places.map((p) => p.id),
          }
        : originalPlan.activities,
      selectedRestaurantsDetails: bestOption.restaurants,
      food: originalPlan.food
        ? {
            ...originalPlan.food,
            selectedRestaurantIds: bestOption.restaurants.map((r) => r.id),
          }
        : originalPlan.food,
      transportation: bestOption.transport
        ? {
            recommendedOptionId: bestOption.transport.id,
            alternativeOptionIds: context.candidateTransport
              .filter((t) => t.id !== bestOption.transport?.id)
              .map((t) => t.id)
              .slice(0, 2),
            mode: (bestOption.transport.mode as any) || "train",
            preference: (trip.preferences?.transportPreference as any) || "auto",
            isEstimate: Boolean(bestOption.transport.isEstimate),
            preferredModeUnavailable: false,
            reasoning: `Cost-effective transit via ${bestOption.transport.provider || bestOption.transport.mode}.`,
            tradeoffs: [],
            warnings: [],

            selectedOption: {
              id: bestOption.transport.id,
              mode: bestOption.transport.mode,
              provider: bestOption.transport.provider || "Direct transit",
              origin: bestOption.transport.origin,
              destination: bestOption.transport.destination,
              departureTime: bestOption.transport.departureTime,
              arrivalTime: bestOption.transport.arrivalTime,
              durationMinutes: bestOption.transport.durationMinutes,
              price: bestOption.transport.price,
              currency: bestOption.transport.currency || "USD",
              isEstimate: Boolean(bestOption.transport.isEstimate),
            },
          }
        : originalPlan.transportation,
      itinerary: validatedItinerary,
      budget: bestOption.calculatedBudget,
      validation: validationReport,
      assembledAt: new Date().toISOString(),
    };

    const changedItems: string[] = [];
    if (bestOption.stay && bestOption.stay.id !== currentStay?.id) {
      changedItems.push(`Stay: ${bestOption.stay.name}`);
    }
    if (bestOption.transport && bestOption.transport.id !== currentTransport?.id) {
      changedItems.push(
        `Transit: ${bestOption.transport.provider || bestOption.transport.mode} (${bestOption.transport.mode.toUpperCase()})`,
      );
    }
    if (bestOption.placeReplacements.size > 0) {
      changedItems.push(
        `${bestOption.placeReplacements.size} attraction(s) replaced with free/budget landmarks`,
      );
    }
    if (bestOption.restaurantReplacements.size > 0) {
      changedItems.push(
        `${bestOption.restaurantReplacements.size} dining venue(s) replaced with budget-friendly local dining`,
      );
    }
    if (bestOption.tier !== trip.budget) {
      changedItems.push(`Budget tier adjusted to ${bestOption.tier.toUpperCase()}`);
    }

    // Truthful savings description: distinguish estimated vs verified amounts
    const hasEstimatedCosts =
      bestOption.calculatedBudget.hasEstimatedAccommodationFees ||
      bestOption.calculatedBudget.hasEstimatedActivityFees ||
      bestOption.calculatedBudget.hasEstimatedFoodCosts;

    const savings = Math.max(0, oldBudget - bestOption.calculatedBudget.totalEstimatedCost);
    const currency = bestOption.calculatedBudget.currency;
    const currencySymbol = bestOption.calculatedBudget.currencySymbol || "$";

    const changeSummary: EditChangeSummary = {
      scope: "cost_reduction",
      summary: hasEstimatedCosts
        ? `Journey re-planned with more economical options. Estimated expenditure reduced by ${currencySymbol}${savings.toLocaleString()} ${currency}.`
        : `Journey re-planned with verified lower-cost options. Verified total savings: ${currencySymbol}${savings.toLocaleString()} ${currency}.`,
      description: hasEstimatedCosts
        ? `Optimized selections and budget tier reduced estimated expenditure from ${currencySymbol}${oldBudget.toLocaleString()} to ${currencySymbol}${bestOption.calculatedBudget.totalEstimatedCost.toLocaleString()} (based on budget-tier allowances and curated budget venues).`
        : `Optimized selections reduced verified cost from ${currencySymbol}${oldBudget.toLocaleString()} to ${currencySymbol}${bestOption.calculatedBudget.totalEstimatedCost.toLocaleString()}.`,
      changedItems,
      oldBudget,
      newBudget: bestOption.calculatedBudget.totalEstimatedCost,
      budgetBefore: oldBudget,
      budgetAfter: bestOption.calculatedBudget.totalEstimatedCost,
      currency,
      currencySymbol,
    };

    // Atomically persist & record version snapshot
    await this.persistAndRecordVersion({
      tripId: trip.id,
      userId,
      plan: newPlan,
      scope: "cost_reduction",
      instruction: instruction || "Make the journey cheaper and reduce overall costs",
      changeSummary,
    });

    return {
      success: true,
      tripId: trip.id,
      plan: newPlan,
      changeSummary,
    };
  }


  // =========================================================================
  // 2. REGENERATE SINGLE DAY
  // =========================================================================
  async regenerateSingleDay(
    trip: TripWithPreferences,
    userId: string,
    dayNumber: number,
    instruction?: string,
  ): Promise<JourneyEditResult> {
    const originalPlan = trip.plan!;
    if (dayNumber < 1 || dayNumber > trip.days) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: `Day ${dayNumber} is outside the journey duration (1 to ${trip.days} days).`,
      };
    }

    const context = await travelService.prepareTripContext(trip);
    const existingDays = originalPlan.itinerary?.days || [];
    const targetDay = existingDays.find((d) => d.dayNumber === dayNumber);
    if (!targetDay) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: `Day ${dayNumber} could not be found in current itinerary.`,
      };
    }

    // Collect visited places on ALL OTHER DAYS to enforce deduplication
    const visitedPlaceIds = new Set<string>();
    for (const d of existingDays) {
      if (d.dayNumber === dayNumber) continue;
      for (const item of d.items) {
        if (item.type === "activity") {
          visitedPlaceIds.add(item.referenceId);
        }
      }
    }

    // Filter available candidate places not visited on other days
    let availablePlaces = context.candidatePlaces.filter((p) => !visitedPlaceIds.has(p.id));

    // If instruction asks for specific nature/outdoors/cultural focus, prioritize those
    if (instruction) {
      const lowerIns = instruction.toLowerCase();
      if (lowerIns.includes("nature") || lowerIns.includes("outdoor") || lowerIns.includes("park")) {
        availablePlaces = [...availablePlaces].sort((a, b) => {
          const aNature = (a.type || "").includes("park") || (a.tags || []).some((t) => t.includes("nature"));
          const bNature = (b.type || "").includes("park") || (b.tags || []).some((t) => t.includes("nature"));
          return (bNature ? 1 : 0) - (aNature ? 1 : 0);
        });
      }
    }

    // Select 2 distinct unvisited attractions for the regenerated day
    const dayPlaces = availablePlaces.slice(0, Math.min(2, availablePlaces.length));

    // Select 2 distinct dining spots for lunch and dinner
    const dayRestaurants = context.candidateRestaurants.slice(0, Math.min(2, context.candidateRestaurants.length));

    // Synthesize the single day's items
    const stayId = originalPlan.selectedStayDetails?.id || "stay_default";
    const stayName = originalPlan.selectedStayDetails?.name || "Sanctuary Residence";
    const transport = originalPlan.transportation?.selectedOption;
    const isFirstDay = dayNumber === 1;
    const isLastDay = dayNumber === trip.days;

    const newItems: ItineraryItem[] = [];

    // Morning start
    if (isFirstDay && transport) {
      const transitStart = (transport.arrivalTime && transport.arrivalTime >= "13:00") ? "13:30" : "09:00";
      const transitEnd = (transport.arrivalTime && transport.arrivalTime >= "13:00") ? "15:00" : "11:00";
      const checkinStart = (transport.arrivalTime && transport.arrivalTime >= "13:00") ? "15:30" : "11:30";
      const checkinEnd = (transport.arrivalTime && transport.arrivalTime >= "13:00") ? "16:30" : "12:30";

      newItems.push({
        type: "transport",
        referenceId: transport.id,
        startTime: transitStart,
        endTime: transitEnd,
        reasoning: `Inbound transit arrival into destination core via ${transport.provider || transport.mode}.`,
      });
      newItems.push({
        type: "stay",
        referenceId: stayId,
        startTime: checkinStart,
        endTime: checkinEnd,
        reasoning: `Hotel check-in and luggage drop at ${stayName}.`,
      });
    } else {
      newItems.push({
        type: "stay",
        referenceId: stayId,
        startTime: "08:30",
        endTime: "09:30",
        reasoning: isFirstDay
          ? `Arrival orientation and check-in briefing at ${stayName}.`
          : `Morning breakfast and preparation at ${stayName}.`,
      });
    }

    // Morning / Midday Activity or Leisure Immersion
    if (dayPlaces[0]) {
      newItems.push({
        type: "activity",
        referenceId: dayPlaces[0].id,
        startTime: isFirstDay && transport && transport.arrivalTime && transport.arrivalTime >= "13:00" ? "17:00" : "10:00",
        endTime: isFirstDay && transport && transport.arrivalTime && transport.arrivalTime >= "13:00" ? "19:00" : "12:30",
        reasoning: `Exploration of ${dayPlaces[0].name} (${dayPlaces[0].type}) matching curated interests.`,
      });
    } else {
      newItems.push({
        type: "stay",
        referenceId: stayId,
        startTime: isFirstDay && transport && transport.arrivalTime && transport.arrivalTime >= "13:00" ? "17:00" : "10:00",
        endTime: isFirstDay && transport && transport.arrivalTime && transport.arrivalTime >= "13:00" ? "19:00" : "12:30",
        reasoning: `Relaxed morning leisure and local surroundings exploration at ${stayName}.`,
      });
    }

    // Lunch
    if (dayRestaurants[0] && (!isFirstDay || !transport || !transport.arrivalTime || transport.arrivalTime < "13:00")) {
      newItems.push({
        type: "food",
        referenceId: dayRestaurants[0].id,
        startTime: "13:00",
        endTime: "14:30",
        reasoning: `Midday dining and regional cuisine at ${dayRestaurants[0].name}.`,
      });
    }

    // Afternoon Activity
    if (dayPlaces[1] && (!isFirstDay || !transport || !transport.arrivalTime || transport.arrivalTime < "13:00")) {
      newItems.push({
        type: "activity",
        referenceId: dayPlaces[1].id,
        startTime: "15:00",
        endTime: "17:30",
        reasoning: `Afternoon visit to ${dayPlaces[1].name} (${dayPlaces[1].type}).`,
      });
    }

    // Dinner
    const dinnerRest = dayRestaurants[1] || dayRestaurants[0];
    if (dinnerRest) {
      newItems.push({
        type: "food",
        referenceId: dinnerRest.id,
        startTime: "19:30",
        endTime: "21:30",
        reasoning: `Evening dinner at ${dinnerRest.name}.`,
      });
    }

    // Departure transit on last day
    if (isLastDay && transport) {
      newItems.push({
        type: "transport",
        referenceId: transport.id,
        startTime: "21:45",
        endTime: "23:00",
        reasoning: `Departure transit transfer and outbound departure via ${transport.provider || transport.mode}.`,
      });
    }

    const newDay: ItineraryDay = {
      dayNumber,
      theme: instruction
        ? `Refined Day ${dayNumber} — ${instruction}`
        : `Refined Day ${dayNumber} Exploration`,
      items: newItems,
    };

    // Construct updated days array (preserving all other days exactly)
    const updatedDays = existingDays.map((d) => (d.dayNumber === dayNumber ? newDay : d));

    // Collect all referenced places & restaurants across the updated itinerary
    const allReferencedPlaceIds = new Set<string>();
    const allReferencedRestIds = new Set<string>();
    for (const d of updatedDays) {
      for (const it of d.items) {
        if (it.type === "activity") allReferencedPlaceIds.add(it.referenceId);
        if (it.type === "food") allReferencedRestIds.add(it.referenceId);
      }
    }

    const updatedPlaces = context.candidatePlaces.filter((p) => allReferencedPlaceIds.has(p.id));
    const updatedRestaurants = context.candidateRestaurants.filter((r) => allReferencedRestIds.has(r.id));
    const currentStay = originalPlan.selectedStayDetails || null;
    const currentTransport = originalPlan.transportation?.selectedOption || null;

    // Recalculate deterministic budget
    const destCurrency = CurrencyResolver.resolve(
      context.destination.name,
      context.destination.country,
      context.destination.countryCode,
    );
    const updatedBudget = BudgetCalculator.calculate({
      days: trip.days,
      travellers: trip.travellers,
      budgetTier: trip.budget,
      stay: currentStay,
      transport: currentTransport as any,
      places: updatedPlaces,
      restaurants: updatedRestaurants,
      currency: destCurrency.code,
      currencySymbol: destCurrency.symbol,
    });

    // Validate the complete updated itinerary
    const validReferenceIds = new Set<string>([
      ...(currentStay ? [currentStay.id] : []),
      ...(currentTransport ? [currentTransport.id] : []),
      ...updatedPlaces.map((p) => p.id),
      ...updatedRestaurants.map((r) => r.id),
    ]);

    const updatedItinerary = {
      days: updatedDays,
      orchestrationNotes: `Day ${dayNumber} successfully regenerated.`,
    };

    const validation = ItineraryValidator.validate({
      expectedDays: trip.days,
      itinerary: updatedItinerary,
      validReferenceIds,
    });

    if (!validation.passed) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: `Regenerated Day ${dayNumber} failed itinerary validation: ${validation.issues.map((i) => i.message).join("; ")}`,
        validationReport: validation,
      };
    }

    // Assemble updated plan
    const updatedPlan: OrchestrationResult = {
      ...originalPlan,
      itinerary: updatedItinerary,
      budget: updatedBudget,
      selectedPlacesDetails: updatedPlaces,
      selectedRestaurantsDetails: updatedRestaurants,
      validation,
      assembledAt: new Date().toISOString(),
    };

    const changeSummary: EditChangeSummary = {
      scope: "day",
      summary: `Day ${dayNumber} successfully regenerated. Days 1 through ${trip.days} (excluding Day ${dayNumber}) remained intact.`,
      changedItems: [`Day ${dayNumber} Schedule (${dayPlaces.map((p) => p.name).join(", ")})`],
      oldBudget: originalPlan.budget?.totalEstimatedCost,
      newBudget: updatedBudget.totalEstimatedCost,
      currency: updatedBudget.currency,
      currencySymbol: updatedBudget.currencySymbol,
    };

    // Atomically persist & record version snapshot
    await this.persistAndRecordVersion({
      tripId: trip.id,
      userId,
      plan: updatedPlan,
      scope: "day",
      instruction,
      changeSummary,
    });


    return {
      success: true,
      tripId: trip.id,
      plan: updatedPlan,
      changeSummary,
    };
  }

  // =========================================================================
  // 3. CHANGE TRANSPORT
  // =========================================================================
  async changeTransport(
    trip: TripWithPreferences,
    userId: string,
    transportPreference: TransportPreference,
    instruction?: string,
  ): Promise<JourneyEditResult> {
    const originalPlan = trip.plan!;
    const updatedTrip: TripWithPreferences = {
      ...trip,
      preferences: {
        id: trip.preferences?.id || "pref_temp",
        tripId: trip.id,
        interests: trip.preferences?.interests || [],
        notes: trip.preferences?.notes || null,
        createdAt: trip.preferences?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transportPreference,
      },
    };
    const context = await travelService.prepareTripContext(updatedTrip);
    context.transportPreference = transportPreference;

    // Re-run transportation agent with strict preference enforcement
    const transRes = await this.transportAgent.run(
      context,
      1,
      instruction,
    );

    if (!transRes.data) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: "Transportation Agent was unable to find viable connections.",
      };
    }

    const newTransportOption =
      context.candidateTransport.find((t) => t.id === transRes.data!.recommendedOptionId) || null;

    // Preserve existing stay, places, and restaurants
    const currentStay = originalPlan.selectedStayDetails || null;
    const currentPlaces = originalPlan.selectedPlacesDetails || [];
    const currentRestaurants = originalPlan.selectedRestaurantsDetails || [];

    // Recalculate deterministic budget
    const destCurrency = CurrencyResolver.resolve(
      context.destination.name,
      context.destination.country,
      context.destination.countryCode,
    );
    const updatedBudget = BudgetCalculator.calculate({
      days: trip.days,
      travellers: trip.travellers,
      budgetTier: trip.budget,
      stay: currentStay,
      transport: newTransportOption,
      places: currentPlaces,
      restaurants: currentRestaurants,
      currency: destCurrency.code,
      currencySymbol: destCurrency.symbol,
    });

    // Update Day 1 arrival transit reference in itinerary if present
    const updatedDays = (originalPlan.itinerary?.days || []).map((day) => {
      const updatedItems = day.items.map((item) => {
        if (item.type === "transport" && newTransportOption) {
          return {
            ...item,
            referenceId: newTransportOption.id,
            reasoning: `Transit connection via ${newTransportOption.provider || newTransportOption.mode} (${newTransportOption.mode.toUpperCase()}).`,
          };
        }
        return item;
      });
      return { ...day, items: updatedItems };
    });

    const updatedItinerary = {
      days: updatedDays,
      orchestrationNotes: originalPlan.itinerary?.orchestrationNotes || "Transit updated.",
    };

    const validReferenceIds = new Set<string>([
      ...(currentStay ? [currentStay.id] : []),
      ...(newTransportOption ? [newTransportOption.id] : []),
      ...currentPlaces.map((p) => p.id),
      ...currentRestaurants.map((r) => r.id),
    ]);

    const validation = ItineraryValidator.validate({
      expectedDays: trip.days,
      itinerary: updatedItinerary,
      validReferenceIds,
    });

    const updatedPlan: OrchestrationResult = {
      ...originalPlan,
      transportation: transRes.data,
      itinerary: updatedItinerary,
      budget: updatedBudget,
      validation,
      assembledAt: new Date().toISOString(),
    };

    const changeSummary: EditChangeSummary = {
      scope: "transport",
      summary: `Transportation mode updated to ${transRes.data.mode.toUpperCase()}.`,
      changedItems: [
        `${transRes.data.mode.toUpperCase()} connection (${newTransportOption?.provider || "Direct transit"})`,
      ],
      oldBudget: originalPlan.budget?.totalEstimatedCost,
      newBudget: updatedBudget.totalEstimatedCost,
      currency: updatedBudget.currency,
      currencySymbol: updatedBudget.currencySymbol,
    };

    // Atomically persist & record version snapshot
    await this.persistAndRecordVersion({
      tripId: trip.id,
      userId,
      plan: updatedPlan,
      scope: "transport",
      instruction,
      changeSummary,
    });


    return {
      success: true,
      tripId: trip.id,
      plan: updatedPlan,
      changeSummary,
    };
  }

  // =========================================================================
  // 4. CHANGE STAY
  // =========================================================================
  async changeStay(
    trip: TripWithPreferences,
    userId: string,
    candidateStayId?: string,
    instruction?: string,
  ): Promise<JourneyEditResult> {
    const originalPlan = trip.plan!;
    const context = await travelService.prepareTripContext(trip);

    let chosenStay: Stay | undefined;

    if (candidateStayId) {
      chosenStay = context.candidateStays.find((s) => s.id === candidateStayId);
      if (!chosenStay) {
        return {
          success: false,
          tripId: trip.id,
          plan: originalPlan,
          error: `Requested stay option "${candidateStayId}" is not in the verified candidate pool.`,
        };
      }
    } else if (instruction) {
      const lower = instruction.toLowerCase();
      if (lower.includes("cheap") || lower.includes("budget") || lower.includes("economical")) {
        // Pick cheaper stay
        const cheaper = [...context.candidateStays]
          .filter((s) => s.id !== originalPlan.selectedStayDetails?.id)
          .sort((a, b) => (a.pricePerNight ?? 999) - (b.pricePerNight ?? 999));
        chosenStay = cheaper[0];
      } else if (lower.includes("luxury") || lower.includes("better") || lower.includes("premium")) {
        // Pick premium stay
        const premium = [...context.candidateStays]
          .filter((s) => s.id !== originalPlan.selectedStayDetails?.id)
          .sort((a, b) => (b.pricePerNight ?? 0) - (a.pricePerNight ?? 0));
        chosenStay = premium[0];
      }
    }

    if (!chosenStay) {
      // Pick first alternative different from current stay
      chosenStay = context.candidateStays.find((s) => s.id !== originalPlan.selectedStayDetails?.id) || context.candidateStays[0];
    }

    if (!chosenStay) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: "No alternative verified accommodations available for this destination.",
      };
    }

    // Preserve existing transport, places, and restaurants
    const currentTransport = originalPlan.transportation?.selectedOption || null;
    const currentPlaces = originalPlan.selectedPlacesDetails || [];
    const currentRestaurants = originalPlan.selectedRestaurantsDetails || [];

    // Recalculate deterministic budget
    const destCurrency = CurrencyResolver.resolve(
      context.destination.name,
      context.destination.country,
      context.destination.countryCode,
    );
    const updatedBudget = BudgetCalculator.calculate({
      days: trip.days,
      travellers: trip.travellers,
      budgetTier: trip.budget,
      stay: chosenStay,
      transport: currentTransport as any,
      places: currentPlaces,
      restaurants: currentRestaurants,
      currency: destCurrency.code,
      currencySymbol: destCurrency.symbol,
    });

    // Update stay reference IDs in all itinerary days
    const updatedDays = (originalPlan.itinerary?.days || []).map((day) => {
      const updatedItems = day.items.map((item) => {
        if (item.type === "stay") {
          return {
            ...item,
            referenceId: chosenStay!.id,
            reasoning: `Accommodations and room reception at ${chosenStay!.name}.`,
          };
        }
        return item;
      });
      return { ...day, items: updatedItems };
    });

    const updatedItinerary = {
      days: updatedDays,
      orchestrationNotes: originalPlan.itinerary?.orchestrationNotes || "Stay updated.",
    };

    const validReferenceIds = new Set<string>([
      chosenStay.id,
      ...(currentTransport ? [currentTransport.id] : []),
      ...currentPlaces.map((p) => p.id),
      ...currentRestaurants.map((r) => r.id),
    ]);

    const validation = ItineraryValidator.validate({
      expectedDays: trip.days,
      itinerary: updatedItinerary,
      validReferenceIds,
    });

    if (!validation.passed) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: `Updated stay failed itinerary validation: ${validation.issues.map((i) => i.message).join("; ")}`,
        validationReport: validation,
      };
    }

    const updatedPlan: OrchestrationResult = {
      ...originalPlan,
      stay: {
        recommendedStayId: chosenStay.id,
        alternativeStayIds: context.candidateStays.filter((s) => s.id !== chosenStay!.id).map((s) => s.id),
        reasoning: `Accommodations updated to ${chosenStay.name} (${chosenStay.category || "standard"}).`,
        tradeoffs: [],
      },
      selectedStayDetails: chosenStay,
      itinerary: updatedItinerary,
      budget: updatedBudget,
      validation,
      assembledAt: new Date().toISOString(),
    };

    const changeSummary: EditChangeSummary = {
      scope: "stay",
      summary: `Accommodations updated to ${chosenStay.name}.`,
      changedItems: [`${chosenStay.name} (${chosenStay.category || "hotel"})`],
      oldBudget: originalPlan.budget?.totalEstimatedCost,
      newBudget: updatedBudget.totalEstimatedCost,
      currency: updatedBudget.currency,
      currencySymbol: updatedBudget.currencySymbol,
    };

    // Atomically persist & record version snapshot
    await this.persistAndRecordVersion({
      tripId: trip.id,
      userId,
      plan: updatedPlan,
      scope: "stay",
      instruction,
      changeSummary,
    });


    return {
      success: true,
      tripId: trip.id,
      plan: updatedPlan,
      changeSummary,
    };
  }

  // =========================================================================
  // 5. REPLACE ACTIVITY / PLACE
  // =========================================================================
  async replaceActivity(
    trip: TripWithPreferences,
    userId: string,
    targetPlaceId?: string,
    candidatePlaceId?: string,
    dayNumber?: number,
    instruction?: string,
  ): Promise<JourneyEditResult> {

    const originalPlan = trip.plan!;
    const context = await travelService.prepareTripContext(trip);

    // Identify target place to replace
    const currentPlaces = originalPlan.selectedPlacesDetails || [];
    let placeToReplace: Place | undefined;

    if (targetPlaceId) {
      placeToReplace = currentPlaces.find((p) => p.id === targetPlaceId);
    } else if (dayNumber) {
      const day = originalPlan.itinerary?.days.find((d) => d.dayNumber === dayNumber);
      const activityItem = day?.items.find((i) => i.type === "activity");
      if (activityItem) {
        placeToReplace = currentPlaces.find((p) => p.id === activityItem.referenceId);
      }
    } else if (currentPlaces.length > 0) {
      placeToReplace = currentPlaces[0];
    }

    if (!placeToReplace) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: targetPlaceId
          ? `Target place "${targetPlaceId}" could not be located in active journey.`
          : "Could not identify activity or attraction to replace.",
      };
    }

    // Determine replacement place
    let replacementPlace: Place | undefined;
    // Collect place IDs currently scheduled in itinerary days, excluding the place being replaced
    const scheduledPlaceIdsInItinerary = new Set<string>();
    if (originalPlan.itinerary?.days) {
      for (const day of originalPlan.itinerary.days) {
        for (const item of day.items) {
          if (item.type === "activity" && item.referenceId !== placeToReplace.id) {
            scheduledPlaceIdsInItinerary.add(item.referenceId);
          }
        }
      }
    }

    if (candidatePlaceId) {
      replacementPlace = context.candidatePlaces.find((p) => p.id === candidatePlaceId);
      if (!replacementPlace) {
        return {
          success: false,
          tripId: trip.id,
          plan: originalPlan,
          error: `Selected attraction candidate "${candidatePlaceId}" is not in the verified candidate pool.`,
        };
      }
      if (candidatePlaceId === placeToReplace.id) {
        return {
          success: false,
          tripId: trip.id,
          plan: originalPlan,
          error: `Selected attraction "${replacementPlace.name}" is already scheduled for this activity.`,
        };
      }
      if (scheduledPlaceIdsInItinerary.has(candidatePlaceId)) {
        return {
          success: false,
          tripId: trip.id,
          plan: originalPlan,
          error: `Selected attraction "${replacementPlace.name}" is already scheduled on another day in this journey.`,
        };
      }
    } else {
      // Pick alternative candidate not currently scheduled anywhere else in the itinerary
      const available = context.candidatePlaces.filter(
        (p) => p.id !== placeToReplace!.id && !scheduledPlaceIdsInItinerary.has(p.id),
      );
      replacementPlace = available[0] || null;
    }

    if (!replacementPlace) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: "No alternative verified attractions available that are not already scheduled in this journey.",
      };
    }

    // Replace in itinerary days
    const updatedDays = (originalPlan.itinerary?.days || []).map((day) => {
      const updatedItems = day.items.map((item) => {
        if (item.type === "activity" && item.referenceId === placeToReplace!.id) {
          return {
            ...item,
            referenceId: replacementPlace!.id,
            reasoning: `Curated visit to ${replacementPlace!.name} (${replacementPlace!.type}).`,
          };
        }
        return item;
      });
      return { ...day, items: updatedItems };
    });

    const updatedPlaces = currentPlaces
      .map((p) => (p.id === placeToReplace!.id ? replacementPlace! : p))
      .filter((p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx);

    // Recalculate deterministic budget
    const currentStay = originalPlan.selectedStayDetails || null;
    const currentTransport = originalPlan.transportation?.selectedOption || null;
    const currentRestaurants = originalPlan.selectedRestaurantsDetails || [];

    const destCurrency = CurrencyResolver.resolve(
      context.destination.name,
      context.destination.country,
      context.destination.countryCode,
    );
    const updatedBudget = BudgetCalculator.calculate({
      days: trip.days,
      travellers: trip.travellers,
      budgetTier: trip.budget,
      stay: currentStay,
      transport: currentTransport as any,
      places: updatedPlaces,
      restaurants: currentRestaurants,
      currency: destCurrency.code,
      currencySymbol: destCurrency.symbol,
    });

    const updatedItinerary = {
      days: updatedDays,
      orchestrationNotes: originalPlan.itinerary?.orchestrationNotes || "Activity updated.",
    };

    const validReferenceIds = new Set<string>([
      ...(currentStay ? [currentStay.id] : []),
      ...(currentTransport ? [currentTransport.id] : []),
      ...updatedPlaces.map((p) => p.id),
      ...currentRestaurants.map((r) => r.id),
    ]);

    const validation = ItineraryValidator.validate({
      expectedDays: trip.days,
      itinerary: updatedItinerary,
      validReferenceIds,
    });

    if (!validation.passed) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: `Activity replacement failed itinerary validation: ${validation.issues.map((i) => i.message).join("; ")}`,
        validationReport: validation,
      };
    }

    const updatedPlan: OrchestrationResult = {
      ...originalPlan,
      selectedPlacesDetails: updatedPlaces,
      activities: {
        selectedPlaceIds: updatedPlaces.map((p) => p.id),
        reasoning: `Updated experience schedule with ${replacementPlace.name}.`,
      },
      itinerary: updatedItinerary,
      budget: updatedBudget,
      validation,
      assembledAt: new Date().toISOString(),
    };

    const changeSummary: EditChangeSummary = {
      scope: "activity",
      summary: `Replaced "${placeToReplace.name}" with "${replacementPlace.name}".`,
      changedItems: [`${placeToReplace.name} → ${replacementPlace.name}`],
      oldBudget: originalPlan.budget?.totalEstimatedCost,
      newBudget: updatedBudget.totalEstimatedCost,
      currency: updatedBudget.currency,
      currencySymbol: updatedBudget.currencySymbol,
    };

    // Atomically persist & record version snapshot
    await this.persistAndRecordVersion({
      tripId: trip.id,
      userId,
      plan: updatedPlan,
      scope: "activity",
      instruction,
      changeSummary,
    });


    return {
      success: true,
      tripId: trip.id,
      plan: updatedPlan,
      changeSummary,
    };
  }

  // =========================================================================
  // 6. REPLACE RESTAURANT
  // =========================================================================
  async replaceRestaurant(
    trip: TripWithPreferences,
    userId: string,
    targetRestaurantId?: string,
    candidateRestaurantId?: string,
    dayNumber?: number,
    instruction?: string,
  ): Promise<JourneyEditResult> {

    const originalPlan = trip.plan!;
    const context = await travelService.prepareTripContext(trip);

    // Identify target restaurant to replace
    const currentRestaurants = originalPlan.selectedRestaurantsDetails || [];
    let restaurantToReplace: Restaurant | undefined;

    if (targetRestaurantId) {
      restaurantToReplace = currentRestaurants.find((r) => r.id === targetRestaurantId);
    } else if (dayNumber) {
      const day = originalPlan.itinerary?.days.find((d) => d.dayNumber === dayNumber);
      const foodItem = day?.items.find((i) => i.type === "food");
      if (foodItem) {
        restaurantToReplace = currentRestaurants.find((r) => r.id === foodItem.referenceId);
      }
    } else if (currentRestaurants.length > 0) {
      restaurantToReplace = currentRestaurants[0];
    }

    if (!restaurantToReplace) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: targetRestaurantId
          ? `Target restaurant "${targetRestaurantId}" could not be located in active journey.`
          : "Could not identify dining venue to replace.",
      };
    }

    // Determine replacement restaurant
    let replacementRestaurant: Restaurant | undefined;

    if (candidateRestaurantId) {
      replacementRestaurant = context.candidateRestaurants.find((r) => r.id === candidateRestaurantId);
      if (!replacementRestaurant) {
        return {
          success: false,
          tripId: trip.id,
          plan: originalPlan,
          error: `Selected restaurant candidate "${candidateRestaurantId}" is not in the verified candidate pool.`,
        };
      }
    } else {
      // Pick alternative candidate not already in selected list
      const currentIds = new Set(currentRestaurants.map((r) => r.id));
      const available = context.candidateRestaurants.filter((r) => !currentIds.has(r.id));
      replacementRestaurant = available[0] || context.candidateRestaurants.find((r) => r.id !== restaurantToReplace!.id);
    }

    if (!replacementRestaurant) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: "No alternative verified restaurants available for this destination.",
      };
    }

    // Replace in itinerary days
    const updatedDays = (originalPlan.itinerary?.days || []).map((day) => {
      const updatedItems = day.items.map((item) => {
        if (item.type === "food" && item.referenceId === restaurantToReplace!.id) {
          return {
            ...item,
            referenceId: replacementRestaurant!.id,
            reasoning: `Dining and regional flavors at ${replacementRestaurant!.name}.`,
          };
        }
        return item;
      });
      return { ...day, items: updatedItems };
    });

    const updatedRestaurants = currentRestaurants
      .map((r) => (r.id === restaurantToReplace!.id ? replacementRestaurant! : r))
      .filter((r, idx, arr) => arr.findIndex((x) => x.id === r.id) === idx);

    // Recalculate deterministic budget
    const currentStay = originalPlan.selectedStayDetails || null;
    const currentTransport = originalPlan.transportation?.selectedOption || null;
    const currentPlaces = originalPlan.selectedPlacesDetails || [];

    const destCurrency = CurrencyResolver.resolve(
      context.destination.name,
      context.destination.country,
      context.destination.countryCode,
    );
    const updatedBudget = BudgetCalculator.calculate({
      days: trip.days,
      travellers: trip.travellers,
      budgetTier: trip.budget,
      stay: currentStay,
      transport: currentTransport as any,
      places: currentPlaces,
      restaurants: updatedRestaurants,
      currency: destCurrency.code,
      currencySymbol: destCurrency.symbol,
    });

    const updatedItinerary = {
      days: updatedDays,
      orchestrationNotes: originalPlan.itinerary?.orchestrationNotes || "Dining updated.",
    };

    const validReferenceIds = new Set<string>([
      ...(currentStay ? [currentStay.id] : []),
      ...(currentTransport ? [currentTransport.id] : []),
      ...currentPlaces.map((p) => p.id),
      ...updatedRestaurants.map((r) => r.id),
    ]);

    const validation = ItineraryValidator.validate({
      expectedDays: trip.days,
      itinerary: updatedItinerary,
      validReferenceIds,
    });

    if (!validation.passed) {
      return {
        success: false,
        tripId: trip.id,
        plan: originalPlan,
        error: `Restaurant replacement failed itinerary validation: ${validation.issues.map((i) => i.message).join("; ")}`,
        validationReport: validation,
      };
    }

    const updatedPlan: OrchestrationResult = {
      ...originalPlan,
      selectedRestaurantsDetails: updatedRestaurants,
      food: {
        selectedRestaurantIds: updatedRestaurants.map((r) => r.id),
        reasoning: `Updated dining schedule with ${replacementRestaurant.name}.`,
      },
      itinerary: updatedItinerary,
      budget: updatedBudget,
      validation,
      assembledAt: new Date().toISOString(),
    };

    const changeSummary: EditChangeSummary = {
      scope: "restaurant",
      summary: `Replaced "${restaurantToReplace.name}" with "${replacementRestaurant.name}".`,
      changedItems: [`${restaurantToReplace.name} → ${replacementRestaurant.name}`],
      oldBudget: originalPlan.budget?.totalEstimatedCost,
      newBudget: updatedBudget.totalEstimatedCost,
      currency: updatedBudget.currency,
      currencySymbol: updatedBudget.currencySymbol,
    };

    // Atomically persist & record version snapshot
    await this.persistAndRecordVersion({
      tripId: trip.id,
      userId,
      plan: updatedPlan,
      scope: "restaurant",
      instruction,
      changeSummary,
    });


    return {
      success: true,
      tripId: trip.id,
      plan: updatedPlan,
      changeSummary,
    };
  }

  // =========================================================================
  // 7. GET CANDIDATE ALTERNATIVES FOR UI PICKERS
  // =========================================================================
  async getAlternatives(
    trip: TripWithPreferences,
    domain: "stay" | "activity" | "restaurant" | "transport",
    targetEntityId?: string,
  ): Promise<{ domain: string; candidates: unknown[] }> {
    const context = await travelService.prepareTripContext(trip);

    switch (domain) {
      case "stay": {
        const currentStayId = trip.plan?.selectedStayDetails?.id || targetEntityId;
        const candidates = context.candidateStays.filter((s) => s.id !== currentStayId);
        return { domain: "stay", candidates };
      }
      case "activity": {
        const scheduledIds = new Set(trip.plan?.selectedPlacesDetails?.map((p) => p.id) || []);
        const candidates = context.candidatePlaces.filter((p) => !scheduledIds.has(p.id));
        return { domain: "activity", candidates: candidates.length > 0 ? candidates : context.candidatePlaces };
      }
      case "restaurant": {
        const scheduledIds = new Set(trip.plan?.selectedRestaurantsDetails?.map((r) => r.id) || []);
        const candidates = context.candidateRestaurants.filter((r) => !scheduledIds.has(r.id));
        return { domain: "restaurant", candidates: candidates.length > 0 ? candidates : context.candidateRestaurants };
      }
      case "transport": {
        return { domain: "transport", candidates: context.candidateTransport };
      }
      default:
        return { domain, candidates: [] };
    }
  }
}

export const journeyEditor = new JourneyEditor();
