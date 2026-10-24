import { spawn } from "child_process";
import http from "http";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDebuggerUrl(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PORT}/json`, (res) => {
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

async function testRoute(url: string) {
  console.log(`\n==========================================\nTESTING ROUTE: ${url}\n==========================================`);
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      "--disable-gpu",
      "--no-sandbox",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let wsUrl = "";
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      wsUrl = await getDebuggerUrl();
      break;
    } catch {}
  }

  if (!wsUrl) {
    console.error("Failed to connect to Chrome!");
    chromeProcess.kill();
    return;
  }

  const ws = new WebSocket(wsUrl);
  let messageId = 1;
  const pending = new Map<number, (res: any) => void>();

  function send(method: string, params: any = {}): Promise<any> {
    const id = messageId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const errors: string[] = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.result);
      pending.delete(msg.id);
    }

    if (msg.method === "Runtime.consoleAPICalled") {
      const { type, args } = msg.params;
      const text = args.map((a: any) => a.value ?? a.description ?? JSON.stringify(a)).join(" ");
      if (type === "error") {
        errors.push(`[Console Error]: ${text}`);
      }
      if (text.includes("Suspense") || text.includes("Switched") || text.includes("error")) {
        console.log(`[Browser Console ${type.toUpperCase()}]:`, text);
      }
    }

    if (msg.method === "Runtime.exceptionThrown") {
      const { exceptionDetails } = msg.params;
      errors.push(`[Exception]: ${exceptionDetails.text} ${exceptionDetails.exception?.description || ""}`);
      console.error("💥 [EXCEPTION]:", exceptionDetails.text, exceptionDetails.exception?.description || "");
    }
  };

  await new Promise((resolve) => (ws.onopen = resolve));
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  await send("Page.navigate", { url });
  await sleep(3500);

  console.log(`Total console errors captured on ${url}:`, errors.length);
  errors.forEach((e) => console.log("  ", e));

  ws.close();
  chromeProcess.kill();
}

async function main() {
  await testRoute("http://localhost:3000/");
  await testRoute("http://localhost:3000/auth/sign-in");
  await testRoute("http://localhost:3000/auth/sign-up");
}

main().catch(console.error);

export {};
