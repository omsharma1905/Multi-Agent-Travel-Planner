import fs from "fs";
import path from "path";

// Load environment from .env.local
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

console.log("=== SAFARIX FULL ORCHESTRATOR PLANNING TEST ===");

const { TravelOrchestrator } = await import("../src/lib/orchestration/orchestrator.ts");

const orchestrator = new TravelOrchestrator();

const mockTrip = {
  id: `trip_test_${Date.now()}`,
  userId: "user_test",
  destination: "Kyoto",
  origin: "Tokyo",
  startDate: "2026-11-01",
  endDate: "2026-11-04",
  days: 3,
  budget: "medium",
  travellers: 2,
  pace: "medium",
  interests: ["culture", "food", "scenic"],
  status: "planning",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  activitiesPreference: ["culture", "scenic"],
  diningPreference: ["local", "casual"],
  stayTypePreference: "hotel",
};

const stagesVisited = [];
console.log("Starting TravelOrchestrator.planTrip...");

const startTime = Date.now();
const result = await orchestrator.planTrip(mockTrip, (stage, msg) => {
  console.log(`  [Progress] Stage: ${stage} | ${msg}`);
  stagesVisited.push(stage);
});

const duration = Date.now() - startTime;
console.log(`\nPlanning completed in ${(duration / 1000).toFixed(1)}s`);
console.log("Result status:", result.status);
console.log("Result stage:", result.stage);
console.log("Attempts:", result.attempts);

if (result.status === "completed") {
  console.log("\nSUCCESS! Generated Itinerary Overview:");
  console.log(`- Days count: ${result.itinerary?.days.length}`);
  for (const day of result.itinerary?.days || []) {
    console.log(`  Day ${day.dayNumber}: ${day.theme} (${day.items.length} items)`);
    for (const item of day.items) {
      console.log(`    * [${item.startTime}-${item.endTime}] ${item.type} (${item.referenceId}): ${item.reasoning.substring(0, 60)}...`);
    }
  }
  console.log(`- Validation passed: ${result.validation?.passed}`);
  console.log(`- Budget total: ${result.budget?.currencySymbol}${result.budget?.totalEstimatedCost} (${result.budget?.budgetStatus})`);
} else {
  console.error("\nFAILED! Planning result failure reason:", result.failureReason);
  process.exit(1);
}
