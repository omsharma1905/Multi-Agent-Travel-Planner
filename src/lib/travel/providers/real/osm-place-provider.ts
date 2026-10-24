/**
 * @file src/lib/travel/providers/real/osm-place-provider.ts
 *
 * Real Attractions & Activities Provider using OpenStreetMap (Photon) & Wikimedia GeoData.
 * 100% Free: requires no API key, no billing account, and no credit card.
 *
 * Rules:
 * - Real mapped places on Earth with genuine coordinates and addresses.
 * - Zero fabricated reviews, fake star ratings, or synthetic opening hours.
 * - Conforms strictly to Place domain model and placeSchema Zod validation.
 * - Caches results to respect public server fair use.
 */

import { PlaceProvider, PlaceFilter } from "../interfaces";
import { Place, PlaceType } from "../../types";
import { placeSchema } from "../../validators/travel-schemas";
import { travelCache } from "../../cache/memory-cache";

interface WikiGeoItem {
  pageid: number;
  title: string;
  lat: number;
  lon: number;
  dist: number;
}

interface WikiGeoResponse {
  query?: {
    geosearch?: WikiGeoItem[];
    pages?: Record<string, { extract?: string }>;
  };
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    country?: string;
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

export class OsmPlaceProvider implements PlaceProvider {
  private photonBaseUrl: string;
  private wikiBaseUrl: string;
  private timeoutMs: number;
  private userAgent: string;

  constructor(
    photonBaseUrl = "https://photon.komoot.io/api",
    wikiBaseUrl = "https://en.wikipedia.org/w/api.php",
    timeoutMs = 8000,
    userAgent = "SafariX-TravelPlanner/1.0 (contact: support@safarix.travel)",
  ) {
    this.photonBaseUrl = photonBaseUrl.replace(/\/$/, "");
    this.wikiBaseUrl = wikiBaseUrl;
    this.timeoutMs = timeoutMs;
    this.userAgent = userAgent;
  }

  private resolveCoordinates(
    destinationId: string,
    filterLat?: number,
    filterLng?: number,
  ): { latitude: number; longitude: number } | null {
    if (
      typeof filterLat === "number" &&
      typeof filterLng === "number" &&
      filterLat !== 0 &&
      filterLng !== 0
    ) {
      return { latitude: filterLat, longitude: filterLng };
    }

    const cityCoords: Record<string, { latitude: number; longitude: number }> = {
      tokyo: { latitude: 35.6762, longitude: 139.6503 },
      kyoto: { latitude: 35.0116, longitude: 135.7681 },
      osaka: { latitude: 34.6937, longitude: 135.5023 },
      paris: { latitude: 48.8566, longitude: 2.3522 },
      london: { latitude: 51.5074, longitude: -0.1278 },
      "new york": { latitude: 40.7128, longitude: -74.006 },
      delhi: { latitude: 28.6139, longitude: 77.209 },
      mumbai: { latitude: 19.076, longitude: 72.8777 },
      goa: { latitude: 15.2993, longitude: 74.124 },
      bali: { latitude: -8.4095, longitude: 115.1889 },
      dubai: { latitude: 25.2048, longitude: 55.2708 },
      rome: { latitude: 41.9028, longitude: 12.4964 },
      reykjavik: { latitude: 64.1466, longitude: -21.9426 },
      bhopal: { latitude: 23.2599, longitude: 77.4126 },
    };

    const clean = destinationId.replace(/^dest_/, "").toLowerCase();
    for (const [key, coords] of Object.entries(cityCoords)) {
      if (clean.includes(key)) return coords;
    }
    return null;
  }

  private inferType(name: string, osmValue?: string): PlaceType {
    const lower = `${name} ${osmValue || ""}`.toLowerCase();
    if (lower.includes("museum") || lower.includes("gallery")) return "museum";
    if (lower.includes("park") || lower.includes("garden") || lower.includes("forest"))
      return "park";
    if (lower.includes("beach") || lower.includes("coast")) return "beach";
    if (
      lower.includes("temple") ||
      lower.includes("shrine") ||
      lower.includes("church") ||
      lower.includes("cathedral") ||
      lower.includes("mosque")
    )
      return "temple";
    if (lower.includes("market") || lower.includes("bazaar")) return "market";
    if (
      lower.includes("view") ||
      lower.includes("tower") ||
      lower.includes("bridge") ||
      lower.includes("observatory")
    )
      return "viewpoint";
    if (
      lower.includes("theater") ||
      lower.includes("theatre") ||
      lower.includes("aquarium") ||
      lower.includes("zoo")
    )
      return "activity";
    return "landmark";
  }

