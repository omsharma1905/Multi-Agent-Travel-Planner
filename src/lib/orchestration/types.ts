/**
 * @file src/lib/orchestration/types.ts
 *
 * Orchestration lifecycle state and output structures.
 */

import { TransportationAgentOutput } from "../agents/transportation/schemas";
import { StayAgentOutput } from "../agents/stay/schemas";
import { ActivitiesAgentOutput } from "../agents/activities/schemas";
import { FoodAgentOutput } from "../agents/food/schemas";
import { ItineraryAgentOutput } from "../agents/itinerary/schemas";
import { BudgetBreakdown } from "../agents/budget/budget-calculator";
import { ValidationReport } from "../agents/validator/itinerary-validator";
import { Place } from "../travel/types/place";
import { Restaurant } from "../travel/types/restaurant";
import { Stay } from "../travel/types/stay";
import { TransportOption } from "../travel/types/transport";
import { TripContext } from "../travel/types/trip-context";
import { FeasibilityIssue } from "../agents/validator/feasibility-engine";

export type OrchestratorStage =
  | "idle"
  | "collecting_data"
  | "running_agents"
  | "calculating_budget"
  | "building_itinerary"
  | "validating"
  | "replanning"
  | "completed"
  | "failed";

export interface CollaborationSummary {
  stagesCompleted: string[];
  targetedReplans: Array<{
    attempt: number;
    targetDomain: string;
    reason: string;
  }>;
  spatialAnchorStayId?: string;
  crossAgentInfluences: string[];
}

export interface SharedPlanningContext {
  tripContext: TripContext;
  transportation: TransportationAgentOutput | null;
  selectedTransport: TransportOption | null;
  activities: ActivitiesAgentOutput | null;
  selectedPlaces: Place[];
  stay: StayAgentOutput | null;
  selectedStay: Stay | null;
  stayAlternatives: Stay[];
  food: FoodAgentOutput | null;
  selectedRestaurants: Restaurant[];
  budget: BudgetBreakdown | null;
  candidateIssues: FeasibilityIssue[];
  replanFeedback?: string;
  targetedReplanDomain?: "stay" | "food" | "activities" | "transportation" | null;
  collaborationLog: string[];
}

export type DomainOutcome = "ready" | "unavailable" | "no_results" | "optional" | "failed";

export interface PlanCompleteness {
  isComplete: boolean;
  hollowReason?: string;
  outcomes: {
    transportation: DomainOutcome;
    stay: DomainOutcome;
    activities: DomainOutcome;
    food: DomainOutcome;
    itinerary: DomainOutcome;
  };
  missingDomains: string[];
}

export interface OrchestrationResult {
  tripId: string;
  status: "completed" | "failed";
  stage: OrchestratorStage;
  attempts: number;
  completeness?: PlanCompleteness;
  transportation: TransportationAgentOutput | null;
  stay: StayAgentOutput | null;
  activities: ActivitiesAgentOutput | null;
  food: FoodAgentOutput | null;
  budget: BudgetBreakdown | null;
  itinerary: ItineraryAgentOutput | null;
  validation: ValidationReport | null;
  selectedPlacesDetails?: Place[];
  selectedRestaurantsDetails?: Restaurant[];
  selectedStayDetails?: Stay;
  stayAlternativesDetails?: Stay[];
  collaborationSummary?: CollaborationSummary;
  error?: string;
  assembledAt: string;
}

