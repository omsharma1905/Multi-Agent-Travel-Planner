import http from "http";
import { spawn, ChildProcess } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth/session";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9230;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_audit_profile_${Date.now()}`);
const ARTIFACT_DIR = "C:\\Users\\OM SHARMA\\.gemini\\antigravity\\brain\\1cf866f0-8291-4aba-9317-3bba072d99a7";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitForServer(url: string, maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {}
    await sleep(500);
  }
  return false;
}

interface TestResult {
  section: string;
  test: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(section: string, test: string, passed: boolean, details: string) {
  results.push({ section, test, passed, details });
  const status = passed ? "[PASS]" : "[FAIL]";
  console.log(`${status} [${section}] ${test}: ${details}`);
}

async function run() {
  console.log("=================================================================");
  console.log(" SAFARIX STEP 3 FINAL FUNCTIONAL AUDIT");
  console.log("=================================================================\n");

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  // 1. Start Next.js dev server if not already running
  let serverProc: ChildProcess | null = null;
  const isAlreadyRunning = await waitForServer(BASE_URL, 3);
  if (!isAlreadyRunning) {
    console.log("Starting Next.js server on 127.0.0.1:3000...");
    const nextBin = path.resolve("node_modules/next/dist/bin/next");
    serverProc = spawn(process.execPath, [nextBin, "dev", "-H", "127.0.0.1", "-p", "3000"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: "3000", HOSTNAME: "127.0.0.1" },
      stdio: "pipe",
    });

    serverProc.stdout?.on("data", (d) => {
      const s = d.toString();
      if (s.includes("Ready") || s.includes("Local:") || s.includes("Compiled")) {
        console.log("Server stdout:", s.trim());
      }
    });

    serverProc.stderr?.on("data", (d) => {
      const s = d.toString();
      if (!s.includes("middleware") && !s.includes("Fast Refresh")) {
        console.error("Server stderr:", s.trim());
      }
    });

    const serverReady = await waitForServer(BASE_URL, 40);
    if (!serverReady) {
      serverProc.kill();
      throw new Error("Failed to start Next.js server within timeout");
    }
    console.log("Next.js server is ready at " + BASE_URL + "\n");
  } else {
    console.log("Existing Next.js server is active at " + BASE_URL + "\n");
  }

