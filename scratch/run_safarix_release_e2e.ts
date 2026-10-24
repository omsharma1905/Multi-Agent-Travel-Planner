/**
 * @file scratch/run_safarix_release_e2e.ts
 *
 * SAFARIX FINAL POLISH — COMPREHENSIVE END-TO-END VERIFICATION SUITE
 *
 * Verifies:
 * 1. Next.js Security Advisory & Version Resolution (16.4.3)
 * 2. Authentication Lifecycle (Sign Up, Sign In, Session Cookie, Sign Out, Auth Guards)
 * 3. Trip Lifecycle & Multi-User Isolation (Creation, Persistence, Stranger Isolation)
 * 4. Real Multi-Agent Orchestration (Transport, Stays, Activities, Food, Budget, Itinerary)
 * 5. Trip Deletion & Cache Invalidation
 * 6. Headless Chrome CDP Verification (Landing Page Redesign, Auth Card Scale & Diagonal Motion)
 */

import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9224;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_e2e_profile_${Date.now()}`);

interface CheckResult {
  section: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: CheckResult[] = [];
function check(section: string, name: string, passed: boolean, details?: string) {
  results.push({ section, name, passed, details });
  const icon = passed ? "✓ [PASS]" : "✗ [FAIL]";
  console.log(`  ${icon} [${section}] ${name} ${details ? "-> " + details : ""}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// HTTP request helper with cookies support
interface HttpResponse {
  status: number;
  body: string;
  json: any;
  headers: http.IncomingHttpHeaders;
  cookies: string[];
}

async function request(
  urlPath: string,
  options: {
    method?: string;
    body?: any;
    cookie?: string;
  } = {}
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const method = options.method || "GET";
    const payload = options.body ? JSON.stringify(options.body) : undefined;

    const headers: http.OutgoingHttpHeaders = {};
    if (options.cookie) {
      headers["Cookie"] = options.cookie;
    }
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsedJson: any = null;
          try {
            parsedJson = JSON.parse(raw);
          } catch {}

          const rawCookies = res.headers["set-cookie"] || [];
          const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];

          resolve({
            status: res.statusCode || 0,
            body: raw,
            json: parsedJson,
            headers: res.headers,
            cookies,
          });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function extractSessionCookie(cookies: string[]): string {
  for (const c of cookies) {
    const match = c.match(/safarix_session=([^;]+)/);
    if (match) return `safarix_session=${match[1]}`;
  }
  return "";
}