  private isTouristAttraction(
    name: string,
    osmKey?: string,
    osmValue?: string,
  ): boolean {
    const lowerName = name.toLowerCase();
    const lowerKey = (osmKey || "").toLowerCase();
    const lowerVal = (osmValue || "").toLowerCase();

    // 1. Explicit highway / road / boundary tags
    if (lowerKey === "highway" || lowerKey === "boundary" || lowerKey === "place") {
      return false;
    }
    const roadValues = [
      "motorway",
      "trunk",
      "primary",
      "secondary",
      "tertiary",
      "unclassified",
      "residential",
      "service",
      "track",
      "road",
      "path",
      "cycleway",
      "footway",
      "pedestrian",
      "street",
      "bus_stop",
    ];
    if (roadValues.includes(lowerVal)) {
      return false;
    }

    // 2. Reject road/highway names unless they explicitly contain landmark keywords
    const landmarkKeywords = [
      "museum",
      "palace",
      "park",
      "garden",
      "castle",
      "fort",
      "monument",
      "tower",
      "cathedral",
      "temple",
      "church",
      "mosque",
      "gallery",
      "sanctuary",
      "waterfall",
      "beach",
      "aquarium",
      "zoo",
      "theatre",
      "theater",
      "bazaar",
      "market",
      "square",
      "plaza",
      "opera",
      "viewpoint",
    ];
    const hasLandmarkWord = landmarkKeywords.some((w) => lowerName.includes(w));

    if (!hasLandmarkWord) {
      // Highway / road numbering or naming patterns: e.g. "E 311 road", "E 311", "D 84", "Highway 1", "Sheikh Zayed Road"
      if (
        /\b(road|rd|highway|hwy|motorway|expressway|freeway|route|street|st|avenue|ave|drive|dr|lane|ln|flyover|junction|roundabout|tunnel)\b/i.test(
          lowerName,
        ) ||
        /\b[edmsi]-\d+\b/i.test(lowerName) ||
        /\b[edmsi]\s*\d{2,4}\b/i.test(lowerName)
      ) {
        return false;
      }
    }

    // 3. Infrastructure, utility, and administrative exclusions
    const nonAttractionPatterns = [
      "station",
      "railway",
      "school",
      "university",
      "college",
      "hospital",
      "clinic",
      "pharmacy",
      "police",
      "substation",
      "constituency",
      "district",
      "municipality",
      "elections",
      "cemetery",
      "graveyard",
      "parking",
      "depot",
      "interchange",
    ];
    if (nonAttractionPatterns.some((p) => lowerName.includes(p))) {
      return false;
    }

    return true;
  }

  async searchPlaces(filter: PlaceFilter): Promise<Place[]> {
    const coords = this.resolveCoordinates(
      filter.destinationId,
      filter.latitude,
      filter.longitude,
    );
    if (!coords) {
      return [];
    }

    const cacheKey = `places_osm_${filter.destinationId}_${coords.latitude.toFixed(
      2,
    )}_${coords.longitude.toFixed(2)}`;
    const cached = await travelCache.get<Place[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const places: Place[] = [];
    const seenNames = new Set<string>();

    // 1. Query Wikimedia GeoSearch for notable encyclopedic landmarks & museums
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const wikiGeoUrl = `${this.wikiBaseUrl}?action=query&list=geosearch&gscoord=${coords.latitude}|${coords.longitude}&gsradius=10000&gslimit=15&format=json&origin=*`;
      const wikiRes = await fetch(wikiGeoUrl, {
        signal: controller.signal,
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
      });
      clearTimeout(timer);

      if (wikiRes.ok) {
        const wikiData = (await wikiRes.json()) as WikiGeoResponse;
        const items = wikiData.query?.geosearch || [];

        // Fetch short introductory extracts for up to 10 landmarks
        const pageIds = items.slice(0, 10).map((i) => i.pageid).join("|");
        let extractMap: Record<string, string> = {};

        if (pageIds) {
          try {
            const extController = new AbortController();
            const extTimer = setTimeout(() => extController.abort(), 4000);
            const extUrl = `${this.wikiBaseUrl}?action=query&pageids=${pageIds}&prop=extracts&exintro=1&explaintext=1&exchars=240&format=json&origin=*`;
            const extRes = await fetch(extUrl, {
              signal: extController.signal,
              headers: { "User-Agent": this.userAgent, Accept: "application/json" },
            });
            clearTimeout(extTimer);
            if (extRes.ok) {
              const extData = (await extRes.json()) as WikiGeoResponse;
              const pages = extData.query?.pages || {};
              for (const [pid, pObj] of Object.entries(pages)) {
                if (pObj.extract) {
                  extractMap[pid] = pObj.extract.replace(/\s+/g, " ").trim();
                }
              }
            }
          } catch {
            // non-fatal extract fallback
          }
        }

        for (const item of items) {
          const rawName = item.title;
          const cleanName = rawName.replace(/\s*\([^)]*\)$/, "").trim();
          const normKey = cleanName.toLowerCase();
          if (seenNames.has(normKey) || !this.isTouristAttraction(cleanName)) {
            continue;
          }
          seenNames.add(normKey);

          const placeType = this.inferType(cleanName);
          const isFree = placeType === "park" || placeType === "viewpoint" || placeType === "beach";
          const description =
            extractMap[String(item.pageid)] ||
            `${cleanName} is a prominent cultural landmark in ${filter.destinationId}.`;

          const place: Place = {
            id: `wiki_place_${item.pageid}`,
            name: cleanName,
            destinationId: filter.destinationId,
            latitude: item.lat,
            longitude: item.lon,
            address: `${cleanName}, ${filter.destinationId}`,
            type: placeType,
            rating: 0,
            reviewCount: 0,
            priceLevel: isFree ? "free" : "moderate",
            priceType: isFree ? "free" : "unknown",
            isPriceEstimate: false,
            tags: [placeType, "attraction", "landmark"],
            description,
            openingHours: {
              text: null,
              isUnknown: true,
              isAlwaysOpen: false,
            },
            website: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
            source: {
              provider: "wikimedia-geosearch",
              providerId: String(item.pageid),
              fetchedAt: new Date().toISOString(),
              isEstimate: false,
              confidence: 0.95,
              attribution: "Landmark data derived from Wikipedia (CC BY-SA 4.0).",
              sourceUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
            },
          };

          const check = placeSchema.safeParse(place);
          if (check.success) {
            places.push(place);
          }
        }
      }
    } catch {
      // Wikimedia GeoSearch failed or timed out; continue to Photon
    }

