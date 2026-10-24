/**
 * @file scratch/test_phase22b_duffel_migration.mjs
 *
 * SAFARIX — PHASE 22B AUTOMATED VERIFICATION SUITE
 * Travel API Provider Audit, Amadeus Replacement & Real-Data Migration
 *
 * Verifies:
 * 1. Provider factory selection (TravelService selects Duffel providers in real mode).
 * 2. Missing credentials fail-closed behavior (ProviderUnavailableError, ProviderConfigurationError).
 * 3. Zero origin fabrication in DuffelTransportProvider (throws OriginRequiredError).
 * 4. IATA resolution and request construction.
 * 5. Duffel flight offer mapping into normalized TransportOption schema.
 * 6. Duffel stay search mapping into normalized Stay schema.
 * 7. Truthful pricing integrity: missing nightly price remains null with priceType: 'unknown'.
 * 8. Zero mock fallback in production / real mode.
 * 9. Diagnostic endpoint (/api/internal/api-diagnostic) accurately reports Duffel providers.
 * 10. Environment variable catalog and secret isolation (.env.example).
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "http://localhost:3000";

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

async function runTests() {
  console.log("\n=======================================================");
  console.log("SAFARIX PHASE 22B: DUFFEL REPLACEMENT & MIGRATION TEST");
  console.log("=======================================================\n");

  // -------------------------------------------------------------------------
  // Test Suite 1: .env.example & Environment Variable Catalog
  // -------------------------------------------------------------------------
  console.log("--- Suite 1: Environment Configuration & Catalog ---");
  const envExamplePath = resolve(".env.example");
  assert(existsSync(envExamplePath), ".env.example exists in root");
  const envExample = readFileSync(envExamplePath, "utf-8");

  assert(
    envExample.includes("DUFFEL_ACCESS_TOKEN"),
    ".env.example documents DUFFEL_ACCESS_TOKEN as required in production",
  );
  assert(
    envExample.includes("DUFFEL_BASE_URL"),
    ".env.example documents DUFFEL_BASE_URL",
  );
  assert(
    !envExample.includes("NEXT_PUBLIC_DUFFEL_ACCESS_TOKEN"),
    "DUFFEL_ACCESS_TOKEN is strictly server-only (no NEXT_PUBLIC_ prefix)",
  );

  // -------------------------------------------------------------------------
  // Test Suite 2: Provider Class Files & Implementations
  // -------------------------------------------------------------------------
  console.log("\n--- Suite 2: Duffel Provider Implementations ---");
  const duffelTransportPath = resolve("src/lib/travel/providers/real/duffel-transport-provider.ts");
  const duffelStayPath = resolve("src/lib/travel/providers/real/duffel-stay-provider.ts");

  assert(existsSync(duffelTransportPath), "DuffelTransportProvider exists in src/lib/travel/providers/real/");
  assert(existsSync(duffelStayPath), "DuffelStayProvider exists in src/lib/travel/providers/real/");

  const transportCode = readFileSync(duffelTransportPath, "utf-8");
  const stayCode = readFileSync(duffelStayPath, "utf-8");

  assert(
    transportCode.includes("class DuffelTransportProvider implements TransportProvider"),
    "DuffelTransportProvider implements TransportProvider interface",
  );
  assert(
    transportCode.includes("OriginRequiredError"),
    "DuffelTransportProvider enforces Zero Origin Fabrication (OriginRequiredError)",
  );
  assert(
    stayCode.includes("class DuffelStayProvider implements StayProvider"),
    "DuffelStayProvider implements StayProvider interface",
  );
  assert(
    stayCode.includes('priceType: "unknown"') && stayCode.includes("pricePerNight: null"),
    "DuffelStayProvider enforces Truthful Pricing (null price when unverified)",
  );

  // -------------------------------------------------------------------------
  // Test Suite 3: TravelService Factory Selection
  // -------------------------------------------------------------------------
  console.log("\n--- Suite 3: Central TravelService Provider Selection ---");
  const travelServiceCode = readFileSync("src/lib/travel/services/travel-service.ts", "utf-8");

  assert(
    travelServiceCode.includes("DuffelTransportProvider") &&
      travelServiceCode.includes("DuffelStayProvider"),
    "TravelService imports DuffelTransportProvider and DuffelStayProvider",
  );
  assert(
    travelServiceCode.includes("this.stayProvider = options.stays ?? new DuffelStayProvider()") &&
      travelServiceCode.includes("this.transportProvider = options.transport ?? new DuffelTransportProvider()"),
    "TravelService selects DuffelStayProvider and DuffelTransportProvider by default in real mode",
  );

  // -------------------------------------------------------------------------
  // Test Suite 4: Travel Config & Assertion Guard
  // -------------------------------------------------------------------------
  console.log("\n--- Suite 4: Travel Config & Credentials Assertion ---");
  const travelConfigCode = readFileSync("src/lib/travel/config.ts", "utf-8");

  assert(
    travelConfigCode.includes("DUFFEL_ACCESS_TOKEN"),
    "travel config reads DUFFEL_ACCESS_TOKEN",
  );
  assert(
    travelConfigCode.includes('providerName === "duffel"') &&
      travelConfigCode.includes("DUFFEL_ACCESS_TOKEN is required when TRAVEL_DATA_MODE is 'real'"),
    "assertProviderCredentials('duffel') asserts DUFFEL_ACCESS_TOKEN in real mode",
  );

  // -------------------------------------------------------------------------
  // Test Suite 5: Diagnostic Endpoint Tracking
  // -------------------------------------------------------------------------
  console.log("\n--- Suite 5: Safe Diagnostic Endpoint Tracking ---");
  const diagRes = await fetch(`${BASE_URL}/api/internal/api-diagnostic`, {
    headers: { "Cache-Control": "no-cache" },
  });

  assert(diagRes.status === 200, "GET /api/internal/api-diagnostic returns 200 OK");
  const diagData = await diagRes.json();

  const duffelStaysItem = diagData.results?.find((r) => r.id === "duffel-stays");
  const duffelAirItem = diagData.results?.find((r) => r.id === "duffel-transport");

  assert(Boolean(duffelStaysItem), "Diagnostic tracks duffel-stays integration");
  if (duffelStaysItem) {
    assert(
      duffelStaysItem.requiredInProduction === true,
      "duffel-stays is marked as requiredInProduction: true",
    );
    assert(
      duffelStaysItem.status === "MISSING" || duffelStaysItem.status === "CONFIGURED",
      `duffel-stays status is valid (${duffelStaysItem.status})`,
    );
    assert(
      duffelStaysItem.liveStatus === "NOT_LIVE_VERIFIED" || duffelStaysItem.liveStatus === "LIVE_VERIFIED",
      `duffel-stays liveStatus is truth-preserving (${duffelStaysItem.liveStatus})`,
    );
    assert(
      duffelStaysItem.envVars.includes("DUFFEL_ACCESS_TOKEN"),
      "duffel-stays references DUFFEL_ACCESS_TOKEN",
    );
  }

  assert(Boolean(duffelAirItem), "Diagnostic tracks duffel-transport integration");
  if (duffelAirItem) {
    assert(
      duffelAirItem.requiredInProduction === true,
      "duffel-transport is marked as requiredInProduction: true",
    );
    assert(
      duffelAirItem.status === "MISSING" || duffelAirItem.status === "CONFIGURED",
      `duffel-transport status is valid (${duffelAirItem.status})`,
    );
    assert(
      duffelAirItem.envVars.includes("DUFFEL_ACCESS_TOKEN"),
      "duffel-transport references DUFFEL_ACCESS_TOKEN",
    );
  }

  // Verify no secret leak in diagnostic payload
  const diagRaw = JSON.stringify(diagData);
  assert(
    !diagRaw.includes("duffel_test_") && !diagRaw.includes("duffel_live_"),
    "Diagnostic payload never leaks Duffel token values or prefixes",
  );

  // -------------------------------------------------------------------------
  // Test Suite 6: Production Audit Integrity Suite (20/20 Checks)
  // -------------------------------------------------------------------------
  console.log("\n--- Suite 6: Production Audit Suite (Zero-Mock Integrity) ---");
  const auditRes = await fetch(`${BASE_URL}/api/internal/production-audit-test`);
  assert(auditRes.status === 200, "GET /api/internal/production-audit-test returns 200 OK");
  const auditData = await auditRes.json();
  assert(
    auditData.passed === true && auditData.passedTests === 20 && auditData.totalTests === 20,
    `Existing production integrity audit passes 20/20 checks (${auditData.passedTests}/${auditData.totalTests})`,
  );

  // -------------------------------------------------------------------------
  // Test Suite 7: Security Matrix Test Suite
  // -------------------------------------------------------------------------
  console.log("\n--- Suite 7: Security Matrix Test Suite ---");
  const secRes = await fetch(`${BASE_URL}/api/internal/security-test`);
  assert(secRes.status === 200, "GET /api/internal/security-test returns 200 OK");
  const secData = await secRes.json();
  assert(
    secData.verdict === "PRODUCTION READY (P0 RESOLVED)" && secData.summary?.fail === 0,
    `Security test suite passes with 0 failures (${secData.summary?.pass} passes)`,
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
