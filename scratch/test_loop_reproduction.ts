import { createSessionToken } from "../src/lib/auth/session";

async function test() {
  const token = await createSessionToken("usr_ghost_user_9999", "ghost@ghost.com");
  const cookie = `safarix_session=${token}`;

  let url = "http://localhost:3000/dashboard";
  for (let i = 0; i < 8; i++) {
    console.log(`Step ${i + 1}: Fetching ${url}`);
    const res = await fetch(url, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    console.log(`  Status: ${res.status}`);
    const loc = res.headers.get("location");
    console.log(`  Location: ${loc}`);
    if (res.status === 200) {
      const text = await res.text();
      const isRscRedirect = text.includes("NEXT_REDIRECT");
      console.log(`  Status 200, RSC redirect? ${isRscRedirect}`);
      if (isRscRedirect) {
        if (text.includes("/auth/sign-in")) {
          url = "http://localhost:3000/auth/sign-in?redirect=%2Fdashboard";
        } else if (text.includes("/dashboard")) {
          url = "http://localhost:3000/dashboard";
        }
        continue;
      }
    }
    if (!loc) break;
    url = loc.startsWith("http") ? loc : `http://localhost:3000${loc}`;
  }
}

test().catch(console.error);
