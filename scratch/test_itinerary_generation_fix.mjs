import fs from "fs";
import path from "path";

// 1. Load environment from .env.local
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

console.log("=== SAFARIX ITINERARY GENERATION FIX REGRESSION SUITE ===");

const { ItineraryAgent } = await import("../src/lib/agents/itinerary/itinerary-agent.ts");
const { itineraryOutputSchema } = await import("../src/lib/agents/itinerary/schemas.ts");
const { ItineraryValidator } = await import("../src/lib/agents/validator/itinerary-validator.ts");
const { AgentObservability } = await import("../src/lib/agents/core/observability.ts");

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} ${detail ? `- ${detail}` : ""}`);
    failed++;
  }
}

// -------------------------------------------------------------
// TEST 1: Missing Prerequisites Diagnostics
// -------------------------------------------------------------
console.log("\n1. Testing Diagnostics: Missing Prerequisites & Empty Candidates...");
const agent = new ItineraryAgent();

const mockContextInvalidDays = {
  trip: { id: "t1", days: 0, destination: "Paris", budget: "medium", travellers: 2 },
  destination: { id: "d1", name: "Paris", country: "France", countryCode: "FR" },
  candidatePlaces: [],
  candidateRestaurants: [],
  candidateStays: [],
  candidateTransport: [],
};

const resMissing = await agent.run(mockContextInvalidDays, {
  stay: null,
  transport: null,
  selectedPlaces: [],
  selectedRestaurants: [],
});
assert(resMissing.status === "failed", "Missing prerequisites returns failed status");
assert(resMissing.errorCategory === "MISSING_PREREQUISITES", "Missing prerequisites error category is MISSING_PREREQUISITES");

const mockContextValidDays = {
  trip: { id: "t1", days: 3, destination: "Paris", budget: "medium", travellers: 2 },
  destination: { id: "d1", name: "Paris", country: "France", countryCode: "FR" },
  candidatePlaces: [],
  candidateRestaurants: [],
  candidateStays: [],
  candidateTransport: [],
};

const resEmptyCandidates = await agent.run(mockContextValidDays, {
  stay: null,
  transport: null,
  selectedPlaces: [],
  selectedRestaurants: [],
});
assert(resEmptyCandidates.status === "failed", "Empty candidates returns failed status");
assert(resEmptyCandidates.errorCategory === "NO_CANDIDATES", "Empty candidates error category is NO_CANDIDATES");

// -------------------------------------------------------------
// TEST 2: Schema Normalizer Robustness
// -------------------------------------------------------------
console.log("\n2. Testing Schema Normalizer Robustness...");

// A. Standard conforming object
const validObj = {
  days: [
    {
      dayNumber: 1,
      theme: "Historical Highlights",
      items: [
        {
          type: "activity",
          referenceId: "place_1",
          startTime: "09:00",
          endTime: "11:00",
          reasoning: "Explore iconic landmark",
        },
      ],
    },
  ],
  orchestrationNotes: "Curated expedition.",
};
const resValidObj = itineraryOutputSchema.safeParse(validObj);
assert(resValidObj.success, "Standard conforming object parses without issues");

// B. Root array variation
const rootArray = [
  {
    dayNumber: 1,
    theme: "Arrival Day",
    items: [
      {
        type: "stay",
        referenceId: "stay_hotel",
        startTime: "14:00",
        endTime: "15:00",
        reasoning: "Hotel check-in",
      },
    ],
  },
];
const resRootArray = itineraryOutputSchema.safeParse(rootArray);
assert(resRootArray.success, "Root array automatically normalizes to valid object");
assert(resRootArray.data?.days.length === 1, "Root array has correct day count");
assert(typeof resRootArray.data?.orchestrationNotes === "string", "Root array receives synthesized orchestration notes");

// C. Aliased keys (schedule, meal, hotel)
const aliasedObj = {
  days: [
    {
      dayNumber: 1,
      theme: "City Flavors",
      schedule: [
        {
          type: "meal",
          referenceId: "rest_bistro",
          startTime: "12:30",
          endTime: "14:00",
          reasoning: "Authentic lunch",
        },
        {
          type: "hotel",
          referenceId: "stay_grand",
          startTime: "15:00",
          endTime: "16:00",
          reasoning: "Check into suite",
        },
      ],
    },
  ],
};
const resAliased = itineraryOutputSchema.safeParse(aliasedObj);
assert(resAliased.success, "Aliased keys (schedule, meal, hotel) automatically normalize");
assert(resAliased.data?.days[0]?.items[0]?.type === "food", "Meal aliased type normalized to 'food'");
assert(resAliased.data?.days[0]?.items[1]?.type === "stay", "Hotel aliased type normalized to 'stay'");

// -------------------------------------------------------------
// TEST 3: Live Planning Synthesis & Validation
// -------------------------------------------------------------
console.log("\n3. Testing Live ItineraryAgent Synthesis & Deterministic Validation...");

const samplePlaces = [
  {
    id: "place_eiffel",
    name: "Eiffel Tower",
    type: "landmark",
    address: "Champ de Mars, Paris",
    estimatedDurationMinutes: 120,
    ticketPrice: 28,
    priceType: "exact",
    currency: "EUR",
    openingHours: "09:00 - 23:00",
    tags: ["landmark", "scenic"],
    description: "Iconic wrought-iron lattice tower.",
  },
  {
    id: "place_louvre",
    name: "Louvre Museum",
    type: "museum",
    address: "Rue de Rivoli, Paris",
    estimatedDurationMinutes: 180,
    ticketPrice: 22,
    priceType: "exact",
    currency: "EUR",
    openingHours: "09:00 - 18:00",
    tags: ["museum", "art"],
    description: "World's largest art museum.",
  },
  {
    id: "place_montmartre",
    name: "Montmartre & Sacré-Cœur",
    type: "historic_district",
    address: "Montmartre, Paris",
    estimatedDurationMinutes: 150,
    ticketPrice: 0,
    priceType: "free",
    currency: "EUR",
    openingHours: "Open 24 hours",
    tags: ["culture", "scenic"],
    description: "Bohemian hilltop district with basilica.",
  },
];

const sampleRestaurants = [
  {
    id: "rest_cafe_flore",
    name: "Café de Flore",
    cuisine: "French Bistro",
    category: "casual",
    address: "Saint-Germain-des-Prés, Paris",
    mealTypes: ["breakfast", "lunch"],
    averagePricePerPerson: 35,
    priceType: "estimate",
    currency: "EUR",
    openingHours: "07:30 - 01:00",
  },
  {
    id: "rest_le_bistro",
    name: "Le Gabriel",
    cuisine: "Haute French",
    category: "fine_dining",
    address: "Avenue Gabriel, Paris",
    mealTypes: ["dinner"],
    averagePricePerPerson: 180,
    priceType: "estimate",
    currency: "EUR",
    openingHours: "19:00 - 22:30",
  },
];

const sampleStay = {
  id: "stay_saint_james",
  name: "Saint James Paris",
  category: "hotel",
  comfortLevel: "luxury",
  address: "Place du Chancelier Adenauer, Paris",
  checkIn: "15:00",
  checkOut: "11:00",
  pricePerNight: 420,
  currency: "EUR",
  roomType: "Deluxe Suite",
};

const sampleTransport = {
  id: "trans_eurostar",
  mode: "train",
  provider: "Eurostar",
  departureTime: "08:30",
  arrivalTime: "11:45",
  durationMinutes: 195,
  totalFare: 160,
  currency: "EUR",
  origin: "London St Pancras",
  destination: "Paris Gare du Nord",
};

const mockTripContext = {
  trip: { id: "trip_paris_3d", days: 3, destination: "Paris", budget: "luxury", travellers: 2 },
  destination: { id: "dest_paris", name: "Paris", country: "France", countryCode: "FR" },
  candidatePlaces: samplePlaces,
  candidateRestaurants: sampleRestaurants,
  candidateStays: [sampleStay],
  candidateTransport: [sampleTransport],
};

const synthRes = await agent.run(mockTripContext, {
  stay: sampleStay,
  transport: sampleTransport,
  selectedPlaces: samplePlaces,
  selectedRestaurants: sampleRestaurants,
});

assert(synthRes.status === "success", "Live ItineraryAgent successfully synthesized schedule", synthRes.reasoning);
assert(synthRes.data !== null, "Itinerary data is non-null");
assert(synthRes.data?.days.length === 3, `Itinerary has exactly 3 days (got ${synthRes.data?.days.length})`);
assert(synthRes.data?.orchestrationNotes.length > 0, "Orchestration notes are present");

// -------------------------------------------------------------
// TEST 4: Deterministic Itinerary Validator Pass
// -------------------------------------------------------------
console.log("\n4. Testing Deterministic Itinerary Validator Pass...");

const validReferenceIds = new Set([
  sampleStay.id,
  sampleTransport.id,
  ...samplePlaces.map((p) => p.id),
  ...sampleRestaurants.map((r) => r.id),
]);

const validation = ItineraryValidator.validate({
  expectedDays: 3,
  itinerary: synthRes.data,
  validReferenceIds,
});

assert(validation.passed, "Deterministic ItineraryValidator passed with zero critical errors");
assert(validation.criticalCount === 0, `Critical issues count is 0 (got ${validation.criticalCount})`);
if (!validation.passed) {
  console.error("Validation issues:", validation.issues);
}

// -------------------------------------------------------------
// TEST 5: Agent Observability Logging
// -------------------------------------------------------------
console.log("\n5. Testing Agent Observability Tracking...");

AgentObservability.clear();
const recorded = AgentObservability.recordRun({
  tripId: "trip_paris_3d",
  agentName: "ItineraryAgent",
  status: synthRes.status,
  attempt: 1,
  durationMs: synthRes.durationMs,
  errorCategory: synthRes.errorCategory,
});

assert(recorded.id.startsWith("run_"), "Observability run recorded with unique ID");
assert(recorded.tripId === "trip_paris_3d", "Observability tripId correctly stored");
const runs = AgentObservability.getRunsForTrip("trip_paris_3d");
assert(runs.length === 1, "getRunsForTrip retrieves recorded entry");

console.log(`\n=== SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) process.exit(1);
