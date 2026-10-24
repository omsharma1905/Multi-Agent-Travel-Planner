import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9227;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_capture_profile_${Date.now()}`);
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

async function capture() {
  console.log("Launching headless Chrome to inspect real rendered website...");
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

    // 1. Desktop Capture
    console.log("Navigating to desktop page...");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send("Page.navigate", { url: `${BASE_URL}/` });
    // Wait for intro animation and render
    await sleep(4000);

    // Close any early access modal if open so we can see the full page
    await send("Runtime.evaluate", {
      expression: `(() => {
        const closeBtns = document.querySelectorAll('button[aria-label*="close" i], button[aria-label*="Close" i]');
        closeBtns.forEach(b => b.click());
      })()`,
    });
    await sleep(500);

    console.log("Capturing Desktop Top View...");
    const desktopTop = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, "actual_rendered_desktop_top.png"),
      Buffer.from(desktopTop.data, "base64")
    );

    // Scroll to middle (How It Works & Multi-Agent Dossier)
    console.log("Scrolling to Methodology & Multi-Agent Dossier...");
    await send("Runtime.evaluate", {
      expression: `window.scrollTo({ top: 1200, behavior: 'instant' });`,
    });
    await sleep(1000);
    const desktopMiddle = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, "actual_rendered_desktop_middle.png"),
      Buffer.from(desktopMiddle.data, "base64")
    );

    // Scroll to lower (Destinations, Marquee, FAQ, Footer)
    console.log("Scrolling to Destinations, Marquee & FAQ...");
    await send("Runtime.evaluate", {
      expression: `window.scrollTo({ top: 2600, behavior: 'instant' });`,
    });
    await sleep(1000);
    const desktopLower = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, "actual_rendered_desktop_lower.png"),
      Buffer.from(desktopLower.data, "base64")
    );

    // 2. Mobile Capture (375x812)
    console.log("Navigating to mobile viewport (375x812)...");
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

    const mobileTop = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, "actual_rendered_mobile_top.png"),
      Buffer.from(mobileTop.data, "base64")
    );

    console.log("All screenshots successfully captured to artifact directory!");
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

capture().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