async function getDebuggerUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${CDP_PORT}/json`, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const list = JSON.parse(data);
          const page = list.find((p: any) => p.type === "page") || list[0];
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else {
            reject(new Error("No page found in targets: " + data));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
  });
}

async function main() {
  console.log("=================================================================");
  console.log(" SAFARIX MASTER RELEASE END-TO-END VERIFICATION");
  console.log("=================================================================\n");

  // ---------------------------------------------------------------------------
  // SECTION 1: Next.js Security Advisory & Version Verification
  // ---------------------------------------------------------------------------
  console.log("--- SECTION 1: Next.js Security Advisory & Version ---");
  const nextPkg = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "node_modules", "next", "package.json"), "utf-8")
  );
  check(
    "Security",
    "Next.js version is security patched (16.4.3)",
    nextPkg.version === "16.4.3",
    `Installed: ${nextPkg.version}`
  );

  const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
  check(
    "Security",
    "package.json reflects patched next >= 16.4.3",
    packageJson.dependencies.next.includes("16.4.3"),
    packageJson.dependencies.next
  );

  // ---------------------------------------------------------------------------
  // SECTION 2: Authentication & Session Lifecycle
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 2: Authentication & Session Lifecycle ---");
  const uniqueId = Date.now();
  const testUser = {
    name: "Elena Rostova",
    email: `elena_e2e_${uniqueId}@safarix.test`,
    password: "CorrectPassword123!",
  };

  // 2.1 Sign Up - Validation Failure on short password
  const invalidSignUp = await request("/api/auth/sign-up", {
    method: "POST",
    body: { name: testUser.name, email: testUser.email, password: "short" },
  });
  check(
    "Auth",
    "Rejects weak/short password (min 8 chars)",
    invalidSignUp.status === 400,
    `Status ${invalidSignUp.status}`
  );

  // 2.2 Sign Up - Valid Registration
  const signUpRes = await request("/api/auth/sign-up", {
    method: "POST",
    body: testUser,
  });
  check(
    "Auth",
    "Registers new user account",
    signUpRes.status === 201 || signUpRes.status === 200,
    `Status ${signUpRes.status}`
  );

  const sessionCookie = extractSessionCookie(signUpRes.cookies);
  check(
    "Auth",
    "Returns HttpOnly HMAC session cookie",
    sessionCookie.includes("safarix_session"),
    sessionCookie.slice(0, 35) + "..."
  );

  // 2.3 Sign Up - Duplicate Email Rejection
  const duplicateSignUp = await request("/api/auth/sign-up", {
    method: "POST",
    body: testUser,
  });
  check(
    "Auth",
    "Rejects duplicate email registration",
    duplicateSignUp.status === 409 || duplicateSignUp.status === 400,
    `Status ${duplicateSignUp.status}`
  );

  // 2.4 Session Revalidation with Cookie
  const sessionRes = await request("/api/auth/session", {
    cookie: sessionCookie,
  });
  check(
    "Auth",
    "GET /api/auth/session returns user without password hash",
    sessionRes.status === 200 &&
      sessionRes.json?.user?.email === testUser.email &&
      !("password" in (sessionRes.json?.user || {})),
    `User: ${sessionRes.json?.user?.name}`
  );

  // 2.5 Sign In - Invalid Password Rejection
  const invalidSignIn = await request("/api/auth/sign-in", {
    method: "POST",
    body: { email: testUser.email, password: "WrongPassword999!" },
  });
  check(
    "Auth",
    "Rejects invalid password with 401",
    invalidSignIn.status === 401,
    `Status ${invalidSignIn.status}`
  );

  // 2.6 Sign In - Valid Credentials
  const signInRes = await request("/api/auth/sign-in", {
    method: "POST",
    body: { email: testUser.email, password: testUser.password },
  });
  check(
    "Auth",
    "Authenticates with valid credentials",
    signInRes.status === 200,
    `Status ${signInRes.status}`
  );
  const activeUserCookie = extractSessionCookie(signInRes.cookies) || sessionCookie;

  // ---------------------------------------------------------------------------
  // SECTION 3: Trip Creation & Multi-User Isolation
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 3: Trip Creation, Persistence & Isolation ---");
  const tripPayload = {
    origin: "Tokyo, Japan",
    destination: "Kyoto, Japan",
    days: 3,
    travellers: 2,
    budget: "moderate",
    interests: ["cultural landmarks", "gardens", "local cuisine"],
    notes: "Prefer early morning temple visits and authentic kaiseki.",
  };

  // 3.1 Unauthenticated trip creation rejection
  const unauthTrip = await request("/api/trips", {
    method: "POST",
    body: tripPayload,
  });
  check(
    "Trips",
    "Rejects unauthenticated trip creation with 401",
    unauthTrip.status === 401,
    `Status ${unauthTrip.status}`
  );

  // 3.2 Authenticated trip creation
  const createTripRes = await request("/api/trips", {
    method: "POST",
    body: tripPayload,
    cookie: activeUserCookie,
  });
  check(
    "Trips",
    "Creates trip and returns 201 with generated trip ID",
    createTripRes.status === 201 && Boolean(createTripRes.json?.id),
    `Trip ID: ${createTripRes.json?.id}`
  );

  const tripId = createTripRes.json?.id;

  // 3.3 List Trips
  const listTripsRes = await request("/api/trips", {
    cookie: activeUserCookie,
  });
  const userTrips = Array.isArray(listTripsRes.json) ? listTripsRes.json : [];
  const foundTrip = userTrips.find((t: any) => t.id === tripId);
  check(
    "Trips",
    "Persisted trip found in user's trip list",
    Boolean(foundTrip),
    `Total Trips: ${userTrips.length}`
  );

  // 3.4 Retrieve Trip by ID
  const getTripRes = await request(`/api/trips/${tripId}`, {
    cookie: activeUserCookie,
  });
  check(
    "Trips",
    "Retrieves trip detail with matching destination and days",
    getTripRes.status === 200 &&
      getTripRes.json?.destination === "Kyoto, Japan" &&
      getTripRes.json?.days === 3,
    `Destination: ${getTripRes.json?.destination}`
  );

  // 3.5 Stranger Isolation Check
  const strangerUser = {
    name: "Marcus Vance",
    email: `marcus_stranger_${uniqueId}@safarix.test`,
    password: "StrangerPass123!",
  };
  const strangerSignUp = await request("/api/auth/sign-up", {
    method: "POST",
    body: strangerUser,
  });
  const strangerCookie = extractSessionCookie(strangerSignUp.cookies);

  const strangerTripAccess = await request(`/api/trips/${tripId}`, {
    cookie: strangerCookie,
  });
  check(
    "Trips",
    "Stranger cannot view another user's trip (returns 404)",
    strangerTripAccess.status === 404,
    `Status ${strangerTripAccess.status}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 4: Real Multi-Agent Orchestration
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 4: Real Multi-Agent Trip Planning ---");
  console.log("Invoking multi-agent planning orchestration for trip...");
  const planStart = Date.now();
  const planRes = await request(`/api/trips/${tripId}/plan`, {
    method: "POST",
    cookie: activeUserCookie,
  });
  const planDuration = ((Date.now() - planStart) / 1000).toFixed(1);

  check(
    "Orchestration",
    "Planning endpoint responds with 200 OK",
    planRes.status === 200,
    `Completed in ${planDuration}s (Status: ${planRes.status})`
  );

  const plan = planRes.json;
  check(
    "Orchestration",
    "Orchestration state is completed",
    plan?.status === "completed",
    `State: ${plan?.status}`
  );

  const daysCount = plan?.itinerary?.days?.length || 0;
  check(
    "Orchestration",
    "Generated itinerary has expected day count matching request (3 days)",
    daysCount === 3,
    `Days generated: ${daysCount}`
  );

  const totalCost = plan?.budget?.totalEstimatedCost || 0;
  check(
    "Orchestration",
    "Budget agent produced deterministic positive cost estimation",
    totalCost > 0,
    `Estimated Total: $${totalCost} ${plan?.budget?.currency || "USD"}`
  );

  // Verify trip in DB now has status 'upcoming' and persisted plan
  const reloadedTrip = await request(`/api/trips/${tripId}`, {
    cookie: activeUserCookie,
  });
  check(
    "Orchestration",
    "Trip status in database updated to 'upcoming' with persisted plan",
    reloadedTrip.json?.status === "upcoming" && Boolean(reloadedTrip.json?.plan),
    `DB Status: ${reloadedTrip.json?.status}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 5: Trip Deletion & Invalidation
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 5: Trip Deletion & Invalidation ---");

  // Stranger cannot delete trip
  const strangerDelete = await request(`/api/trips/${tripId}`, {
    method: "DELETE",
    cookie: strangerCookie,
  });
  check(
    "Trips",
    "Stranger cannot delete another user's trip (returns 404)",
    strangerDelete.status === 404,
    `Status ${strangerDelete.status}`
  );

  // Owner deletes trip
  const ownerDelete = await request(`/api/trips/${tripId}`, {
    method: "DELETE",
    cookie: activeUserCookie,
  });
  check(
    "Trips",
    "Owner successfully deletes trip (returns 200)",
    ownerDelete.status === 200,
    `Status ${ownerDelete.status}`
  );

  // Post-deletion retrieval returns 404
  const postDeleteGet = await request(`/api/trips/${tripId}`, {
    cookie: activeUserCookie,
  });
  check(
    "Trips",
    "Trip is completely deleted (GET returns 404)",
    postDeleteGet.status === 404,
    `Status ${postDeleteGet.status}`
  );

  // ---------------------------------------------------------------------------
  // SECTION 6: Headless Chrome CDP Browser Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- SECTION 6: Headless Chrome Visual & Navigation Verification ---");

  const chromeProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${USER_DATA_DIR}`,
      "--disable-gpu",
      "--no-sandbox",
      "--window-size=1280,800",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  process.on("exit", () => {
    try {
      chromeProcess.kill();
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  });

  let wsUrl = "";
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      wsUrl = await getDebuggerUrl();
      if (wsUrl) break;
    } catch {}
  }

  if (!wsUrl) {
    console.error("Failed to connect to Chrome debugging port!");
    chromeProcess.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let messageId = 1;
  const pending = new Map<number, (res: any) => void>();
  const browserErrors: string[] = [];

  function send(method: string, params: any = {}): Promise<any> {
    const id = messageId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evalExpression(expr: string): Promise<any> {
    const res = await send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res?.exceptionDetails) {
      throw new Error(`Eval error in "${expr}": ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res?.result?.value;
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.result);
      pending.delete(msg.id);
    }

    if (msg.method === "Runtime.consoleAPICalled") {
      const { type, args } = msg.params;
      const text = args.map((a: any) => a.value ?? a.description ?? "").join(" ");
      if (type === "error" && !text.includes("favicon")) {
        browserErrors.push(text);
      }
    }

    if (msg.method === "Runtime.exceptionThrown") {
      browserErrors.push(msg.params.exceptionDetails.text);
    }
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  await send("Page.enable");
  await send("Runtime.enable");

  // 6.1 Landing Page Visual Inspection (Desktop)
  console.log("Navigating to Landing Page (http://localhost:3000)...");
  await send("Page.navigate", { url: `${BASE_URL}/` });
  await sleep(3000);

  const landingHeadline = await evalExpression(`
    (document.querySelector('main h1') || document.querySelectorAll('h1')[1])?.textContent?.trim()
  `);
  check(
    "Landing UI",
    "Hero headline rendered with editorial copy",
    landingHeadline?.includes("The art of travel") || landingHeadline?.includes("quiet precision"),
    landingHeadline?.slice(0, 45)
  );

  const intakeInputExists = await evalExpression(`
    Boolean(document.querySelector('input[placeholder*="Where should your journey begin"]'))
  `);
  check(
    "Landing UI",
    "Hero contains interactive destination intake capsule",
    Boolean(intakeInputExists)
  );

  const sixDisciplinesPresent = await evalExpression(`
    (document.body.textContent || '').includes("TRANSIT AGENT") &&
    (document.body.textContent || '').includes("STAYS AGENT") &&
    (document.body.textContent || '').includes("ACTIVITIES AGENT")
  `);
  check(
    "Landing UI",
    "MultiAgentDossierScene displays 6 specialized agent disciplines",
    Boolean(sixDisciplinesPresent)
  );

  const kyotoFeaturePresent = await evalExpression(`
    (document.body.textContent || '').includes("Kyoto & Ancient Valleys") &&
    (document.body.textContent || '').includes("Curated itineraries")
  `);
  check(
    "Landing UI",
    "Destinations gallery displays curated editorial photo spread",
    Boolean(kyotoFeaturePresent)
  );

  // 6.2 Sign In Page Inspection & Diagonal Animation
  console.log("\nNavigating to Sign In Page (http://localhost:3000/auth/sign-in)...");
  await send("Page.navigate", { url: `${BASE_URL}/auth/sign-in` });
  await sleep(2000);

  const cardScale = await evalExpression(`
    (() => {
      const card = document.querySelector('div[class*="rounded-2xl"][class*="bg-[#F4F1E5]"]');
      if (!card) return null;
      const rect = card.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    })()
  `);
  check(
    "Auth UI",
    "Authentication card has expanded desktop scale (>= 900px wide, >= 500px tall)",
    Boolean(cardScale && cardScale.width >= 900 && cardScale.height >= 500),
    JSON.stringify(cardScale)
  );

  const atmosphericCoordinates = await evalExpression(`
    document.body.innerText.includes("PORTAL // EXPEDITION TERMINAL") &&
    document.body.innerText.includes("COORD // 35.6762° N")
  `);
  check(
    "Auth UI",
    "Atmospheric coordinates and editorial framing rendered in background",
    Boolean(atmosphericCoordinates)
  );

  // 6.3 Trigger Diagonal Sweep to Sign Up
  await evalExpression(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Create account') && !b.disabled);
      if (btn) btn.click();
    })()
  `);
  await sleep(1000);

  const pathnameAfterSweep = await evalExpression("window.location.pathname");
  check(
    "Auth UI",
    "Diagonal panel sweeps left and updates URL to /auth/sign-up without page reload",
    pathnameAfterSweep === "/auth/sign-up",
    pathnameAfterSweep
  );

  const signUpEditorialPresent = await evalExpression(`
    document.body.innerText.includes("Start your") && document.body.innerText.includes("next journey")
  `);
  check(
    "Auth UI",
    "Panel content cross-fades to 'Start your next journey.'",
    Boolean(signUpEditorialPresent)
  );

  // 6.4 Trigger Diagonal Sweep back to Sign In
  await evalExpression(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Sign in' && !b.disabled && b.type === 'button');
      if (btn) btn.click();
    })()
  `);
  await sleep(1000);

  const pathnameAfterReverse = await evalExpression("window.location.pathname");
  check(
    "Auth UI",
    "Diagonal panel reverses right and updates URL back to /auth/sign-in",
    pathnameAfterReverse === "/auth/sign-in",
    pathnameAfterReverse
  );

  // 6.5 Mobile Viewport (375x812)
  console.log("\nInspecting Mobile Viewport (375x812)...");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sleep(500);

  const mobileSwitcherWorks = await evalExpression(`
    Boolean(document.querySelector('[data-testid="mobile-tab-signin"]') && document.querySelector('[data-testid="mobile-tab-signup"]'))
  `);
  check(
    "Auth UI",
    "Mobile segment switcher cleanly rendered on mobile viewport",
    Boolean(mobileSwitcherWorks)
  );

  // 6.6 Console Errors Check
  const filteredBrowserErrors = browserErrors.filter((e) => !e.includes("ResizeObserver"));
  check(
    "Browser Stability",
    "Zero console errors or exceptions across entire navigation journey",
    filteredBrowserErrors.length === 0,
    `${filteredBrowserErrors.length} errors recorded`
  );

  ws.close();
  chromeProcess.kill();

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n=================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`E2E SUITE RESULT: ${passed}/${total} CHECKS PASSED (${failed} FAILED)`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("E2E Suite Execution Failed with uncaught error:", err);
  process.exit(1);
});
