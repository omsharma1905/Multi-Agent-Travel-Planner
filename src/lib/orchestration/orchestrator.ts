/**
 * @file src/lib/orchestration/orchestrator.ts
 *
 * Travel Orchestrator — Central Multi-Agent Coordinator.
 *
 * Flow:
 * 1. Load Trip & Prepare TripContext (via TravelService)
 * 2. Parallel Agent Execution (Transportation, Stay, Activities, Food)
 * 3. Deterministic Feasibility & Budget Calculation
 * 4. Itinerary Agent Synthesis
 * 5. Deterministic Itinerary Validator
 * 6. Replan Loop (up to MAX_REPLANS = 3) upon failure
 * 7. Return Verified Planning Output
 */

import { travelService, TripContext } from "@/lib/travel";
import { TripWithPreferences } from "@/features/trips/types";
import { TransportationAgent } from "../agents/transportation/transportation-agent";
import { StayAgent } from "../agents/stay/stay-agent";
import { ActivitiesAgent } from "../agents/activities/activities-agent";
import { FoodAgent } from "../agents/food/food-agent";
import { BudgetCalculator } from "../agents/budget/budget-calculator";
import { ItineraryAgent } from "../agents/itinerary/itinerary-agent";
import { FeasibilityEngine } from "../agents/validator/feasibility-engine";
import { ItineraryValidator, ValidationReport } from "../agents/validator/itinerary-validator";
import { AgentObservability } from "../agents/core/observability";
import { CurrencyResolver } from "../travel/services/currency-resolver";
import { CollaborationSummary, DomainOutcome, OrchestrationResult, OrchestratorStage, PlanCompleteness, SharedPlanningContext } from "./types";

const MAX_REPLANS = 3;

export class TravelOrchestrator {
  private _transportAgent?: TransportationAgent;
  private _stayAgent?: StayAgent;
  private _activitiesAgent?: ActivitiesAgent;
  private _foodAgent?: FoodAgent;
  private _itineraryAgent?: ItineraryAgent;

  private get transportAgent() { return this._transportAgent ??= new TransportationAgent(); }
  private get stayAgent() { return this._stayAgent ??= new StayAgent(); }
  private get activitiesAgent() { return this._activitiesAgent ??= new ActivitiesAgent(); }
  private get foodAgent() { return this._foodAgent ??= new FoodAgent(); }
  private get itineraryAgent() { return this._itineraryAgent ??= new ItineraryAgent(); }


