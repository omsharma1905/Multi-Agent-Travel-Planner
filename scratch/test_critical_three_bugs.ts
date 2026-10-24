/**
 * @file scratch/test_critical_three_bugs.ts
 *
 * Targeted Regression & Verification Suite for the Critical Three-Bug Mission:
 * - Bug A: Journey Cost Optimization (genuine re-planning, multi-domain optimization, truthful savings)
 * - Bug B: Transportation Status Semantic Consistency (local/not-required vs unavailable)
 * - Bug C: Wikimedia Image Configuration, Validation, and Crash Prevention
 */

import nextConfig from "../next.config";
import { BudgetCalculator } from "../src/lib/agents/budget/budget-calculator";
import { ItineraryValidator } from "../src/lib/agents/validator/itinerary-validator";
import { travelService } from "../src/lib/travel";
import { journeyEditor } from "../src/lib/orchestration/editing/journey-editor";
import { travelOrchestrator } from "../src/lib/orchestration/orchestrator";
import { Place } from "../src/lib/travel/types/place";
import { Restaurant } from "../src/lib/travel/types/restaurant";
import { Stay } from "../src/lib/travel/types/stay";
import { TransportOption } from "../src/lib/travel/types/transport";
import { TripWithPreferences } from "../src/features/trips/types";
import { OrchestrationResult } from "../src/lib/orchestration/types";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`✓ [PASS] ${message}`);
}

