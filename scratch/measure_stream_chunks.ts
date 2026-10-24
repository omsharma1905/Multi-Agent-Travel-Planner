import http from "http";
import { createSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth/session";

async function main() {
  const token = await createSessionToken("usr_1792480214157_fake", "test@safarix.test");
  const cookie = `${SESSION_COOKIE_NAME}=${token}`;

  const t0 = performance.now();
  const req = http.request(
    "http://localhost:3000/",
    {
      headers: {
        Cookie: cookie,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      },
    },
    (res) => {
      console.log(`[+${(performance.now() - t0).toFixed(1)}ms] Status: ${res.statusCode}`);
      res.on("data", (chunk) => {
        const str = chunk.toString();
        const hasFallback = str.includes("B:0");
        const hasCompleted = str.includes("$RC") || str.includes("$RS");
        console.log(`[+${(performance.now() - t0).toFixed(1)}ms] Chunk received (${chunk.length} bytes). Fallback: ${hasFallback}, Completed: ${hasCompleted}`);
      });
      res.on("end", () => {
        console.log(`[+${(performance.now() - t0).toFixed(1)}ms] Response ended.`);
      });
    }
  );
  req.end();
}

main().catch(console.error);

export {};