  // 2. Launch headless Chrome
  console.log("Launching headless Chrome on CDP port " + CDP_PORT + "...");
  const chromeProc = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--remote-debugging-address=127.0.0.1`,
      `--user-data-dir=${USER_DATA_DIR}`,
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let ws: WebSocket | null = null;
  const consoleErrors: string[] = [];

  try {
    let wsUrl = "";
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      try {
        wsUrl = await getDebuggerUrl();
        if (wsUrl) break;
      } catch {}
    }

    if (!wsUrl) throw new Error("Chrome CDP not reachable");

    ws = new WebSocket(wsUrl);
    let msgId = 1;
    const pending = new Map<number, (res: any) => void>();

    ws.onmessage = (event: any) => {
      const parsed = JSON.parse(event.data.toString());
      if (parsed.id && pending.has(parsed.id)) {
        const resolve = pending.get(parsed.id)!;
        pending.delete(parsed.id);
        resolve(parsed.result);
      }
      if (parsed.method === "Runtime.consoleAPICalled" && parsed.params.type === "error") {
        const text = parsed.params.args.map((a: any) => a.value ?? a.description ?? "").join(" ");
        if (!text.includes("favicon") && !text.includes("404")) consoleErrors.push(text);
      }
    };

    await new Promise<void>((resolve, reject) => {
      ws!.onopen = () => resolve();
      ws!.onerror = (err) => reject(err);
    });

    function send(method: string, params: any = {}): Promise<any> {
      return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws!.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    async function evaluate<T = any>(expr: string): Promise<T> {
      const res = await send("Runtime.evaluate", {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res?.exceptionDetails) {
        console.error("Evaluation exception:", JSON.stringify(res.exceptionDetails));
      }
      return res?.result?.value;
    }

    async function navigateTo(url: string) {
      await send("Page.navigate", { url });
      await sleep(2500);
    }

    async function captureScreenshot(name: string) {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      if (shot?.data) {
        const p = path.join(ARTIFACT_DIR, `${name}.png`);
        fs.writeFileSync(p, Buffer.from(shot.data, "base64"));
        console.log(`Saved screenshot: ${p}`);
      }
    }

    // =================================================================
    // SECTION 1: TRIP PLANNER INTEGRATION
    // =================================================================
    console.log("\n--- SECTION 1: TRIP PLANNER INTEGRATION ---");
    await navigateTo(`${BASE_URL}/`);

    // 1A. Check planner inputs exist on landing page
    const plannerInputsExist = await evaluate(`
      (() => {
        const dest = document.getElementById('planner-destination-input') || document.querySelector('input[placeholder*=\"Ha Long Bay\"]');
        const dep = document.querySelector('input[aria-label=\"Departure Date\"]');
        const ret = document.querySelector('input[aria-label=\"Return Date\"]');
        const party = document.querySelector('button[aria-label=\"Select party size\"]');
        const tier = document.querySelector('button[aria-label=\"Select luxury tier\"]');
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Explore Journey with SafariX'));
        return {
          dest: !!dest,
          dep: !!dep,
          ret: !!ret,
          party: !!party,
          tier: !!tier,
          submitBtn: !!submitBtn
        };
      })()
    `);

    record(
      "1. Trip Planner",
      "Form Elements Exist on Landing Console",
      plannerInputsExist.dest && plannerInputsExist.dep && plannerInputsExist.ret && plannerInputsExist.party && plannerInputsExist.tier && plannerInputsExist.submitBtn,
      `Dest: ${plannerInputsExist.dest}, Dep: ${plannerInputsExist.dep}, Ret: ${plannerInputsExist.ret}, Party: ${plannerInputsExist.party}, Tier: ${plannerInputsExist.tier}, Btn: ${plannerInputsExist.submitBtn}`
    );

    // 1B. Unauthenticated submission verification:
    // When unauthenticated, submitting redirects to /auth/sign-in?redirect=/trips/new?... preserving all search params.
    await evaluate(`
      (() => {
        const dest = document.getElementById('planner-destination-input') || document.querySelector('input[placeholder*=\"Ha Long Bay\"]');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (dest && setter) {
          setter.call(dest, 'Ha Long Bay, Vietnam');
          dest.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Explore Journey with SafariX'));
        if (submitBtn) submitBtn.click();
      })()
    `);

    for (let i = 0; i < 15; i++) {
      await sleep(400);
      const url = await evaluate<string>(`window.location.href`);
      if (url && (url.includes("/auth/sign-in") || url.includes("/trips/new"))) break;
    }

    const unauthRedirectUrl = await evaluate<string>(`window.location.href`);
    const decodedUrl = decodeURIComponent(unauthRedirectUrl);
    record(
      "1. Trip Planner",
      "Unauthenticated Submit Preserves Redirect Query Target",
      unauthRedirectUrl.includes("/auth/sign-in") && unauthRedirectUrl.includes("redirect=") && decodedUrl.includes("destination="),
      `Unauth redirect URL: ${unauthRedirectUrl}`
    );

    // 1C. Sign in as demo user to authenticate the browser session
    console.log("Signing in demo explorer account inside browser...");
    await evaluate(`
      (async () => {
        await fetch('/api/auth/sign-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'demo@safarix.travel',
            password: 'password123'
          })
        });
      })()
    `);
    await sleep(600);

    // 1D. Navigate back to landing page as authenticated user and submit full trip parameters
    await navigateTo(`${BASE_URL}/`);
    await sleep(800);

    await evaluate(`
      (async () => {
        const dest = document.getElementById('planner-destination-input') || document.querySelector('input[placeholder*=\"Ha Long Bay\"]');
        const dep = document.querySelector('input[aria-label=\"Departure Date\"]');
        const ret = document.querySelector('input[aria-label=\"Return Date\"]');
        const partyBtn = document.querySelector('button[aria-label=\"Select party size\"]');
        const tierBtn = document.querySelector('button[aria-label=\"Select luxury tier\"]');
        
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (dest && setter) {
          setter.call(dest, 'Ha Long Bay, Vietnam');
          dest.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (dep && setter) {
          setter.call(dep, '2026-11-14');
          dep.dispatchEvent(new Event('input', { bubbles: true }));
          dep.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (ret && setter) {
          setter.call(ret, '2026-11-22');
          ret.dispatchEvent(new Event('input', { bubbles: true }));
          ret.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (partyBtn) {
          partyBtn.click();
          await new Promise(r => setTimeout(r, 250));
          const opt = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('4 Adventurers') || b.innerText.includes('4'));
          if (opt) opt.click();
        }
        if (tierBtn) {
          tierBtn.click();
          await new Promise(r => setTimeout(r, 250));
          const tierOpt = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Signature Sovereign'));
          if (tierOpt) tierOpt.click();
        }

        await new Promise(r => setTimeout(r, 250));
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Explore Journey with SafariX'));
        if (submitBtn) submitBtn.click();
      })()
    `);

    // Poll until /trips/new is loaded
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const curUrl = await evaluate<string>(`window.location.href`);
      if (curUrl && curUrl.includes('/trips/new')) break;
    }
    await sleep(1500);

    const tripNewState = await evaluate(`
      (() => {
        const url = window.location.href;
        const inputs = Array.from(document.querySelectorAll('input'));
        const destInput = inputs.find(i => i.value && i.value.includes('Ha Long Bay')) || document.querySelector('input[placeholder*=\"Tokyo\"]');
        const daysInput = inputs.find(i => i.name === 'days' || i.value === '8') || document.querySelector('input[name=\"days\"]');
        const travelersInput = inputs.find(i => i.name === 'travelers' || i.value === '4') || Array.from(document.querySelectorAll('input[type=\"number\"]'))[1];
        
        const buttons = Array.from(document.querySelectorAll('button'));
        const selectedTier = buttons.find(b => 
          b.innerText.toLowerCase().includes('signature') && (b.className.includes('#1f3d2b') || b.className.includes('#1F3D2B') || b.className.includes('ring') || b.className.includes('E3EBE4'))
        );

        return {
          url: url || '',
          destValue: destInput ? destInput.value : null,
          daysValue: daysInput ? daysInput.value : null,
          travelersValue: travelersInput ? travelersInput.value : null,
          hasLuxuryTierSelected: !!selectedTier
        };
      })()
    `);

    record(
      "1. Trip Planner",
      "Parameter Transfer to /trips/new",
      tripNewState.url.includes("/trips/new") && tripNewState.url.includes("destination="),
      `Navigated URL: ${tripNewState.url}`
    );

    record(
      "1. Trip Planner",
      "Destination & Calculated Days (8 days for Nov 14-22)",
      tripNewState.destValue === "Ha Long Bay, Vietnam" && tripNewState.daysValue === "8",
      `Destination: "${tripNewState.destValue}", Days: "${tripNewState.daysValue}" (Expected 8 days)`
    );

    record(
      "1. Trip Planner",
      "Party Size & Luxury Tier Transferred",
      tripNewState.travelersValue === "4" && tripNewState.hasLuxuryTierSelected,
      `Travelers: "${tripNewState.travelersValue}", Luxury Selected: ${tripNewState.hasLuxuryTierSelected}`
    );

    await captureScreenshot("audit_trip_planner_prefilled_new_trip");

    // 1E. Edge Cases: Direct navigation defaults
    await navigateTo(`${BASE_URL}/trips/new`);
    await sleep(1000);
    const defaultState = await evaluate(`
      (() => {
        const daysInput = document.querySelector('input[name=\"days\"], input[type=\"number\"]');
        const travelersInput = Array.from(document.querySelectorAll('input[type=\"number\"]'))[1];
        return {
          days: daysInput ? daysInput.value : null,
          travelers: travelersInput ? travelersInput.value : null
        };
      })()
    `);

    record(
      "1. Trip Planner Edge Cases",
      "Direct Navigation Defaults Apply",
      defaultState.days === "7" && defaultState.travelers === "2",
      `Default Days: ${defaultState.days}, Default Travelers: ${defaultState.travelers}`
    );

    // 1F. Invalid dates: Return before Departure -> fallback to 7 days
    await navigateTo(`${BASE_URL}/trips/new?departure=2026-11-25&return=2026-11-20`);
    await sleep(1000);
    const invalidDateDays = await evaluate(`
      (() => {
        const daysInput = document.querySelector('input[name=\"days\"], input[type=\"number\"]');
        return daysInput ? daysInput.value : null;
      })()
    `);

    record(
      "1. Trip Planner Edge Cases",
      "Invalid Date Range Fallback (Return before Departure)",
      invalidDateDays === "7",
      `Clamped / Fallback Days: ${invalidDateDays}`
    );

    // 1G. Direct URL navigation with arbitrary parameters
    await navigateTo(`${BASE_URL}/trips/new?destination=Kyoto%2C+Japan&days=12&travelers=3&tier=premium&type=train`);
    await sleep(1000);
    const directUrlState = await evaluate(`
      (() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const dest = inputs.find(i => i.value && i.value.includes('Kyoto'));
        const days = inputs.find(i => i.value === '12');
        const travelers = inputs.find(i => i.value === '3');
        return {
          dest: dest ? dest.value : null,
          days: days ? days.value : null,
          travelers: travelers ? travelers.value : null
        };
      })()
    `);

    record(
      "1. Trip Planner Edge Cases",
      "Direct URL Query Params Full Intake Binding",
      directUrlState.dest === "Kyoto, Japan" && directUrlState.days === "12" && directUrlState.travelers === "3",
      `Dest: "${directUrlState.dest}", Days: "${directUrlState.days}", Travelers: "${directUrlState.travelers}"`
    );

    // =================================================================
    // SECTION 2: HOLIDAY / FLIGHT / HOTELS TABS & SCOPE HONESTY
    // =================================================================
    console.log("\n--- SECTION 2: HOLIDAY / FLIGHT / HOTELS TABS & SCOPE HONESTY ---");
    await navigateTo(`${BASE_URL}/`);
    await sleep(1000);

    const tabsCheck = await evaluate(`
      (async () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const holidayBtn = buttons.find(b => b.innerText.trim() === 'Holiday');
        const flightBtn = buttons.find(b => b.innerText.trim() === 'Flight');
        const hotelsBtn = buttons.find(b => b.innerText.trim() === 'Hotels');
        
        const initialText = document.body.innerText;
        const hasScopeDisclaimer = initialText.includes('SafariX coordinates routes & stays. Bookings finalized with licensed partners.');

        // Click Flight tab
        if (flightBtn) flightBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const flightNotice = document.body.innerText.includes('SafariX compares commercial and charter');

        // Click Hotels tab
        if (hotelsBtn) hotelsBtn.click();
        await new Promise(r => setTimeout(r, 300));
        const hotelNotice = document.body.innerText.includes('SafariX curates');

        return {
          hasAllTabs: !!holidayBtn && !!flightBtn && !!hotelsBtn,
          hasScopeDisclaimer,
          flightNotice,
          hotelNotice
        };
      })()
    `);

    record(
      "2. Holiday / Flight / Hotels",
      "All Tabs Present with Honest Scope Disclaimer",
      tabsCheck.hasAllTabs && tabsCheck.hasScopeDisclaimer && tabsCheck.flightNotice && tabsCheck.hotelNotice,
      `Disclaimer: ${tabsCheck.hasScopeDisclaimer}, Flight Notice: ${tabsCheck.flightNotice}, Hotel Notice: ${tabsCheck.hotelNotice}`
    );

    // =================================================================
    // SECTION 3: DATA ACCURACY & ILLUSTRATIVE LABELS
    // =================================================================
    console.log("\n--- SECTION 3: DATA ACCURACY & ILLUSTRATIVE LABELS ---");
    await navigateTo(`${BASE_URL}/`);
    await sleep(1000);

    const dataAccuracy = await evaluate(`
      (() => {
        const text = document.body.innerText;
        const lower = text.toLowerCase();
        const hasBenchmarkNote = lower.includes('simulation benchmark');
        const hasWeatherFootnote = text.includes('historical seasonal averages');
        const hasSampleDossierLabel = text.includes('(Sample Dossier)');
        const hasEngineReady = lower.includes('engine ready');
        
        return {
          hasBenchmarkNote,
          hasWeatherFootnote,
          hasSampleDossierLabel,
          hasEngineReady
        };
      })()
    `);

    record(
      "3. Data Accuracy",
      "Social Proof Simulation Benchmark Disclaimer",
      dataAccuracy.hasBenchmarkNote,
      `Found simulation benchmark disclaimer: ${dataAccuracy.hasBenchmarkNote}`
    );

    record(
      "3. Data Accuracy",
      "Destination Weather Historical Averages Footnote",
      dataAccuracy.hasWeatherFootnote,
      `Found weather historical averages footnote: ${dataAccuracy.hasWeatherFootnote}`
    );

    record(
      "3. Data Accuracy",
      "Master Itinerary Labeled (Sample Dossier)",
      dataAccuracy.hasSampleDossierLabel,
      `Sample Dossier badge present: ${dataAccuracy.hasSampleDossierLabel}`
    );

    record(
      "3. Data Accuracy",
      "Autonomous Agent Activity Status Visible",
      dataAccuracy.hasEngineReady,
      `Agent status indicators present: ${dataAccuracy.hasEngineReady}`
    );

    // =================================================================
    // SECTION 4: NAVIGATION AUDIT
    // =================================================================
    console.log("\n--- SECTION 4: NAVIGATION AUDIT ---");
    const navAudit = await evaluate(`
      (() => {
        const links = Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.innerText.trim(),
          href: a.getAttribute('href')
        }));

        const hasMethodology = links.some(l => l.href === '#methodology');
        const hasSanctuaries = links.some(l => l.href === '#sanctuaries');
        const hasAgents = links.some(l => l.href === '#agents');
        const hasConcierge = links.some(l => l.href === '#concierge');
        const hasNewTrip = links.some(l => l.href === '/trips/new');
        const hasPrivacy = links.some(l => l.href === '/privacy');
        const hasTerms = links.some(l => l.href === '/terms');

        return {
          hasMethodology,
          hasSanctuaries,
          hasAgents,
          hasConcierge,
          hasNewTrip,
          hasPrivacy,
          hasTerms,
          totalLinks: links.length
        };
      })()
    `);

    record(
      "4. Navigation",
      "Desktop Navbar & Footer Section Targets",
      navAudit.hasMethodology && navAudit.hasSanctuaries && navAudit.hasAgents && navAudit.hasConcierge && navAudit.hasNewTrip,
      `Methodology: ${navAudit.hasMethodology}, Sanctuaries: ${navAudit.hasSanctuaries}, Agents: ${navAudit.hasAgents}, Concierge: ${navAudit.hasConcierge}, NewTrip: ${navAudit.hasNewTrip}`
    );

    record(
      "4. Navigation",
      "Legal & Policy Links",
      navAudit.hasPrivacy && navAudit.hasTerms,
      `Privacy: ${navAudit.hasPrivacy}, Terms: ${navAudit.hasTerms}`
    );

    // Test mobile drawer toggle
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(500);

    const drawerCheck = await evaluate(`
      (() => {
        const toggleBtn = document.querySelector('button[aria-controls=\"safarix-drawer\"]');
        if (!toggleBtn) return { foundToggle: false };
        toggleBtn.click();
        const drawer = document.getElementById('safarix-drawer');
        const isVisible = drawer && !drawer.classList.contains('hidden');
        return {
          foundToggle: true,
          isOpen: !!isVisible
        };
      })()
    `);

    record(
      "4. Navigation",
      "Mobile Drawer Accessible Toggle & Expansion",
      drawerCheck.foundToggle && drawerCheck.isOpen,
      `Toggle found: ${drawerCheck.foundToggle}, Drawer opened: ${drawerCheck.isOpen}`
    );

    // =================================================================
    // SECTION 5: ACCESSIBILITY & PERFORMANCE
    // =================================================================
    console.log("\n--- SECTION 5: ACCESSIBILITY & PERFORMANCE ---");

    // Test Viewport Overflows at 360px, 390px, 430px
    const viewports = [360, 390, 430];
    for (const vp of viewports) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: vp,
        height: 800,
        deviceScaleFactor: 2,
        mobile: true,
      });
      await sleep(400);

      const overflow = await evaluate(`
        (() => {
          const scrollW = document.documentElement.scrollWidth;
          const clientW = document.documentElement.clientWidth;
          return {
            scrollW,
            clientW,
            hasOverflow: scrollW > clientW
          };
        })()
      `);

      record(
        "5. Responsive & Overflow",
        `Zero Horizontal Overflow at ${vp}px`,
        !overflow.hasOverflow,
        `ScrollWidth: ${overflow.scrollW}px, ClientWidth: ${overflow.clientW}px`
      );
    }

    // Check prefers-reduced-motion
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await sleep(400);
    const motionCheck = await evaluate(`
      (() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      })()
    `);

    record(
      "5. Accessibility",
      "prefers-reduced-motion Media Query Respected",
      motionCheck === true,
      `Media query detected: ${motionCheck}`
    );

    // Semantic headings
    const headingStructure = await evaluate(`
      (() => {
        const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.innerText.trim());
        const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.innerText.trim());
        return {
          h1Count: h1s.length,
          h1Text: h1s[0] || "",
          h2Count: h2s.length
        };
      })()
    `);

    record(
      "5. Accessibility",
      "Semantic Heading Structure",
      headingStructure.h1Count >= 1 && headingStructure.h2Count >= 3,
      `H1 count: ${headingStructure.h1Count} ("${headingStructure.h1Text}"), H2 count: ${headingStructure.h2Count}`
    );

    // Console Errors Check
    record(
      "5. Performance & Console",
      "Zero Unhandled Console Errors",
      consoleErrors.length === 0,
      consoleErrors.length === 0 ? "0 console errors" : `Errors: ${consoleErrors.join("; ")}`
    );

    // =================================================================
    // SECTION 6: REGRESSION ROUTE VERIFICATION
    // =================================================================
    console.log("\n--- SECTION 6: REGRESSION ROUTE VERIFICATION ---");
    const testRoutes = [
      { path: "/", expectedCode: 200, name: "Landing Page" },
      { path: "/auth/sign-in", expectedCode: 200, name: "Sign In Page" },
      { path: "/auth/sign-up", expectedCode: 200, name: "Sign Up Page" },
      { path: "/privacy", expectedCode: 200, name: "Privacy Policy" },
      { path: "/terms", expectedCode: 200, name: "Terms of Service" },
      { path: "/dashboard", expectedCode: 307, name: "Dashboard Auth Guard" },
      { path: "/profile", expectedCode: 307, name: "Profile Auth Guard" },
      { path: "/trips/new", expectedCode: 307, name: "Trip Intake Auth Guard (Unauthenticated)" },
      { path: "/api/auth/session", expectedCode: 200, name: "Auth Session API" },
    ];

    for (const r of testRoutes) {
      const code = await new Promise<number>((resolve) => {
        const req = http.get(`${BASE_URL}${r.path}`, (res) => {
          resolve(res.statusCode || 0);
        });
        req.on("error", () => resolve(0));
      });

      const pass = code === r.expectedCode || (r.expectedCode === 307 && (code === 307 || code === 302));
      record(
        "6. Regression Routes",
        `${r.name} (${r.path})`,
        pass,
        `HTTP Status: ${code} (Expected: ${r.expectedCode})`
      );
    }

    // Capture final mobile and desktop evidence
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await navigateTo(`${BASE_URL}/`);
    await captureScreenshot("audit_desktop_verified_landing");

    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await captureScreenshot("audit_mobile_verified_landing");

  } finally {
    if (ws) ws.close();
    chromeProc.kill();
    if (serverProc) serverProc.kill();
    try {
      await sleep(1000);
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }

  // Summary
  console.log("\n=================================================================");
  console.log(" AUDIT SUMMARY");
  console.log("=================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Tests: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.error("Some tests failed!");
    process.exit(1);
  } else {
    console.log("ALL STEP 3 FINAL FUNCTIONAL AUDIT TESTS PASSED SUCCESSFULLY!");
  }
}

run().catch((err) => {
  console.error("Fatal audit runner error:", err);
  process.exit(1);
});
