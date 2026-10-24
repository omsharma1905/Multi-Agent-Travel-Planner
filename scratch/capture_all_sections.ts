import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9228;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_full_profile_${Date.now()}`);
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

    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log("Navigating to page...");
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(4000);

    // Dismiss any modal
    await send("Runtime.evaluate", {
      expression: `(() => {
        const closeBtns = document.querySelectorAll('button[aria-label*="close" i], button[aria-label*="Close" i]');
        closeBtns.forEach(b => b.click());
      })()`,
    });
    await sleep(500);

    // Measure total height
    const heightRes = await send("Runtime.evaluate", {
      expression: `document.body.scrollHeight`,
    });
    const totalHeight = heightRes.result.value;
    console.log("Total page scrollHeight:", totalHeight);

    // Capture Sections:
    // 1. Destinations
    console.log("Capturing Destinations...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#destinations')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const destShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "actual_destinations.png"), Buffer.from(destShot.data, "base64"));

    // 2. Marquee & FAQ
    console.log("Capturing Marquee & FAQ...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#faq')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const faqShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "actual_faq.png"), Buffer.from(faqShot.data, "base64"));

    // 3. Final CTA & Footer
    console.log("Capturing Final CTA & Footer...");
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#final-cta')?.scrollIntoView({ behavior: 'instant', block: 'start' });`,
    });
    await sleep(1000);
    const footerShot = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(ARTIFACT_DIR, "actual_footer.png"), Buffer.from(footerShot.data, "base64"));

    console.log("Section screenshots captured successfully!");
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
  console.error("Failed:", err);
  process.exit(1);
});
