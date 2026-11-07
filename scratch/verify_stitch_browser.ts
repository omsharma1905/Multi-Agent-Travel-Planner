import http from "http";
import { spawn, ChildProcess } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9229;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_stitch_profile_${Date.now()}`);
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

async function run() {
  console.log("=================================================================");
  console.log(" VERIFYING STITCH LANDING PAGE IN HEADLESS CHROME");
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

    // ==========================================
    // 1. DESKTOP VIEWPORT (1440x900)
    // ==========================================
    console.log("1. Setting desktop viewport 1440x900...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`Navigating to ${BASE_URL}...`);
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(3500);

    // Shot 1: Desktop Hero & Floating Planner
    console.log("Capturing Shot 1: Desktop Hero & Floating Planner...");
    const shot1 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "stitch_desktop_hero_planner.png"), Buffer.from(shot1.data, "base64"));

    // Shot 2: Curated Sanctuaries
    console.log("Capturing Shot 2: Curated Sanctuaries (#sanctuaries)...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#sanctuaries')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const shot2 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "stitch_desktop_sanctuaries.png"), Buffer.from(shot2.data, "base64"));

    // Shot 3: Multi-Agent Swarm & Live Master Itinerary
    console.log("Capturing Shot 3: Multi-Agent Swarm (#agents)...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#agents')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const shot3 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "stitch_desktop_agents.png"), Buffer.from(shot3.data, "base64"));

    // Shot 4: Workflow & Final CTA
    console.log("Capturing Shot 4: Workflow & Final CTA (#methodology)...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#methodology')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const shot4 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "stitch_desktop_workflow_cta.png"), Buffer.from(shot4.data, "base64"));

    // ==========================================
    // 2. MOBILE VIEWPORT (390x844 - iPhone 14 / modern mobile)
    // ==========================================
    console.log("\n2. Switching to mobile viewport (390x844)...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
      hasTouch: true,
    });

    await send("Runtime.evaluate", { expression: `window.scrollTo(0, 0);` });
    await sleep(1200);

    // Shot 5: Mobile Hero & Island Planner
    console.log("Capturing Shot 5: Mobile Hero & Island Planner...");
    const shot5 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "stitch_mobile_hero_planner.png"), Buffer.from(shot5.data, "base64"));

    // Shot 6: Mobile Curated Sanctuaries
    console.log("Capturing Shot 6: Mobile Sanctuaries...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#sanctuaries')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const shot6 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "stitch_mobile_sanctuaries.png"), Buffer.from(shot6.data, "base64"));

    // Shot 7: Mobile Multi-Agent Swarm & Fixed Bottom Nav
    console.log("Capturing Shot 7: Mobile Multi-Agent Swarm & Bottom Nav...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#agents')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const shot7 = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "stitch_mobile_agents_itinerary.png"), Buffer.from(shot7.data, "base64"));

    console.log("\n=================================================================");
    console.log(" SCREENSHOT AUDIT COMPLETED SUCCESSFULLY!");
    console.log(` Console Errors (${consoleErrors.length}):`, consoleErrors);
    console.log("=================================================================");

    ws.close();
  } finally {
    try {
      chromeProc.kill();
      await sleep(1000);
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {
      // Ignore temporary Windows Chrome lock
    }
  }
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
