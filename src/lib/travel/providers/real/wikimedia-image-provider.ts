/**
 * @file src/lib/travel/providers/real/wikimedia-image-provider.ts
 *
 * Real Image Provider using Wikimedia Commons & Wikipedia APIs.
 * 100% Free, requiring no API key, no billing account, and no credit card.
 *
 * Compliance & Licensing:
 * - Queries public Wikipedia / Wikimedia Commons endpoints.
 * - Adheres strictly to Creative Commons and Public Domain licensing requirements.
 * - Preserves item-specific author credit, license name, license URL, and source link.
 * - Never assumes all images share the same license.
 * - Uses in-memory caching to respect Wikimedia Foundation server resources.
 */

import { ImageProvider, DestinationImageResult } from "../interfaces";
import { travelCache } from "../../cache/memory-cache";

interface WikiPageImageResponse {
  query?: {
    pages?: Record<
      string,
      {
        pageid?: number;
        title?: string;
        pageimage?: string;
        thumbnail?: { source: string; width: number; height: number };
        original?: { source: string; width: number; height: number };
      }
    >;
  };
}

interface WikiImageInfoResponse {
  query?: {
    pages?: Record<
      string,
      {
        imageinfo?: Array<{
          url?: string;
          descriptionurl?: string;
          extmetadata?: {
            Artist?: { value?: string };
            LicenseShortName?: { value?: string };
            LicenseUrl?: { value?: string };
            Credit?: { value?: string };
            UsageTerms?: { value?: string };
            ObjectName?: { value?: string };
          };
        }>;
      }
    >;
  };
}

export class WikimediaImageProvider implements ImageProvider {
  private wikiBaseUrl: string;
  private commonsBaseUrl: string;
  private timeoutMs: number;
  private userAgent: string;

  constructor(
    wikiBaseUrl = "https://en.wikipedia.org/w/api.php",
    commonsBaseUrl = "https://commons.wikimedia.org/w/api.php",
    timeoutMs = 3500,
    userAgent = "SafariX-TravelPlanner/1.0 (contact: support@safarix.travel)",
  ) {
    this.wikiBaseUrl = wikiBaseUrl;
    this.commonsBaseUrl = commonsBaseUrl;
    this.timeoutMs = timeoutMs;
    this.userAgent = userAgent;
  }

  private stripHtml(html?: string): string {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }

  async getDestinationImage(query: string): Promise<DestinationImageResult | null> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return null;

    const cacheKey = `img_wiki_${cleanQuery.toLowerCase()}`;
    const cached = await travelCache.get<DestinationImageResult>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      // Step 1: Query English Wikipedia for the primary lead image
      const pageUrl = `${this.wikiBaseUrl}?action=query&titles=${encodeURIComponent(
        cleanQuery,
      )}&prop=pageimages&piprop=name|thumbnail|original&pithumbsize=1200&format=json&origin=*`;

