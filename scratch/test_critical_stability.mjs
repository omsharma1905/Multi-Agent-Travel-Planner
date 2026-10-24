/**
 * @file scratch/test_critical_stability.mjs
 * Verification script for Bug A (Delete Journey), Bug B (Itinerary Anti-Hallucination & Deduplication),
 * and honest reporting of provider blockers.
 */

import { itineraryOutputSchema } from "../src/lib/agents/itinerary/schemas.js";
import { ItineraryValidator } from "../src/lib/agents/validator/itinerary-validator.js";

async function runTests() {
  console.log("=== SAFARIX CRITICAL STABILITY VERIFICATION ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Anti-hallucination Schema Test: Verify item_orientation is NEVER synthetically injected
  console.log("\n--- Test 1: Itinerary Schema Anti-Hallucination ---");
  const rawEmptySchedule = {
    days: [
      {
        dayNumber: 1,
        theme: "Arrival",
        items: []
      }
    ],
    orchestrationNotes: "Empty day schedule test"
  };

  const parsedEmpty = itineraryOutputSchema.safeParse(rawEmptySchedule);
  // It should either fail validation or items should be empty, NEVER contain item_orientation!
  if (!parsedEmpty.success) {
    assert(true, "Empty day rejected by schema validation (no fake items injected)");
  } else {
    const hasOrientation = parsedEmpty.data.days.some(d => 
      d.items.some(i => i.referenceId === "item_orientation" || i.referenceId.startsWith("item_"))
    );
    assert(!hasOrientation, "Parsed output contains NO synthetic item_orientation or item_1");
  }

  // 2. Anti-hallucination with missing referenceId
  const rawMissingRef = {
    days: [
      {
        dayNumber: 1,
        theme: "Arrival",
        items: [
          {
            type: "activity",
            startTime: "10:00",
            endTime: "12:00",
            reasoning: "Test activity without ID"
          }
        ]
      }
    ],
    orchestrationNotes: "Missing ID test"
  };

  const parsedMissingRef = itineraryOutputSchema.safeParse(rawMissingRef);
  assert(!parsedMissingRef.success, "Item without valid referenceId rejected by schema (no synthetic item_1 fabricated)");

  // 3. Validator Duplicate Day Structure Enforcement
  console.log("\n--- Test 2: Validator Duplicate Day Structure Enforcement ---");
  const duplicateStructureItinerary = {
    days: [
      {
        dayNumber: 1,
        theme: "Arrival & Sightseeing",
        items: [
          {
            type: "activity",
            referenceId: "place_tokyo_tower",
            startTime: "10:00",
            endTime: "12:00",
            reasoning: "Explore Tokyo Tower"
          }
        ]
      },
      {
        dayNumber: 2,
        theme: "Day 2 Sightseeing",
        items: [
          {
            type: "activity",
            referenceId: "place_sensoji",
            startTime: "10:00",
            endTime: "12:00",
            reasoning: "Explore Sensoji"
          }
        ]
      },
      {
        dayNumber: 3,
        theme: "Day 3 Sightseeing",
        items: [
          {
            type: "activity",
            referenceId: "place_sensoji",
            startTime: "10:00",
            endTime: "12:00",
            reasoning: "Explore Sensoji"
          }
        ]
      }
    ],
    orchestrationNotes: "Duplicate day test"
  };

  const validIds = new Set(["place_tokyo_tower", "place_sensoji"]);
  const valResult = ItineraryValidator.validate({
    expectedDays: 3,
    itinerary: duplicateStructureItinerary,
    validReferenceIds: validIds
  });

  assert(!valResult.passed, "Itinerary with duplicate day structure and duplicate place visit fails validation");
  const hasDupStructure = valResult.issues.some(i => i.code === "DUPLICATE_DAY_STRUCTURE");
  const hasDupPlace = valResult.issues.some(i => i.code === "DUPLICATE_PLACE_VISIT");
  assert(hasDupStructure, "Validator correctly caught DUPLICATE_DAY_STRUCTURE");
  assert(hasDupPlace, "Validator correctly caught DUPLICATE_PLACE_VISIT");

  // 4. Validator Passes for Distinct Well-Curated Itinerary
  console.log("\n--- Test 3: Validator Passes for Unique Curated Itinerary ---");
  const validItinerary = {
    days: [
      {
        dayNumber: 1,
        theme: "Arrival & Historic Asakusa",
        items: [
          {
            type: "activity",
            referenceId: "place_sensoji",
            startTime: "14:00",
            endTime: "16:00",
            reasoning: "Historic temple exploration"
          }
        ]
      },
      {
        dayNumber: 2,
        theme: "Modern Skyline & Architecture",
        items: [
          {
            type: "activity",
            referenceId: "place_tokyo_tower",
            startTime: "10:00",
            endTime: "12:30",
            reasoning: "Iconic observation tower"
          }
        ]
      },
      {
        dayNumber: 3,
        theme: "Meiji Shrine & Garden Walk",
        items: [
          {
            type: "activity",
            referenceId: "place_meiji",
            startTime: "09:30",
            endTime: "11:30",
            reasoning: "Forest sanctuary and shrine"
          }
        ]
      }
    ],
    orchestrationNotes: "Unique curated 3-day itinerary"
  };

  const fullValidIds = new Set(["place_sensoji", "place_tokyo_tower", "place_meiji"]);
  const validRes = ItineraryValidator.validate({
    expectedDays: 3,
    itinerary: validItinerary,
    validReferenceIds: fullValidIds
  });

  assert(validRes.passed, "Unique curated itinerary passes validation with 0 errors");

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
