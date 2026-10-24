/**
 * @file src/lib/travel/types/common.ts
 *
 * Foundational travel types, geographic primitives, and provenance tracking.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type PriceLevel = "free" | "budget" | "moderate" | "expensive" | "luxury";

export interface DaySchedule {
  open: string; // e.g. "09:00"
  close: string; // e.g. "17:00"
  isClosed?: boolean;
  isUnknown?: boolean;
}

export interface OpeningHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
  text?: string | null;
  isAlwaysOpen?: boolean;
  isUnknown?: boolean;
}

export interface SourceMetadata {
  provider: string; // e.g. "open-meteo", "pexels", "google-places", "amadeus", "osrm", "mock"
  providerId?: string; // upstream external ID (e.g. Google Place ID, Amadeus Hotel ID)
  fetchedAt: string; // ISO 8601 string
  isEstimate: boolean; // false for real provider data, true for mock/estimated
  confidence?: number; // 0 to 1
  cached?: boolean;
  sourceUrl?: string; // deep link or official source link
  attribution?: string; // required provider attribution text or copyright
}