  async planTrip(
    trip: TripWithPreferences,
    onProgress?: (stage: OrchestratorStage, message: string) => void,
  ): Promise<OrchestrationResult> {
    const notify = (stage: OrchestratorStage, msg: string) => {
      if (onProgress) onProgress(stage, msg);
    };

    let attempt = 1;
    let replanFeedback: string | undefined;

    notify("collecting_data", "Resolving destination & gathering travel candidate options...");
    let context: TripContext;
    try {
      context = await travelService.prepareTripContext(trip);
    } catch (err) {
      notify("failed", "Failed to retrieve travel candidates.");
      return this.failureResult(trip.id, "collecting_data", attempt, String(err));
    }

    const sharedContext: SharedPlanningContext = {
      tripContext: context,
      transportation: null,
      selectedTransport: null,
      activities: null,
      selectedPlaces: [],
      stay: null,
      selectedStay: null,
      stayAlternatives: [],
      food: null,
      selectedRestaurants: [],
      budget: null,
      candidateIssues: [],
      targetedReplanDomain: null,
      collaborationLog: [],
    };

    const collaborationSummary: CollaborationSummary = {
      stagesCompleted: [],
      targetedReplans: [],
      spatialAnchorStayId: undefined,
      crossAgentInfluences: [],
    };

    while (attempt <= MAX_REPLANS) {
      notify("running_agents", `Collaborative agent planning (Attempt ${attempt}/${MAX_REPLANS})...`);

      // 1. Stage 1: Transport & Places / Activities (Concurrent execution if not targeted)
      const needTransport = !sharedContext.transportation || sharedContext.targetedReplanDomain === "transportation";
      const needActivities = !sharedContext.activities || sharedContext.targetedReplanDomain === "activities";

      if (needTransport || needActivities) {
        const [transRes, actRes] = await Promise.all([
          needTransport ? this.transportAgent.run(context, attempt, replanFeedback) : Promise.resolve(null),
          needActivities ? this.activitiesAgent.run(context, attempt, replanFeedback) : Promise.resolve(null),
        ]);

        if (transRes) {
          sharedContext.transportation = transRes.data;
          sharedContext.selectedTransport = transRes.data
            ? context.candidateTransport.find((t) => t.id === transRes.data!.recommendedOptionId) || null
            : null;
          AgentObservability.recordRun({
            tripId: trip.id,
            agentName: "TransportationAgent",
            status: transRes.status,
            attempt,
            durationMs: transRes.durationMs,
            error: transRes.warnings[0],
          });
        }

        if (actRes) {
          sharedContext.activities = actRes.data;
          sharedContext.selectedPlaces = actRes.data
            ? context.candidatePlaces.filter((p) => actRes.data!.selectedPlaceIds.includes(p.id))
            : [];
          AgentObservability.recordRun({
            tripId: trip.id,
            agentName: "ActivitiesAgent",
            status: actRes.status,
            attempt,
            durationMs: actRes.durationMs,
            error: actRes.warnings[0],
          });
        }

        if (!collaborationSummary.stagesCompleted.includes("transport_and_places")) {
          collaborationSummary.stagesCompleted.push("transport_and_places");
        }
      }

      // 2. Stage 2: Stay Agent (Anchored to selected places)
      const needStay = !sharedContext.stay || sharedContext.targetedReplanDomain === "stay";
      if (needStay) {
        const stayRes = await this.stayAgent.run(
          context,
          attempt,
          replanFeedback,
          sharedContext.selectedPlaces,
        );
        sharedContext.stay = stayRes.data;
        sharedContext.selectedStay = stayRes.data
          ? context.candidateStays.find((s) => s.id === stayRes.data!.recommendedStayId) || null
          : null;
        const alternativeIds = stayRes.data?.alternativeStayIds || [];
        sharedContext.stayAlternatives = context.candidateStays
          .filter((s) => alternativeIds.includes(s.id) && s.id !== sharedContext.selectedStay?.id)
          .slice(0, 2);
        if (sharedContext.selectedStay) {
          collaborationSummary.spatialAnchorStayId = sharedContext.selectedStay.id;
        }
        if (!collaborationSummary.crossAgentInfluences.some((i) => i.includes("StayAgent anchored"))) {
          collaborationSummary.crossAgentInfluences.push(
            `StayAgent anchored selection to ${sharedContext.selectedPlaces.length} selected places centroid`,
          );
        }
        AgentObservability.recordRun({
          tripId: trip.id,
          agentName: "StayAgent",
          status: stayRes.status,
          attempt,
          durationMs: stayRes.durationMs,
          error: stayRes.warnings[0],
        });
        if (!collaborationSummary.stagesCompleted.includes("stay_anchored")) {
          collaborationSummary.stagesCompleted.push("stay_anchored");
        }
      }

      // 3. Stage 3: Food Agent (Anchored to selected places)
      const needFood = !sharedContext.food || sharedContext.targetedReplanDomain === "food";
      if (needFood) {
        const foodRes = await this.foodAgent.run(
          context,
          attempt,
          replanFeedback,
          sharedContext.selectedPlaces,
        );
        sharedContext.food = foodRes.data;
        sharedContext.selectedRestaurants = foodRes.data
          ? context.candidateRestaurants.filter((r) => foodRes.data!.selectedRestaurantIds.includes(r.id))
          : [];
        if (!collaborationSummary.crossAgentInfluences.some((i) => i.includes("FoodAgent anchored"))) {
          collaborationSummary.crossAgentInfluences.push(
            `FoodAgent anchored dining venues to ${sharedContext.selectedPlaces.length} selected attractions`,
          );
        }
        AgentObservability.recordRun({
          tripId: trip.id,
          agentName: "FoodAgent",
          status: foodRes.status,
          attempt,
          durationMs: foodRes.durationMs,
          error: foodRes.warnings[0],
        });
        if (!collaborationSummary.stagesCompleted.includes("food_anchored")) {
          collaborationSummary.stagesCompleted.push("food_anchored");
        }
      }

      // 4. Stage 4: Deterministic Feasibility & Budget Constraints Evaluation
      notify("calculating_budget", "Checking cross-agent feasibility & calculating budget bounds...");
      const candidateIssues = FeasibilityEngine.verifyCandidates({
        destinationId: context.destination.id,
        stay: sharedContext.selectedStay,
        transport: sharedContext.selectedTransport,
        places: sharedContext.selectedPlaces,
        restaurants: sharedContext.selectedRestaurants,
      });

      const criticalIssue = candidateIssues.find((i) => i.severity === "error");
      if (criticalIssue) {
        if (attempt < MAX_REPLANS) {
          let target: "stay" | "food" | "activities" | "transportation" = "stay";
          if (criticalIssue.code.includes("STAY")) target = "stay";
          else if (criticalIssue.code.includes("TRANSPORT")) target = "transportation";
          else if (criticalIssue.code.includes("PLACE")) target = "activities";
          else if (criticalIssue.code.includes("RESTAURANT") || criticalIssue.code.includes("FOOD")) target = "food";

          replanFeedback = criticalIssue.message;
          sharedContext.targetedReplanDomain = target;
          collaborationSummary.targetedReplans.push({
            attempt,
            targetDomain: target,
            reason: criticalIssue.message,
          });
          attempt++;
          notify("replanning", `Feasibility constraint conflict: ${criticalIssue.message}. Retrying ${target} agent...`);
          continue;
        }
      }

      const destCurrency = CurrencyResolver.resolve(
        context.destination.name,
        context.destination.country,
        context.destination.countryCode,
      );

      const budgetBreakdown = BudgetCalculator.calculate({
        days: trip.days,
        travellers: trip.travellers,
        budgetTier: trip.budget,
        stay: sharedContext.selectedStay,
        transport: sharedContext.selectedTransport,
        places: sharedContext.selectedPlaces,
        restaurants: sharedContext.selectedRestaurants,
        currency: destCurrency.code,
        currencySymbol: destCurrency.symbol,
      });

      sharedContext.budget = budgetBreakdown;

      // Check budget constraint: if budget is exceeded and attempts remain, trigger targeted replan
      if (budgetBreakdown.budgetStatus === "exceeds_budget" && attempt < MAX_REPLANS) {
        const stayCost = budgetBreakdown.accommodationCost;
        const foodCost = budgetBreakdown.dailyFoodEstimate;
        const actCost = budgetBreakdown.activityFeesEstimate;

        let target: "stay" | "food" | "activities" = "stay";
        let reason = "Accommodation cost exceeds budget tier limits. Select a more economical or standard stay option.";

        if (stayCost >= foodCost && stayCost >= actCost) {
          target = "stay";
          reason = "Accommodation cost exceeds budget tier limits. Select a more economical or standard stay option.";
        } else if (foodCost >= actCost) {
          target = "food";
          reason = "Dining expenses exceed budget tier limits. Prioritize affordable local dining and casual bistros.";
        } else {
          target = "activities";
          reason = "Activities fees exceed budget tier limits. Select lower-cost cultural landmarks.";
        }

        collaborationSummary.targetedReplans.push({
          attempt,
          targetDomain: target,
          reason,
        });
        collaborationSummary.crossAgentInfluences.push(
          `Budget constraint (${budgetBreakdown.budgetStatus}) triggered targeted replan of ${target} agent`,
        );
        sharedContext.targetedReplanDomain = target;
        replanFeedback = reason;
        attempt++;
        notify("replanning", `Budget exceeded: ${reason}. Retrying ${target} agent...`);
        continue;
      }

      // Reset targeted replan domain for general synthesis
      sharedContext.targetedReplanDomain = null;

      // 5. Stage 5: Itinerary Agent Synthesis with Transit Schedule Timing
      notify("building_itinerary", "Synthesizing day-by-day logical sequence...");

      if (sharedContext.selectedTransport) {
        const trans = sharedContext.selectedTransport;
        const isLateArrival =
          Boolean((trans.arrivalTime && trans.arrivalTime >= "13:00") ||
          (typeof trans.durationMinutes === "number" && trans.durationMinutes >= 300));
        if (isLateArrival && !collaborationSummary.crossAgentInfluences.some((i) => i.includes("arrival timing"))) {
          collaborationSummary.crossAgentInfluences.push(
            `Transportation arrival timing (${trans.arrivalTime || (trans.durationMinutes ? `${trans.durationMinutes}m` : "scheduled")}) scheduled Day 1 arrival & check-in before afternoon activities`,
          );
        }
      }

      const itinRes = await this.itineraryAgent.run(
        context,
        {
          stay: sharedContext.selectedStay,
          transport: sharedContext.selectedTransport,
          selectedPlaces: sharedContext.selectedPlaces,
          selectedRestaurants: sharedContext.selectedRestaurants,
        },
        attempt,
        replanFeedback,
      );

      AgentObservability.recordRun({
        tripId: trip.id,
        agentName: "ItineraryAgent",
        status: itinRes.status,
        attempt,
        durationMs: itinRes.durationMs,
        error: itinRes.warnings[0] || (itinRes.status === "failed" ? itinRes.reasoning : undefined),
        errorCategory: itinRes.errorCategory,
      });

      if (!itinRes.data) {
        const cat = itinRes.errorCategory || "SCHEDULE_GENERATION_ERROR";
        const reason = itinRes.reasoning || itinRes.warnings[0] || "Itinerary agent failed to generate a schedule.";
        if (cat === "NO_CANDIDATES") {
          const completeness = this.deriveCompleteness(context, sharedContext, { days: [], orchestrationNotes: reason });
          const failureMsg = completeness.hollowReason || reason;
          notify("failed", failureMsg);
          return {
            tripId: trip.id,
            status: "failed",
            stage: "failed",
            attempts: attempt,
            completeness,
            transportation: sharedContext.transportation,
            stay: sharedContext.stay,
            activities: sharedContext.activities,
            food: sharedContext.food,
            budget: budgetBreakdown,
            itinerary: null,
            validation: { passed: false, criticalCount: 1, warningCount: 0, issues: [{ code: "NO_CANDIDATES", message: reason, severity: "error" }] },
            selectedPlacesDetails: sharedContext.selectedPlaces,
            selectedRestaurantsDetails: sharedContext.selectedRestaurants,
            selectedStayDetails: sharedContext.selectedStay || undefined,
            stayAlternativesDetails: sharedContext.stayAlternatives,
            collaborationSummary,
            error: failureMsg,
            assembledAt: new Date().toISOString(),
          };
        }
        replanFeedback = `[${cat}] ${reason}`;
        attempt++;
        notify("replanning", `Itinerary synthesis issue (${cat}): ${reason}. Retrying (attempt ${attempt}/${MAX_REPLANS})...`);
        continue;
      }

      // 6. Stage 6: Deterministic Itinerary Validator
      notify("validating", "Validating itinerary timing, exact day count, and references...");
      const validReferenceIds = new Set<string>([
        ...(sharedContext.selectedStay ? [sharedContext.selectedStay.id] : []),
        ...(sharedContext.selectedTransport ? [sharedContext.selectedTransport.id] : []),
        ...sharedContext.selectedPlaces.map((p) => p.id),
        ...sharedContext.selectedRestaurants.map((r) => r.id),
      ]);

      const validation: ValidationReport = ItineraryValidator.validate({
        expectedDays: trip.days,
        itinerary: itinRes.data,
        validReferenceIds,
      });

      if (validation.passed) {
        // Derive domain outcomes and evaluate whether this plan is complete
        const completeness = this.deriveCompleteness(context, sharedContext, itinRes.data);

        // If the itinerary has no activities, stays, or dining (e.g. only transport + free time),
        // it cannot be marked as successfully completed.
        if (!completeness.isComplete) {
          notify("failed", completeness.hollowReason || "Incomplete journey plan: core experiences or accommodations are unavailable.");
          return {
            tripId: trip.id,
            status: "failed",
            stage: "failed",
            attempts: attempt,
            completeness,
            transportation: sharedContext.transportation,
            stay: sharedContext.stay,
            activities: sharedContext.activities,
            food: sharedContext.food,
            budget: budgetBreakdown,
            itinerary: itinRes.data,
            validation,
            selectedPlacesDetails: sharedContext.selectedPlaces,
            selectedRestaurantsDetails: sharedContext.selectedRestaurants,
            selectedStayDetails: sharedContext.selectedStay || undefined,
            stayAlternativesDetails: sharedContext.stayAlternatives,
            collaborationSummary,
            error: completeness.hollowReason,
            assembledAt: new Date().toISOString(),
          };
        }

        if (!collaborationSummary.stagesCompleted.includes("itinerary_validated")) {
          collaborationSummary.stagesCompleted.push("itinerary_validated");
        }
        notify("completed", "Journey planning successfully verified.");
        return {
          tripId: trip.id,
          status: "completed",
          stage: "completed",
          attempts: attempt,
          completeness,
          transportation: sharedContext.transportation,
          stay: sharedContext.stay,
          activities: sharedContext.activities,
          food: sharedContext.food,
          budget: budgetBreakdown,
          itinerary: itinRes.data,
          validation,
          selectedPlacesDetails: sharedContext.selectedPlaces,
          selectedRestaurantsDetails: sharedContext.selectedRestaurants,
          selectedStayDetails: sharedContext.selectedStay || undefined,
          stayAlternativesDetails: sharedContext.stayAlternatives,
          collaborationSummary,
          assembledAt: new Date().toISOString(),
        };
      }

      // Replan if failed validation
      AgentObservability.recordRun({
        tripId: trip.id,
        agentName: "ItineraryValidator",
        status: "failed",
        attempt,
        durationMs: 0,
        error: validation.issues.map((i) => `[${i.code}] ${i.message}`).join("; "),
        errorCategory: "ITINERARY_VALIDATION_ERROR",
      });

      replanFeedback = validation.issues.map((i) => `[${i.code}] ${i.message}`).join("; ");
      notify("replanning", `Validation issues detected: ${replanFeedback}. Retrying with targeted replan...`);
      attempt++;
    }

    notify("failed", `Exceeded maximum planning attempts (${MAX_REPLANS}).`);
    return this.failureResult(
      trip.id,
      "failed",
      MAX_REPLANS,
      `Exceeded maximum planning attempts without achieving a passing validation. Last feedback: ${replanFeedback}`,
    );
  }

