import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9231;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_debug_profile_${Date.now()}`);

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
        } catch (e) { reject(e); }
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

    const ws = new WebSocket(wsUrl);
    let msgId = 1;
    const pending = new Map<number, (res: any) => void>();

    ws.onmessage = (event: any) => {
      const parsed = JSON.parse(event.data.toString());
      if (parsed.id && pending.has(parsed.id)) {
        pending.get(parsed.id)!(parsed.result);
      }
    };

    await new Promise<void>((resolve) => (ws.onopen = () => resolve()));
    function send(method: string, params: any = {}): Promise<any> {
      return new Promise((resolve) => {
        const id = msgId++;
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", { url: `${BASE_URL}/` });
    await sleep(3000);

    const clickRes = await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Explore Journey with SafariX'));
        if (!btn) return { found: false };
        btn.click();
        return { found: true, btnText: btn.innerText };
      })()`,
      returnByValue: true,
    });
    console.log("Click result:", clickRes?.result?.value);

    for (let i = 0; i < 15; i++) {
      await sleep(500);
      const url = await send("Runtime.evaluate", { expression: `window.location.href`, returnByValue: true });
      console.log(`Poll ${i}: ${url?.result?.value}`);
      if (url?.result?.value?.includes('/auth/sign-in') || url?.result?.value?.includes('/trips/new')) break;
    }

    ws.close();
  } finally {
    try {
      chromeProc.kill();
      await sleep(500);
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  }
}

run();
