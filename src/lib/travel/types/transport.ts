/**
 * @file src/lib/travel/types/transport.ts
 *
 * Normalized TransportOption domain model covering multi-modal transit legs.
 */

import type { SourceMetadata  } from "./common";

export type TransportMode =
  | "flight"
  | "train"
  | "bus"
  | "car"
  | "taxi"
  | "metro"
  | "ferry"
  | "walk";

export interface TransportOption {
  id: string;
  mode: TransportMode;
  provider: string; // e.g. "Shinkansen JR Central", "Air France", "Commercial Flight Search (Google Flights)"
  origin: string; // e.g. "TYO" or "Tokyo Station"
  destination: string; // e.g. "OSA" or "Kyoto Station"
  departureTime?: string | null; // ISO 8601 string or HH:mm or null
  arrivalTime?: string | null; // ISO 8601 string or HH:mm or null
  durationMinutes?: number | null;
  price: number | null;
  currency: string;
  stops?: number | null;
  availability: "available" | "limited" | "sold_out" | "unknown";
  bookingUrl?: string | null;
  isEstimate?: boolean;
  source: SourceMetadata;
}
