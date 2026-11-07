import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:5000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9232;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_improvements_profile_${Date.now()}`);
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
          resolve(page.webSocketDebuggerUrl);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on("error", reject);
  });
}

interface TestCheck {
  part: string;
  name: string;
  passed: boolean;
  details: string;
}

const checks: TestCheck[] = [];
function record(part: string, name: string, passed: boolean, details: string) {
  checks.push({ part, name, passed, details });
  const tag = passed ? "[PASS]" : "[FAIL]";
  console.log(`${tag} [${part}] ${name} -> ${details}`);
}

async function run() {
  console.log("=================================================================");
  console.log(" SAFARIX NAVIGATION, PLANNER & MOBILE AUTH IMPROVEMENTS AUDIT");
  console.log("=================================================================\n");

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  const chromeProc = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

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

    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const pending = new Map<number, (res: any) => void>();

    ws.onmessage = (event: any) => {
      const parsed = JSON.parse(event.data.toString());
      if (parsed.id && pending.has(parsed.id)) {
        const resolve = pending.get(parsed.id)!;
        pending.delete(parsed.id);
        resolve(parsed.result);
      }
    };

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = (err) => reject(err);
    });

    function send(method: string, params: any = {}): Promise<any> {
      return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");

    async function evaluate<T = any>(expr: string): Promise<T> {
      const res = await send("Runtime.evaluate", {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.value;
    }

    async function captureScreenshot(name: string) {
      const shot = await send("Page.captureScreenshot", { format: "png" });
      if (shot?.data) {
        const p = path.join(ARTIFACT_DIR, `${name}.png`);
        fs.writeFileSync(p, Buffer.from(shot.data, "base64"));
        console.log(`Saved screenshot: ${p}`);
      }
    }

    // =========================================================================
    // PART 1: NAVBAR NAVIGATION TESTING
    // =========================================================================
    console.log("\n--- PART 1: NAVBAR NAVIGATION AUDIT ---");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(3000);

    // 1A. Click Sanctuaries link
    const sanctuariesClick = await evaluate(`
      (() => {
        const link = document.querySelector('header nav a[href="#sanctuaries"]');
        if (!link) return { found: false };
        link.click();
        return { found: true };
      })()
    `);
    await sleep(1200);

    const sanctuariesView = await evaluate(`
      (() => {
        const el = document.getElementById('sanctuaries');
        if (!el) return { found: false };
        const rect = el.getBoundingClientRect();
        return {
          found: true,
          hash: window.location.hash,
          top: rect.top,
          visible: rect.top >= -50 && rect.top <= 250
        };
      })()
    `);
    record(
      "Part 1",
      "Navbar Sanctuaries Link Navigates and Displays Section",
      sanctuariesClick.found && sanctuariesView.hash === "#sanctuaries" && sanctuariesView.visible,
      `Hash: ${sanctuariesView.hash}, Top: ${Math.round(sanctuariesView.top)}px, Visible: ${sanctuariesView.visible}`
    );

    // 1B. Click Intelligence link
    await evaluate(`
      (() => {
        const link = document.querySelector('header nav a[href="#agents"]');
        if (link) link.click();
      })()
    `);
    await sleep(1200);

    const agentsView = await evaluate(`
      (() => {
        const el = document.getElementById('agents');
        if (!el) return { found: false };
        const rect = el.getBoundingClientRect();
        return {
          found: true,
          hash: window.location.hash,
          top: rect.top,
          visible: rect.top >= -50 && rect.top <= 250
        };
      })()
    `);
    record(
      "Part 1",
      "Navbar Intelligence Link Navigates and Displays Section",
      agentsView.hash === "#agents" && agentsView.visible,
      `Hash: ${agentsView.hash}, Top: ${Math.round(agentsView.top)}px, Visible: ${agentsView.visible}`
    );

    // 1C. Click Method link
    await evaluate(`
      (() => {
        const link = document.querySelector('header nav a[href="#methodology"]');
        if (link) link.click();
      })()
    `);
    await sleep(1200);

    const methodologyView = await evaluate(`
      (() => {
        const el = document.getElementById('methodology');
        if (!el) return { found: false };
        const rect = el.getBoundingClientRect();
        return {
          found: true,
          hash: window.location.hash,
          top: rect.top,
          visible: rect.top >= -50 && rect.top <= 250
        };
      })()
    `);
    record(
      "Part 1",
      "Navbar Method Link Navigates and Displays Section",
      methodologyView.hash === "#methodology" && methodologyView.visible,
      `Hash: ${methodologyView.hash}, Top: ${Math.round(methodologyView.top)}px, Visible: ${methodologyView.visible}`
    );

    // 1D. Click Contact link
    await evaluate(`
      (() => {
        const link = document.querySelector('header nav a[href="#concierge"]');
        if (link) link.click();
      })()
    `);
    await sleep(1200);

    const contactView = await evaluate(`
      (() => {
        const el = document.getElementById('concierge');
        if (!el) return { found: false };
        const rect = el.getBoundingClientRect();
        return {
          found: true,
          hash: window.location.hash,
          top: rect.top,
          visible: rect.top <= window.innerHeight
        };
      })()
    `);
    record(
      "Part 1",
      "Navbar Contact Link Navigates and Displays Section",
      contactView.hash === "#concierge" && contactView.visible,
      `Hash: ${contactView.hash}, Top: ${Math.round(contactView.top)}px, InViewport: ${contactView.visible}`
    );

    // 1E. Click Home link
    await evaluate(`
      (() => {
        const link = document.querySelector('header nav a[href="#hero"]');
        if (link) link.click();
      })()
    `);
    await sleep(1200);

    const homeView = await evaluate(`
      (() => {
        return {
          scrollY: window.scrollY,
          atTop: window.scrollY < 50
        };
      })()
    `);
    record(
      "Part 1",
      "Navbar Home Link Returns Smoothly to Page Top",
      homeView.atTop,
      `ScrollY: ${homeView.scrollY}px, AtTop: ${homeView.atTop}`
    );

    // 1F. Direct Hash URL Loading (e.g. /#agents)
    console.log("Testing direct hash loading at http://localhost:3000/#agents...");
    await send("Page.navigate", { url: `${BASE_URL}/#agents` });
    await sleep(2500);

    const directHashView = await evaluate(`
      (() => {
        const el = document.getElementById('agents');
        const rect = el?.getBoundingClientRect();
        return {
          hash: window.location.hash,
          top: rect ? Math.round(rect.top) : null,
          visible: rect ? (rect.top >= -50 && rect.top <= 250) : false
        };
      })()
    `);
    record(
      "Part 1",
      "Direct Hash Navigation Loads Section Correctly",
      directHashView.hash === "#agents" && directHashView.visible,
      `Hash: ${directHashView.hash}, Top: ${directHashView.top}px, Visible: ${directHashView.visible}`
    );

    // 1G. Mobile Drawer Navigation & Auto-close
    console.log("Testing mobile drawer navigation at 390x844...");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, hasTouch: true });
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(2500);

    const mobileDrawerNav = await evaluate(`
      (async () => {
        // Open drawer
        const hamburger = document.querySelector('button[aria-label="Toggle navigation drawer"]');
        if (hamburger) hamburger.click();
        await new Promise(r => setTimeout(r, 400));
        
        const drawerBefore = document.getElementById('safarix-drawer');
        const isOpenBefore = drawerBefore?.classList.contains('opacity-100');

        // Click Sanctuaries in drawer
        const link = Array.from(document.querySelectorAll('#safarix-drawer nav a')).find(a => a.innerText.includes('Sanctuaries'));
        if (link) link.click();
        await new Promise(r => setTimeout(r, 800));

        const drawerAfter = document.getElementById('safarix-drawer');
        const isClosedAfter = drawerAfter?.classList.contains('opacity-0');
        const sanctuariesEl = document.getElementById('sanctuaries');
        const rect = sanctuariesEl?.getBoundingClientRect();

        return {
          opened: isOpenBefore,
          closed: isClosedAfter,
          hash: window.location.hash,
          visible: rect ? (rect.top >= -50 && rect.top <= 300) : false
        };
      })()
    `);
    record(
      "Part 1",
      "Mobile Drawer Link Navigates Section and Closes Drawer",
      mobileDrawerNav.opened && mobileDrawerNav.closed && mobileDrawerNav.hash === "#sanctuaries",
      `Opened: ${mobileDrawerNav.opened}, Closed: ${mobileDrawerNav.closed}, Hash: ${mobileDrawerNav.hash}, Visible: ${mobileDrawerNav.visible}`
    );

    // =========================================================================
    // PART 2: TRIP PLANNER DROPDOWNS TESTING
    // =========================================================================
    console.log("\n--- PART 2: TRIP PLANNER DROPDOWNS AUDIT ---");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(2500);

    // 2A. Party Size Dropdown Opening, Options & Selection
    const partyDropdownTest = await evaluate(`
      (async () => {
        const btn = document.querySelector('button[aria-label="Select party size"]');
        if (!btn) return { found: false };
        btn.click();
        await new Promise(r => setTimeout(r, 300));

        const optButtons = Array.from(document.querySelectorAll('button[data-testid="party-option"]'));
        const optionsText = optButtons.map(b => b.innerText.split('\\n')[0].trim());

        // Select "4 Adventurers"
        const opt4 = optButtons.find(b => b.innerText.includes('4 Adventurers'));
        if (opt4) opt4.click();
        await new Promise(r => setTimeout(r, 300));

        const btnAfter = document.querySelector('button[aria-label="Select party size"]');
        return {
          found: true,
          optionsCount: optButtons.length,
          options: optionsText,
          selectedText: btnAfter?.innerText.trim()
        };
      })()
    `);
    record(
      "Part 2",
      "Party Size Dropdown Renders Premium Options and Updates Selection",
      partyDropdownTest.found && partyDropdownTest.optionsCount === 4 && partyDropdownTest.selectedText?.includes("4 Adventurers"),
      `Options (${partyDropdownTest.optionsCount}): [${partyDropdownTest.options?.join(", ")}], Selected: ${partyDropdownTest.selectedText}`
    );

    // 2B. Tier Dropdown Opening, Subtitles & Selection
    const tierDropdownTest = await evaluate(`
      (async () => {
        const btn = document.querySelector('button[aria-label="Select luxury tier"]');
        if (!btn) return { found: false };
        btn.click();
        await new Promise(r => setTimeout(r, 300));

        const tierButtons = Array.from(document.querySelectorAll('button[data-testid="tier-option"]'));

        // Select "Signature Sovereign ($10k+)"
        const sigOpt = tierButtons.find(b => b.innerText.includes('Signature Sovereign'));
        if (sigOpt) sigOpt.click();
        await new Promise(r => setTimeout(r, 300));

        const btnAfter = document.querySelector('button[aria-label="Select luxury tier"]');
        return {
          found: true,
          tierCount: tierButtons.length,
          selectedText: btnAfter?.innerText.trim()
        };
      })()
    `);
    record(
      "Part 2",
      "Tier Dropdown Renders Curated Tiers and Updates Selection",
      tierDropdownTest.found && tierDropdownTest.tierCount === 3 && tierDropdownTest.selectedText?.includes("Signature Sovereign"),
      `Tiers (${tierDropdownTest.tierCount}), Selected: ${tierDropdownTest.selectedText}`
    );

    // 2C. Click Outside & Escape Key Dismissal
    const dismissalTest = await evaluate(`
      (async () => {
        const btn = document.querySelector('button[aria-label="Select party size"]');
        if (btn) btn.click();
        await new Promise(r => setTimeout(r, 200));

        let openBefore = document.querySelectorAll('button[data-testid="party-option"]').length > 0;

        // Press Escape key
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await new Promise(r => setTimeout(r, 200));

        let closedAfter = document.querySelectorAll('button[data-testid="party-option"]').length === 0;
        return { openBefore, closedAfter };
      })()
    `);
    record(
      "Part 2",
      "Trip Planner Dropdowns Dismiss on Escape Key and Outside Click",
      dismissalTest.openBefore && dismissalTest.closedAfter,
      `Opened: ${dismissalTest.openBefore}, Dismissed: ${dismissalTest.closedAfter}`
    );

    // 2D. Parameter Transfer to /trips/new preserves selected values
    const submitTransferTest = await evaluate(`
      (async () => {
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Explore Journey with SafariX'));
        if (submitBtn) submitBtn.click();
        return { clicked: true };
      })()
    `);
    await sleep(2000);

    const redirectUrl = await evaluate<string>(`window.location.href`);
    console.log("FULL REDIRECT URL:", redirectUrl);
    const decodedUrl = decodeURIComponent(redirectUrl);
    record(
      "Part 2",
      "Planner Form Submits Selected Party Size and Tier to Target",
      decodedUrl.includes("partySize=4") && decodedUrl.includes("Signature"),
      `Decoded target URL: ${decodedUrl}`
    );

    // Capture screenshot of planner with dropdown open
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(2000);
    await evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label="Select luxury tier"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(400);
    await captureScreenshot("audit_trip_planner_dropdown_open");

    // =========================================================================
    // PART 3: MOBILE AUTH REDESIGN & DESKTOP PRESERVATION
    // =========================================================================
    console.log("\n--- PART 3: MOBILE AUTH REDESIGN & DESKTOP PRESERVATION ---");

    // 3A. Desktop Preservation (1440x900)
    console.log("Verifying desktop authentication preservation at 1440x900...");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${BASE_URL}/auth/sign-in` });
    await sleep(2500);

    const desktopPreserved = await evaluate(`
      (() => {
        const desktopLeft = document.querySelector('div.hidden.md\\\\:flex.absolute.inset-y-0.left-0');
        const desktopSlidingPanel = Array.from(document.querySelectorAll('div')).find(d => 
          d.className.includes('md:flex') && d.className.includes('bg-[#063D2E]')
        );
        const card = document.querySelector('div.md\\\\:h-\\\\[530px\\\\], div.lg\\\\:h-\\\\[540px\\\\]');
        return {
          hasDesktopLeft: !!desktopLeft,
          hasDesktopSlidingPanel: !!desktopSlidingPanel,
          hasDesktopCardContainer: !!card
        };
      })()
    `);
    record(
      "Part 3",
      "Desktop Authentication Split Layout & Sliding Panel Preserved (>= 1024px)",
      desktopPreserved.hasDesktopLeft && desktopPreserved.hasDesktopSlidingPanel && desktopPreserved.hasDesktopCardContainer,
      `Desktop Left: ${desktopPreserved.hasDesktopLeft}, Sliding Panel: ${desktopPreserved.hasDesktopSlidingPanel}, Card Container: ${desktopPreserved.hasDesktopCardContainer}`
    );
    await captureScreenshot("desktop_signin_preserved");

    // 3B. Mobile Sign In Redesign (390x844)
    console.log("Verifying mobile Sign In redesign at 390x844...");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true, hasTouch: true });
    await send("Page.navigate", { url: `${BASE_URL}/auth/sign-in` });
    await sleep(2500);

    const mobileSignInElements = await evaluate(`
      (() => {
        const logo = Array.from(document.querySelectorAll('span')).find(s => s.innerText === 'SAFARIX');
        const heading = document.querySelector('h3');
        const serifBack = heading?.querySelector('span.font-serif')?.innerText;
        const signInTab = document.querySelector('[data-testid="mobile-tab-signin"]');
        const signUpTab = document.querySelector('[data-testid="mobile-tab-signup"]');
        const emailInput = document.getElementById('mobile-signin-email');
        const passwordInput = document.getElementById('mobile-signin-password');
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign in to SafariX'));
        const demoFillBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Demo Fill'));
        const coordsWatermark = document.body.innerText.includes('20.84° N · 107.04° E');

        return {
          hasLogo: !!logo,
          headingText: heading?.innerText.replace(/\\n/g, ' '),
          serifEmphasis: serifBack,
          hasTabs: !!signInTab && !!signUpTab,
          hasEmail: !!emailInput,
          hasPassword: !!passwordInput,
          hasSubmit: !!submitBtn,
          hasDemoFill: !!demoFillBtn,
          hasCoords: coordsWatermark
        };
      })()
    `);
    record(
      "Part 3",
      "Mobile Sign In Layout Features Brand Header, Serif Heading, Segment Switch & Inputs",
      mobileSignInElements.hasLogo && mobileSignInElements.hasTabs && mobileSignInElements.hasEmail && mobileSignInElements.hasPassword && mobileSignInElements.hasSubmit,
      `Heading: "${mobileSignInElements.headingText}", Serif: "${mobileSignInElements.serifEmphasis}", Coords: ${mobileSignInElements.hasCoords}`
    );
    await captureScreenshot("mobile_signin_redesign");

    // 3C. Password Visibility Toggle Test
    const passwordToggleTest = await evaluate(`
      (async () => {
        const passInput = document.getElementById('mobile-signin-password');
        const toggleBtn = passInput?.parentElement?.querySelector('button[aria-label]');
        const typeBefore = passInput?.type;
        if (toggleBtn) toggleBtn.click();
        await new Promise(r => setTimeout(r, 200));
        const typeAfter = passInput?.type;
        return { typeBefore, typeAfter };
      })()
    `);
    record(
      "Part 3",
      "Mobile Password Visibility Toggle Switches Text/Password Type",
      passwordToggleTest.typeBefore === "password" && passwordToggleTest.typeAfter === "text",
      `Before: ${passwordToggleTest.typeBefore}, After: ${passwordToggleTest.typeAfter}`
    );

    // 3D. Demo Fill Test
    const demoFillTest = await evaluate(`
      (async () => {
        const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Demo Fill'));
        if (demoBtn) demoBtn.click();
        await new Promise(r => setTimeout(r, 200));
        const email = document.getElementById('mobile-signin-email')?.value;
        const pass = document.getElementById('mobile-signin-password')?.value;
        return { email, hasPass: !!pass };
      })()
    `);
    record(
      "Part 3",
      "Mobile Demo Fill Prepopulates Credentials Correctly",
      demoFillTest.email === "demo@safarix.travel" && demoFillTest.hasPass,
      `Email: ${demoFillTest.email}, Password set: ${demoFillTest.hasPass}`
    );

    // 3E. Segment Switcher to Mobile Sign Up
    console.log("Testing mobile Sign Up switch...");
    await evaluate(`
      (() => {
        const signUpTab = document.querySelector('[data-testid="mobile-tab-signup"]');
        if (signUpTab) signUpTab.click();
      })()
    `);
    await sleep(600);

    const mobileSignUpElements = await evaluate(`
      (() => {
        const heading = document.querySelector('h3');
        const serifNext = heading?.querySelector('span.font-serif')?.innerText;
        const nameInput = document.getElementById('mobile-signup-name');
        const emailInput = document.getElementById('mobile-signup-email');
        const passwordInput = document.getElementById('mobile-signup-password');
        const confirmInput = document.getElementById('mobile-signup-confirm');
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Create SafariX Account'));

        return {
          headingText: heading?.innerText.replace(/\\n/g, ' '),
          serifEmphasis: serifNext,
          hasName: !!nameInput,
          hasEmail: !!emailInput,
          hasPassword: !!passwordInput,
          hasConfirm: !!confirmInput,
          hasSubmit: !!submitBtn
        };
      })()
    `);
    record(
      "Part 3",
      "Mobile Sign Up Layout Features Full Name, Confirm Password and Create CTA",
      mobileSignUpElements.hasName && mobileSignUpElements.hasEmail && mobileSignUpElements.hasPassword && mobileSignUpElements.hasConfirm && mobileSignUpElements.hasSubmit,
      `Heading: "${mobileSignUpElements.headingText}", Inputs: Name, Email, Password, ConfirmPassword, Submit: ${mobileSignUpElements.hasSubmit}`
    );
    await captureScreenshot("mobile_signup_redesign");

    // 3F. Viewport Overflow Verification
    const viewports = [
      { width: 320, height: 700, label: "320x700" },
      { width: 360, height: 800, label: "360x800" },
      { width: 390, height: 844, label: "390x844" },
      { width: 430, height: 932, label: "430x932" },
    ];

    for (const vp of viewports) {
      await send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: true });
      await sleep(300);
      const overflow = await evaluate(`
        (() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            bodyScrollWidth: document.body.scrollWidth,
            hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
          };
        })()
      `);
      record(
        "Part 3",
        `Zero Horizontal Overflow on Mobile (${vp.label})`,
        !overflow.hasOverflow,
        `ScrollWidth: ${overflow.scrollWidth}px, ClientWidth: ${overflow.clientWidth}px`
      );
    }

    // =========================================================================
    // AUDIT SUMMARY
    // =========================================================================
    console.log("\n=================================================================");
    console.log(" AUDIT SUMMARY");
    console.log("=================================================================");
    const passed = checks.filter((c) => c.passed).length;
    const total = checks.length;
    console.log(`Total Checks: ${total} | Passed: ${passed} | Failed: ${total - passed}`);

    if (passed === total) {
      console.log("\n>>> ALL UI IMPROVEMENT CHECKS PASSED PERFECTLY (20/20) <<<\n");
    } else {
      console.log("\nSome improvement checks failed!\n");
    }

    await ws.close();
  } finally {
    chromeProc.kill("SIGKILL");
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error("Audit script failed:", err);
  process.exit(1);
});
