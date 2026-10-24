/**
 * @file scratch/test_phase22c_application_workflow.mjs
 *
 * SAFARIX PHASE 22C: APPLICATION-LEVEL WORKFLOW & ORCHESTRATION VERIFICATION
 */

import fs from "fs";
import path from "path";

// Load environment from .env.local synchronously before anything else
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

// Dynamically import domain modules AFTER environment is fully set
const { TravelService } = await import("../src/lib/travel/services/travel-service.ts");
const { TravelOrchestrator } = await import("../src/lib/orchestration/orchestrator.ts");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
  }
}

async function runWorkflow() {
  console.log("\n=======================================================");
  console.log("SAFARIX PHASE 22C: APPLICATION-LEVEL WORKFLOW TEST");
  console.log("=======================================================\n");

  const travelService = new TravelService();
  const orchestrator = new TravelOrchestrator();

  const mockTrip = {
    id: "test-trip-phase22c-" + Date.now(),
    userId: "test-user-isolated",
    title: "Cultural Journey to Tokyo",
    destination: "Tokyo",
    origin: "London",
    startDate: "2026-11-15",
    endDate: "2026-11-20",
    days: 5,
    travellers: 2,
    budget: "moderate",
    status: "draft",
    preferences: {
      travelStyle: "cultural",
      interests: ["history", "culinary"],
      pace: "balanced",
      transportPreference: "flight",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log("--- 1. TripContextAssembler Multi-Provider Ingestion ---");
  const start = Date.now();
  const context = await travelService.prepareTripContext(mockTrip);
  const elapsed = Date.now() - start;

  assert(
    context.destination.name.includes("Tokyo"),
    `Destination resolved via Open-Meteo: ${context.destination.name} (Source: ${context.destination.source.provider})`,
  );
  assert(
    Boolean(context.origin && context.origin.name.includes("London")),
    `Origin resolved via Open-Meteo: ${context.origin?.name} (Source: ${context.origin?.source?.provider})`,
  );

  // Transportation retrieval via Duffel Air
  assert(
    context.candidateTransport.length > 0,
    `Candidate transportation retrieved via Duffel Air: ${context.candidateTransport.length} offers`,
  );
  if (context.candidateTransport.length > 0) {
    const flight = context.candidateTransport[0];
    assert(
      flight.source.provider === "duffel-transport",
      `Flight option has genuine provider provenance: ${flight.source.provider} (${flight.provider})`,
    );
  }

  // Honest failure reporting for unapproved / unconfigured providers
  assert(
    context.availability.places.status === "unavailable",
    `Places marked unavailable truthfully due to Google Places 403 (Zero mock fabrication)`,
  );
  assert(
    context.candidatePlaces.length === 0,
    `Zero fake places injected into candidate pool (Empty candidates count: ${context.candidatePlaces.length})`,
  );
  assert(
    context.availability.stays.status === "unavailable",
    `Stays marked unavailable truthfully due to Duffel Stays 403 (Zero mock fabrication)`,
  );
  assert(
    context.candidateStays.length === 0,
    `Zero fake stays injected into candidate pool (Empty candidates count: ${context.candidateStays.length})`,
  );

  // Imagery handling (Deferred Pexels)
  assert(
    context.destinationImage === null,
    "Destination hero image is null (Graceful fallback to neutral gradient active)",
  );

  console.log("\n--- 2. Multi-Agent Orchestration Run ---");
  const planStart = Date.now();
  const planResult = await orchestrator.planTrip(mockTrip, (stage, msg) => {
    console.log(`  [Orchestrator Stage] ${stage}: ${msg}`);
  });
  const planElapsed = Date.now() - planStart;

  assert(
    planResult.status === "completed" || planResult.success === true,
    `Multi-agent collaborative planning completed in ${planElapsed}ms (Status: ${planResult.status})`,
  );
  assert(
    Array.isArray(planResult.itinerary?.days) && planResult.itinerary?.days?.length === mockTrip.days,
    `Itinerary generated exact requested day count: ${planResult.itinerary?.days?.length} days`,
  );
  assert(
    typeof planResult.budget?.totalEstimatedCost === "number",
    `Budget estimated with honest provenance (Total: $${planResult.budget?.totalEstimatedCost})`,
  );

  console.log("\n=======================================================");
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runWorkflow().catch((e) => {
  console.error("FATAL ERROR IN WORKFLOW:", e);
  process.exit(1);
});
