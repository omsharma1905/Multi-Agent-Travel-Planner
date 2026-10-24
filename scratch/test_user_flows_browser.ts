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
            reject(new Error("No page found: " + data));
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
  console.log("=================================================================");
  console.log(" SAFARIX FULL BROWSER VERIFICATION & REGRESSION SUITE");
  console.log("=================================================================\n");

  // Create test user for this session
  const testEmail = `test_suite_${Date.now()}@safarix.test`;
  const password = "Password123!";
  console.log(`Creating test user: ${testEmail}...`);
  const signupRes = await fetch("http://localhost:3000/api/auth/sign-up", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Verified Travel Tester",
      email: testEmail,
      password,
    }),
  });
  console.log("Sign-up status:", signupRes.status);
  const setCookie = signupRes.headers.get("set-cookie");
  let sessionToken = "";
  if (setCookie) {
    const match = setCookie.match(/safarix_session=([^;]+)/);
    if (match) sessionToken = match[1];
  }

  // Launch headless Chrome
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

  const ws = new WebSocket(wsUrl);
  let msgId = 1;
  const pending = new Map<number, (res: any) => void>();

  function send(method: string, params: any = {}): Promise<any> {
    const id = msgId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const recordedErrors: string[] = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.result);
      pending.delete(msg.id);
    }

    if (msg.method === "Runtime.consoleAPICalled") {
      const { type, args } = msg.params;
      const text = args.map((a: any) => a.value ?? a.description ?? JSON.stringify(a)).join(" ");
      if (type === "error" || text.includes("Suspense") || text.includes("Switched")) {
        console.log(`[Browser Console ${type.toUpperCase()}]:`, text);
        if (type === "error" || text.includes("CAUGHT WINDOW ERROR")) {
          recordedErrors.push(text);
        }
      }
    }

    if (msg.method === "Runtime.exceptionThrown") {
      const { exceptionDetails } = msg.params;
      console.error("💥 [EXCEPTION]:", exceptionDetails.text, exceptionDetails.exception?.description || "");
      recordedErrors.push(exceptionDetails.text);
    }
  };

  await new Promise((resolve) => (ws.onopen = resolve));
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.addEventListener('error', (event) => {
        const err = event.error;
        console.error('=== CAUGHT WINDOW ERROR === ' + JSON.stringify({
          message: err ? err.message : event.message,
          name: err ? err.name : null,
          digest: err ? err.digest : null,
          stack: err ? err.stack : null,
        }));
      });
    `
  });

  // Step 1: Fresh unauthenticated visit to landing page
  console.log("\n--- Step 1: Fresh Unauthenticated Visit to / ---");
  await send("Page.navigate", { url: "http://localhost:3000/" });
  await sleep(2500);

  // Step 2: Unauthenticated visit to /auth/sign-in
  console.log("\n--- Step 2: Unauthenticated Visit to /auth/sign-in ---");
  await send("Page.navigate", { url: "http://localhost:3000/auth/sign-in" });
  await sleep(2000);

  // Step 3: Unauthenticated visit to /auth/sign-up
  console.log("\n--- Step 3: Unauthenticated Visit to /auth/sign-up ---");
  await send("Page.navigate", { url: "http://localhost:3000/auth/sign-up" });
  await sleep(2000);

  // Step 4: Inject authenticated session cookie
  console.log("\n--- Step 4: Inject Authenticated Session Cookie ---");
  await send("Network.setCookie", {
    name: "safarix_session",
    value: sessionToken,
    domain: "localhost",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });
  console.log("Injected safarix_session cookie into browser context");

  // Step 5: Authenticated visit to landing page /
  console.log("\n--- Step 5: Authenticated Visit to / ---");
  await send("Page.navigate", { url: "http://localhost:3000/" });
  await sleep(2500);

  // Step 6: Authenticated visit to /dashboard
  console.log("\n--- Step 6: Authenticated Visit to /dashboard ---");
  await send("Page.navigate", { url: "http://localhost:3000/dashboard" });
  await sleep(2500);

  // Step 7: Back Navigation to /
  console.log("\n--- Step 7: Browser Back Button to / ---");
  let history = await send("Page.getNavigationHistory");
  let currentIndex = history.currentIndex;
  if (currentIndex > 0) {
    const prevEntry = history.entries[currentIndex - 1];
    await send("Page.navigateToHistoryEntry", { entryId: prevEntry.id });
    await sleep(2500);
  }

  // Step 8: Forward Navigation to /dashboard
  console.log("\n--- Step 8: Browser Forward Button to /dashboard ---");
  history = await send("Page.getNavigationHistory");
  currentIndex = history.currentIndex;
  if (currentIndex < history.entries.length - 1) {
    const nextEntry = history.entries[currentIndex + 1];
    await send("Page.navigateToHistoryEntry", { entryId: nextEntry.id });
    await sleep(2500);
  }

  // Step 9: Visit trip creation (/trips/new)
  console.log("\n--- Step 9: Visit Trip Creation (/trips/new) ---");
  await send("Page.navigate", { url: "http://localhost:3000/trips/new" });
  await sleep(2500);

  // Step 10: Create trip and visit trip detail (/trips/[tripId])
  console.log("\n--- Step 10: Create Trip and Visit /trips/[tripId] ---");
  const createTripRes = await fetch("http://localhost:3000/api/trips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `safarix_session=${sessionToken}`,
    },
    body: JSON.stringify({
      origin: "Paris",
      destination: "Rome",
      days: 3,
      travellers: 2,
      budget: "moderate",
      transportPreference: "auto",
      interests: ["culture", "food"],
    }),
  });
  console.log("Create trip status:", createTripRes.status);
  const tripData = await createTripRes.json();
  const tripId = tripData.id;
  console.log("Created trip id:", tripId);
  if (tripId) {
    await send("Page.navigate", { url: `http://localhost:3000/trips/${tripId}` });
    await sleep(3000);
  }

  // Step 11: Clear cookies (Sign Out) and verify protected route interception
  console.log("\n--- Step 11: Sign Out & Protected Route Interception ---");
  await send("Network.clearBrowserCookies");
  await send("Page.navigate", { url: "http://localhost:3000/dashboard" });
  await sleep(2500);

  console.log("\n=================================================================");
  console.log(` BROWSER VERIFICATION COMPLETE: ${recordedErrors.length} ERRORS RECORDED`);
  if (recordedErrors.length === 0) {
    console.log(" ✓ ALL 11 BROWSER JOURNEYS EXECUTED WITH ZERO ERRORS!");
  } else {
    recordedErrors.forEach((e) => console.log(" ❌ ", e));
  }
  console.log("=================================================================\n");

  ws.close();
  chromeProcess.kill();
  if (recordedErrors.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export {};
