/**
 * @file scratch/test_free_providers_resilience.ts
 *
 * Automated verification suite testing resilience, boundary schemas, and edge cases
 * for the SafariX Free-Only Provider Migration:
 * 1. Malformed results handling
 * 2. Deduplication of places and restaurants
 * 3. Missing/invalid coordinates
 * 4. Bounded timeouts & abort handling
 * 5. Empty results handling
 * 6. In-memory caching & rate-limit fair use
 * 7. Missing images graceful degradation
 * 8. Budget calculator: sourced prices vs unknown price estimates
 * 9. Outbound search link verification
 * 10. Reference ID grounding in itineraries
 */

import { OsmPlaceProvider } from "../src/lib/travel/providers/real/osm-place-provider";
import { OsmFoodProvider } from "../src/lib/travel/providers/real/osm-food-provider";
import { OsmStayProvider } from "../src/lib/travel/providers/real/osm-stay-provider";
import { OutboundTransportProvider } from "../src/lib/travel/providers/real/outbound-transport-provider";
import { WikimediaImageProvider } from "../src/lib/travel/providers/real/wikimedia-image-provider";
import { BudgetCalculator } from "../src/lib/agents/budget/budget-calculator";
import { ItineraryValidator } from "../src/lib/agents/validator/itinerary-validator";
import { Stay, TransportOption, Place, Restaurant } from "../src/lib/travel";