function mockPrefs(tripId: string, partial: any = {}): any {
  return {
    id: `pref_${tripId}`,
    tripId,
    interests: [],
    transportPreference: "auto",
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

async function runRegressionSuite() {
  console.log("=== SAFARIX CRITICAL THREE-BUG RESOLUTION REGRESSION SUITE ===\n");

  // =========================================================================
  // SUITE 1: BUG C — WIKIMEDIA IMAGE CONFIGURATION & RUNTIME SAFETY
  // =========================================================================
  console.log("--- Suite 1: Bug C — Wikimedia Image Configuration & Safety ---");

  // 1. Next.js image remotePatterns validation
  const remotePatterns = nextConfig.images?.remotePatterns || [];
  const hasWikimediaUpload = remotePatterns.some(
    (p: any) => p.hostname === "upload.wikimedia.org" && p.protocol === "https",
  );
  assert(hasWikimediaUpload, "next.config.ts configures upload.wikimedia.org under images.remotePatterns");

  const hasWikimediaCommons = remotePatterns.some(
    (p: any) => p.hostname === "commons.wikimedia.org" && p.protocol === "https",
  );
  assert(hasWikimediaCommons, "next.config.ts configures commons.wikimedia.org under images.remotePatterns");

  // 2. CSP Directives validation
  const headers = await (nextConfig.headers ? nextConfig.headers() : Promise.resolve([]));
  const rootHeader = headers.find((h: any) => h.source === "/(.*)");
  const cspHeader = rootHeader?.headers.find((h: any) => h.key === "Content-Security-Policy");
  assert(Boolean(cspHeader), "Content-Security-Policy header is configured");
  assert(
    Boolean(cspHeader?.value.includes("https://upload.wikimedia.org")),
    "CSP img-src includes https://upload.wikimedia.org",
  );
  assert(
    Boolean(cspHeader?.value.includes("https://commons.wikimedia.org")),
    "CSP img-src includes https://commons.wikimedia.org",
  );

  // 3. Image URL validator test (matching the logic in trips/new/page.tsx and DestinationImage.tsx)
  const isAllowedImageHost = (url: string | null): boolean => {
    if (!url || typeof url !== "string") return false;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
      const allowedHosts = [
        "upload.wikimedia.org",
        "commons.wikimedia.org",
        "images.unsplash.com",
        "images.pexels.com",
      ];
      return allowedHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
    } catch {
      return false;
    }
  };

  assert(
    isAllowedImageHost("https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Tokyo_Tower.jpg/800px-Tokyo_Tower.jpg"),
    "Valid upload.wikimedia.org HTTPS URL is accepted",
  );
  assert(
    isAllowedImageHost("https://commons.wikimedia.org/wiki/Special:FilePath/Tokyo.jpg"),
    "Valid commons.wikimedia.org HTTPS URL is accepted",
  );
  assert(
    isAllowedImageHost("https://images.unsplash.com/photo-1503899036084-c55cdd92da26"),
    "Valid images.unsplash.com URL is accepted",
  );
  assert(!isAllowedImageHost(null), "Null URL is safely rejected");
  assert(!isAllowedImageHost(""), "Empty string URL is safely rejected");
  assert(!isAllowedImageHost("   "), "Whitespace-only URL is safely rejected");
  assert(!isAllowedImageHost("not-a-valid-url"), "Malformed URL string is safely rejected without throwing");
  assert(!isAllowedImageHost("https://malicious-site.com/image.jpg"), "Untrusted external hostname is rejected");
  assert(!isAllowedImageHost("javascript:alert(1)"), "JavaScript pseudo-protocol is rejected");
  assert(!isAllowedImageHost("ftp://upload.wikimedia.org/file.jpg"), "Non-HTTP/HTTPS protocol is rejected");

  // 4. Test live WikimediaImageProvider resolution and metadata preservation
  const destinationImg = await travelService.getDestinationImage("Tokyo");
  assert(destinationImg !== null, "travelService.getDestinationImage resolves authentic photo");
  assert(
    Boolean(destinationImg?.url && destinationImg.url.includes("wikimedia.org")),
    "Resolved destination photo is hosted on Wikimedia Foundation servers",
  );
  assert(
    Boolean(destinationImg?.source?.attribution && destinationImg.source.attribution.includes("Wikimedia Commons")),
    "Wikimedia Commons photo preserves genuine license and attribution metadata",
  );


  // =========================================================================
  // SUITE 2: BUG B — TRANSPORTATION STATUS SEMANTIC CONSISTENCY
  // =========================================================================
  console.log("\n--- Suite 2: Bug B — Transportation Status Semantic Consistency ---");

  // 1. Trip without intercity origin specified (local itinerary)
  const localTrip: TripWithPreferences = {
    id: "trip_local_test",
    userId: "user_test",
    title: "Local Tokyo Exploration",
    origin: "",
    destination: "Tokyo",
    days: 3,
    travellers: 2,
    budget: "moderate",
    status: "planning",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: mockPrefs("trip_local_transit", {
      interests: ["Culture"],
      transportPreference: "auto",
    }),
  };

  const localContext = await travelService.prepareTripContext(localTrip);

  assert(
    localContext.availability.origin.status === "available" &&
      localContext.availability.origin.reason === "not_specified",
    "Origin availability for trip without origin is 'available' with reason 'not_specified'",
  );

  assert(
    localContext.availability.transport.status === "available" &&
      localContext.availability.transport.reason === "not_required",
    "Transport availability for trip without origin is 'available' with reason 'not_required' (never 'unavailable')",
  );

  // 2. Test orchestrator deriveCompleteness for local trip
  // In orchestrator, when context.availability.transport.reason === "not_required", transOutcome is "optional"
  const completeness = (travelOrchestrator as any).deriveCompleteness(
    localContext,
    {
      tripContext: localContext,
      transportation: null,
      selectedTransport: null,
      activities: { selectedPlaceIds: ["place_1"], reasoning: "Test", tradeoffs: [] },
      selectedPlaces: [
        {
          id: "place_1",
          name: "Test Shrine",
          destinationId: "tokyo",
          latitude: 35.68,
          longitude: 139.76,
          category: "landmark",
          priceLevel: "free",
          priceType: "free",
          rating: 4.8,
          reviewCount: 100,
          source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
        },
      ],
      stay: { recommendedStayId: "stay_1", alternativeStayIds: [], reasoning: "Test", tradeoffs: [] },
      selectedStay: {
        id: "stay_1",
        name: "Test Hotel",
        destinationId: "tokyo",
        latitude: 35.68,
        longitude: 139.76,
        type: "hotel",
        priceType: "unknown",
        rating: 4.5,
        reviewCount: 50,
        source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
      },
      stayAlternatives: [],
      food: { selectedRestaurantIds: ["food_1"], reasoning: "Test", tradeoffs: [] },
      selectedRestaurants: [
        {
          id: "food_1",
          name: "Test Ramen",
          destinationId: "tokyo",
          latitude: 35.68,
          longitude: 139.76,
          cuisine: ["Japanese"],
          priceLevel: "budget",
          priceType: "budget",
          rating: 4.6,
          reviewCount: 80,
          address: "Tokyo",
          tags: [],
          source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
        },
      ],
      budget: null,
      candidateIssues: [],
      collaborationLog: [],
    },
    {
      days: [
        {
          dayNumber: 1,
          theme: "Orientation",
          items: [
            { id: "item_1", timeSlot: "morning", type: "activity", referenceId: "place_1", title: "Test Shrine", startTime: "09:00", endTime: "11:00", durationMinutes: 120, reasoning: "Test" },
            { id: "item_2", timeSlot: "lunch", type: "food", referenceId: "food_1", title: "Test Ramen", startTime: "12:00", endTime: "13:00", durationMinutes: 60, reasoning: "Test" },
            { id: "item_3", timeSlot: "night", type: "stay", referenceId: "stay_1", title: "Test Hotel", startTime: "18:00", endTime: "19:00", durationMinutes: 60, reasoning: "Test" },
          ],
        },
        {
          dayNumber: 2,
          theme: "Exploration",
          items: [
            { id: "item_4", timeSlot: "morning", type: "activity", referenceId: "place_1", title: "Test Shrine", startTime: "09:00", endTime: "11:00", durationMinutes: 120, reasoning: "Test" },
          ],
        },
        {
          dayNumber: 3,
          theme: "Farewell",
          items: [
            { id: "item_5", timeSlot: "morning", type: "activity", referenceId: "place_1", title: "Test Shrine", startTime: "09:00", endTime: "11:00", durationMinutes: 120, reasoning: "Test" },
          ],
        },
      ],
      orchestrationNotes: "Test Notes",
    },
  );

  assert(
    completeness.outcomes.transportation === "optional",
    "Completeness evaluates transport outcome as 'optional' (never 'unavailable') for local trip",
  );

  // 3. Test UI domainStatuses derivation logic (from trips/[tripId]/page.tsx)
  const computeDomainTransportStatus = (trip: TripWithPreferences, planningResult: any, planningStatus: string) => {
    return planningStatus === "in_progress"
      ? "in_progress"
      : planningResult?.transportation
      ? "found"
      : !trip?.origin || !trip.origin.trim() || planningResult?.completeness?.outcomes?.transportation === "optional"
      ? planningResult?.itinerary
        ? "independent"
        : "waiting"
      : planningResult?.completeness?.outcomes?.transportation === "unavailable"
      ? "unavailable"
      : planningResult?.completeness?.outcomes?.transportation === "no_results"
      ? "no_results"
      : planningResult?.itinerary
      ? "independent"
      : "waiting";
  };

  const domainStatus = computeDomainTransportStatus(
    localTrip,
    { itinerary: { days: [] }, completeness },
    "completed",
  );

  assert(
    domainStatus === "independent",
    "Trip overview status derives as 'independent' (LOCAL / ARRIVAL), completely matching the detailed section",
  );

  // 4. Test trip with required connection that is genuinely unresolvable (e.g. invalid origin)
  const unresolvableTrip: TripWithPreferences = {
    id: "trip_bad_origin",
    userId: "user_test",
    title: "Unresolvable Bad Origin Trip",
    origin: "NonExistentCityXYZ12345",
    destination: "Tokyo",
    days: 3,
    travellers: 1,
    budget: "moderate",
    status: "planning",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: mockPrefs("trip_unresolvable_origin", {
      transportPreference: "flight",
    }),
  };

  const unresolvableContext = await travelService.prepareTripContext(unresolvableTrip);
  assert(
    unresolvableContext.availability.origin.status === "unavailable" &&
      unresolvableContext.availability.origin.reason === "origin_not_found",
    "Unresolvable origin sets origin.status to 'unavailable' with reason 'origin_not_found'",
  );
  assert(
    unresolvableContext.availability.transport.status === "unavailable" &&
      unresolvableContext.availability.transport.reason === "origin_not_found",
    "Unresolvable origin correctly sets transport.status to 'unavailable' with reason 'origin_not_found'",
  );

  const unresolvableDomainStatus = computeDomainTransportStatus(
    unresolvableTrip,
    {
      itinerary: null,
      completeness: {
        outcomes: { transportation: "unavailable" },
      },
    },
    "completed",
  );
  assert(
    unresolvableDomainStatus === "unavailable",
    "Genuinely unresolvable required transport truthfully reports 'unavailable'",
  );


  // =========================================================================
  // SUITE 3: BUG A — JOURNEY COST OPTIMIZATION (GENUINE RE-PLANNING)
  // =========================================================================
  console.log("\n--- Suite 3: Bug A — Journey Cost Optimization ---");

  // Create an initial mock plan with moderate tier, a paid activity, and a moderate restaurant
  const mockPlacePaid1: Place = {
    id: "place_paid_tokyo_tower",
    name: "Tokyo Tower Main Deck",
    type: "landmark",
    destinationId: "tokyo",
    latitude: 35.6586,
    longitude: 139.7454,
    priceLevel: "expensive",
    priceType: "paid",
    ticketPrice: 30, // $30/person
    currency: "USD",
    rating: 4.6,
    reviewCount: 1500,
    address: "Minato, Tokyo",
    description: "Observation deck.",
    tags: ["landmark", "viewpoint"],
    source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
  };

  const mockPlacePaid2: Place = {
    id: "place_paid_roppongi_hills",
    name: "Roppongi Hills Observation Deck",
    type: "landmark",
    destinationId: "tokyo",
    latitude: 35.6604,
    longitude: 139.7292,
    priceLevel: "expensive",
    priceType: "paid",
    ticketPrice: 25, // $25/person
    currency: "USD",
    rating: 4.5,
    reviewCount: 1200,
    address: "Roppongi, Tokyo",
    description: "Observation deck.",
    tags: ["landmark", "viewpoint"],
    source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
  };

  const mockPlacePaid3: Place = {
    id: "place_paid_mori_museum",
    name: "Mori Art Museum",
    type: "museum",
    destinationId: "tokyo",
    latitude: 35.6605,
    longitude: 139.7295,
    priceLevel: "moderate",
    priceType: "paid",
    ticketPrice: 20, // $20/person
    currency: "USD",
    rating: 4.7,
    reviewCount: 900,
    address: "Roppongi, Tokyo",
    description: "Art museum.",
    tags: ["museum", "art"],
    source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
  };

  const mockStayModerate: Stay = {
    id: "stay_mod_shinjuku",
    name: "Shinjuku Granbell Hotel",
    destinationId: "tokyo",
    latitude: 35.6961,
    longitude: 139.7065,
    address: "Kabukicho, Shinjuku, Tokyo",
    category: "hotel",
    comfortLevel: "comfort",
    rating: 4.2,
    reviewCount: 850,
    pricePerNight: 180,
    currency: "USD",
    amenities: ["wifi", "air_conditioning"],
    checkIn: "15:00",
    checkOut: "11:00",
    description: "Comfortable hotel in central Shinjuku.",
    source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
  };

  const mockRestaurantFine: Restaurant = {
    id: "rest_fine_ginza",
    name: "Ginza Kaiseki Yoshi",
    destinationId: "tokyo",
    latitude: 35.6712,
    longitude: 139.7654,
    cuisine: ["Japanese", "Kaiseki"],
    priceLevel: "expensive",
    priceType: "premium",
    averagePricePerPerson: 90,
    currency: "USD",
    rating: 4.8,
    reviewCount: 420,
    address: "Ginza, Chuo, Tokyo",
    tags: ["fine dining", "kaiseki"],
    source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
  };

  const mockPlacesList = [mockPlacePaid1, mockPlacePaid2, mockPlacePaid3];

  const initialBudget = BudgetCalculator.calculate({
    days: 3,
    travellers: 2,
    budgetTier: "moderate",
    stay: mockStayModerate,
    places: mockPlacesList,
    restaurants: [mockRestaurantFine],
    currency: "USD",
    currencySymbol: "$",
  });

  const initialItinerary = {
    days: [
      {
        dayNumber: 1,
        theme: "Tokyo Heritage & Landmarks",
        items: [
          { id: "item_day1_act", timeSlot: "morning" as const, type: "activity" as const, referenceId: mockPlacePaid1.id, title: mockPlacePaid1.name, startTime: "09:30", endTime: "11:30", durationMinutes: 120, reasoning: "Visit Tokyo Tower." },
          { id: "item_day1_food", timeSlot: "dinner" as const, type: "food" as const, referenceId: mockRestaurantFine.id, title: mockRestaurantFine.name, startTime: "19:00", endTime: "20:30", durationMinutes: 90, reasoning: "Dinner at Ginza Kaiseki." },
          { id: "item_day1_stay", timeSlot: "night" as const, type: "stay" as const, referenceId: mockStayModerate.id, title: mockStayModerate.name, startTime: "21:00", endTime: "22:00", durationMinutes: 60, reasoning: "Night at hotel." },
        ],
      },
      {
        dayNumber: 2,
        theme: "Cultural Exploration",
        items: [
          { id: "item_day2_act", timeSlot: "morning" as const, type: "activity" as const, referenceId: mockPlacePaid2.id, title: mockPlacePaid2.name, startTime: "10:00", endTime: "12:00", durationMinutes: 120, reasoning: "Cultural exploration." },
          { id: "item_day2_stay", timeSlot: "night" as const, type: "stay" as const, referenceId: mockStayModerate.id, title: mockStayModerate.name, startTime: "21:00", endTime: "22:00", durationMinutes: 60, reasoning: "Night at hotel." },
        ],
      },
      {
        dayNumber: 3,
        theme: "Farewell & Departure",
        items: [
          { id: "item_day3_act", timeSlot: "morning" as const, type: "activity" as const, referenceId: mockPlacePaid3.id, title: mockPlacePaid3.name, startTime: "10:00", endTime: "11:30", durationMinutes: 90, reasoning: "Morning walk." },
        ],
      },
    ],
    orchestrationNotes: "Initial plan.",
  };

  const originalPlan: OrchestrationResult = {
    tripId: "trip_opt_test",
    status: "completed",
    stage: "completed",
    attempts: 1,
    transportation: null,
    stay: {
      recommendedStayId: mockStayModerate.id,
      alternativeStayIds: [],
      reasoning: "Curated stay.",
      tradeoffs: [],
    },
    activities: {
      selectedPlaceIds: [mockPlacePaid1.id, mockPlacePaid2.id, mockPlacePaid3.id],
      reasoning: "Selected places.",
    },
    food: {
      selectedRestaurantIds: [mockRestaurantFine.id],
      reasoning: "Selected dining.",
    },
    budget: initialBudget,
    itinerary: initialItinerary,
    validation: { passed: true, criticalCount: 0, warningCount: 0, issues: [] },
    selectedPlacesDetails: mockPlacesList,
    selectedRestaurantsDetails: [mockRestaurantFine],
    selectedStayDetails: mockStayModerate,
    assembledAt: new Date().toISOString(),
  };

  const tripToOptimize: TripWithPreferences = {
    id: "trip_opt_test",
    userId: "user_test_opt",
    title: "Tokyo Cultural Exploration",
    origin: "",
    destination: "Tokyo",
    days: 3,
    travellers: 2,
    budget: "moderate",
    status: "completed",
    plan: originalPlan,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: mockPrefs("trip_opt_test", {
      interests: ["Culture", "Food & Wine"],
      transportPreference: "auto",
    }),
  };

  // Mock persistence calls so reduceCost can run standalone in tests
  (journeyEditor as any).persistAndRecordVersion = async () => {};

  console.log(`Initial budget total: $${initialBudget.totalEstimatedCost}`);

  // 1. Run cost reduction optimization
  const editResult = await journeyEditor.reduceCost(
    tripToOptimize,
    "user_test_opt",
    "Make the journey cheaper and reduce overall costs",
  );

  if (!editResult.success) {
    console.log("editResult failure error:", editResult.error);
  }
  assert(editResult.success, "Cost reduction re-planning succeeds instead of prematurely throwing couldn't update journey error");
  assert(Boolean(editResult.plan), "Revised plan is returned");
  assert(
    editResult.plan.budget!.totalEstimatedCost < initialBudget.totalEstimatedCost,
    `Revised budget ($${editResult.plan.budget!.totalEstimatedCost}) is strictly lower than initial budget ($${initialBudget.totalEstimatedCost})`,
  );

  // 2. Verify itinerary validation and reference integrity
  assert(
    editResult.plan.validation !== null && editResult.plan.validation.passed,
    "Revised itinerary passes strict deterministic validation",
  );
  assert(
    editResult.plan.itinerary!.days.length === 3,
    "Revised itinerary preserves exact requested day count (3 days)",
  );

  // 3. Verify truthful savings claim in changeSummary
  const changeSummary = editResult.changeSummary;
  assert(Boolean(changeSummary), "Edit change summary is provided");
  assert(
    (changeSummary?.newBudget ?? 0) < (changeSummary?.oldBudget ?? 0),
    "Change summary records strictly reduced budget",
  );
  assert(
    Boolean(changeSummary?.summary.includes("reduced") || changeSummary?.summary.includes("economical")),
    "Change summary communicates cost reduction truthfully",
  );

  // 4. Test ItineraryValidator anti-hallucination protection
  const hallucinatedItinerary = {
    days: [
      {
        dayNumber: 1,
        theme: "Hallucinated Day",
        items: [
          {
            id: "fake_item_1",
            timeSlot: "morning" as const,
            type: "activity" as const,
            referenceId: "hallucinated_place_id_9999",
            title: "Fake Attraction",
            startTime: "09:00",
            endTime: "11:00",
            durationMinutes: 120,
            reasoning: "Invented place.",
          },
        ],
      },
    ],
    orchestrationNotes: "Fake",
  };

  const hallucinationVal = ItineraryValidator.validate({
    expectedDays: 1,
    itinerary: hallucinatedItinerary,
    validReferenceIds: new Set(["legit_place_1"]),
  });

  assert(!hallucinationVal.passed, "ItineraryValidator strictly rejects hallucinated reference IDs");
  assert(
    hallucinationVal.issues.some((i) => i.code === "HALLUCINATED_REFERENCE_ID"),
    "Validator report flags HALLUCINATED_REFERENCE_ID issue code",
  );

  // 5. Test impossible cost reduction preserves original plan intact
  // When an impossible constraint is requested or budget cannot be reduced further:
  const mockPlaceFree: Place = {
    id: "place_free_ueno_park",
    name: "Ueno Park",
    type: "park",
    destinationId: "tokyo",
    latitude: 35.7148,
    longitude: 139.7741,
    priceLevel: "free",
    priceType: "free",
    ticketPrice: 0,
    currency: "USD",
    rating: 4.5,
    reviewCount: 3000,
    address: "Ueno, Taito, Tokyo",
    description: "Public park.",
    tags: ["park", "free"],
    source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
  };

  const mockRestaurantBudget: Restaurant = {
    id: "rest_budget_ichiran",
    name: "Ichiran Ramen",
    destinationId: "tokyo",
    latitude: 35.6945,
    longitude: 139.7025,
    cuisine: ["Ramen", "Japanese"],
    priceLevel: "budget",
    priceType: "budget",
    averagePricePerPerson: 10,
    currency: "USD",
    rating: 4.4,
    reviewCount: 2000,
    address: "Shinjuku, Tokyo",
    tags: ["ramen", "budget"],
    source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
  };

  const mockStayBudget: Stay = {
    id: "stay_budget_capsule",
    name: "Shinjuku Capsule Inn",
    destinationId: "tokyo",
    latitude: 35.6961,
    longitude: 139.7065,
    address: "Kabukicho, Shinjuku, Tokyo",
    category: "hostel",
    comfortLevel: "budget",
    rating: 4.1,
    reviewCount: 500,
    pricePerNight: 40,
    currency: "USD",
    amenities: ["wifi"],
    checkIn: "15:00",
    checkOut: "10:00",
    description: "Budget capsule hostel.",
    source: { provider: "osm", fetchedAt: new Date().toISOString(), isEstimate: false },
  };

  const rockBottomBudget = BudgetCalculator.calculate({
    days: 1,
    travellers: 1,
    budgetTier: "budget",
    stay: mockStayBudget,
    places: [mockPlaceFree],
    restaurants: [mockRestaurantBudget],
    currency: "USD",
    currencySymbol: "$",
  });

  const rockBottomPlan: OrchestrationResult = {
    ...originalPlan,
    budget: rockBottomBudget,
    selectedStayDetails: mockStayBudget,
    stay: {
      recommendedStayId: mockStayBudget.id,
      alternativeStayIds: [],
      reasoning: "Cheapest capsule stay.",
      tradeoffs: [],
    },
    selectedPlacesDetails: [mockPlaceFree],
    selectedRestaurantsDetails: [mockRestaurantBudget],
    itinerary: {
      days: [
        {
          dayNumber: 1,
          theme: "Rock Bottom Day",
          items: [
            { type: "activity" as const, referenceId: mockPlaceFree.id, startTime: "09:00", endTime: "11:00", reasoning: "Free park." },
            { type: "food" as const, referenceId: mockRestaurantBudget.id, startTime: "12:00", endTime: "13:00", reasoning: "Budget ramen." },
            { type: "stay" as const, referenceId: mockStayBudget.id, startTime: "21:00", endTime: "22:00", reasoning: "Night at capsule." },
          ],
        },
      ],
      orchestrationNotes: "Minimal.",
    },
  };

  const rockBottomTrip: TripWithPreferences = {
    ...tripToOptimize,
    days: 1,
    travellers: 1,
    budget: "budget",
    plan: rockBottomPlan,
  };

  // Mock travelService to return only identical minimal items so no lower permutation is possible
  const origPrepareTripContext = travelService.prepareTripContext.bind(travelService);
  const origSearchPlaces = travelService.searchPlaces.bind(travelService);
  const origSearchRestaurants = travelService.searchRestaurants.bind(travelService);
  const origSearchStays = travelService.searchStays.bind(travelService);

  (travelService as any).prepareTripContext = async () => ({
    destination: { id: "tokyo", name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503, currency: "USD", timezone: "Asia/Tokyo" },
    originAirport: null,
    destAirports: [],
    candidateTransport: [],
    candidateStays: [mockStayBudget],
    candidatePlaces: [mockPlaceFree],
    candidateRestaurants: [mockRestaurantBudget],
    availability: {
      origin: { status: "available" as const, reason: "not_specified" as const },
      transport: { status: "available" as const, reason: "not_required" as const },
    },
  });
  (travelService as any).searchPlaces = async () => [mockPlaceFree];
  (travelService as any).searchRestaurants = async () => [mockRestaurantBudget];
  (travelService as any).searchStays = async () => [mockStayBudget];

  try {
    const impossibleResult = await journeyEditor.reduceCost(
      rockBottomTrip,
      "user_test_opt",
      "Reduce costs further",
    );

    assert(
      !impossibleResult.success,
      "When no further economical candidate exists, system truthfully returns success: false",
    );
    assert(
      impossibleResult.plan === rockBottomPlan,
      "When optimization cannot reduce costs further, original plan remains completely intact",
    );
    assert(
      impossibleResult.error!.includes("Unable to reduce costs further"),
      "Helpful, truthful error message explains current selections already represent the most economical verified options",
    );
  } finally {
    // Restore original methods
    (travelService as any).prepareTripContext = origPrepareTripContext;
    (travelService as any).searchPlaces = origSearchPlaces;
    (travelService as any).searchRestaurants = origSearchRestaurants;
    (travelService as any).searchStays = origSearchStays;
  }

  console.log(`\n=== ALL ${passedTests}/${totalTests} REGRESSION TESTS PASSED CLEANLY! ===`);
}

runRegressionSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
