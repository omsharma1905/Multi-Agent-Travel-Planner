/**
 * @file scratch/test_page_stability.ts
 *
 * Verifies page loading stability, zero infinite redirects, and clean render behaviour.
 */

import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth/session";

const BASE_URL = "http://localhost:3000";

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

async function runStabilityTests() {
  console.log("=================================================================");
  console.log(" SAFARIX PAGE LOADING & STABILITY VERIFICATION SUITE");
  console.log("=================================================================\n");

  // 1. Landing page loads cleanly
  console.log("--- Check 1: Public Landing Page Load ---");
  const landingRes = await fetch(`${BASE_URL}/`, { redirect: "manual" });
  assert(landingRes.status === 200, `Landing page returns HTTP 200 (got ${landingRes.status})`);
  const landingHtml = await landingRes.text();
  assert(landingHtml.includes("SafariX"), "Landing page contains SafariX brand text");
  assert(!landingHtml.includes("The server could not finish this Suspense boundary"), "Landing page has zero unhandled Suspense boundary errors");

  // 2. Auth Sign-in page loads without redirect loops
  console.log("\n--- Check 2: Sign-in Page Load (Unauthenticated) ---");
  const signInRes = await fetch(`${BASE_URL}/auth/sign-in`, { redirect: "manual" });
  assert(signInRes.status === 200, `Sign-in page returns HTTP 200 without redirect loop (got ${signInRes.status})`);
  const signInHtml = await signInRes.text();
  assert(signInHtml.includes("Sign In") || signInHtml.includes("INTELLIGENT TRAVEL"), "Sign-in page rendered form content");

  // 3. Auth Sign-up page loads without redirect loops
  console.log("\n--- Check 3: Sign-up Page Load (Unauthenticated) ---");
  const signUpRes = await fetch(`${BASE_URL}/auth/sign-up`, { redirect: "manual" });
  assert(signUpRes.status === 200, `Sign-up page returns HTTP 200 without redirect loop (got ${signUpRes.status})`);

  // 4. Unauthenticated dashboard access redirects once to sign-in
  console.log("\n--- Check 4: Unauthenticated Dashboard Interception ---");
  const unauthDashRes = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
  assert(unauthDashRes.status === 307, `Unauthenticated dashboard returns 307 (got ${unauthDashRes.status})`);
  const dashLoc = unauthDashRes.headers.get("location");
  assert(dashLoc === "/auth/sign-in?redirect=%2Fdashboard", `Redirect location points to sign-in with dashboard return target (got ${dashLoc})`);

  // Follow the redirect to ensure sign-in page handles it with 200 and no further bounce
  const dashFollowRes = await fetch(`${BASE_URL}${dashLoc}`, { redirect: "manual" });
  assert(dashFollowRes.status === 200, `Sign-in page renders 200 on redirect target (got ${dashFollowRes.status})`);

  // 5. Ghost/stale session token (HMAC valid, user not in DB)
  console.log("\n--- Check 5: Stale/Ghost Session Token Loop Prevention ---");
  const ghostToken = await createSessionToken(
    "usr_ghost_nonexistent_99999",
    "ghost@test.local"
  );
  const ghostCookie = `${SESSION_COOKIE_NAME}=${ghostToken}`;

  // Visit /dashboard with ghost token
  const ghostDashRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Cookie: ghostCookie },
    redirect: "manual",
  });
  // Server-side layout detects user missing in DB and redirects to /auth/sign-in?redirect=%2Fdashboard
  assert(ghostDashRes.status === 307 || ghostDashRes.status === 200, `Dashboard handles ghost session gracefully without crashing (got ${ghostDashRes.status})`);
  
  // Follow to sign-in with ghost cookie: must NOT redirect back to /dashboard
  const ghostSignInRes = await fetch(`${BASE_URL}/auth/sign-in?redirect=%2Fdashboard`, {
    headers: { Cookie: ghostCookie },
    redirect: "manual",
  });
  assert(ghostSignInRes.status === 200, `Sign-in page renders HTTP 200 for ghost session (NO infinite loop back to dashboard!) (got ${ghostSignInRes.status})`);

  // 6. Session API endpoint responsiveness and cache control
  console.log("\n--- Check 6: Session API Endpoint ---");
  const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: ghostCookie },
    redirect: "manual",
  });
  assert(sessionRes.status === 200, `Session endpoint responds 200 (got ${sessionRes.status})`);
  const sessionData = await sessionRes.json();
  assert(sessionData.user === null, `Ghost user correctly resolved to null by database verification`);
  const cacheCtrl = sessionRes.headers.get("cache-control") || "";
  assert(cacheCtrl.includes("no-store"), `Cache-control contains no-store (got ${cacheCtrl})`);

  // 7. Verify consecutive rapid requests do not hit rate limiter or trigger crash
  console.log("\n--- Check 7: Rapid Page Requests Stability ---");
  const rapidPromises = Array.from({ length: 5 }, () => fetch(`${BASE_URL}/`, { redirect: "manual" }));
  const rapidResults = await Promise.all(rapidPromises);
  const all200 = rapidResults.every((r) => r.status === 200);
  assert(all200, "5 consecutive landing page loads all return HTTP 200 cleanly without rate-limiting blocks or error states");

  console.log("\n=================================================================");
  console.log(` ALL ${passedTests}/${totalTests} PAGE STABILITY CHECKS PASSED CLEANLY!`);
  console.log("=================================================================\n");
}

runStabilityTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
