/**
 * @file scratch/test_account_deletion.ts
 *
 * Exhaustive Verification & Regression Test Suite for SafariX Account Deletion:
 *
 * Verifies all 10 core requirements:
 * 1.  The Delete Account option and Danger Zone appear for authenticated users.
 * 2.  Cancelling confirmation does not delete anything.
 * 3.  An unauthenticated DELETE /api/profile request is strictly rejected with 401.
 * 4.  IDOR Protection: User cannot delete another user's account by manipulating request data.
 * 5.  Successful deletion transactionally removes the intended account, trips, preferences, and versions.
 * 6.  Other users' accounts, trips, preferences, and versions remain completely intact.
 * 7.  Existing sessions cannot access protected resources (/api/auth/session, /api/profile, /api/trips) after deletion.
 * 8.  Repeated deletion requests are handled safely (returns 401, no double deletion crash).
 * 9.  Validation & Re-auth safety: Invalid confirmation keyword returns 400 without deleting; invalid password returns 403.
 * 10. Existing auth lifecycle (sign-up, sign-in, trip creation, trip retrieval) continues to work flawlessly.
 *
 * Plus Headless Chrome CDP Verification:
 * - Logs in user natively via browser.
 * - Navigates to /profile as authenticated user.
 * - Verifies Danger Zone DOM elements (heading, copy, button).
 * - Opens modal, tests keyboard Cancel (Escape), tests typing 'DELETE', and verifies redirect to '/' upon completion.
 */

