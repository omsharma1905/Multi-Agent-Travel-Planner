import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:5000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9245;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_dropdown_fix_profile_${Date.now()}`);
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
  section: string;
  name: string;
  passed: boolean;
  details: string;
}

const checks: TestCheck[] = [];
function record(section: string, name: string, passed: boolean, details: string) {
  checks.push({ section, name, passed, details });
  const tag = passed ? "[PASS]" : "[FAIL]";
  console.log(`${tag} [${section}] ${name} -> ${details}`);
}

async function run() {
  console.log("=================================================================");
  console.log(" SAFARIX TRIP PLANNER DROPDOWN VISUAL DEFECT REMEDIATION AUDIT");
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

    // -------------------------------------------------------------------------
    // 1. DESKTOP 1440x900 VISUAL & PALETTE AUDIT
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 1: DESKTOP 1440x900 PALETTE & CLIPPING AUDIT ---");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(2500);

    // 1A. Open Party Size Dropdown
    await evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label="Select party size"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(400);

    const partyStyles = await evaluate(`
      (() => {
        const menu = document.querySelector('[data-testid="party-option"]')?.parentElement;
        if (!menu) return null;
        const style = window.getComputedStyle(menu);
        const rect = menu.getBoundingClientRect();
        const selectedBtn = Array.from(menu.querySelectorAll('button[data-testid="party-option"]')).find(b => b.innerText.includes('2 Adventurers'));
        const selStyle = selectedBtn ? window.getComputedStyle(selectedBtn) : null;
        const selIcon = selectedBtn?.querySelector('div > div');
        const selIconStyle = selIcon ? window.getComputedStyle(selIcon) : null;

        return {
          bgColor: style.backgroundColor,
          borderColor: style.borderColor,
          textColor: style.color,
          zIndex: style.zIndex,
          menuWidth: Math.round(rect.width),
          menuHeight: Math.round(rect.height),
          selectedBg: selStyle?.backgroundColor,
          selectedIconBg: selIconStyle?.backgroundColor
        };
      })()
    `);

    // In rgb: #FBFBFA = rgb(251, 251, 250), #DCE5DF = rgb(220, 229, 223), #0E2A24 = rgb(14, 42, 36), #EAF2ED = rgb(234, 242, 237)
    record(
      "1. Palette",
      "Party Size Dropdown Has Solid Clean Ivory Background & Dark Forest Text",
      partyStyles?.bgColor === "rgb(251, 251, 250)" && partyStyles?.textColor === "rgb(14, 42, 36)",
      `Bg: ${partyStyles?.bgColor}, Text: ${partyStyles?.textColor}, Border: ${partyStyles?.borderColor}`
    );

    record(
      "1. Palette",
      "Selected Option Has Subtle Ivory-Green Background & Deep Forest Icon Badge",
      partyStyles?.selectedBg === "rgb(234, 242, 237)" && partyStyles?.selectedIconBg === "rgb(14, 42, 36)",
      `SelectedBg: ${partyStyles?.selectedBg}, SelectedIconBg: ${partyStyles?.selectedIconBg}`
    );

    await captureScreenshot("planner_desktop_party_open");

    // 1B. Open Luxury Tier Dropdown
    await evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label="Select luxury tier"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(400);

    const tierStyles = await evaluate(`
      (() => {
        const menu = document.querySelector('[data-testid="tier-option"]')?.parentElement;
        if (!menu) return null;
        const style = window.getComputedStyle(menu);
        const rect = menu.getBoundingClientRect();
        const hero = document.getElementById('hero');
        const heroStyle = hero ? window.getComputedStyle(hero) : null;

        return {
          bgColor: style.backgroundColor,
          borderColor: style.borderColor,
          textColor: style.color,
          zIndex: style.zIndex,
          menuWidth: Math.round(rect.width),
          menuHeight: Math.round(rect.height),
          heroOverflow: heroStyle?.overflow
        };
      })()
    `);

    record(
      "1. Palette",
      "Luxury Tier Dropdown Has Solid Clean Ivory Background & Unclipped Hero Overflow",
      tierStyles?.bgColor === "rgb(251, 251, 250)" && tierStyles?.heroOverflow !== "hidden",
      `Bg: ${tierStyles?.bgColor}, Hero Overflow: ${tierStyles?.heroOverflow}, Menu Width: ${tierStyles?.menuWidth}px`
    );

    await captureScreenshot("planner_desktop_tier_open");

    // -------------------------------------------------------------------------
    // 2. DISMISSAL (OUTSIDE CLICK & ESCAPE)
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 2: INTERACTION & DISMISSAL AUDIT ---");

    // 2A. Escape Key Dismissal
    const escapeTest = await evaluate(`
      (async () => {
        const openBefore = document.querySelectorAll('[data-testid="tier-option"]').length > 0;
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await new Promise(r => setTimeout(r, 200));
        const openAfter = document.querySelectorAll('[data-testid="tier-option"]').length > 0;
        return { openBefore, openAfter };
      })()
    `);
    record(
      "2. Dismissal",
      "Escape Key Dismisses Open Dropdown Menu",
      escapeTest.openBefore && !escapeTest.openAfter,
      `Open before: ${escapeTest.openBefore}, Open after: ${escapeTest.openAfter}`
    );

    // 2B. Outside Click Dismissal
    await evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label="Select party size"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(300);

    const outsideClickTest = await evaluate(`
      (async () => {
        const openBefore = document.querySelectorAll('[data-testid="party-option"]').length > 0;
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        await new Promise(r => setTimeout(r, 200));
        const openAfter = document.querySelectorAll('[data-testid="party-option"]').length > 0;
        return { openBefore, openAfter };
      })()
    `);
    record(
      "2. Dismissal",
      "Outside Click Dismisses Open Dropdown Menu",
      outsideClickTest.openBefore && !outsideClickTest.openAfter,
      `Open before: ${outsideClickTest.openBefore}, Open after: ${outsideClickTest.openAfter}`
    );

    // 2C. Selection Updates Trigger Without Form Submission
    await evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label="Select party size"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(300);

    const selectOptionTest = await evaluate(`
      (async () => {
        const opt4 = Array.from(document.querySelectorAll('button[data-testid="party-option"]')).find(b => b.innerText.includes('4 Adventurers'));
        if (opt4) opt4.click();
        await new Promise(r => setTimeout(r, 200));
        const btn = document.querySelector('button[aria-label="Select party size"]');
        const menuOpen = document.querySelectorAll('[data-testid="party-option"]').length > 0;
        return {
          btnText: btn?.innerText.trim(),
          menuClosed: !menuOpen,
          has4: btn?.innerText.includes('4 Adventurers')
        };
      })()
    `);
    record(
      "2. Selection",
      "Selecting Option Updates Trigger and Closes Dropdown",
      selectOptionTest.has4 && selectOptionTest.menuClosed,
      `Trigger text: "${selectOptionTest.btnText}", Closed: ${selectOptionTest.menuClosed}`
    );

    // -------------------------------------------------------------------------
    // 3. RESPONSIVE & MOBILE AUDIT ACROSS 7 VIEWPORTS
    // -------------------------------------------------------------------------
    console.log("\n--- SECTION 3: RESPONSIVE & MOBILE AUDIT ---");

    const viewports = [
      { width: 320, height: 700, label: "320x700" },
      { width: 360, height: 800, label: "360x800" },
      { width: 390, height: 844, label: "390x844" },
      { width: 430, height: 932, label: "430x932" },
      { width: 768, height: 1024, label: "768x1024" },
      { width: 1024, height: 768, label: "1024x768" },
      { width: 1440, height: 900, label: "1440x900" },
    ];

    for (const vp of viewports) {
      await send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 2, mobile: vp.width < 1024 });
      await send("Page.navigate", { url: `${BASE_URL}/` });
      await sleep(1500);

      // Scroll to console button
      await evaluate(`
        (() => {
          const btn = document.querySelector('button[aria-label="Select party size"]');
          if (btn) btn.scrollIntoView({ block: 'center' });
        })()
      `);
      await sleep(300);

      // Open Party Dropdown
      await evaluate(`
        (() => {
          const btn = document.querySelector('button[aria-label="Select party size"]');
          if (btn) btn.click();
        })()
      `);
      await sleep(300);

      const overflowAudit = await evaluate(`
        (() => {
          const menu = document.querySelector('[data-testid="party-option"]')?.parentElement;
          const rect = menu?.getBoundingClientRect();
          const docScroll = document.documentElement.scrollWidth;
          const docClient = document.documentElement.clientWidth;

          return {
            hasOverflow: docScroll > docClient,
            menuWidth: rect ? Math.round(rect.width) : 0,
            menuLeft: rect ? Math.round(rect.left) : 0,
            menuRight: rect ? Math.round(rect.right) : 0,
            docClient
          };
        })()
      `);

      record(
        "3. Responsive",
        `Zero Horizontal Overflow with Dropdown Open (${vp.label})`,
        !overflowAudit.hasOverflow,
        `Menu width: ${overflowAudit.menuWidth}px, Left: ${overflowAudit.menuLeft}px, Viewport: ${overflowAudit.docClient}px`
      );

      if (vp.label === "390x844") {
        await captureScreenshot("planner_mobile_party_open");

        // Now open Tier dropdown on mobile
        await evaluate(`
          (() => {
            const btn = document.querySelector('button[aria-label="Select luxury tier"]');
            if (btn) btn.click();
          })()
        `);
        await sleep(400);
        await captureScreenshot("planner_mobile_tier_open");
      }
    }

    // -------------------------------------------------------------------------
    // AUDIT SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n=================================================================");
    console.log(" AUDIT SUMMARY");
    console.log("=================================================================");
    const total = checks.length;
    const passed = checks.filter(c => c.passed).length;
    console.log(`Total Checks: ${total} | Passed: ${passed} | Failed: ${total - passed}`);

    if (passed === total) {
      console.log("\n>>> ALL DROPDOWN VISUAL DEFECT REMEDIATION CHECKS PASSED (100%) <<<\n");
    } else {
      console.log("\nSome checks failed!\n");
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
