import fs from "fs";

async function main() {
  const res = await fetch("http://localhost:3000/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    }
  });

  const html = await res.text();
  console.log("HTML length:", html.length);
  fs.writeFileSync("scratch/landing.html", html, "utf-8");

  // Search for any mention of digest or error in html
  const matches = html.match(/(digest|error|boundary|suspense|switched)/gi);
  console.log("Keywords found:", matches);

  // Search for script tags containing self.__next_f or similar
  const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  console.log("Total script tags:", scripts.length);
  for (const s of scripts) {
    if (s.includes("digest") || s.includes("error") || s.includes("Suspense") || s.includes("switched")) {
      console.log("Matching script snippet:", s.slice(0, 300));
    }
  }
}

main().catch(console.error);

export {};
