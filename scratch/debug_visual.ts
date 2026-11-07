import http from "http";
import { spawn } from "child_process";
import os from "os";
import path from "path";
import fs from "fs";

const CDP_PORT = 9231;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_debug_${Date.now()}`);
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function run() {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--remote-debugging-address=127.0.0.1`,
      `--user-data-dir=${USER_DATA_DIR}`,
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "http://localhost:3000",
    ],
    { stdio: "ignore" }
  );

  await new Promise((r) => setTimeout(r, 1500));

  const list = await fetch(`http://127.0.0.1:${CDP_PORT}/json`).then((r) => r.json());
  const page = list.find((p: any) => p.type === "page") || list[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise<void>((resolve) => {
    ws.onopen = () => resolve();
  });

  let id = 1;
  const pending = new Map();
  const failedRequests: string[] = [];

  ws.onmessage = (e: any) => {
    const data = JSON.parse(e.data.toString());
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data.result);
      pending.delete(data.id);
    }
    if (data.method === "Network.loadingFailed") {
      failedRequests.push(`${data.params.requestId}: ${data.params.errorText}`);
    }
  };

  const send = (method: string, params: any = {}) =>
    new Promise((resolve) => {
      const curId = id++;
      pending.set(curId, resolve);
      ws.send(JSON.stringify({ id: curId, method, params }));
    });

  await send("Page.enable");
  await send("Network.enable");
  await send("Runtime.enable");

  await new Promise((r) => setTimeout(r, 3000));

  const diag = await send("Runtime.evaluate", {
    expression: `
      (() => {
        const icons = Array.from(document.querySelectorAll('.material-symbols-outlined'));
        const firstIcon = icons[0];
        const computed = firstIcon ? window.getComputedStyle(firstIcon) : null;
        const fontLoaded = document.fonts.check('24px "Material Symbols Outlined"');
        const availableFonts = Array.from(document.fonts).map(f => f.family + ' (' + f.status + ')');
        
        const images = Array.from(document.querySelectorAll('img')).map(i => ({
          src: i.src,
          naturalWidth: i.naturalWidth,
          complete: i.complete
        }));

        const bgImages = Array.from(document.querySelectorAll('*')).filter(el => {
          const bg = window.getComputedStyle(el).backgroundImage;
          return bg && bg !== 'none';
        }).map(el => window.getComputedStyle(el).backgroundImage);

        return {
          iconCount: icons.length,
          firstIconText: firstIcon ? firstIcon.innerText : null,
          computedFont: computed ? computed.fontFamily : null,
          fontLoaded,
          availableFonts,
          images,
          bgImages: bgImages.slice(0, 5)
        };
      })()
    `,
    returnByValue: true,
  });

  console.log("DIAGNOSTIC RESULTS:\n", JSON.stringify((diag as any)?.result?.value, null, 2));
  console.log("FAILED NETWORK REQUESTS:", failedRequests);

  ws.close();
  chrome.kill();
  try {
    fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
  } catch {}
}

run().catch(console.error);
