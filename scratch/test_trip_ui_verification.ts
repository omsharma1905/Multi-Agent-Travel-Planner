/**
 * @file scratch/test_trip_ui_verification.ts
 *
 * Verifies Trip Detail Page UI rendering via Chrome DevTools Protocol:
 * 1. Generates a trip with origin: Delhi, destination: Dubai
 * 2. Triggers plan generation
 * 3. Inspects DOM elements on /trips/[tripId]:
 *    - Transportation section has TRANSPORT SELECTED & Google Flights link
 *    - Activities section has HIGHLIGHTS CURATED & clean reasoning
 *    - No '0.0' star ratings exist in DOM
 *    - Destination hero does not contain stretched SVG flags
 */

import { spawn } from "child_process";
import http from "http";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDebuggerUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PORT}/json`, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const list = JSON.parse(data);
          const page = list.find((p: any) => p.type === "page") || list[0];
          if (page && page.webSocketDebuggerUrl) {
            resolve(page.webSocketDebuggerUrl);
          } else {
            reject(new Error("No page found: " + data));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
  });
}

async function runTripUiVerification() {
  console.log("=================================================================");
  console.log(" SAFARIX TRIP UI AUDIT VERIFICATION IN HEADLESS CHROME");
  console.log("=================================================================\n");

  // 1. Create authenticated user
  const email = `audit_tester_${Date.now()}@safarix.test`;
  const signupRes = await fetch("http://localhost:3000/api/auth/sign-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Audit Inspector", email, password: "Password123!" }),
  });
  const setCookie = signupRes.headers.get("set-cookie") || "";
  const tokenMatch = setCookie.match(/safarix_session=([^;]+)/);
  const sessionToken = tokenMatch ? tokenMatch[1] : "";

  // 2. Create trip with origin and destination
  const tripRes = await fetch("http://localhost:3000/api/trips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `safarix_session=${sessionToken}`,
    },
    body: JSON.stringify({
      origin: "New Delhi",
      destination: "Dubai",
      days: 3,
      budget: "moderate",
      travellers: 2,
      transportPreference: "flight",
      interests: ["culture", "sightseeing"],
    }),
  });

  const tripData = await tripRes.json();
  const tripId = tripData.id;
  console.log(`Created trip: ${tripId} (New Delhi -> Dubai)`);

  // 3. Trigger plan generation
  console.log("Triggering journey planning API...");
  const planRes = await fetch(`http://localhost:3000/api/trips/${tripId}/plan?force=true`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `safarix_session=${sessionToken}`,
    },
  });
  const planJson = await planRes.json();
  console.log("Planning status:", planJson.status);

  // 4. Launch headless Chrome to inspect rendered DOM
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      "--disable-gpu",
      "--no-sandbox",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let wsUrl = "";
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      wsUrl = await getDebuggerUrl();
      break;
    } catch {}
  }

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map<number, (res: any) => void>();

  function send(method: string, params: any = {}): Promise<any> {
    const id = msgId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.result);
      pending.delete(msg.id);
    }
  };

  await new Promise((r) => (ws.onopen = r));
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  // Inject session cookie
  await send("Network.setCookie", {
    name: "safarix_session",
    value: sessionToken,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });

  // Navigate to trip page
  console.log(`Navigating Chrome to http://localhost:3000/trips/${tripId}...`);
  await send("Page.navigate", { url: `http://localhost:3000/trips/${tripId}` });
  await sleep(3500);

  // Evaluate DOM
  const evalResult = await send("Runtime.evaluate", {
    expression: `(() => {
      const text = document.body.innerText;
      const images = Array.from(document.querySelectorAll('img')).map(i => i.src);
      const hasZeroZeroRating = text.includes('★ 0.0') || text.includes('★ 0');
      const hasHighlightsCurated = text.includes('HIGHLIGHTS CURATED');
      const hasPlacesAllocated = text.includes('PLACES ALLOCATED');
      const hasLLMErrorLeak = text.includes('LLM call failed') || text.includes('Gemini schema validation failed');
      const hasGoogleFlightsLink = Array.from(document.querySelectorAll('a')).some(a => a.href.includes('google.com/travel/flights'));
      const hasTransportBadge = text.includes('TRANSPORT SELECTED') || text.includes('EXTERNAL ROUTE SEARCH');
      const hasStretchedFlag = images.some(s => s.toLowerCase().includes('flag') && s.toLowerCase().includes('.svg'));

      return {
        hasZeroZeroRating,
        hasHighlightsCurated,
        hasPlacesAllocated,
        hasLLMErrorLeak,
        hasGoogleFlightsLink,
        hasTransportBadge,
        hasStretchedFlag,
        imagesCount: images.length,
      };
    })()`,
    returnByValue: true,
  });

  const dom = evalResult?.result?.value || {};
  console.log("\nDOM Verification Results:");
  console.log("- hasZeroZeroRating:", dom.hasZeroZeroRating, (dom.hasZeroZeroRating ? "❌ FAIL" : "✅ PASS"));
  console.log("- hasHighlightsCurated:", dom.hasHighlightsCurated, (dom.hasHighlightsCurated ? "✅ PASS" : "❌ FAIL"));
  console.log("- hasPlacesAllocated:", dom.hasPlacesAllocated, (dom.hasPlacesAllocated ? "❌ FAIL" : "✅ PASS"));
  console.log("- hasLLMErrorLeak:", dom.hasLLMErrorLeak, (dom.hasLLMErrorLeak ? "❌ FAIL" : "✅ PASS"));
  console.log("- hasGoogleFlightsLink:", dom.hasGoogleFlightsLink, (dom.hasGoogleFlightsLink ? "✅ PASS" : "❌ FAIL"));
  console.log("- hasTransportBadge:", dom.hasTransportBadge, (dom.hasTransportBadge ? "✅ PASS" : "❌ FAIL"));
  console.log("- hasStretchedFlag:", dom.hasStretchedFlag, (dom.hasStretchedFlag ? "❌ FAIL" : "✅ PASS"));

  ws.close();
  chromeProcess.kill();

  const allPassed =
    !dom.hasZeroZeroRating &&
    dom.hasHighlightsCurated &&
    !dom.hasPlacesAllocated &&
    !dom.hasLLMErrorLeak &&
    dom.hasGoogleFlightsLink &&
    dom.hasTransportBadge &&
    !dom.hasStretchedFlag;

  if (allPassed) {
    console.log("\n✓ ALL 7 DOM AND VISUAL VERIFICATION CRITERIA PASSED IN REAL CHROME BROWSER!\n");
    process.exit(0);
  } else {
    console.error("\n✗ DOM verification criteria failed.");
    process.exit(1);
  }
}

runTripUiVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
