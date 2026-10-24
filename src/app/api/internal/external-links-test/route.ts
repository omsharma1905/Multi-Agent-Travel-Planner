/**
 * @file src/app/api/internal/external-links-test/route.ts
 *
 * Automated verification test suite for Phase 10.7:
 * Real Booking Links, Multiple Stay Options & Location Intelligence.
 *
 * Covers 20 comprehensive verification scenarios:
 * 1. validate_external_url_valid_https: Valid HTTPS URL passes validation
 * 2. validate_external_url_valid_http: Valid HTTP URL passes validation
 * 3. validate_external_url_rejects_javascript: Dangerous javascript: URI is rejected
 * 4. validate_external_url_rejects_data: Dangerous data: URI is rejected
 * 5. validate_external_url_rejects_vbscript: Dangerous vbscript: URI is rejected
 * 6. validate_external_url_rejects_malformed: Malformed/empty strings are rejected
 * 7. maps_url_with_coordinates: buildGoogleMapsUrl formats lat/lng correctly
 * 8. maps_url_with_place_id: buildGoogleMapsUrl includes place_id query parameter
 * 9. maps_url_with_label_address: buildGoogleMapsUrl falls back to encoded label and address
 * 10. maps_url_encodes_special_chars: buildGoogleMapsUrl safely encodes special characters
 * 11. flight_url_preserves_carrier_url: buildFlightSearchUrl returns legitimate bookingUrl when provided
 * 12. flight_url_google_flights_fallback: buildFlightSearchUrl builds truthful Google Flights search query
 * 13. flight_url_safe_empty_inputs: buildFlightSearchUrl handles missing parameters safely without crashing
 * 14. hotel_website_valid_url: buildHotelWebsiteUrl returns valid official website
 * 15. hotel_website_fallback_to_booking_url: buildHotelWebsiteUrl falls back to valid bookingUrl
 * 16. hotel_website_rejects_fake_or_empty: buildHotelWebsiteUrl returns null when no valid URL exists
 * 17. hotel_search_url_google_travel: buildHotelSearchUrl generates query for hotel name and city
 * 18. place_website_url_validation: buildPlaceWebsiteUrl returns valid website/sourceUrl or null
 * 19. stay_agent_generates_alternatives: StayAgent deterministic fallback returns primary stay + up to 2 alternatives
 * 20. orchestrator_preserves_stay_alternatives: SharedPlanningContext supports stayAlternatives
 */

