/**
 * @file src/app/api/locations/search/route.ts
 *
 * Location Search Autocomplete API.
 * Provides real-time, geocoding-backed location search starting from 1 character.
 * Single-character queries resolve instantly from curated world & Indian travel hubs.
 * Multi-character queries leverage Open-Meteo geocoding via TravelService.
 */

import { NextRequest, NextResponse } from "next/server";
import { travelService } from "@/lib/travel";
import { enforceRateLimit } from "@/lib/security/rate-limiter";

export interface LocationCandidate {
  id: string;
  name: string;
  displayName: string;
  country: string;
  countryCode: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

// Curated top hubs for instantaneous single-character autocomplete (q.length === 1)
const CURATED_HUBS: LocationCandidate[] = [
  // A
  { id: "hub_ams", name: "Amsterdam", displayName: "Amsterdam, North Holland, Netherlands", country: "Netherlands", countryCode: "NL", region: "North Holland", latitude: 52.3676, longitude: 4.9041 },
  { id: "hub_ath", name: "Athens", displayName: "Athens, Attica, Greece", country: "Greece", countryCode: "GR", region: "Attica", latitude: 37.9838, longitude: 23.7275 },
  { id: "hub_agra", name: "Agra", displayName: "Agra, Uttar Pradesh, India", country: "India", countryCode: "IN", region: "Uttar Pradesh", latitude: 27.1767, longitude: 78.0081 },
  { id: "hub_akl", name: "Auckland", displayName: "Auckland, New Zealand", country: "New Zealand", countryCode: "NZ", region: "Auckland", latitude: -36.8485, longitude: 174.7633 },
  // B
  { id: "hub_bho", name: "Bhopal", displayName: "Bhopal, Madhya Pradesh, India", country: "India", countryCode: "IN", region: "Madhya Pradesh", latitude: 23.2599, longitude: 77.4126 },
  { id: "hub_bkk", name: "Bangkok", displayName: "Bangkok, Thailand", country: "Thailand", countryCode: "TH", region: "Central", latitude: 13.7563, longitude: 100.5018 },
  { id: "hub_bcn", name: "Barcelona", displayName: "Barcelona, Catalonia, Spain", country: "Spain", countryCode: "ES", region: "Catalonia", latitude: 41.3851, longitude: 2.1734 },
  { id: "hub_ber", name: "Berlin", displayName: "Berlin, Germany", country: "Germany", countryCode: "DE", region: "Berlin", latitude: 52.52, longitude: 13.405 },
  { id: "hub_blr", name: "Bengaluru", displayName: "Bengaluru, Karnataka, India", country: "India", countryCode: "IN", region: "Karnataka", latitude: 12.9716, longitude: 77.5946 },
  { id: "hub_bos", name: "Boston", displayName: "Boston, Massachusetts, United States", country: "United States", countryCode: "US", region: "Massachusetts", latitude: 42.3601, longitude: -71.0589 },
  { id: "hub_bali", name: "Bali", displayName: "Bali (Denpasar), Indonesia", country: "Indonesia", countryCode: "ID", region: "Bali", latitude: -8.4095, longitude: 115.1889 },
  // C
  { id: "hub_cai", name: "Cairo", displayName: "Cairo, Egypt", country: "Egypt", countryCode: "EG", region: "Cairo", latitude: 30.0444, longitude: 31.2357 },
  { id: "hub_cpt", name: "Cape Town", displayName: "Cape Town, Western Cape, South Africa", country: "South Africa", countryCode: "ZA", region: "Western Cape", latitude: -33.9249, longitude: 18.4241 },
  { id: "hub_ord", name: "Chicago", displayName: "Chicago, Illinois, United States", country: "United States", countryCode: "US", region: "Illinois", latitude: 41.8781, longitude: -87.6298 },
  { id: "hub_maa", name: "Chennai", displayName: "Chennai, Tamil Nadu, India", country: "India", countryCode: "IN", region: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707 },
  // D
  { id: "hub_dxb", name: "Dubai", displayName: "Dubai, United Arab Emirates", country: "United Arab Emirates", countryCode: "AE", region: "Dubai", latitude: 25.2048, longitude: 55.2708 },
  { id: "hub_del", name: "Delhi", displayName: "Delhi / New Delhi, India", country: "India", countryCode: "IN", region: "Delhi", latitude: 28.6139, longitude: 77.209 },
  { id: "hub_dub", name: "Dublin", displayName: "Dublin, Ireland", country: "Ireland", countryCode: "IE", region: "Leinster", latitude: 53.3498, longitude: -6.2603 },
  { id: "hub_doh", name: "Doha", displayName: "Doha, Qatar", country: "Qatar", countryCode: "QA", region: "Doha", latitude: 25.2854, longitude: 51.531 },
  // E
  { id: "hub_edi", name: "Edinburgh", displayName: "Edinburgh, Scotland, United Kingdom", country: "United Kingdom", countryCode: "GB", region: "Scotland", latitude: 55.9533, longitude: -3.1883 },
  // F
  { id: "hub_flr", name: "Florence", displayName: "Florence, Tuscany, Italy", country: "Italy", countryCode: "IT", region: "Tuscany", latitude: 43.7696, longitude: 11.2558 },
  { id: "hub_fra", name: "Frankfurt", displayName: "Frankfurt, Hesse, Germany", country: "Germany", countryCode: "DE", region: "Hesse", latitude: 50.1109, longitude: 8.6821 },
  // G
  { id: "hub_goa", name: "Goa", displayName: "Goa (Panaji), India", country: "India", countryCode: "IN", region: "Goa", latitude: 15.2993, longitude: 74.124 },
  { id: "hub_gva", name: "Geneva", displayName: "Geneva, Switzerland", country: "Switzerland", countryCode: "CH", region: "Geneva", latitude: 46.2044, longitude: 6.1432 },
  // H
  { id: "hub_hkg", name: "Hong Kong", displayName: "Hong Kong, SAR China", country: "China", countryCode: "HK", region: "Hong Kong", latitude: 22.3193, longitude: 114.1694 },
  { id: "hub_hyd", name: "Hyderabad", displayName: "Hyderabad, Telangana, India", country: "India", countryCode: "IN", region: "Telangana", latitude: 17.385, longitude: 78.4867 },
  { id: "hub_hel", name: "Helsinki", displayName: "Helsinki, Uusimaa, Finland", country: "Finland", countryCode: "FI", region: "Uusimaa", latitude: 60.1699, longitude: 24.9384 },
  // I
  { id: "hub_ist", name: "Istanbul", displayName: "Istanbul, Turkey", country: "Turkey", countryCode: "TR", region: "Marmara", latitude: 41.0082, longitude: 28.9784 },
  { id: "hub_ind", name: "Indore", displayName: "Indore, Madhya Pradesh, India", country: "India", countryCode: "IN", region: "Madhya Pradesh", latitude: 22.7196, longitude: 75.8577 },
  // J
  { id: "hub_jai", name: "Jaipur", displayName: "Jaipur, Rajasthan, India", country: "India", countryCode: "IN", region: "Rajasthan", latitude: 26.9124, longitude: 75.7873 },
  { id: "hub_jdh", name: "Jodhpur", displayName: "Jodhpur, Rajasthan, India", country: "India", countryCode: "IN", region: "Rajasthan", latitude: 26.2389, longitude: 73.0243 },
  // K
  { id: "hub_kyo", name: "Kyoto", displayName: "Kyoto, Kansai, Japan", country: "Japan", countryCode: "JP", region: "Kansai", latitude: 35.0116, longitude: 135.7681 },
  { id: "hub_ccu", name: "Kolkata", displayName: "Kolkata, West Bengal, India", country: "India", countryCode: "IN", region: "West Bengal", latitude: 22.5726, longitude: 88.3639 },
  { id: "hub_kul", name: "Kuala Lumpur", displayName: "Kuala Lumpur, Malaysia", country: "Malaysia", countryCode: "MY", region: "Federal Territory", latitude: 3.139, longitude: 101.6869 },
  { id: "hub_cok", name: "Kochi", displayName: "Kochi, Kerala, India", country: "India", countryCode: "IN", region: "Kerala", latitude: 9.9312, longitude: 76.2673 },
  // L
  { id: "hub_lon", name: "London", displayName: "London, England, United Kingdom", country: "United Kingdom", countryCode: "GB", region: "Greater London", latitude: 51.5074, longitude: -0.1278 },
  { id: "hub_lis", name: "Lisbon", displayName: "Lisbon, Portugal", country: "Portugal", countryCode: "PT", region: "Lisboa", latitude: 38.7223, longitude: -9.1393 },
  { id: "hub_lax", name: "Los Angeles", displayName: "Los Angeles, California, United States", country: "United States", countryCode: "US", region: "California", latitude: 34.0522, longitude: -118.2437 },
  // M
  { id: "hub_bom", name: "Mumbai", displayName: "Mumbai, Maharashtra, India", country: "India", countryCode: "IN", region: "Maharashtra", latitude: 19.076, longitude: 72.8777 },
  { id: "hub_mad", name: "Madrid", displayName: "Madrid, Community of Madrid, Spain", country: "Spain", countryCode: "ES", region: "Community of Madrid", latitude: 40.4168, longitude: -3.7038 },
  { id: "hub_mil", name: "Milan", displayName: "Milan, Lombardy, Italy", country: "Italy", countryCode: "IT", region: "Lombardy", latitude: 45.4642, longitude: 9.19 },
  { id: "hub_man", name: "Manali", displayName: "Manali, Himachal Pradesh, India", country: "India", countryCode: "IN", region: "Himachal Pradesh", latitude: 32.2432, longitude: 77.1892 },
  { id: "hub_muc", name: "Munich", displayName: "Munich, Bavaria, Germany", country: "Germany", countryCode: "DE", region: "Bavaria", latitude: 48.1351, longitude: 11.582 },
  // N
  { id: "hub_nyc", name: "New York", displayName: "New York, NY, United States", country: "United States", countryCode: "US", region: "New York", latitude: 40.7128, longitude: -74.006 },
  { id: "hub_nce", name: "Nice", displayName: "Nice, Provence-Alpes-Côte d'Azur, France", country: "France", countryCode: "FR", region: "Provence-Alpes-Côte d'Azur", latitude: 43.7102, longitude: 7.262 },
  // O
  { id: "hub_osl", name: "Oslo", displayName: "Oslo, Norway", country: "Norway", countryCode: "NO", region: "Oslo", latitude: 59.9139, longitude: 10.7522 },
  { id: "hub_osa", name: "Osaka", displayName: "Osaka, Kansai, Japan", country: "Japan", countryCode: "JP", region: "Kansai", latitude: 34.6937, longitude: 135.5023 },
  // P
  { id: "hub_par", name: "Paris", displayName: "Paris, Île-de-France, France", country: "France", countryCode: "FR", region: "Île-de-France", latitude: 48.8566, longitude: 2.3522 },
  { id: "hub_prg", name: "Prague", displayName: "Prague, Czech Republic", country: "Czech Republic", countryCode: "CZ", region: "Prague", latitude: 50.0755, longitude: 14.4378 },
  { id: "hub_hkt", name: "Phuket", displayName: "Phuket, Thailand", country: "Thailand", countryCode: "TH", region: "Phuket", latitude: 7.8804, longitude: 98.3923 },
  { id: "hub_pnq", name: "Pune", displayName: "Pune, Maharashtra, India", country: "India", countryCode: "IN", region: "Maharashtra", latitude: 18.5204, longitude: 73.8567 },
  // R
  { id: "hub_rom", name: "Rome", displayName: "Rome, Lazio, Italy", country: "Italy", countryCode: "IT", region: "Lazio", latitude: 41.9028, longitude: 12.4964 },
  { id: "hub_rio", name: "Rio de Janeiro", displayName: "Rio de Janeiro, Brazil", country: "Brazil", countryCode: "BR", region: "Rio de Janeiro", latitude: -22.9068, longitude: -43.1729 },
  { id: "hub_rik", name: "Rishikesh", displayName: "Rishikesh, Uttarakhand, India", country: "India", countryCode: "IN", region: "Uttarakhand", latitude: 30.0869, longitude: 78.2676 },
  // S
  { id: "hub_sin", name: "Singapore", displayName: "Singapore, Singapore", country: "Singapore", countryCode: "SG", region: "Singapore", latitude: 1.3521, longitude: 103.8198 },
  { id: "hub_syd", name: "Sydney", displayName: "Sydney, New South Wales, Australia", country: "Australia", countryCode: "AU", region: "New South Wales", latitude: -33.8688, longitude: 151.2093 },
  { id: "hub_sfo", name: "San Francisco", displayName: "San Francisco, California, United States", country: "United States", countryCode: "US", region: "California", latitude: 37.7749, longitude: -122.4194 },
  { id: "hub_sml", name: "Shimla", displayName: "Shimla, Himachal Pradesh, India", country: "India", countryCode: "IN", region: "Himachal Pradesh", latitude: 31.1048, longitude: 77.1734 },
  // T
  { id: "hub_tyo", name: "Tokyo", displayName: "Tokyo, Kanto, Japan", country: "Japan", countryCode: "JP", region: "Kanto", latitude: 35.6762, longitude: 139.6503 },
  { id: "hub_yto", name: "Toronto", displayName: "Toronto, Ontario, Canada", country: "Canada", countryCode: "CA", region: "Ontario", latitude: 43.6532, longitude: -79.3832 },
  // U
  { id: "hub_udr", name: "Udaipur", displayName: "Udaipur, Rajasthan, India", country: "India", countryCode: "IN", region: "Rajasthan", latitude: 24.5854, longitude: 73.7125 },
  // V
  { id: "hub_vce", name: "Venice", displayName: "Venice, Veneto, Italy", country: "Italy", countryCode: "IT", region: "Veneto", latitude: 45.4408, longitude: 12.3155 },
  { id: "hub_vie", name: "Vienna", displayName: "Vienna, Austria", country: "Austria", countryCode: "AT", region: "Vienna", latitude: 48.2082, longitude: 16.3738 },
  { id: "hub_vns", name: "Varanasi", displayName: "Varanasi, Uttar Pradesh, India", country: "India", countryCode: "IN", region: "Uttar Pradesh", latitude: 25.3176, longitude: 82.9739 },
  // Z
  { id: "hub_zrh", name: "Zurich", displayName: "Zurich, Switzerland", country: "Switzerland", countryCode: "CH", region: "Zurich", latitude: 47.3769, longitude: 8.5417 },
];

export async function GET(req: NextRequest) {
  // 1. Rate Limiting for External Geocoding
  const rlBlock = await enforceRateLimit(req, { category: "PROVIDER_SEARCH" });
  if (rlBlock) return rlBlock;

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      return NextResponse.json([]);
    }

