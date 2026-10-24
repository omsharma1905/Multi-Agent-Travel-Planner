/**
 * @file src/app/api/destinations/image/route.ts
 *
 * Dynamic destination image resolution route.
 * Resolves authentic destination imagery at runtime via TravelService (WikimediaImageProvider)
 * or verified curated collection. 100% Free: requires no Pexels API key or billing.
 */

import { NextRequest, NextResponse } from "next/server";
import { travelService } from "@/lib/travel";
import { getDestinationImage } from "@/lib/travel/images";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

export async function GET(req: NextRequest) {
  // 1. Rate Limiting for External Imagery Provider
  const rlBlock = await enforceRateLimit(req, { category: "PROVIDER_SEARCH" });
  if (rlBlock) return rlBlock;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.trim();

    if (!query) {
      return NextResponse.json({ error: "Missing query parameter." }, { status: 400 });
    }

    // 2. Resource Limit (Query Length)
    if (query.length > 200) {
      return NextResponse.json(
        { error: "Query exceeds maximum allowed length of 200 characters." },
        { status: 400 },
      );
    }

    // 1. First attempt dynamic resolution via TravelService / ImageProvider with bounded 3500ms timeout
    let dynamicImage = null;
    try {
      dynamicImage = await Promise.race([
        travelService.getDestinationImage(query),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
      ]);
    } catch {
      // Graceful fallback
    }

    // 2. If provider returns an authentic photo (not a flag or SVG), return it with provenance
    if (
      dynamicImage &&
      dynamicImage.url &&
      !/\.svg(\.png)?$/i.test(dynamicImage.url) &&
      !/\b(flag|coat_of_arms|seal)\b/i.test(dynamicImage.url)
    ) {
      return NextResponse.json(
        {
          name: query,
          url: dynamicImage.url,
          photographer: dynamicImage.photographer,
          photographerUrl: dynamicImage.photographerUrl,
          alt: dynamicImage.alt,
          source: dynamicImage.source,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
          },
        },
      );
    }

    // 3. Fallback to registry if present
    const staticEntry = getDestinationImage(query);
    if (staticEntry.heroImage) {
      return NextResponse.json(
        {
          name: staticEntry.name,
          country: staticEntry.country,
          url: staticEntry.heroImage,
          photographer: "Verified Collection",
          photographerUrl: null,
          alt: `${staticEntry.name}, ${staticEntry.country}`,
          source: {
            provider: "veora-verified-registry",
            isEstimate: false,
          },
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
          },
        },
      );
    }

    // 4. Clean null with gradient if no image found
    return NextResponse.json({
      name: query,
      url: null,
      gradient: staticEntry.neutralGradient,
      source: {
        provider: "typographic-fallback",
        isEstimate: true,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve destination image." },
      { status: 500 },
    );
  }
}
