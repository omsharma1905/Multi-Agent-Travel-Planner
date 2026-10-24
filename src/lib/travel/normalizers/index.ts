/**
 * @file src/lib/travel/normalizers/index.ts
 *
 * Normalization helpers to standardise strings, tags, and apply provenance stamps.
 */

import { SourceMetadata } from "../types";

export function createSourceMetadata(
  provider = "mock",
  isEstimate = true,
  confidence = 0.95,
): SourceMetadata {
  return {
    provider,
    fetchedAt: new Date().toISOString(),
    isEstimate,
    confidence,
  };
}

export function normalizeSearchString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Great-circle distance between two coordinate pairs in kilometers (Haversine formula).
 */
export function calculateHaversineDistanceKm(
  p1: { latitude: number; longitude: number },
  p2: { latitude: number; longitude: number },
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.latitude * Math.PI) / 180) *
      Math.cos((p2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Standard alias for calculateHaversineDistanceKm.
 */
export const calculateHaversineDistance = calculateHaversineDistanceKm;