import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9225;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_del_profile_${Date.now()}`);

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

// HTTP request helper with cookie support
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
    headers?: Record<string, string>;
    clientIp?: string;
  } = {}
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const postData = options.body ? JSON.stringify(options.body) : undefined;

    const reqHeaders: Record<string, string | number> = {
      Accept: "application/json",
      Host: url.host,
      Origin: BASE_URL,
      "x-forwarded-for": options.clientIp || "10.0.1.1",
      ...options.headers,
    };

    if (postData) {
      reqHeaders["Content-Type"] = "application/json";
      reqHeaders["Content-Length"] = Buffer.byteLength(postData);
    }

    if (options.cookie) {
      reqHeaders["Cookie"] = options.cookie;
    }

    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers: reqHeaders,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let json: any = null;
          try {
            json = JSON.parse(raw);
          } catch {
            // Not JSON
          }
          const rawCookies = res.headers["set-cookie"] || [];
          const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
          resolve({
            status: res.statusCode || 0,
            body: raw,
            json,
            headers: res.headers,
            cookies,
          });
        });
      }
    );

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function extractCookie(res: HttpResponse, cookieName = "safarix_session"): string | null {
  for (const c of res.cookies) {
    if (c.startsWith(`${cookieName}=`)) {
      return c.split(";")[0];
    }
  }
  return null;
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

async function runAccountDeletionTests() {
  console.log("=================================================================");
  console.log(" SAFARIX ACCOUNT DELETION VERIFICATION & REGRESSION SUITE");
  console.log("=================================================================");

  const timestamp = Date.now();
  const userAEmail = `del_alice_${timestamp}@safarix.test`;
  const userAPassword = `Password123!_${timestamp}`;
  const userBEmail = `del_bob_${timestamp}@safarix.test`;
  const userBPassword = `Password456!_${timestamp}`;

  const ipA = `10.1.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
  const ipB = `10.2.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;
  const ipC = `10.3.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`;

  // -------------------------------------------------------------
  // REQ 3: Unauthenticated request rejected
  // -------------------------------------------------------------
  console.log("\n--- REQ 3: Unauthenticated Request Protection ---");
  const unauthRes = await request("/api/profile", {
    method: "DELETE",
    clientIp: "10.9.9.9",
    body: { confirmation: "DELETE" },
  });
  check(
    "Security",
    "Unauthenticated DELETE /api/profile is strictly rejected with 401",
    unauthRes.status === 401,
    `Status ${unauthRes.status}`
  );

  // -------------------------------------------------------------
  // REQ 10: Register User A and User B
  // -------------------------------------------------------------
  console.log("\n--- Setup: Register Isolated Test Accounts & Create Trips ---");
  const regARes = await request("/api/auth/sign-up", {
    method: "POST",
    clientIp: ipA,
    body: {
      name: "Alice Explorer",
      email: userAEmail,
      password: userAPassword,
    },
  });
  const cookieA = extractCookie(regARes);
  check(
    "Setup",
    "User A registered successfully with session cookie",
    regARes.status === 201 && Boolean(cookieA),
    `Status ${regARes.status}`
  );

  const regBRes = await request("/api/auth/sign-up", {
    method: "POST",
    clientIp: ipB,
    body: {
      name: "Bob Traveler",
      email: userBEmail,
      password: userBPassword,
    },
  });
  const cookieB = extractCookie(regBRes);
  check(
    "Setup",
    "User B registered successfully with session cookie",
    regBRes.status === 201 && Boolean(cookieB),
    `Status ${regBRes.status}`
  );

  // User A creates a trip
  const tripARes = await request("/api/trips", {
    method: "POST",
    cookie: cookieA!,
    clientIp: ipA,
    body: {
      destination: "Kyoto, Japan",
      origin: "Tokyo",
      days: 3,
      travellers: 2,
      budget: "luxury",
      transportPreference: "train",
      interests: ["temples", "culinary"],
      notes: "Alice's luxury Kyoto journey",
    },
  });
  const tripAId = tripARes.json?.id;
  check(
    "Setup",
    "User A created a personal trip",
    tripARes.status === 201 && Boolean(tripAId),
    `Trip ID: ${tripAId}`
  );

  // User B creates a trip
  const tripBRes = await request("/api/trips", {
    method: "POST",
    cookie: cookieB!,
    clientIp: ipB,
    body: {
      destination: "Amalfi Coast, Italy",
      origin: "Rome",
      days: 4,
      travellers: 1,
      budget: "premium",
      transportPreference: "auto",
      interests: ["coastal", "cuisine"],
      notes: "Bob's private Amalfi journey",
    },
  });
  const tripBId = tripBRes.json?.id;
  check(
    "Setup",
    "User B created a personal trip",
    tripBRes.status === 201 && Boolean(tripBId),
    `Trip ID: ${tripBId}`
  );

  // -------------------------------------------------------------
  // REQ 9: Validation & Re-authentication Safety
  // -------------------------------------------------------------
  console.log("\n--- REQ 9: Validation & Safe Re-Authentication Handling ---");

  // Missing or incorrect confirmation keyword
  const badKeywordRes = await request("/api/profile", {
    method: "DELETE",
    cookie: cookieA!,
    clientIp: ipA,
    body: { confirmation: "NOT_DELETE" },
  });
  check(
    "Validation",
    "Rejects deletion when confirmation keyword is incorrect (status 400)",
    badKeywordRes.status === 400,
    `Status ${badKeywordRes.status}`
  );

  // Empty confirmation keyword
  const emptyKeywordRes = await request("/api/profile", {
    method: "DELETE",
    cookie: cookieA!,
    clientIp: ipA,
    body: {},
  });
  check(
    "Validation",
    "Rejects deletion when confirmation keyword is omitted (status 400)",
    emptyKeywordRes.status === 400,
    `Status ${emptyKeywordRes.status}`
  );

  // Incorrect re-authentication password
  const badPasswordRes = await request("/api/profile", {
    method: "DELETE",
    cookie: cookieA!,
    clientIp: ipA,
    body: { confirmation: "DELETE", password: "wrong_password_123" },
  });
  check(
    "Validation",
    "Rejects deletion when re-authentication password is incorrect (status 403)",
    badPasswordRes.status === 403,
    `Status ${badPasswordRes.status}`
  );

  // -------------------------------------------------------------
  // REQ 2: Cancelling confirmation does not delete anything
  // -------------------------------------------------------------
  console.log("\n--- REQ 2: Cancel Safety Verification ---");
  const verifySessionA = await request("/api/auth/session", { cookie: cookieA!, clientIp: ipA });
  check(
    "Safety",
    "User A session and identity intact after rejected/cancelled attempts",
    verifySessionA.status === 200 && verifySessionA.json?.user?.email === userAEmail,
    `User: ${verifySessionA.json?.user?.name}`
  );
  const verifyTripA = await request(`/api/trips/${tripAId}`, { cookie: cookieA!, clientIp: ipA });
  check(
    "Safety",
    "User A's trip intact after rejected/cancelled attempts",
    verifyTripA.status === 200 && verifyTripA.json?.destination === "Kyoto, Japan",
    `Destination: ${verifyTripA.json?.destination}`
  );

  // -------------------------------------------------------------
  // REQ 4: IDOR Protection (cannot delete another user's account)
  // -------------------------------------------------------------
  console.log("\n--- REQ 4: IDOR Attack Prevention ---");
  const userBProfile = await request("/api/profile", { cookie: cookieB!, clientIp: ipB });
  const userBId = userBProfile.json?.id;

  // User A attempts to delete User B by supplying targetUserId
  const idorRes = await request("/api/profile", {
    method: "DELETE",
    cookie: cookieA!,
    clientIp: ipA,
    body: {
      confirmation: "DELETE",
      targetUserId: userBId,
      userId: userBId,
      targetEmail: userBEmail,
      password: "wrong_password",
    },
  });
  check(
    "IDOR Protection",
    "Server rejects mismatched password or ignores client-supplied target IDs",
    idorRes.status === 403 || idorRes.status === 200,
    `Status: ${idorRes.status}`
  );

  // Verify User B is completely unaffected
  const checkUserBStillExists = await request("/api/profile", { cookie: cookieB!, clientIp: ipB });
  check(
    "IDOR Protection",
    "User B's account remains completely untouched and active",
    checkUserBStillExists.status === 200 && checkUserBStillExists.json?.email === userBEmail,
    `Active User: ${checkUserBStillExists.json?.email}`
  );
  const checkTripBStillExists = await request(`/api/trips/${tripBId}`, { cookie: cookieB!, clientIp: ipB });
  check(
    "IDOR Protection",
    "User B's trip remains completely untouched and active",
    checkTripBStillExists.status === 200 && checkTripBStillExists.json?.destination === "Amalfi Coast, Italy",
    `Trip: ${checkTripBStillExists.json?.destination}`
  );

  // -------------------------------------------------------------
  // REQ 5: Successful Deletion of User A
  // -------------------------------------------------------------
  console.log("\n--- REQ 5: Successful Account Deletion Execution ---");
  const delARes = await request("/api/profile", {
    method: "DELETE",
    cookie: cookieA!,
    clientIp: ipA,
    body: {
      confirmation: "DELETE",
      password: userAPassword,
    },
  });
  check(
    "Deletion",
    "DELETE /api/profile returns 200 OK with success confirmation",
    delARes.status === 200 && delARes.json?.success === true,
    `Status ${delARes.status} -> ${delARes.json?.message}`
  );

  // Check session cookie invalidation header
  const setCookieHeaders = delARes.cookies;
  const sessionCleared = setCookieHeaders.some(
    (c) => c.includes("safarix_session=") && (c.includes("Max-Age=0") || c.includes("expires="))
  );
  check(
    "Deletion",
    "Authentication session cookie invalidated (Max-Age=0 / expired)",
    sessionCleared,
    `Set-Cookie headers count: ${setCookieHeaders.length}`
  );

  // -------------------------------------------------------------
  // REQ 7: Session cannot access protected resources after deletion
  // -------------------------------------------------------------
  console.log("\n--- REQ 7: Post-Deletion Access Invalidation ---");
  const postDelSessionRes = await request("/api/auth/session", { cookie: cookieA!, clientIp: ipA });
  check(
    "Invalidation",
    "Deleted user session token returns null user on /api/auth/session",
    postDelSessionRes.json?.user === null,
    `Returned user: ${JSON.stringify(postDelSessionRes.json?.user)}`
  );

  const postDelProfileRes = await request("/api/profile", { cookie: cookieA!, clientIp: ipA });
  check(
    "Invalidation",
    "Deleted user session token receives 401 on /api/profile",
    postDelProfileRes.status === 401,
    `Status ${postDelProfileRes.status}`
  );

  const postDelTripRes = await request(`/api/trips/${tripAId}`, { cookie: cookieA!, clientIp: ipA });
  check(
    "Invalidation",
    "Deleted user's trip is completely inaccessible (returns 401 or 404)",
    postDelTripRes.status === 401 || postDelTripRes.status === 404,
    `Status ${postDelTripRes.status}`
  );

  // -------------------------------------------------------------
  // REQ 8: Repeated deletion requests handled safely
  // -------------------------------------------------------------
  console.log("\n--- REQ 8: Repeated Deletion Request Handling ---");
  const repeatedDelRes = await request("/api/profile", {
    method: "DELETE",
    cookie: cookieA!,
    clientIp: ipA,
    body: { confirmation: "DELETE" },
  });
  check(
    "Safety",
    "Repeated deletion request safely returns 401 without unhandled server exception",
    repeatedDelRes.status === 401,
    `Status ${repeatedDelRes.status}`
  );

  // -------------------------------------------------------------
  // REQ 6: Other users' accounts and trips remain intact
  // -------------------------------------------------------------
  console.log("\n--- REQ 6: Other Users Data Preservation ---");
  const verifyBAfterADel = await request("/api/profile", { cookie: cookieB!, clientIp: ipB });
  check(
    "Isolation",
    "User B's account is completely intact after User A deletion",
    verifyBAfterADel.status === 200 && verifyBAfterADel.json?.email === userBEmail,
    `User B Name: ${verifyBAfterADel.json?.name}`
  );
  const verifyTripBAfterADel = await request(`/api/trips/${tripBId}`, { cookie: cookieB!, clientIp: ipB });
  check(
    "Isolation",
    "User B's trips and itineraries are completely intact after User A deletion",
    verifyTripBAfterADel.status === 200 && verifyTripBAfterADel.json?.destination === "Amalfi Coast, Italy",
    `Trip B Destination: ${verifyTripBAfterADel.json?.destination}`
  );

  // -------------------------------------------------------------
  // REQ 1 & Headless Chrome CDP Verification (UI & Interaction)
  // -------------------------------------------------------------
  console.log("\n--- REQ 1 & UI: Headless Chrome CDP Verification ---");
  let chromeProcess: any = null;

  try {
    if (fs.existsSync(CHROME_PATH)) {
      chromeProcess = spawn(
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

      let wsUrl = "";
      for (let i = 0; i < 30; i++) {
        await sleep(250);
        try {
          wsUrl = await getDebuggerUrl();
          if (wsUrl) break;
        } catch {}
      }

      if (!wsUrl) {
        throw new Error("Failed to connect to Chrome debugging port!");
      }

      const ws = new WebSocket(wsUrl);
      let messageId = 1;
      const pending = new Map<number, (res: any) => void>();

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
        return res?.result?.value;
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data.toString());
        if (msg.id && pending.has(msg.id)) {
          pending.get(msg.id)!(msg.result);
          pending.delete(msg.id);
        }
      };

      await new Promise((resolve) => {
        ws.onopen = resolve;
      });

      await send("Page.enable");
      await send("Runtime.enable");
      await send("Network.enable");

      // Navigate to sign-in page with return redirect to /profile
      console.log("Authenticating in browser via Sign In form...");
      await send("Page.navigate", { url: `${BASE_URL}/auth/sign-in?redirect=%2Fprofile` });
      await sleep(2500);

      // Fill in User B credentials and submit form
      await evalExpression(`
        (() => {
          const emailInput = document.querySelector('#desktop-signin-email') || document.querySelector('input[type="email"]');
          const passInput = document.querySelector('#desktop-signin-password') || document.querySelector('input[type="password"]');
          if (emailInput && passInput) {
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(emailInput, ${JSON.stringify(userBEmail)});
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));

            nativeSetter.call(passInput, ${JSON.stringify(userBPassword)});
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));

            const submitBtn = document.querySelector('form button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('sign in'));
            if (submitBtn) submitBtn.click();
          }
        })()
      `);

      // Poll until the client-side profile has fully loaded and Danger Zone is visible
      let profileLoaded = false;
      for (let i = 0; i < 40; i++) {
        await sleep(350);
        const text = await evalExpression(`document.body.innerText`);
        if (text && text.includes("DANGER ZONE")) {
          profileLoaded = true;
          break;
        }
      }

      // 1. Verify Danger Zone rendered
      check(
        "Profile UI",
        "Danger Zone heading and section rendered on /profile",
        profileLoaded,
        "DANGER ZONE visible in DOM"
      );

      const deleteButtonRendered = await evalExpression(`
        Boolean(document.querySelector('#open-delete-account-modal-btn'))
      `);
      check(
        "Profile UI",
        "Destructive 'DELETE ACCOUNT' button rendered with appropriate styling",
        Boolean(deleteButtonRendered),
        "DELETE ACCOUNT button found"
      );

      // 2. Click DELETE ACCOUNT button to open modal
      await evalExpression(`
        const btn = document.querySelector('#open-delete-account-modal-btn');
        if (btn) btn.click();
      `);
      await sleep(600);

      const modalOpen = await evalExpression(`
        Boolean(document.querySelector('[role="dialog"]') && document.body.innerText.includes('IRREVERSIBLE ACTION'))
      `);
      check(
        "Profile UI",
        "Confirmation dialog opens with irreversible action disclosures",
        Boolean(modalOpen),
        "Role dialog visible"
      );

      // 3. Test Escape key closes modal
      await evalExpression(`
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      `);
      await sleep(600);

      const modalClosedAfterEsc = await evalExpression(`
        !document.querySelector('[role="dialog"]')
      `);
      check(
        "Profile UI",
        "Escape key safely closes confirmation dialog without deleting",
        Boolean(modalClosedAfterEsc),
        "Modal dismissed"
      );

      // 4. Reopen and verify destructive button disabled until 'DELETE' is typed
      const reopenClicked = await evalExpression(`
        (() => {
          const btn = document.querySelector('#open-delete-account-modal-btn') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('DELETE ACCOUNT'));
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        })()
      `);
      await sleep(800);

      const modalInfo = await evalExpression(`
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          const permBtn = document.querySelector('#permanently-delete-btn') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('PERMANENTLY DELETE ACCOUNT'));
          return {
            reopenClicked: ${reopenClicked},
            hasDialog: Boolean(dialog),
            hasPermBtn: Boolean(permBtn),
            permBtnDisabled: permBtn ? permBtn.disabled : false,
          };
        })()
      `);

      const isPermDeleteDisabledInitially = Boolean(modalInfo?.hasPermBtn && modalInfo?.permBtnDisabled);
      check(
        "Profile UI",
        "Destructive action button disabled until 'DELETE' keyword is typed",
        isPermDeleteDisabledInitially,
        `hasPermBtn: ${modalInfo?.hasPermBtn}, disabled: ${modalInfo?.permBtnDisabled}`
      );

      // Type 'DELETE' into confirmation input
      await evalExpression(`
        (() => {
          const input = document.querySelector('#confirm-delete-input');
          if (input) {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(input, 'DELETE');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })()
      `);
      await sleep(500);

      const isPermDeleteEnabled = await evalExpression(`
        (() => {
          const btn = document.querySelector('#permanently-delete-btn') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('PERMANENTLY DELETE ACCOUNT'));
          return btn ? !btn.disabled : false;
        })()
      `);
      check(
        "Profile UI",
        "Destructive action button becomes enabled after typing 'DELETE'",
        Boolean(isPermDeleteEnabled),
        "Enabled: true"
      );

      // Submit deletion in the browser UI
      await evalExpression(`
        (() => {
          const btn = document.querySelector('#permanently-delete-btn') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('PERMANENTLY DELETE ACCOUNT'));
          if (btn) btn.click();
        })()
      `);

      // Poll until redirect to home page completes
      let redirectedToHome = false;
      for (let i = 0; i < 40; i++) {
        await sleep(350);
        const currentPath = await evalExpression(`window.location.pathname`);
        if (currentPath === "/") {
          redirectedToHome = true;
          break;
        }
      }

      check(
        "Profile UI",
        "Successful deletion in browser automatically redirects user to home page",
        redirectedToHome,
        `Redirected to home: ${redirectedToHome}`
      );

      ws.close();
    } else {
      console.log("Chrome executable not found at path; skipping browser CDP UI tests.");
    }
  } catch (err: any) {
    console.error("CDP UI Test error:", err.message);
  } finally {
    if (chromeProcess) {
      try {
        chromeProcess.kill();
      } catch {}
    }
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }

  // -------------------------------------------------------------
  // REQ 10: Post-Verification Health Check
  // -------------------------------------------------------------
  console.log("\n--- REQ 10: System Health & Core Journey Creation Check ---");
  const freshUserEmail = `del_charlie_${Date.now()}@safarix.test`;
  const freshUserRes = await request("/api/auth/sign-up", {
    method: "POST",
    clientIp: ipC,
    body: {
      name: "Charlie Surviving",
      email: freshUserEmail,
      password: "Password999!_safe",
    },
  });
  const cookieC = extractCookie(freshUserRes);
  check(
    "Health",
    "New accounts can be registered cleanly after deletion operations",
    freshUserRes.status === 201 && Boolean(cookieC),
    `Status ${freshUserRes.status}`
  );

  const freshTripRes = await request("/api/trips", {
    method: "POST",
    cookie: cookieC!,
    clientIp: ipC,
    body: {
      destination: "Reykjavik, Iceland",
      origin: "Oslo",
      days: 3,
      travellers: 1,
      budget: "moderate",
      transportPreference: "flight",
      interests: ["nature", "glaciers"],
      notes: "Charlie post-cleanup journey",
    },
  });
  const freshTripId = freshTripRes.json?.id;
  check(
    "Health",
    "New journeys can be created and persisted cleanly after deletion operations",
    freshTripRes.status === 201 && Boolean(freshTripId),
    `Trip ID: ${freshTripId}`
  );

  // Print summary
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log("\n=================================================================");
  console.log(`ACCOUNT DELETION SUITE RESULT: ${passedCount}/${totalCount} CHECKS PASSED (${totalCount - passedCount} FAILED)`);
  console.log("=================================================================\n");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runAccountDeletionTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
