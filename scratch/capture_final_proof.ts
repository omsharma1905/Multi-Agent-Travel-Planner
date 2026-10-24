import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9229;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_proof_profile_${Date.now()}`);
const ARTIFACT_DIR = "C:\\Users\\OM SHARMA\\.gemini\\antigravity\\brain\\1cf866f0-8291-4aba-9317-3bba072d99a7";

async function sleep(ms: number) {
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

async function run() {
  console.log("=================================================================");
  console.log(" CAPTURING FRESH DESKTOP & MOBILE PROOF OF UPDATED SAFARIX UI");
  console.log("=================================================================\n");

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

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
    const consoleErrors: string[] = [];

    ws.onmessage = (event: any) => {
      const parsed = JSON.parse(event.data.toString());
      if (parsed.id && pending.has(parsed.id)) {
        const resolve = pending.get(parsed.id)!;
        pending.delete(parsed.id);
        resolve(parsed.result);
      }
      if (parsed.method === "Runtime.consoleAPICalled" && parsed.params.type === "error") {
        const text = parsed.params.args.map((a: any) => a.value ?? a.description ?? "").join(" ");
        if (!text.includes("favicon")) consoleErrors.push(text);
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

    // 1. Desktop Setup (1440x900)
    console.log("1. Setting desktop viewport 1440x900 and loading page...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(4000);

    // Dismiss early access dialog if open
    await send("Runtime.evaluate", {
      expression: `(() => {
        const closeBtns = document.querySelectorAll('button[aria-label*="close" i], button[aria-label*="Close" i]');
        closeBtns.forEach(b => b.click());
      })()`,
    });
    await sleep(600);

    // Shot 1: Hero & Navbar
    console.log("Capturing Shot 1: Desktop Navbar & Hero...");
    const shot1 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "fresh_desktop_navbar_hero.png"), Buffer.from(shot1.data, "base64"));

    // Shot 2: Methodology (Dark Forest Contrast)
    console.log("Capturing Shot 2: Desktop Methodology (#how-it-works)...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const shot2 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "fresh_desktop_methodology.png"), Buffer.from(shot2.data, "base64"));

    // Shot 3: Multi-Agent Dossier (Pale Sage Canvas)
    console.log("Capturing Shot 3: Desktop Multi-Agent Dossier (#features)...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#features')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const shot3 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "fresh_desktop_multiagent_dossier.png"), Buffer.from(shot3.data, "base64"));

    // Shot 4: Destinations Gallery (Deep Forest Gallery)
    console.log("Capturing Shot 4: Desktop Destinations Gallery (#destinations)...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#destinations')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const shot4 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "fresh_desktop_destinations.png"), Buffer.from(shot4.data, "base64"));

    // Shot 5: FAQ & Footer (Warm Paper FAQ -> Deep Forest Footer)
    console.log("Capturing Shot 5: Desktop FAQ (#faq)...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#faq')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const shot5 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "fresh_desktop_faq_footer.png"), Buffer.from(shot5.data, "base64"));

    // 2. Mobile Setup (375x812)
    console.log("Setting mobile viewport 375x812...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await send("Runtime.evaluate", {
      expression: `window.scrollTo({ top: 0, behavior: 'instant' });`,
    });
    await sleep(1000);

    console.log("Capturing Shot 6: Mobile Hero & Navbar...");
    const shot6 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "fresh_mobile_hero.png"), Buffer.from(shot6.data, "base64"));

    console.log("Capturing Shot 7: Mobile Methodology (#how-it-works)...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const shot7 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "fresh_mobile_methodology.png"), Buffer.from(shot7.data, "base64"));

    // Inspect computed background styles
    const stylesCheck = await send("Runtime.evaluate", {
      expression: `(() => {
        const getBg = (sel) => {
          const el = document.querySelector(sel);
          return el ? window.getComputedStyle(el).backgroundColor : null;
        };
        return {
          navbar: getBg('header'),
          hero: getBg('section[aria-label="Editorial Travel Planning Hero"]'),
          howItWorks: getBg('#how-it-works'),
          features: getBg('#features'),
          destinations: getBg('#destinations'),
          faq: getBg('#faq'),
          finalCta: getBg('#final-cta'),
          footer: getBg('footer')
        };
      })()`,
      returnByValue: true,
    });

    console.log("\nVerified Section Background Colors:", JSON.stringify(stylesCheck.result.value, null, 2));
    console.log("Browser Console Errors:", consoleErrors.length === 0 ? "0 errors" : consoleErrors);

    ws.close();
  } finally {
    try {
      chromeProc.kill("SIGTERM");
    } catch {}
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error("Proof capture failed:", err);
  process.exit(1);
});