    // 2. Resource Limit (Query Length)
    if (q.length > 200) {
      return NextResponse.json(
        { error: "Query exceeds maximum allowed length of 200 characters." },
        { status: 400 },
      );
    }

    const qLower = q.toLowerCase();

    // 1. Single character search: Return curated hubs matching the initial letter
    if (q.length === 1) {
      const matches = CURATED_HUBS.filter((hub) =>
        hub.name.toLowerCase().startsWith(qLower),
      );
      return NextResponse.json(matches.slice(0, 10), {
        headers: { "Cache-Control": "public, max-age=3600" },
      });
    }

    // 2. Multi-character search (q.length >= 2)
    // Find any local curated hub matches
    const hubMatches = CURATED_HUBS.filter(
      (hub) =>
        hub.name.toLowerCase().includes(qLower) ||
        hub.displayName.toLowerCase().includes(qLower),
    );

    // Concurrently query TravelService for real geocoded destinations
    let liveDestinations: LocationCandidate[] = [];
    try {
      const results = await travelService.searchDestinations({ query: q, limit: 10 });
      liveDestinations = results.map((dest) => {
        const regionStr = dest.region ? `${dest.region}, ` : "";
        return {
          id: dest.id,
          name: dest.name,
          displayName: `${dest.name}, ${regionStr}${dest.country}`,
          country: dest.country,
          countryCode: dest.countryCode,
          region: dest.region,
          latitude: dest.latitude,
          longitude: dest.longitude,
          timezone: dest.timezone,
        };
      });
    } catch {
      // Fall through to hub matches
    }

    // Combine and deduplicate by normalized name + countryCode
    const seen = new Set<string>();
    const combined: LocationCandidate[] = [];

    // Prioritize exact or prefix matches from either source
    const all = [...liveDestinations, ...hubMatches];

    // Sort: items whose name starts with query come first
    all.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(qLower);
      const bStarts = b.name.toLowerCase().startsWith(qLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    });

    for (const item of all) {
      const key = `${item.name.toLowerCase()}_${item.countryCode.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }

    return NextResponse.json(combined.slice(0, 8), {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