  private deriveCompleteness(
    context: TripContext,
    sharedContext: SharedPlanningContext,
    itinerary: import("../agents/itinerary/schemas").ItineraryAgentOutput,
  ): PlanCompleteness {
    // 1. Evaluate Transportation
    let transOutcome: DomainOutcome = "ready";
    if (sharedContext.selectedTransport || sharedContext.transportation) {
      transOutcome = "ready";
    } else if (
      !context.trip.origin ||
      !context.trip.origin.trim() ||
      context.availability.transport.reason === "not_required"
    ) {
      transOutcome = "optional";
    } else if (context.availability.transport.status === "unavailable") {
      transOutcome = "unavailable";
    } else if (context.candidateTransport.length === 0) {
      transOutcome = "no_results";
    } else {
      transOutcome = "optional";
    }

    // 2. Evaluate Stays / Accommodation
    let stayOutcome: DomainOutcome = "ready";
    if (sharedContext.selectedStay || sharedContext.stay) {
      stayOutcome = "ready";
    } else if (context.availability.stays.status === "unavailable") {
      stayOutcome = "unavailable";
    } else if (context.candidateStays.length === 0) {
      stayOutcome = "no_results";
    } else {
      stayOutcome = "failed";
    }

    // 3. Evaluate Activities / Experiences
    let actOutcome: DomainOutcome = "ready";
    if (sharedContext.selectedPlaces.length > 0 || (sharedContext.activities && sharedContext.activities.selectedPlaceIds.length > 0)) {
      actOutcome = "ready";
    } else if (context.availability.places.status === "unavailable") {
      actOutcome = "unavailable";
    } else if (context.candidatePlaces.length === 0) {
      actOutcome = "no_results";
    } else {
      actOutcome = "failed";
    }

    // 4. Evaluate Dining / Food
    let foodOutcome: DomainOutcome = "ready";
    if (sharedContext.selectedRestaurants.length > 0 || (sharedContext.food && sharedContext.food.selectedRestaurantIds.length > 0)) {
      foodOutcome = "ready";
    } else if (context.availability.food.status === "unavailable") {
      foodOutcome = "unavailable";
    } else if (context.candidateRestaurants.length === 0) {
      foodOutcome = "no_results";
    } else {
      foodOutcome = "failed";
    }

    // 5. Evaluate Itinerary schedule items
    const allItems = itinerary.days.flatMap((d) => d.items);
    const activityItems = allItems.filter((i) => i.type === "activity");
    const stayItems = allItems.filter((i) => i.type === "stay");
    const foodItems = allItems.filter((i) => i.type === "food");

    const missingDomains: string[] = [];
    if (stayOutcome !== "ready") missingDomains.push("Accommodation");
    if (actOutcome !== "ready") missingDomains.push("Attractions & Activities");
    if (foodOutcome !== "ready") missingDomains.push("Dining");

    // A plan is hollow if it has 0 scheduled activities and 0 scheduled stays
    const isHollow = activityItems.length === 0 && stayItems.length === 0 && foodItems.length === 0;
    const isComplete = !isHollow && actOutcome === "ready" && stayOutcome === "ready";

    let hollowReason: string | undefined;
    if (isHollow) {
      hollowReason = `Hollow journey schedule: Destination providers returned 0 curated activities, stays, or dining options. Itinerary contains only transit/free-time. Missing: ${missingDomains.join(", ")}.`;
    } else if (!isComplete) {
      hollowReason = `Incomplete journey: Core destination requirements missing (${missingDomains.join(", ")}). Real verified provider inventory is required for a complete plan.`;
    }

    let itinOutcome: DomainOutcome = isComplete ? "ready" : (isHollow ? "failed" : "ready");

    return {
      isComplete,
      hollowReason,
      outcomes: {
        transportation: transOutcome,
        stay: stayOutcome,
        activities: actOutcome,
        food: foodOutcome,
        itinerary: itinOutcome,
      },
      missingDomains,
    };
  }

  private failureResult(
    tripId: string,
    stage: OrchestratorStage,
    attempts: number,
    error: string,
  ): OrchestrationResult {
    return {
      tripId,
      status: "failed",
      stage,
      attempts,
      transportation: null,
      stay: null,
      activities: null,
      food: null,
      budget: null,
      itinerary: null,
      validation: null,
      error,
      assembledAt: new Date().toISOString(),
    };
  }
}

export const travelOrchestrator = new TravelOrchestrator();
