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

async function main() {
  console.log("Launching Headless Chrome with CDP...");
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

  process.on("exit", () => {
    try {
      chromeProcess.kill();
    } catch {}
  });

  // Wait for Chrome to open debugging port
  let wsUrl = "";
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    try {
      wsUrl = await getDebuggerUrl();
      break;
    } catch {
      // retry
    }
  }

  if (!wsUrl) {
    console.error("Failed to connect to Chrome debugging port!");
    chromeProcess.kill();
    return;
  }

  console.log("Connected to Chrome CDP WebSocket:", wsUrl);
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

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.result);
      pending.delete(msg.id);
    }

    if (msg.method === "Runtime.consoleAPICalled") {
      const { type, args } = msg.params;
      const text = args.map((a: any) => {
        if (a.type === "string") return a.value;
        if (a.preview) {
          const props = a.preview.properties?.map((p: any) => `${p.name}: ${p.value}`).join(", ");
          return `${a.description || a.className || a.type} { ${props} }`;
        }
        return a.value ?? a.description ?? JSON.stringify(a);
      }).join(" ");
      console.log(`[Browser Console ${type.toUpperCase()}]:`, text);
    }

    if (msg.method === "Runtime.exceptionThrown") {
      const { exceptionDetails } = msg.params;
      console.error("\n💥 [Browser EXCEPTION THROWN]:", exceptionDetails.text);
      if (exceptionDetails.exception) {
        console.error("Exception object:", exceptionDetails.exception.description);
      }
      if (exceptionDetails.stackTrace) {
        console.error("Stack trace:");
        for (const frame of exceptionDetails.stackTrace.callFrames) {
          console.error(`  at ${frame.functionName || "<anonymous>"} (${frame.url}:${frame.lineNumber}:${frame.columnNumber})`);
        }
      }
    }

    if (msg.method === "Log.entryAdded") {
      const { entry } = msg.params;
      console.log(`[Browser Log ${entry.level.toUpperCase()}]: ${entry.text} (${entry.url || ""})`);
    }
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  // Enable debugging domains
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");

  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.addEventListener('error', (event) => {
        console.error('WINDOW ERROR CAUGHT:', event.message, event.error ? event.error.stack : 'no stack');
      });
      window.addEventListener('unhandledrejection', (event) => {
        console.error('UNHANDLED REJECTION CAUGHT:', event.reason);
      });
    `
  });

  console.log("\nNavigating to http://localhost:3000/ ...");
  await send("Page.navigate", { url: "http://localhost:3000/" });

  // Wait 4 seconds for full render, hydration, and any console/error events
  await sleep(4000);

  console.log("\nNavigation check completed. Closing browser.");
  ws.close();
  chromeProcess.kill();
}

main().catch(console.error);

export {};
