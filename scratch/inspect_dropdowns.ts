import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:5000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9240;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_inspect_profile_${Date.now()}`);
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

async function run() {
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

    console.log("Navigating to http://localhost:5000 at 1440x900...");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(2500);

    // Open Tier Dropdown on desktop
    await evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label="Select luxury tier"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(400);

    const desktopTierRect = await evaluate(`
      (() => {
        const dropdown = document.querySelector('[data-testid="tier-option"]')?.parentElement;
        const hero = document.getElementById('hero');
        const dRect = dropdown ? dropdown.getBoundingClientRect() : null;
        const hRect = hero ? hero.getBoundingClientRect() : null;
        return { dropdown: dRect, hero: hRect, isClippedByHero: dRect && hRect ? dRect.bottom > hRect.bottom : false };
      })()
    `);
    console.log("Desktop Tier Dropdown rect info:", desktopTierRect);
    await captureScreenshot("inspect_desktop_tier_open");

    // Check Mobile 390x844
    console.log("\nNavigating at 390x844...");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(2500);

    // Scroll to console
    await evaluate(`
      (() => {
        const consoleEl = document.querySelector('button[aria-label="Select party size"]');
        if (consoleEl) consoleEl.scrollIntoView({ block: 'center' });
      })()
    `);
    await sleep(500);

    // Open Party Size Dropdown on mobile
    await evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label="Select party size"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(400);

    const mobilePartyRect = await evaluate(`
      (() => {
        const dropdown = document.querySelector('[data-testid="party-option"]')?.parentElement;
        const hero = document.getElementById('hero');
        const sanctuaries = document.getElementById('sanctuaries');
        const dRect = dropdown ? dropdown.getBoundingClientRect() : null;
        const hRect = hero ? hero.getBoundingClientRect() : null;
        const sRect = sanctuaries ? sanctuaries.getBoundingClientRect() : null;
        return {
          dropdown: dRect,
          hero: hRect,
          sanctuaries: sRect,
          isClippedByHero: dRect && hRect ? dRect.bottom > hRect.bottom : false,
          overlapsSanctuaries: dRect && sRect ? dRect.bottom > sRect.top : false
        };
      })()
    `);
    console.log("Mobile Party Dropdown rect info:", mobilePartyRect);
    await captureScreenshot("inspect_mobile_party_open");

    // Open Tier Dropdown on mobile
    await evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label="Select luxury tier"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(400);

    const mobileTierRect = await evaluate(`
      (() => {
        const dropdown = document.querySelector('[data-testid="tier-option"]')?.parentElement;
        const dRect = dropdown ? dropdown.getBoundingClientRect() : null;
        return { dropdown: dRect };
      })()
    `);
    console.log("Mobile Tier Dropdown rect info:", mobileTierRect);
    await captureScreenshot("inspect_mobile_tier_open");

    await ws.close();
  } finally {
    chromeProc.kill("SIGKILL");
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch(console.error);