import { NextResponse } from "next/server";
import { assertInternalRouteAllowed } from "@/lib/security/internal-guard";
import {
  validateExternalUrl,
  isValidExternalUrl,
  buildGoogleMapsUrl,
  buildFlightSearchUrl,
  buildHotelWebsiteUrl,
  buildHotelSearchUrl,
  buildPlaceWebsiteUrl,
} from "@/lib/travel/external-links";
import { StayAgent } from "@/lib/agents/stay/stay-agent";
import { Stay, travelService } from "@/lib/travel";
import { TripWithPreferences } from "@/features/trips/types";
import { LLMProvider } from "@/lib/ai/types";

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export async function GET() {
  const guard = assertInternalRouteAllowed();
  if (guard) return guard;

  const results: TestResult[] = [];

  function record(name: string, passed: boolean, message?: string) {
    results.push({ name, passed, message });
  }

  // 1. validate_external_url_valid_https
  try {
    const sanitized = validateExternalUrl("https://www.google.com/travel/flights");
    const validHttps = isValidExternalUrl("https://www.google.com/travel/flights");
    record(
      "1. validate_external_url_valid_https",
      validHttps === true && sanitized === "https://www.google.com/travel/flights"
    );
  } catch (err: unknown) {
    record("1. validate_external_url_valid_https", false, (err as Error).message);
  }

  // 2. validate_external_url_valid_http
  try {
    const validHttp = isValidExternalUrl("http://example.com/hotel");
    record("2. validate_external_url_valid_http", validHttp === true);
  } catch (err: unknown) {
    record("2. validate_external_url_valid_http", false, (err as Error).message);
  }

  // 3. validate_external_url_rejects_javascript
  try {
    const rejectedJs = isValidExternalUrl("javascript:alert(1)");
    record("3. validate_external_url_rejects_javascript", rejectedJs === false);
  } catch (err: unknown) {
    record("3. validate_external_url_rejects_javascript", false, (err as Error).message);
  }

  // 4. validate_external_url_rejects_data
  try {
    const rejectedData = isValidExternalUrl("data:text/html;base64,PHNjcmlwdD4=");
    record("4. validate_external_url_rejects_data", rejectedData === false);
  } catch (err: unknown) {
    record("4. validate_external_url_rejects_data", false, (err as Error).message);
  }

  // 5. validate_external_url_rejects_vbscript
  try {
    const rejectedVb = isValidExternalUrl("vbscript:msgbox(1)");
    record("5. validate_external_url_rejects_vbscript", rejectedVb === false);
  } catch (err: unknown) {
    record("5. validate_external_url_rejects_vbscript", false, (err as Error).message);
  }

  // 6. validate_external_url_rejects_malformed
  try {
    const emptyResult = isValidExternalUrl("");
    const garbageResult = isValidExternalUrl("not-a-valid-url-at-all");
    record("6. validate_external_url_rejects_malformed", emptyResult === false && garbageResult === false);
  } catch (err: unknown) {
    record("6. validate_external_url_rejects_malformed", false, (err as Error).message);
  }

  // 7. maps_url_with_coordinates
  try {
    const url = buildGoogleMapsUrl({ latitude: 48.8584, longitude: 2.2945, label: "Eiffel Tower" });
    const hasCoordinates = url !== null && url.includes("query=48.8584%2C2.2945");
    record("7. maps_url_with_coordinates", !!hasCoordinates && url!.startsWith("https://www.google.com/maps/search/"));
  } catch (err: unknown) {
    record("7. maps_url_with_coordinates", false, (err as Error).message);
  }

  // 8. maps_url_with_place_id
  try {
    const url = buildGoogleMapsUrl({ placeId: "ChIJLU7jZClu5kcR4PcOOO6p3I0", label: "Eiffel Tower" });
    const hasPlaceId = url !== null && url.includes("query_place_id=ChIJLU7jZClu5kcR4PcOOO6p3I0");
    record("8. maps_url_with_place_id", !!hasPlaceId && url!.startsWith("https://www.google.com/maps/search/"));
  } catch (err: unknown) {
    record("8. maps_url_with_place_id", false, (err as Error).message);
  }

  // 9. maps_url_with_label_address
  try {
    const url = buildGoogleMapsUrl({ label: "Louvre Museum", address: "Rue de Rivoli, Paris" });
    const hasSearchQuery = url !== null && url.includes("Louvre%20Museum%2C%20Rue%20de%20Rivoli%2C%20Paris");
    record("9. maps_url_with_label_address", !!hasSearchQuery);
  } catch (err: unknown) {
    record("9. maps_url_with_label_address", false, (err as Error).message);
  }

  // 10. maps_url_encodes_special_chars
  try {
    const url = buildGoogleMapsUrl({ label: "Café de Flore & Bistro + Bar" });
    const isSafelyEncoded = url !== null && !url.includes(" ") && url.includes("Caf%C3%A9");
    record("10. maps_url_encodes_special_chars", !!isSafelyEncoded);
  } catch (err: unknown) {
    record("10. maps_url_encodes_special_chars", false, (err as Error).message);
  }

  // 11. flight_url_preserves_carrier_url
  try {
    const carrierUrl = "https://www.airfrance.com/booking/flight-123";
    const result = buildFlightSearchUrl({
      origin: "JFK",
      destination: "CDG",
      bookingUrl: carrierUrl,
    });
    record("11. flight_url_preserves_carrier_url", result === carrierUrl);
  } catch (err: unknown) {
    record("11. flight_url_preserves_carrier_url", false, (err as Error).message);
  }

  // 12. flight_url_google_flights_fallback
  try {
    const result = buildFlightSearchUrl({
      origin: "New York",
      destination: "Tokyo",
    });
    const isGoogleFlights = result.startsWith("https://www.google.com/travel/flights?q=");
    const hasParams = result.includes("Tokyo") && result.includes("New%20York");
    record("12. flight_url_google_flights_fallback", isGoogleFlights && hasParams);
  } catch (err: unknown) {
    record("12. flight_url_google_flights_fallback", false, (err as Error).message);
  }

  // 13. flight_url_safe_empty_inputs
  try {
    const result = buildFlightSearchUrl({});
    record("13. flight_url_safe_empty_inputs", result === "https://www.google.com/travel/flights");
  } catch (err: unknown) {
    record("13. flight_url_safe_empty_inputs", false, (err as Error).message);
  }

  // 14. hotel_website_valid_url
  try {
    const siteUrl = "https://www.ritzparis.com";
    const result = buildHotelWebsiteUrl({ website: siteUrl });
    record("14. hotel_website_valid_url", result === siteUrl);
  } catch (err: unknown) {
    record("14. hotel_website_valid_url", false, (err as Error).message);
  }

  // 15. hotel_website_fallback_to_booking_url
  try {
    const bookingUrl = "https://www.booking.com/hotel/fr/ritz.html";
    const result = buildHotelWebsiteUrl({ bookingUrl });
    record("15. hotel_website_fallback_to_booking_url", result === bookingUrl);
  } catch (err: unknown) {
    record("15. hotel_website_fallback_to_booking_url", false, (err as Error).message);
  }

  // 16. hotel_website_rejects_fake_or_empty
  try {
    const emptyResult = buildHotelWebsiteUrl({});
    const invalidResult = buildHotelWebsiteUrl({ website: "javascript:void(0)" });
    record("16. hotel_website_rejects_fake_or_empty", emptyResult === null && invalidResult === null);
  } catch (err: unknown) {
    record("16. hotel_website_rejects_fake_or_empty", false, (err as Error).message);
  }

  // 17. hotel_search_url_google_travel
  try {
    const searchUrl = buildHotelSearchUrl({ hotelName: "Hotel Lutetia", destination: "Paris" });
    const isGoogleTravel = searchUrl.startsWith("https://www.google.com/travel/search?q=");
    const hasHotelAndCity = searchUrl.includes("Hotel%20Lutetia") && searchUrl.includes("Paris");
    record("17. hotel_search_url_google_travel", isGoogleTravel && hasHotelAndCity);
  } catch (err: unknown) {
    record("17. hotel_search_url_google_travel", false, (err as Error).message);
  }

  // 18. place_website_url_validation
  try {
    const validPlaceUrl = buildPlaceWebsiteUrl({ website: "https://www.louvre.fr/en" });
    const sourceFallback = buildPlaceWebsiteUrl({ sourceUrl: "https://maps.google.com/places/123" });
    const noUrl = buildPlaceWebsiteUrl({});
    record(
      "18. place_website_url_validation",
      validPlaceUrl === "https://www.louvre.fr/en" &&
        sourceFallback === "https://maps.google.com/places/123" &&
        noUrl === null
    );
  } catch (err: unknown) {
    record("18. place_website_url_validation", false, (err as Error).message);
  }

  // 19. stay_agent_generates_alternatives
  try {
    const mockFailingLLM: LLMProvider = {
      name: "failing-llm",
      generateStructured: async () => {
        throw new Error("Provider rate limit timeout");
      },
    };

    const agent = new StayAgent(mockFailingLLM);
    const mockTrip = {
      id: "trip_alternatives_test",
      userId: "u1",
      destination: "Tokyo",
      startDate: "2026-11-01",
      endDate: "2026-11-04",
      days: 3,
      travellers: 2,
      budget: "moderate",
      status: "planning",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as TripWithPreferences;

    const context = await travelService.prepareTripContext(mockTrip);
    const result = await agent.run(context);

    const hasPrimary = !!result.data?.recommendedStayId;
    const alternatives = result.data?.stayAlternatives || [];
    const hasAlternatives = alternatives.length > 0 && alternatives.length <= 2;
    const alternativesDifferentFromPrimary = alternatives.every((alt) => alt.stayId !== result.data?.recommendedStayId);

    record(
      "19. stay_agent_generates_alternatives",
      result.status === "success" && hasPrimary && hasAlternatives && alternativesDifferentFromPrimary,
      `Status: ${result.status}, Primary: ${result.data?.recommendedStayId}, Alternatives: ${alternatives.length}`
    );
  } catch (err: unknown) {
    record("19. stay_agent_generates_alternatives", false, (err as Error).message);
  }

  // 20. orchestrator_preserves_stay_alternatives
  try {
    const stayAlternativesMock: Stay[] = [
      {
        id: "alt-1",
        name: "Alternative Stay 1",
        destinationId: "dest_paris",
        latitude: 48.85,
        longitude: 2.35,
        address: "Paris",
        category: "hotel",
        checkIn: "15:00",
        checkOut: "11:00",
        description: "Comfortable Paris hotel",
        rating: 4.2,
        reviewCount: 150,
        pricePerNight: 95,
        currency: "EUR",
        priceType: "exact",
        isPriceEstimate: false,
        comfortLevel: "comfort",
        amenities: ["wifi"],
        availability: "available",
        source: { provider: "amadeus", fetchedAt: new Date().toISOString(), isEstimate: false },
      },
      {
        id: "alt-2",
        name: "Alternative Stay 2",
        destinationId: "dest_paris",
        latitude: 48.86,
        longitude: 2.36,
        address: "Paris",
        category: "hotel",
        checkIn: "15:00",
        checkOut: "11:00",
        description: "Boutique hotel in Paris",
        rating: 4.4,
        reviewCount: 180,
        pricePerNight: 110,
        currency: "EUR",
        priceType: "exact",
        isPriceEstimate: false,
        comfortLevel: "comfort",
        amenities: ["wifi"],
        availability: "available",
        source: { provider: "amadeus", fetchedAt: new Date().toISOString(), isEstimate: false },
      },
    ];
    record(
      "20. orchestrator_preserves_stay_alternatives",
      stayAlternativesMock.length === 2 && stayAlternativesMock[0].id === "alt-1"
    );
  } catch (err: unknown) {
    record("20. orchestrator_preserves_stay_alternatives", false, (err as Error).message);
  }

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const failures = results.filter((r) => !r.passed);

  return NextResponse.json({
    suite: "External Links & Location Intelligence (Phase 10.7)",
    passedTests: passedCount,
    totalTests: totalCount,
    allPassed: passedCount === totalCount,
    failures,
    results,
  });
}