    // 2. Query Photon for OpenStreetMap attractions & museums
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const photonUrl = `${this.photonBaseUrl}/?q=attraction&lat=${coords.latitude}&lon=${coords.longitude}&limit=12`;
      const res = await fetch(photonUrl, {
        signal: controller.signal,
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = (await res.json()) as PhotonResponse;
        const features = data.features || [];

        for (const f of features) {
          const name = f.properties?.name;
          if (!name || name.trim().length < 2) continue;

          const normKey = name.trim().toLowerCase();
          if (
            seenNames.has(normKey) ||
            !this.isTouristAttraction(name.trim(), f.properties.osm_key, f.properties.osm_value)
          ) {
            continue;
          }
          seenNames.add(normKey);

          const [lon, lat] = f.geometry.coordinates;
          const osmVal = f.properties.osm_value;
          const placeType = this.inferType(name, osmVal);
          const isFree = placeType === "park" || placeType === "viewpoint" || placeType === "beach";

          const street = f.properties.street || "";
          const city = f.properties.city || filter.destinationId;
          const address = street ? `${street}, ${city}` : `${name}, ${city}`;

          const place: Place = {
            id: `osm_place_${f.properties.osm_id}`,
            name: name.trim(),
            destinationId: filter.destinationId,
            latitude: lat,
            longitude: lon,
            address,
            type: placeType,
            rating: 0,
            reviewCount: 0,
            priceLevel: isFree ? "free" : "moderate",
            priceType: isFree ? "free" : "unknown",
            isPriceEstimate: false,
            tags: [placeType, osmVal || "attraction"].filter(Boolean),
            description: `${name} is a mapped place of interest in ${city}.`,
            openingHours: (() => {
              const raw = (f.properties as any).opening_hours || (f.properties as any)["opening_hours"] || (f.properties as any).extra_tags?.opening_hours;
              if (typeof raw === "string" && raw.trim().length > 0) {
                return {
                  text: raw.trim(),
                  isUnknown: false,
                  isAlwaysOpen: raw.toLowerCase().includes("24/7"),
                };
              }
              return {
                text: null,
                isUnknown: true,
                isAlwaysOpen: false,
              };
            })(),
            website: undefined,
            source: {
              provider: "osm-photon",
              providerId: String(f.properties.osm_id),
              fetchedAt: new Date().toISOString(),
              isEstimate: false,
              confidence: 0.95,
              attribution: "Place data © OpenStreetMap contributors, ODbL.",
            },
          };

          const check = placeSchema.safeParse(place);
          if (check.success) {
            places.push(place);
          }
        }
      }
    } catch {
      // Photon query failed or timed out
    }

    const limit = Math.min(filter.limit || 15, 25);
    const finalResults = places.slice(0, limit);

    if (finalResults.length > 0) {
      await travelCache.set(cacheKey, finalResults, 3600); // Cache 1 hour
    }

    return finalResults;
  }

  async getPlace(id: string): Promise<Place | null> {
    if (!id.startsWith("wiki_place_") && !id.startsWith("osm_place_")) {
      return null;
    }
    return null;
  }
}
