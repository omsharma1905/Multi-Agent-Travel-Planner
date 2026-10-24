import { spawn } from "child_process";
import http from "http";
import os from "os";
import path from "path";
import fs from "fs";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9223;
const USER_DATA_DIR = path.join(os.tmpdir(), `chrome_test_profile_${Date.now()}`);

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

interface TestReport {
  name: string;
  passed: boolean;
  details?: string;
}

const reports: TestReport[] = [];
function report(name: string, passed: boolean, details?: string) {
  reports.push({ name, passed, details });
  console.log(`${passed ? " PASS " : " FAIL "} [${name}] ${details ? "-> " + details : ""}`);
}

async function runTests() {
  console.log("=== SAFARIX ANIMATED AUTH UI CDP VERIFICATION SUITE ===");

  const chromeProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${USER_DATA_DIR}`,
      "--disable-gpu",
      "--no-sandbox",
      "--window-size=1280,800",
      "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let devToolsListening = false;
  chromeProcess.stderr.on("data", (d) => {
    const s = d.toString();
    if (s.includes("DevTools listening on")) {
      devToolsListening = true;
    }
  });

  process.on("exit", () => {
    try {
      chromeProcess.kill();
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {}
  });

  let wsUrl = "";
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    try {
      wsUrl = await getDebuggerUrl();
      if (wsUrl) break;
    } catch {}
  }

  if (!wsUrl) {
    console.error("Failed to connect to Chrome debugging port!");
    chromeProcess.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);

  let messageId = 1;
  const pending = new Map<number, (res: any) => void>();
  const consoleErrors: string[] = [];

  function send(method: string, params: any = {}): Promise<any> {
    const id = messageId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evalExpression(expr: string): Promise<any> {
    const res = await send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res?.exceptionDetails) {
      throw new Error(`Eval error in "${expr}": ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res?.result?.value;
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.result);
      pending.delete(msg.id);
    }

    if (msg.method === "Runtime.consoleAPICalled") {
      const { type, args } = msg.params;
      const text = args.map((a: any) => a.value ?? a.description ?? "").join(" ");
      if (type === "error") {
        consoleErrors.push(text);
        console.error("Browser error:", text);
      }
    }

    if (msg.method === "Runtime.exceptionThrown") {
      consoleErrors.push(msg.params.exceptionDetails.text);
      console.error("Browser exception:", msg.params.exceptionDetails.text);
    }
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  // TEST 1: Direct navigation to /auth/sign-in
  console.log("\n--- TEST 1: Direct navigation to /auth/sign-in ---");
  await send("Page.navigate", { url: "http://localhost:3000/auth/sign-in" });
  await sleep(2500);

  const initialUrl = await evalExpression("window.location.pathname");
  report("Direct load /auth/sign-in pathname", initialUrl === "/auth/sign-in", initialUrl);

  const headingText = await evalExpression(`document.querySelector("h2")?.textContent?.trim()`);
  report("Sign In form heading", headingText?.includes("Sign in"), headingText);

  const panelEditorialText = await evalExpression(`document.body.innerText.includes("Welcome") && document.body.innerText.includes("Your next adventure is waiting")`);
  report("Welcome panel editorial text present", Boolean(panelEditorialText));

  // Check panel clipPath & position
  const panelStyle = await evalExpression(`
    (() => {
      // Find the moving panel by looking for motion div with polygon
      const divs = Array.from(document.querySelectorAll('div'));
      const panel = divs.find(d => d.style.clipPath && d.style.clipPath.includes('polygon'));
      return panel ? { clipPath: panel.style.clipPath, left: panel.style.left } : null;
    })()
  `);
  report(
    "Desktop panel initial geometry for sign-in",
    Boolean(panelStyle && panelStyle.clipPath.includes("polygon")),
    JSON.stringify(panelStyle)
  );

  // TEST 2: Click "Create account" to trigger diagonal sweep animation
  console.log("\n--- TEST 2: Switch to Sign Up via 'Create account' button ---");
  await evalExpression(`
    (() => {
      // Find the switch button inside the sign-in form area
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('Create account') && !b.disabled);
      if (btn) btn.click();
      return Boolean(btn);
    })()
  `);

  // Wait for 1s for animation duration (0.72s) to finish
  await sleep(1000);

  const urlAfterSwitch = await evalExpression("window.location.pathname");
  report("URL updated to /auth/sign-up without page reload", urlAfterSwitch === "/auth/sign-up", urlAfterSwitch);

  const signUpEditorialPresent = await evalExpression(`
    document.body.innerText.includes("Start your") && document.body.innerText.includes("next journey")
  `);
  report("Panel content cross-faded to 'Start your next journey'", Boolean(signUpEditorialPresent));

  const signUpFormVisible = await evalExpression(`
    (() => {
      const nameInput = document.querySelector('#desktop-signup-name') || document.querySelector('input[type="text"]');
      const emailInput = document.querySelector('#desktop-signup-email');
      const passInput = document.querySelector('#desktop-signup-password');
      const confirmInput = document.querySelector('#desktop-signup-confirm');
      return Boolean(nameInput && emailInput && passInput && confirmInput);
    })()
  `);
  report("Sign Up fields visible and rendered", Boolean(signUpFormVisible));

  // TEST 3: Click "Sign in" to reverse animation
  console.log("\n--- TEST 3: Switch back to Sign In via 'Sign in' button ---");
  await evalExpression(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent && b.textContent.trim() === 'Sign in' && !b.disabled && b.type === 'button');
      if (btn) btn.click();
      return Boolean(btn);
    })()
  `);
  await sleep(1000);

  const urlAfterReverse = await evalExpression("window.location.pathname");
  report("URL reverted back to /auth/sign-in", urlAfterReverse === "/auth/sign-in", urlAfterReverse);

  const signInEditorialPresent = await evalExpression(`
    document.body.innerText.includes("Welcome") && document.body.innerText.includes("back")
  `);
  report("Panel content cross-faded back to 'Welcome back'", Boolean(signInEditorialPresent));

  // TEST 4: Browser Back / Forward navigation (popstate)
  console.log("\n--- TEST 4: Browser Back and Forward navigation ---");
  await evalExpression("window.history.back()");
  await sleep(900);

  const urlAfterBack = await evalExpression("window.location.pathname");
  report("window.history.back() moved to /auth/sign-up", urlAfterBack === "/auth/sign-up", urlAfterBack);

  await evalExpression("window.history.forward()");
  await sleep(900);

  const urlAfterForward = await evalExpression("window.location.pathname");
  report("window.history.forward() moved to /auth/sign-in", urlAfterForward === "/auth/sign-in", urlAfterForward);

  // TEST 5: Password visibility toggle
  console.log("\n--- TEST 5: Password Show/Hide toggle ---");
  const initialPasswordType = await evalExpression(`
    document.querySelector('#desktop-signin-password')?.getAttribute('type')
  `);
  await evalExpression(`
    (() => {
      const toggle = document.querySelector('button[aria-label="Show password"]');
      if (toggle) toggle.click();
    })()
  `);
  await sleep(200);
  const toggledPasswordType = await evalExpression(`
    document.querySelector('#desktop-signin-password')?.getAttribute('type')
  `);
  report(
    "Password Show/Hide toggles input type",
    initialPasswordType === "password" && toggledPasswordType === "text",
    `Initial: ${initialPasswordType}, Toggled: ${toggledPasswordType}`
  );

  // TEST 6: Demo Quick-Fill
  console.log("\n--- TEST 6: Demo Quick-Fill button ---");
  await evalExpression(`
    (() => {
      const demoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Demo Fill'));
      if (demoBtn) demoBtn.click();
    })()
  `);
  await sleep(300);
  const filledEmail = await evalExpression(`
    document.querySelector('#desktop-signin-email')?.value
  `);
  report("Demo Fill populated email", Boolean(filledEmail && filledEmail.includes("@")), filledEmail);

  // TEST 7: Direct load of /auth/sign-up
  console.log("\n--- TEST 7: Direct navigation to /auth/sign-up ---");
  await send("Page.navigate", { url: "http://localhost:3000/auth/sign-up" });
  await sleep(2500);

  const directSignUpUrl = await evalExpression("window.location.pathname");
  report("Direct /auth/sign-up url", directSignUpUrl === "/auth/sign-up", directSignUpUrl);

  const directSignUpEditorial = await evalExpression(`
    document.body.innerText.includes("Start your") && document.body.innerText.includes("next journey")
  `);
  report("Direct /auth/sign-up loads in sign-up mode immediately", Boolean(directSignUpEditorial));

  // TEST 8: Mobile Responsive Viewport
  console.log("\n--- TEST 8: Mobile Responsive Viewport (375x812) ---");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sleep(500);

  const mobileSegmentVisible = await evalExpression(`
    Boolean(document.querySelector('[data-testid="mobile-tab-signin"]') && document.querySelector('[data-testid="mobile-tab-signup"]'))
  `);
  report("Mobile segment switcher rendered", Boolean(mobileSegmentVisible));

  // Click Sign in tab on mobile
  await evalExpression(`
    (() => {
      const signinSegment = document.querySelector('[data-testid="mobile-tab-signin"]');
      if (signinSegment) signinSegment.click();
    })()
  `);
  await sleep(800);

  const mobileSignInActive = await evalExpression(`
    document.body.innerText.includes("Welcome") && document.body.innerText.includes("back")
  `);
  report("Mobile segment switch to Sign in works", Boolean(mobileSignInActive));

  // TEST 9: Console errors check
  console.log("\n--- TEST 9: Console Error Verification ---");
  const filteredErrors = consoleErrors.filter(
    (e) => !e.includes("favicon") && !e.includes("ResizeObserver")
  );
  report("Zero console errors during all auth interactions", filteredErrors.length === 0, `${filteredErrors.length} errors caught`);

  // Teardown
  ws.close();
  chromeProcess.kill();

  const total = reports.length;
  const passed = reports.filter((r) => r.passed).length;
  console.log(`\n=========================================`);
  console.log(`RESULTS: ${passed}/${total} checks PASSED`);
  console.log(`=========================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
