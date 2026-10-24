import { Destination } from "./destination";
import { Place } from "./place";
import { Restaurant } from "./restaurant";
import { Stay } from "./stay";
import { TransportOption } from "./transport";
import { Route } from "./route";
import { DestinationImageResult } from "../providers/interfaces";
import { TripWithPreferences, TransportPreference } from "@/features/trips/types";

export type ContextReadiness = "ready" | "partial" | "blocked";

export interface ComponentAvailability {
  status: "available" | "partial" | "unavailable";
  reason?: string;
  error?: string;
}

export interface TripContextAvailability {
  origin: ComponentAvailability;
  destination: ComponentAvailability;
  imagery: ComponentAvailability;
  stays: ComponentAvailability;
  places: ComponentAvailability;
  food: ComponentAvailability;
  transport: ComponentAvailability;
  routes: ComponentAvailability;
}

export interface SourceSummary {
  realProviders: string[];
  estimatedProviders: string[];
  unavailableProviders: string[];
}

export interface TripContextImagery {
  hero: DestinationImageResult | null;
  additional?: DestinationImageResult[];
}

export interface TripContext {
  trip: TripWithPreferences;
  transportPreference: TransportPreference;
  origin: Destination | null;
  destination: Destination;
  imagery: TripContextImagery;
  candidateStays: Stay[];
  candidatePlaces: Place[];
  candidateRestaurants: Restaurant[];
  candidateTransport: TransportOption[];
  routes: Route[];
  availability: TripContextAvailability;
  sourceSummary: SourceSummary;
  readiness: ContextReadiness;
  assembledAt: string;
}

