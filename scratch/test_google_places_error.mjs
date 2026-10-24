import fs from "fs";
import path from "path";

const content = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
let key = null;
for (const rawLine of content.split(/\r?\n/)) {
  const line = rawLine.trim();
  const m = line.match(/^GOOGLE_PLACES_API_KEY\s*=\s*(.*)$/);
  if (m) {
    key = m[1].replace(/^["']|["']$/g, "").trim();
  }
  if (!key) {
    const m2 = line.match(/^GOOGLE_MAPS_API_KEY\s*=\s*(.*)$/);
    if (m2) key = m2[1].replace(/^["']|["']$/g, "").trim();
  }
}

if (!key) {
  console.log("No key found via regex");
  process.exit(1);
}

console.log("Key found with length:", key.length, "prefix:", key.slice(0, 4));

async function checkPlaces() {
  const url = "https://places.googleapis.com/v1/places:searchText";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName",
    },
    body: JSON.stringify({ textQuery: "Eiffel Tower Paris" }),
  });

  console.log("HTTP Status:", res.status, res.statusText);
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    const sanitized = JSON.stringify(json, null, 2).replace(new RegExp(key, "g"), "[REDACTED_API_KEY]");
    console.log("Response Body (Sanitized):", sanitized);
  } catch {
    console.log("Raw Response:", text.replace(new RegExp(key, "g"), "[REDACTED_API_KEY]"));
  }
}

checkPlaces();
