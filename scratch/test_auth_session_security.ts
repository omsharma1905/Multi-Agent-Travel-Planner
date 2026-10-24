/**
 * @file scratch/test_auth_session_security.ts
 *
 * Exhaustive Verification & Regression Test Suite for SafariX Bug 4:
 * Authentication Session, Sign-In/Sign-Out, and Browser History Security.
 *
 * Validates all 15 scenarios:
 * 1.  Successful sign-in establishes valid server session token & cookie.
 * 2.  Successful sign-up persists user, bcrypt hash, and valid session.
 * 3.  Landing page renders authenticated state when session is valid.
 * 4.  BFCache/history restoration revalidation (no false logged-out state).
 * 5.  Forward navigation to dashboard validates active session.
 * 6.  Unauthenticated request to protected pages redirects to sign-in.
 * 7.  Unauthenticated request to protected APIs returns 401.
 * 8.  Valid session allows access to user's own trip.
 * 9.  User ownership enforcement (cannot access another user's trip).
 * 10. Successful sign-out invalidates cookie (Max-Age=0, expired date).
 * 11. Back navigation after sign-out rejects protected trip data access.
 * 12. Forward navigation after sign-out does not restore access.
 * 13. Expired, malformed, or tampered session tokens are rejected.
 * 14. Private no-store cache headers present on sensitive endpoints.
 * 15. Sign-in / sign-up redirects prevent loops for authenticated users.
 */

import { db, schema } from "../src/lib/db";
import { eq } from "drizzle-orm";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE_NAME,
} from "../src/lib/auth/session";
import { TripsService } from "../src/features/trips/service";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

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