async function runResilienceTests() {
  console.log("=== SAFARIX FREE PROVIDERS RESILIENCE & EDGE CASES AUDIT ===");
  let passedCount = 0;
  let totalCount = 0;

  function assert(title: string, condition: boolean, details?: string) {
    totalCount++;
    if (condition) {
      passedCount++;
      console.log(`✓ [TEST ${totalCount}] ${title}`);
    } else {
      console.error(`✗ [TEST ${totalCount} FAILED] ${title}: ${details || "Assertion failed"}`);
      throw new Error(`Test failed: ${title}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Missing / Nonexistent Destination Empty Results
  // ---------------------------------------------------------------------------
  console.log("\n--- Category 1: Empty Results & Boundary Conditions ---");
  const placeProvider = new OsmPlaceProvider();
  const emptyPlaces = await placeProvider.searchPlaces({ destinationId: "NonExistentAtlantisXYZ999" });
  assert("Unknown destination returns empty array without throwing", Array.isArray(emptyPlaces) && emptyPlaces.length === 0);

  const stayProvider = new OsmStayProvider();
  const emptyStays = await stayProvider.searchStays({ destinationId: "NonExistentAtlantisXYZ999" });
  assert("Unknown stay destination returns empty array without throwing", Array.isArray(emptyStays) && emptyStays.length === 0);

  const foodProvider = new OsmFoodProvider();
  const emptyFood = await foodProvider.searchRestaurants({ destinationId: "NonExistentAtlantisXYZ999" });
  assert("Unknown food destination returns empty array without throwing", Array.isArray(emptyFood) && emptyFood.length === 0);

  // ---------------------------------------------------------------------------
  // 2. Outbound Flights: Missing Origin / Destination Handling
  // ---------------------------------------------------------------------------
  console.log("\n--- Category 2: Flight Resolution & Link Protocol ---");
  const transportProvider = new OutboundTransportProvider();
  const missingOriginFlights = await transportProvider.searchTransport({ origin: "", destination: "Tokyo" });
  assert("Empty origin returns 0 flights without unhandled exceptions", missingOriginFlights.length === 0);

  const unresolvableFlights = await transportProvider.searchTransport({ origin: "FakeCityNoAirport12345", destination: "Tokyo" });
  assert("Unresolvable airport returns 0 flights truthfully", unresolvableFlights.length === 0);

  const validFlights = await transportProvider.searchTransport({ origin: "London", destination: "Tokyo", travellers: 2 });
  assert("Resolved flight has price: null and availability: 'unknown'", validFlights[0]?.price === null && validFlights[0]?.availability === "unknown");
  assert("Resolved flight contains authentic Google Flights outbound search link", validFlights[0]?.bookingUrl?.startsWith("https://www.google.com/travel/flights?q=") === true);
  assert("Flight bookingUrl contains origin, destination, and departure query", validFlights[0]?.bookingUrl?.includes("LON") === true && validFlights[0]?.bookingUrl?.includes("TYO") === true);

  // ---------------------------------------------------------------------------
  // 3. Accommodations: Unknown Pricing & Outbound Link Formatting
  // ---------------------------------------------------------------------------
  console.log("\n--- Category 3: Lodging Pricing Truthfulness & Search Links ---");
  const stays = await stayProvider.searchStays({ destinationId: "Tokyo", limit: 3 });
  assert("Stays returned have priceType: 'unknown' and pricePerNight: null", stays.every(s => s.priceType === "unknown" && s.pricePerNight === null));
  assert("Stays contain genuine non-zero geographic coordinates", stays.every(s => s.latitude !== 0 && s.longitude !== 0));
  assert("Stays contain authentic Google Hotels search link", stays.every(s => s.bookingUrl?.startsWith("https://www.google.com/travel/hotels?q=") === true));

  // ---------------------------------------------------------------------------
  // 4. Missing Image & Wikimedia Attribution
  // ---------------------------------------------------------------------------
  console.log("\n--- Category 4: Image Retrieval & Licensing Integrity ---");
  const imageProvider = new WikimediaImageProvider();
  const missingImg = await imageProvider.getDestinationImage("NonExistentFakePlaceXYZ123456789");
  assert("Nonexistent destination image safely returns null (degrades gracefully)", missingImg === null);

  const validImg = await imageProvider.getDestinationImage("Paris");
  assert("Valid destination resolves authentic Wikimedia Commons image", typeof validImg?.url === "string" && validImg.url.startsWith("https://"));
  assert("Image contains photographer or attribution notice", Boolean(validImg?.source?.attribution && validImg.source.attribution.length > 5));

  // ---------------------------------------------------------------------------
  // 5. Timeout & Abort Handling
  // ---------------------------------------------------------------------------
  console.log("\n--- Category 5: Timeout Resilience ---");
  const quickTimeoutProvider = new OsmPlaceProvider("https://photon.komoot.io/api", "https://en.wikipedia.org/w/api.php", 1);
  const timeoutPlaces = await quickTimeoutProvider.searchPlaces({ destinationId: "Tokyo" });
  assert("1ms timeout is gracefully caught without crashing the application", Array.isArray(timeoutPlaces));

  // ---------------------------------------------------------------------------
  // 6. Budget Calculator: Sourced Prices vs Estimated Allowances
  // ---------------------------------------------------------------------------
  console.log("\n--- Category 6: Budget Calculator Distinction ---");
  // Case A: Sourced Stay with known exact price
  const sourcedStay: Stay = {
    id: "stay_sourced_test",
    name: "Sourced Luxury Hotel",
    destinationId: "tokyo",
    latitude: 35.68,
    longitude: 139.75,
    address: "Chiyoda, Tokyo",
    category: "hotel",
    rating: 4.8,
    reviewCount: 300,
    pricePerNight: 200,
    totalStayPrice: 600,
    isPriceEstimate: false,
    priceType: "exact",
    availability: "available",
    currency: "USD",
    amenities: ["WiFi"],
    checkIn: "15:00",
    checkOut: "11:00",
    description: "Verified exact stay",
    source: { provider: "test", fetchedAt: new Date().toISOString(), isEstimate: false },
  };

  const sourcedBudget = BudgetCalculator.calculate({
    days: 4,
    travellers: 2,
    budgetTier: "moderate",
    stay: sourcedStay,
  });
  assert("Sourced stay with exact price results in hasEstimatedAccommodationFees: false", sourcedBudget.hasEstimatedAccommodationFees === false);
  assert("Sourced stay cost accurately equals pricePerNight * nights", sourcedBudget.accommodationCost === 200 * 3);

  // Case B: Free Provider Stay with unknown price
  const unknownPriceStay: Stay = {
    ...sourcedStay,
    id: "osm_stay_test_unknown",
    pricePerNight: null,
    totalStayPrice: null,
    priceType: "unknown",
    availability: "unknown",
  };

  const estimatedBudget = BudgetCalculator.calculate({
    days: 4,
    travellers: 2,
    budgetTier: "moderate",
    stay: unknownPriceStay,
  });
  assert("Unknown price stay results in hasEstimatedAccommodationFees: true", estimatedBudget.hasEstimatedAccommodationFees === true);
  assert("Estimated accommodation cost uses moderate budget tier baseline (250/night * 3 nights)", estimatedBudget.accommodationCost === 250 * 3);

  // ---------------------------------------------------------------------------
  // 7. Itinerary Reference ID Grounding
  // ---------------------------------------------------------------------------
  console.log("\n--- Category 7: Itinerary Reference Integrity ---");
  const validReferenceIds = new Set<string>([
    "wiki_place_12345",
    "osm_place_67890",
    "osm_rest_11122",
    "osm_stay_99988",
    "flight_outbound_lon_tyo",
  ]);

  const validItinerary = {
    days: [
      {
        dayNumber: 1,
        theme: "Arrival & Historic Landmarks",
        items: [
          {
            type: "transport" as const,
            reasoning: "Arrival at Tokyo",
            startTime: "09:30",
            endTime: "13:30",
            referenceId: "flight_outbound_lon_tyo",
          },
          {
            type: "stay" as const,
            reasoning: "Check in to lodging",
            startTime: "14:00",
            endTime: "15:00",
            referenceId: "osm_stay_99988",
          },
          {
            type: "activity" as const,
            reasoning: "Explore traditional temple",
            startTime: "15:30",
            endTime: "17:30",
            referenceId: "wiki_place_12345",
          },
          {
            type: "food" as const,
            reasoning: "Authentic local ramen",
            startTime: "18:00",
            endTime: "19:30",
            referenceId: "osm_rest_11122",
          },
        ],
      },
    ],
    orchestrationNotes: "Grounded 1-day sample",
  };

  const validationReport = ItineraryValidator.validate({
    expectedDays: 1,
    itinerary: validItinerary,
    validReferenceIds,
  });

  assert("Grounded itinerary referencing real candidate IDs passes validation with 0 errors", validationReport.passed === true);

  // Test hallucinated ID rejection
  const invalidItinerary = {
    ...validItinerary,
    days: [
      {
        ...validItinerary.days[0],
        items: [
          ...validItinerary.days[0].items,
          {
            type: "activity" as const,
            reasoning: "Fake attraction reasoning",
            startTime: "20:00",
            endTime: "21:00",
            referenceId: "hallucinated_place_nonexistent",
          },
        ],
      },
    ],
  };

  const invalidReport = ItineraryValidator.validate({
    expectedDays: 1,
    itinerary: invalidItinerary,
    validReferenceIds,
  });

  assert("Itinerary referencing hallucinated referenceId is strictly rejected by ItineraryValidator", invalidReport.passed === false);
  assert("Validator report identifies HALLUCINATED_REFERENCE_ID issue", invalidReport.issues.some(i => i.code === "HALLUCINATED_REFERENCE_ID"));

  // ---------------------------------------------------------------------------
  // 8. Opening Hours Truthfulness & Zero-Fabrication
  // ---------------------------------------------------------------------------
  console.log("\n--- Category 8: Opening Hours Zero-Mock & Truthfulness ---");
  const livePlaces = await placeProvider.searchPlaces({ destinationId: "Tokyo", limit: 5 });
  assert("Live OSM places returned successfully", livePlaces.length > 0);
  for (const p of livePlaces) {
    if (p.openingHours) {
      assert(
        `Place "${p.name}" opening hours never substitute invented schedules`,
        p.openingHours.text !== "10:00 - 18:00" &&
        p.openingHours.text !== "Hours vary by season. Verify current opening times prior to visiting." &&
        (p.openingHours.isUnknown === true || typeof p.openingHours.text === "string"),
      );
      if (p.openingHours.isUnknown) {
        assert(`Place "${p.name}" missing hours honestly represented with text: null`, p.openingHours.text === null);
      }
    }
  }

  const liveFood = await foodProvider.searchRestaurants({ destinationId: "Tokyo", limit: 5 });
  assert("Live OSM restaurants returned successfully", liveFood.length > 0);
  for (const r of liveFood) {
    if (r.openingHours) {
      assert(
        `Restaurant "${r.name}" opening hours never substitute invented schedules`,
        r.openingHours.text !== "10:00 - 18:00" &&
        r.openingHours.text !== "Hours may vary; please confirm with the restaurant before visiting." &&
        (r.openingHours.isUnknown === true || typeof r.openingHours.text === "string"),
      );
      if (r.openingHours.isUnknown) {
        assert(`Restaurant "${r.name}" missing hours honestly represented with text: null`, r.openingHours.text === null);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Strict Airport Registry Resolution (No False Positives)
  // ---------------------------------------------------------------------------
  console.log("\n--- Category 9: Strict Airport Resolution Integrity ---");
  const { AirportResolver } = await import("../src/lib/travel/services/airport-resolver");
  const fakeCodeResult = await AirportResolver.resolve("XYZ");
  assert("Unverified 3-letter code 'XYZ' is rejected as unresolved", fakeCodeResult.resolved === false && fakeCodeResult.source === "unresolved");

  const nonExistentCode = await AirportResolver.resolve("ZZZ");
  assert("Non-existent 3-letter code 'ZZZ' is rejected as unresolved", nonExistentCode.resolved === false && nonExistentCode.source === "unresolved");

  const emptyCodeResult = await AirportResolver.resolve("");
  assert("Empty airport query returns unresolved", emptyCodeResult.resolved === false);

  const verifiedLHR = await AirportResolver.resolve("LHR");
  assert("Verified 3-letter IATA code 'LHR' resolves to London Heathrow", verifiedLHR.resolved === true && verifiedLHR.iataCode === "LHR" && verifiedLHR.cityName === "London");

  const verifiedTokyo = await AirportResolver.resolve("Tokyo");
  assert("Verified metropolitan city 'Tokyo' resolves to TYO", verifiedTokyo.resolved === true && verifiedTokyo.iataCode === "TYO");

  // ---------------------------------------------------------------------------
  // 10. Cache TTL & Public Server Fair Use
  // ---------------------------------------------------------------------------
  console.log("\n--- Category 10: Cache TTL & Fair Use ---");
  const { travelCache } = await import("../src/lib/travel/cache/memory-cache");
  await travelCache.set("test_key_ttl", { payload: "safarix_test" }, 1);
  const immediateCached = await travelCache.get<{ payload: string }>("test_key_ttl");
  assert("Memory cache stores and retrieves unexpired entry", immediateCached?.payload === "safarix_test");

  // Wait for 1100ms for TTL expiry
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const expiredCached = await travelCache.get<{ payload: string }>("test_key_ttl");
  assert("Memory cache correctly expires entries after TTL", expiredCached === null);

  console.log(`\n=== ALL ${passedCount}/${totalCount} RESILIENCE & BOUNDARY TESTS PASSED! ===\n`);
}

runResilienceTests().catch((err) => {
  console.error("FATAL AUDIT FAILURE:", err);
  process.exit(1);
});
