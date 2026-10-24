import fs from "fs";
import path from "path";

const content = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
let token = null;
for (const rawLine of content.split(/\r?\n/)) {
  const line = rawLine.trim();
  const m = line.match(/^DUFFEL_ACCESS_TOKEN\s*=\s*(.*)$/);
  if (m) token = m[1].replace(/^["']|["']$/g, "").trim();
}

async function testStays() {
  const url = "https://api.duffel.com/stays/search";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      location: {
        geographic_coordinates: {
          latitude: 51.5074,
          longitude: -0.1278,
        },
        radius: 15,
      },
      check_in_date: "2026-11-15",
      check_out_date: "2026-11-18",
      rooms: 1,
      guests: [{ type: "adult" }, { type: "adult" }],
    }),
  });

  console.log("Stays HTTP Status:", res.status);
  const text = await res.text();
  console.log("Stays Response:", text);
}

testStays();
