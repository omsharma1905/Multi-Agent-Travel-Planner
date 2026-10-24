import type { BudgetTier, TripStatus } from "@/types";
import type { Destination } from "@/lib/travel/types/destination";
import type { OrchestrationResult } from "@/lib/orchestration/types";

export interface Trip {
  id: string;
  userId: string;
  title: string;
  origin?: string | null;
  originCanonical?: Destination | null;
  destination: string;
  days: number;
  travellers: number;
  budget: BudgetTier;
  status: TripStatus;
  isSaved?: boolean;
  plan?: OrchestrationResult | null;
  createdAt: string;
  updatedAt: string;
}

export type TransportPreference = "auto" | "flight" | "train" | "bus" | "car";

export interface TripPreferences {
  id: string;
  tripId: string;
  transportPreference?: TransportPreference;
  interests: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripWithPreferences extends Trip {
  preferences: TripPreferences | null;
}

export interface CreateTripInput {
  origin?: string;
  destination: string;
  days: number;
  travellers: number;
  budget: BudgetTier;
  transportPreference?: TransportPreference;
  interests: string[];
  notes?: string;
}

export interface TripVersion {
  id: string;
  tripId: string;
  userId: string;
  versionNumber: number;
  scope: string;
  instruction?: string | null;
  changeSummary?: Record<string, unknown> | null;
  snapshot: OrchestrationResult;
  totalCost: number;
  currency: string;
  currencySymbol: string;
  createdAt: string;
}


