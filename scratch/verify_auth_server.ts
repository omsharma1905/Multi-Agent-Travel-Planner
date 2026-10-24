import { spawn } from "child_process";
import http from "http";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRoute(url: string, cookie?: string): Promise<{ status: number; text: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.get(
      url,
      {
        headers: cookie ? { Cookie: cookie } : {},
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, text, headers: res.headers }));
      }
    );
    req.on("error", reject);
  });
}

async function postJson(url: string, data: any): Promise<{ status: number; json: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsedUrl = new URL(url);
    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode || 0, json: JSON.parse(text), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode || 0, json: text, headers: res.headers });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log("=== SAFARIX ANIMATED AUTH & ROUTING IN-PROCESS VERIFICATION ===\n");

  const devServer = spawn("npx.cmd", ["next", "dev", "--port", "3001"], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });

  devServer.stdout.on("data", (d) => {
    const line = d.toString();
    if (line.includes("Ready") || line.includes("compiled")) {
      process.stdout.write("[Next Dev] " + line);
    }
  });

  devServer.stderr.on("data", (d) => {
    const line = d.toString();
    if (!line.includes("ExperimentalWarning")) {
      process.stderr.write("[Next Dev Err] " + line);
    }
  });

  // Wait for server to become ready on port 3001
  console.log("Waiting for Next.js dev server on http://localhost:3001...");
  let ready = false;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const res = await fetchRoute("http://127.0.0.1:3001/api/auth/session");
      if (res.status === 200) {
        ready = true;
        console.log("Dev server is ready!\n");
        break;
      }
    } catch (e: any) {
      if (i % 10 === 0) {
        console.log("Probe attempt error:", e.code || e.message);
      }
    }
  }

  if (!ready) {
    console.error("Server failed to respond within 20s!");
    devServer.kill();
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;
  function assert(name: string, ok: boolean, info?: string) {
    if (ok) {
      console.log(`  ✓ [PASS] ${name} ${info ? "-> " + info : ""}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name} ${info ? "-> " + info : ""}`);
      failed++;
    }
  }

  try {
    // 1. Verify GET /auth/sign-in
    console.log("1. Inspecting GET /auth/sign-in...");
    const signInRes = await fetchRoute("http://127.0.0.1:3001/auth/sign-in");
    assert("HTTP Status 200", signInRes.status === 200, String(signInRes.status));
    assert("Contains 'Sign in' form elements", signInRes.text.includes("Sign in"));
    assert("Contains 'Welcome back.' editorial heading", signInRes.text.includes("Welcome") && signInRes.text.includes("back"));
    assert("Contains 'Create account' switch action", signInRes.text.includes("Create account"));
    assert("Contains deep green & ivory styling classes", signInRes.text.includes("#063D2E") || signInRes.text.includes("F4F1E5"));
    assert("Contains 'Back to SafariX' link", signInRes.text.includes("Back to SafariX"));
    assert("Contains demo fill helper", signInRes.text.includes("Demo Fill"));
    assert("No SSR crash / panic markers", !signInRes.text.includes("TurbopackInternalError") && !signInRes.text.includes("Application error"));

    // 2. Verify GET /auth/sign-up
    console.log("\n2. Inspecting GET /auth/sign-up...");
    const signUpRes = await fetchRoute("http://127.0.0.1:3001/auth/sign-up");
    assert("HTTP Status 200", signUpRes.status === 200, String(signUpRes.status));
    assert("Contains 'Create account' form elements", signUpRes.text.includes("Create account"));
    assert("Contains 'Start your' editorial heading", signUpRes.text.includes("Start your") && signUpRes.text.includes("journey"));
    assert("Contains 'Confirm password' field", signUpRes.text.includes("Confirm password"));
    assert("Contains 'Sign in' switch action", signUpRes.text.includes("Sign in"));
    assert("Contains deep green & ivory styling classes", signUpRes.text.includes("#063D2E") || signUpRes.text.includes("F4F1E5"));
    assert("No SSR crash / panic markers", !signUpRes.text.includes("TurbopackInternalError") && !signUpRes.text.includes("Application error"));

    // 3. Verify Auth APIs with test credentials
    console.log("\n3. Testing Auth API integration...");
    const testEmail = `animated_auth_test_${Date.now()}@example.com`;
    const signupApiRes = await postJson("http://127.0.0.1:3001/api/auth/sign-up", {
      name: "Aurora Explorer",
      email: testEmail,
      password: "TestPassword123!",
    });
    assert("POST /api/auth/sign-up returns 201 or 200", signupApiRes.status === 200 || signupApiRes.status === 201, `Status ${signupApiRes.status}`);

    const setCookie = signupApiRes.headers["set-cookie"]?.[0] || "";
    assert("Session cookie returned with HttpOnly", setCookie.includes("safarix_session") && setCookie.includes("HttpOnly"), setCookie.slice(0, 40) + "...");

    // Validate active session
    const sessionRes = await fetchRoute("http://127.0.0.1:3001/api/auth/session", setCookie);
    assert("GET /api/auth/session is authenticated", sessionRes.text.includes(testEmail), sessionRes.text.slice(0, 100));

    // Sign in with existing credentials
    const signinApiRes = await postJson("http://127.0.0.1:3001/api/auth/sign-in", {
      email: testEmail,
      password: "TestPassword123!",
    });
    assert("POST /api/auth/sign-in succeeds", signinApiRes.status === 200, `Status ${signinApiRes.status}`);

    // Invalid credentials rejection
    const invalidSignin = await postJson("http://127.0.0.1:3001/api/auth/sign-in", {
      email: testEmail,
      password: "wrongpassword!",
    });
    assert("POST /api/auth/sign-in rejects invalid credentials", invalidSignin.status === 401 || invalidSignin.status === 400, `Status ${invalidSignin.status}`);

    console.log(`\n=========================================`);
    console.log(`VERIFICATION SUMMARY: ${passed}/${passed + failed} checks PASSED`);
    console.log(`=========================================`);
  } finally {
    console.log("Shutting down test dev server...");
    devServer.kill("SIGTERM");
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
