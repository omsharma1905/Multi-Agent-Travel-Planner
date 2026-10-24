/**
 * @file src/lib/travel/providers/real/pexels-image-provider.ts
 *
 * Real Image Provider using Pexels Curated/Search API.
 * Retrieves high-resolution verified travel photography for destinations.
 *
 * Free tier: 200 requests/hour, 20,000 requests/month.
 * Endpoint: https://api.pexels.com/v1/search?query={query}&orientation=landscape&per_page=1
 */

import { ImageProvider, DestinationImageResult } from "../interfaces";
import { getTravelConfig } from "../../config";

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

export class PexelsImageProvider implements ImageProvider {
  private apiKey: string | null;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(apiKey?: string | null, baseUrl?: string, timeoutMs?: number) {
    const config = getTravelConfig();
    this.apiKey = apiKey !== undefined ? apiKey : config.providers.pexels.apiKey;
    this.baseUrl = baseUrl || config.providers.pexels.baseUrl;
    this.timeoutMs = timeoutMs || config.providers.pexels.timeoutMs;
  }

  async getDestinationImage(query: string): Promise<DestinationImageResult | null> {
    // If no API key configured, return null (graceful degradation to neutral gradient)
    if (!this.apiKey) {
      return null;
    }

    const searchQuery = `${query.trim()} landmark travel`;
    const url = `${this.baseUrl}/search?query=${encodeURIComponent(searchQuery)}&orientation=landscape&per_page=1`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Authorization: this.apiKey,
          Accept: "application/json",
        },
      });
      clearTimeout(timer);

      if (res.status === 401 || res.status === 403) {
        console.warn("[PexelsImageProvider] Invalid or expired Pexels API key. Gracefully continuing without dynamic imagery.");
        return null;
      }

      if (!res.ok) {
        console.warn(`[PexelsImageProvider] Pexels API responded with status ${res.status}. Gracefully continuing without dynamic imagery.`);
        return null;
      }

      const data = (await res.json()) as PexelsSearchResponse;
      if (!data.photos || data.photos.length === 0) {
        return null;
      }

      const photo = data.photos[0];
      return {
        url: photo.src.large2x || photo.src.large || photo.src.original,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        alt: photo.alt || `${query} travel landscape`,
        source: {
          provider: "pexels",
          providerId: String(photo.id),
          fetchedAt: new Date().toISOString(),
          isEstimate: false,
          confidence: 0.9,
          attribution: `Photo by ${photo.photographer} on Pexels (${photo.url})`,
          sourceUrl: photo.url,
        },
      };
    } catch (err: unknown) {
      console.warn("[PexelsImageProvider] Error fetching imagery:", err instanceof Error ? err.message : String(err));
      return null;
    }
  }
}