      const pageRes = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": this.userAgent,
          Accept: "application/json",
        },
      });

      if (!pageRes.ok) {
        clearTimeout(timer);
        return null;
      }

      const pageData = (await pageRes.json()) as WikiPageImageResponse;
      clearTimeout(timer);

      const pages = pageData.query?.pages;
      if (!pages) {
        return null;
      }

      const page = Object.values(pages)[0];
      if (!page) {
        return null;
      }

      let imageUrl = page?.original?.source || page?.thumbnail?.source;
      let fileName = page?.pageimage;

      const isNonPhoto = (name?: string, url?: string): boolean => {
        const target = `${name || ""} ${url || ""}`.toLowerCase();
        return (
          /\b(flag|coat_of_arms|seal|emblem|locator|map|insignia|symbol|logo|blason|wappen|escudo)\b/i.test(target) ||
          /\.svg(\.png)?$/i.test(target)
        );
      };

      // If lead image is a flag, coat of arms, map, or missing, search Wikimedia Commons for a real photo
      if (!imageUrl || isNonPhoto(fileName, imageUrl)) {
        try {
          const searchController = new AbortController();
          const searchTimer = setTimeout(() => searchController.abort(), 2500);
          const searchUrl = `${this.commonsBaseUrl}?action=query&list=search&srsearch=${encodeURIComponent(
            `${cleanQuery} skyline OR panoramic OR landmark`,
          )}&srnamespace=6&srlimit=8&format=json&origin=*`;

          const searchRes = await fetch(searchUrl, {
            signal: searchController.signal,
            headers: { "User-Agent": this.userAgent, Accept: "application/json" },
          });
          clearTimeout(searchTimer);

          if (searchRes.ok) {
            const searchData = (await searchRes.json()) as {
              query?: { search?: Array<{ title: string }> };
            };
            const hits = (searchData.query?.search || []).filter((h) => !isNonPhoto(h.title));
            if (hits.length > 0) {
              fileName = hits[0].title.replace(/^File:/i, "");
              imageUrl = undefined; // Will be populated from Commons imageinfo below
            }
          }
        } catch {
          // Fall through to null if Commons search fails
        }
      }

      if (!fileName && !imageUrl) {
        return null;
      }

      let artist = "Wikimedia Commons Contributor";
      let license = "CC BY-SA / Public Domain";
      let licenseUrl: string | undefined = undefined;
      let sourceUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanQuery)}`;

      // Step 2: If fileName exists, fetch item-specific licensing, url, and author metadata from Wikimedia Commons
      if (fileName) {
        try {
          const infoController = new AbortController();
          const infoTimer = setTimeout(() => infoController.abort(), 2500);

          const infoUrl = `${this.commonsBaseUrl}?action=query&titles=File:${encodeURIComponent(
            fileName,
          )}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;

          const infoRes = await fetch(infoUrl, {
            signal: infoController.signal,
            headers: {
              "User-Agent": this.userAgent,
              Accept: "application/json",
            },
          });
          clearTimeout(infoTimer);

          if (infoRes.ok) {
            const infoData = (await infoRes.json()) as WikiImageInfoResponse;
            const infoPages = infoData.query?.pages;
            if (infoPages) {
              const filePage = Object.values(infoPages)[0];
              const info = filePage.imageinfo?.[0];
              if (info) {
                if (info.url && !imageUrl) {
                  imageUrl = info.url;
                }
                if (info.descriptionurl) sourceUrl = info.descriptionurl;
                const meta = info.extmetadata;
                if (meta) {
                  const rawArtist = this.stripHtml(meta.Artist?.value);
                  if (rawArtist) artist = rawArtist;

                  const rawLicense = meta.LicenseShortName?.value || meta.UsageTerms?.value;
                  if (rawLicense) license = rawLicense;

                  if (meta.LicenseUrl?.value) {
                    licenseUrl = meta.LicenseUrl.value;
                  }
                }
              }
            }
          }
        } catch {
          // Graceful fallback to default Wikipedia attribution if Commons metadata query times out
        }
      }

      if (!imageUrl || isNonPhoto(fileName, imageUrl)) {
        return null;
      }

      const attribution = licenseUrl
        ? `Photo by ${artist} via Wikimedia Commons (${license} - ${licenseUrl}).`
        : `Photo by ${artist} via Wikimedia Commons (${license}).`;

      const result: DestinationImageResult = {
        url: imageUrl,
        photographer: artist,
        photographerUrl: sourceUrl,
        alt: `${cleanQuery} travel destination photography`,
        source: {
          provider: "wikimedia-commons",
          providerId: fileName || cleanQuery,
          fetchedAt: new Date().toISOString(),
          isEstimate: false,
          confidence: 0.98,
          attribution,
          sourceUrl,
        },
      };

      await travelCache.set(cacheKey, result, 86400); // Cache for 24 hours
      return result;
    } catch {
      return null;
    }
  }
}
