/**
 * @file src/lib/travel/types/destination.ts
 *
 * Normalized Destination domain model.
 */

import type { SourceMetadata  } from "./common";

export interface Destination {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone: string;
  description: string;
  aliases: string[];
  imageUrl?: string;
  source: SourceMetadata;
}