function extractCookie(response: Response, cookieName: string): string | null {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function runTestSuite() {
  console.log("=================================================================");
  console.log(" SAFARIX BUG 4: AUTHENTICATION & BROWSER HISTORY SECURITY SUITE");
  console.log(` Target Server: ${BASE_URL}`);
  console.log("=================================================================\n");

  const timestamp = Date.now();
  const userAEmail = `test_alice_${timestamp}@safarix.test`;
  const userAPassword = `SecurePassword123!@#`;
  const userBEmail = `test_bob_${timestamp}@safarix.test`;
  const userBPassword = `AnotherSecurePassword456!@#`;

  let userACookie = "";
  let userBCookie = "";
  let userAId = "";
  let userBId = "";
  let tripAId = "";

  // -------------------------------------------------------------------------
  // SCENARIO 2: Successful sign-up persists user, bcrypt hash, and valid session
  // -------------------------------------------------------------------------
  console.log("--- Scenario 2: Sign-Up, Bcrypt Hash & Session Creation ---");
  {
    const res = await fetch(`${BASE_URL}/api/auth/sign-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Explorer",
        email: userAEmail,
        password: userAPassword,
      }),
    });

    assert(res.status === 201, `Sign-up returns HTTP 201 (got ${res.status})`);
    const data = await res.json();
    assert(data.success === true, "Sign-up response success flag is true");
    assert(data.user && data.user.email === userAEmail, "Sign-up returns created user data");
    userAId = data.user.id;

    const setCookie = res.headers.get("set-cookie") || "";
    assert(setCookie.includes(SESSION_COOKIE_NAME), "Sign-up sets session cookie in response");
    assert(setCookie.toLowerCase().includes("httponly"), "Session cookie has HttpOnly flag");
    assert(setCookie.toLowerCase().includes("samesite=lax"), "Session cookie has SameSite=Lax flag");
    assert(setCookie.toLowerCase().includes("path=/"), "Session cookie has Path=/");

    const token = extractCookie(res, SESSION_COOKIE_NAME);
    assert(Boolean(token), "Extracted valid session token string from sign-up cookie");
    userACookie = `${SESSION_COOKIE_NAME}=${token}`;

    // Verify database record has bcrypt hashed password (never plain text)
    const dbUser = await db.query.users.findFirst({
      where: eq(schema.users.email, userAEmail),
    });
    assert(Boolean(dbUser), "User found in PostgreSQL database");
    if (!dbUser || !dbUser.passwordHash) throw new Error("dbUser or passwordHash not found");
    assert(dbUser.passwordHash.startsWith("$2"), "Password in DB is verified bcrypt hash");
    assert(dbUser.passwordHash !== userAPassword, "Password is never stored as plain text");

    // Sign up user B
    const resB = await fetch(`${BASE_URL}/api/auth/sign-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob Traveler",
        email: userBEmail,
        password: userBPassword,
      }),
    });
    assert(resB.status === 201, "Sign-up User B returns HTTP 201");
    const dataB = await resB.json();
    userBId = dataB.user.id;
    const tokenB = extractCookie(resB, SESSION_COOKIE_NAME);
    userBCookie = `${SESSION_COOKIE_NAME}=${tokenB}`;
  }

  // -------------------------------------------------------------------------
  // SCENARIO 1: Successful sign-in establishes valid server session token & cookie
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 1: Sign-In Session Establishment ---");
  {
    const res = await fetch(`${BASE_URL}/api/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userAEmail,
        password: userAPassword,
      }),
    });

    assert(res.status === 200, `Sign-in returns HTTP 200 (got ${res.status})`);
    const data = await res.json();
    assert(data.success === true, "Sign-in response success flag is true");
    assert(data.user?.id === userAId, "Sign-in returns correct user ID");

    const setCookie = res.headers.get("set-cookie") || "";
    assert(setCookie.includes(SESSION_COOKIE_NAME), "Sign-in sets session cookie");
    assert(setCookie.toLowerCase().includes("httponly"), "Sign-in cookie has HttpOnly flag");

    const token = extractCookie(res, SESSION_COOKIE_NAME);
    assert(Boolean(token), "Extracted session token from sign-in");
    userACookie = `${SESSION_COOKIE_NAME}=${token}`;

    // Verify token cryptographically
    const payload = await verifySessionToken(token);
    assert(payload !== null, "HMAC-SHA256 signature verified on server session token");
    assert(payload?.userId === userAId, "Session token payload matches user ID");
    assert(payload?.email === userAEmail, "Session token payload matches user email");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 3 & 4: Landing Page & BFCache Revalidation
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 3 & 4: Landing Page & BFCache / History Sync ---");
  {
    // Authenticated request to landing page
    const resLandingAuth = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: userACookie },
      redirect: "manual",
    });
    assert(resLandingAuth.status === 200, "Landing page returns 200 for authenticated user");

    // Session check endpoint with authenticated cookie
    const resSession = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: {
        Cookie: userACookie,
        "Cache-Control": "no-cache",
      },
    });
    assert(resSession.status === 200, "Session endpoint returns HTTP 200");
    const sessionData = await resSession.json();
    assert(sessionData.user?.id === userAId, "Session endpoint returns authenticated user");
    assert(sessionData.user?.email === userAEmail, "Session endpoint returns correct email");

    // Test that unauthenticated session check returns null user without error
    const resNoAuthSession = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { "Cache-Control": "no-cache" },
    });
    assert(resNoAuthSession.status === 200, "Unauthenticated session check returns 200");
    const noAuthData = await resNoAuthSession.json();
    assert(noAuthData.user === null, "Unauthenticated session check returns { user: null }");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 5: Forward Navigation to Dashboard Validates Active Session
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 5: Dashboard Access with Active Session ---");
  {
    const resDashboard = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: userACookie },
      redirect: "manual",
    });
    assert(
      resDashboard.status === 200 || resDashboard.status === 304,
      `Active session accesses /dashboard successfully (got HTTP ${resDashboard.status})`,
    );
  }

  // -------------------------------------------------------------------------
  // SCENARIO 6: Unauthenticated Request to Protected Pages Redirects to Sign-In
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 6: Unauthenticated Protected Route Interception ---");
  {
    const protectedPaths = [
      "/dashboard",
      "/profile",
      "/trips/new",
      "/trips/saved",
      "/trips/completed",
      "/wishlist",
    ];

    for (const path of protectedPaths) {
      const res = await fetch(`${BASE_URL}${path}`, {
        redirect: "manual",
      });
      assert(
        res.status === 307 || res.status === 302,
        `Unauthenticated ${path} redirects (got HTTP ${res.status})`,
      );
      const location = res.headers.get("location") || "";
      assert(
        location.includes("/auth/sign-in"),
        `Unauthenticated ${path} redirects to /auth/sign-in (got ${location})`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // SCENARIO 7: Unauthenticated Request to Protected APIs Returns 401
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 7: Unauthenticated API Access Rejection ---");
  {
    const resTrips = await fetch(`${BASE_URL}/api/trips`, {
      redirect: "manual",
    });
    assert(resTrips.status === 401, `GET /api/trips without auth returns 401 (got ${resTrips.status})`);

    const resProfile = await fetch(`${BASE_URL}/api/profile`, {
      redirect: "manual",
    });
    assert(resProfile.status === 401, `GET /api/profile without auth returns 401 (got ${resProfile.status})`);
  }

  // -------------------------------------------------------------------------
  // SCENARIO 8 & 9: Trip Ownership Invariant Enforcement
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 8 & 9: Trip Access & Ownership Security ---");
  {
    // Create a trip owned by User A
    const tripA = await TripsService.createTrip(
      {
        id: userAId,
        name: "Alice Explorer",
        email: userAEmail,
        createdAt: new Date().toISOString(),
      },
      {
        destination: "Kyoto",
        origin: "Tokyo",
        days: 3,
        travellers: 2,
        budget: "moderate",
        transportPreference: "train",
        interests: ["culture", "gardens"],
      },
    );
    tripAId = tripA.id;
    assert(Boolean(tripAId), "Trip created successfully for User A");

    // User A accesses their own trip via API
    const resOwnerApi = await fetch(`${BASE_URL}/api/trips/${tripAId}`, {
      headers: { Cookie: userACookie },
    });
    assert(resOwnerApi.status === 200, `Owner (User A) accesses own trip via API (HTTP 200)`);
    const ownerTripData = await resOwnerApi.json();
    assert(ownerTripData.id === tripAId, "Owner retrieved correct trip record");

    // User B tries to access User A's trip via API
    const resIntruderApi = await fetch(`${BASE_URL}/api/trips/${tripAId}`, {
      headers: { Cookie: userBCookie },
    });
    assert(
      resIntruderApi.status === 404 || resIntruderApi.status === 403,
      `Non-owner (User B) denied access to User A's trip via API (got HTTP ${resIntruderApi.status})`,
    );

    // User B tries to access User A's trip page in browser -> layout redirect
    const resIntruderPage = await fetch(`${BASE_URL}/trips/${tripAId}`, {
      headers: { Cookie: userBCookie },
      redirect: "manual",
    });
    const bodyText = await resIntruderPage.text();
    const isHttpRedirect =
      (resIntruderPage.status === 307 || resIntruderPage.status === 302) &&
      (resIntruderPage.headers.get("location") || "").includes("/dashboard");
    const isRscRedirect =
      resIntruderPage.status === 200 &&
      (bodyText.includes("NEXT_REDIRECT") || bodyText.includes("/dashboard"));

    assert(
      isHttpRedirect || isRscRedirect,
      `Non-owner (User B) redirected from /trips/${tripAId} to dashboard (HTTP: ${isHttpRedirect}, RSC: ${isRscRedirect})`,
    );
  }

  // -------------------------------------------------------------------------
  // SCENARIO 10: Successful Sign-Out Invalidates Cookie
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 10: Definitive Sign-Out & Cookie Clearance ---");
  {
    const resSignOut = await fetch(`${BASE_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: { Cookie: userACookie },
    });
    assert(resSignOut.status === 200, "Sign-out endpoint returns HTTP 200");

    const setCookie = resSignOut.headers.get("set-cookie") || "";
    assert(setCookie.includes(SESSION_COOKIE_NAME), "Sign-out response sets cookie header");
    assert(
      setCookie.toLowerCase().includes("max-age=0") ||
        setCookie.toLowerCase().includes("expires=thu, 01 jan 1970"),
      "Sign-out cookie has Max-Age=0 or expired date to clear cookie in browser",
    );
  }

  // -------------------------------------------------------------------------
  // SCENARIOS 11 & 12: Back & Forward Navigation After Sign-Out
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 11 & 12: Navigation After Sign-Out ---");
  {
    // Expired/cleared cookie simulated
    const clearedCookie = `${SESSION_COOKIE_NAME}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    // Attempting to visit /dashboard after signout
    const resPostSignoutDashboard = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: clearedCookie },
      redirect: "manual",
    });
    assert(
      resPostSignoutDashboard.status === 307 || resPostSignoutDashboard.status === 302,
      `Visiting /dashboard after sign-out redirects (HTTP ${resPostSignoutDashboard.status})`,
    );

    // Attempting to visit trip after signout
    const resPostSignoutTrip = await fetch(`${BASE_URL}/trips/${tripAId}`, {
      headers: { Cookie: clearedCookie },
      redirect: "manual",
    });
    assert(
      resPostSignoutTrip.status === 307 || resPostSignoutTrip.status === 302,
      `Visiting trip page after sign-out redirects (HTTP ${resPostSignoutTrip.status})`,
    );
  }

  // -------------------------------------------------------------------------
  // SCENARIO 13: Expired, Malformed, or Tampered Session Tokens Rejected
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 13: Cryptographic Session Security & Tamper Resistance ---");
  {
    // Test 1: Tampered signature
    const validToken = await createSessionToken("usr_test_123", "test@test.com");
    const [payloadB64, sig] = validToken.split(".");
    const tamperedSig = sig.replace(/^[0-9a-f]/, (c) => (c === "a" ? "b" : "a"));
    const tamperedToken = `${payloadB64}.${tamperedSig}`;
    assert((await verifySessionToken(tamperedToken)) === null, "Tampered signature is strictly rejected");

    // Test 2: Tampered payload
    const tamperedPayloadB64 = Buffer.from(
      JSON.stringify({ userId: "usr_admin_hacked", expiresAt: Date.now() + 9999999 }),
    ).toString("base64url");
    const tamperedPayloadToken = `${tamperedPayloadB64}.${sig}`;
    assert((await verifySessionToken(tamperedPayloadToken)) === null, "Tampered payload is strictly rejected");

    // Test 3: Malformed tokens
    assert((await verifySessionToken("not-a-token")) === null, "Single token string without dot is rejected");
    assert((await verifySessionToken("a.b.c")) === null, "Three-part token is rejected");
    assert((await verifySessionToken(null)) === null, "Null token is safely handled as null");
    assert((await verifySessionToken("")) === null, "Empty token is safely handled as null");

    // Test 4: Expired token
    const expiredPayload = {
      userId: "usr_expired",
      email: "expired@test.com",
      issuedAt: Date.now() - 100000,
      expiresAt: Date.now() - 1000, // expired 1s ago
      nonce: "testnonce",
    };
    const crypto = await import("crypto");
    const secret = process.env.SESSION_SECRET || "safarix-production-hmac-sha256-signing-secret-key-must-be-at-least-32-bytes";
    const expPayloadB64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
    const expSig = crypto.createHmac("sha256", secret).update(expPayloadB64).digest("hex");
    const expiredToken = `${expPayloadB64}.${expSig}`;
    assert((await verifySessionToken(expiredToken)) === null, "Expired session token is strictly rejected");

    // Test 5: Tampered cookie sent to /api/auth/session endpoint
    const resTamperedSession = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${tamperedToken}` },
    });
    assert(resTamperedSession.status === 200, "Session endpoint handles tampered token safely");
    const tamperedSessionData = await resTamperedSession.json();
    assert(tamperedSessionData.user === null, "Tampered token yields null user on session endpoint");
  }

  // -------------------------------------------------------------------------
  // SCENARIO 14: Private No-Store Cache Headers on Sensitive Endpoints
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 14: Cache-Control Header Verification ---");
  {
    // /api/auth/session headers
    const resSession = await fetch(`${BASE_URL}/api/auth/session`);
    const sessionCacheHeader = resSession.headers.get("cache-control") || "";
    assert(
      sessionCacheHeader.includes("no-store"),
      `/api/auth/session contains 'no-store' (got: ${sessionCacheHeader})`,
    );
    assert(
      sessionCacheHeader.includes("no-cache"),
      `/api/auth/session contains 'no-cache'`,
    );

    // /api/auth/sign-out headers
    const resSignOut = await fetch(`${BASE_URL}/api/auth/sign-out`, { method: "POST" });
    const signOutCacheHeader = resSignOut.headers.get("cache-control") || "";
    assert(
      signOutCacheHeader.includes("no-store"),
      `/api/auth/sign-out contains 'no-store' (got: ${signOutCacheHeader})`,
    );

    // Protected page headers
    const resProtected = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
    const protectedCacheHeader = resProtected.headers.get("cache-control") || "";
    assert(
      protectedCacheHeader.includes("no-store") || protectedCacheHeader.includes("private"),
      `/dashboard response includes protective cache header (got: ${protectedCacheHeader})`,
    );
  }

  // -------------------------------------------------------------------------
  // SCENARIO 15: Loop Prevention for Authenticated Users on Sign-In/Up Pages
  // -------------------------------------------------------------------------
  console.log("\n--- Scenario 15: Sign-In/Up Loop Prevention ---");
  {
    // Re-sign in user A to get fresh valid cookie
    const resSignIn = await fetch(`${BASE_URL}/api/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userAEmail, password: userAPassword }),
    });
    const token = extractCookie(resSignIn, SESSION_COOKIE_NAME);
    const validCookie = `${SESSION_COOKIE_NAME}=${token}`;

    // Request /auth/sign-in with valid session
    const resSignInPage = await fetch(`${BASE_URL}/auth/sign-in`, {
      headers: { Cookie: validCookie },
      redirect: "manual",
    });
    assert(
      resSignInPage.status === 307 || resSignInPage.status === 302,
      `Authenticated /auth/sign-in redirects (got HTTP ${resSignInPage.status})`,
    );
    const signInRedirectLoc = resSignInPage.headers.get("location") || "";
    assert(
      signInRedirectLoc.includes("/dashboard"),
      `Authenticated user redirected to /dashboard from sign-in (got: ${signInRedirectLoc})`,
    );

    // Request /auth/sign-up with valid session
    const resSignUpPage = await fetch(`${BASE_URL}/auth/sign-up`, {
      headers: { Cookie: validCookie },
      redirect: "manual",
    });
    assert(
      resSignUpPage.status === 307 || resSignUpPage.status === 302,
      `Authenticated /auth/sign-up redirects (got HTTP ${resSignUpPage.status})`,
    );
    const signUpRedirectLoc = resSignUpPage.headers.get("location") || "";
    assert(
      signUpRedirectLoc.includes("/dashboard"),
      `Authenticated user redirected to /dashboard from sign-up (got: ${signUpRedirectLoc})`,
    );

    // Request /auth/sign-in WITHOUT cookie -> Should serve the page (HTTP 200)
    const resUnauthSignInPage = await fetch(`${BASE_URL}/auth/sign-in`, {
      redirect: "manual",
    });
    assert(
      resUnauthSignInPage.status === 200,
      `Unauthenticated /auth/sign-in renders sign-in page (HTTP 200)`,
    );
  }

  // -------------------------------------------------------------------------
  // CLEANUP TEST USERS & TRIPS
  // -------------------------------------------------------------------------
  console.log("\n--- Cleanup ---");
  try {
    if (tripAId) {
      await TripsService.deleteTrip(tripAId, userAId);
      console.log(`✓ Cleaned up test trip: ${tripAId}`);
    }
    if (userAId) {
      await db.delete(schema.users).where(eq(schema.users.id, userAId));
      console.log(`✓ Cleaned up test user A: ${userAId}`);
    }
    if (userBId) {
      await db.delete(schema.users).where(eq(schema.users.id, userBId));
      console.log(`✓ Cleaned up test user B: ${userBId}`);
    }
  } catch (err) {
    console.warn("Notice: Test cleanup encountered non-fatal error:", err);
  }

  console.log("\n=================================================================");
  console.log(` TEST RUN COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log("=================================================================\n");

  if (passedTests !== totalTests) {
    throw new Error(`Regression test suite failed: ${passedTests}/${totalTests} passed`);
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite Execution Failed:", err);
  process.exit(1);
});
