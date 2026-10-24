import fs from "fs";
import path from "path";

// Load environment from .env.local
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const key = process.env.GOOGLE_PLACES_API_KEY;
console.log("GOOGLE_PLACES_API_KEY present:", Boolean(key));

if (!key) {
  console.log("No key configured.");
  process.exit(0);
}

const url = "https://places.googleapis.com/v1/places:searchText";
const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": key,
    "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
  },
  body: JSON.stringify({
    textQuery: "Kyoto top tourist attractions",
    pageSize: 5,
  }),
});

console.log("Status:", res.status, res.statusText);
const body = await res.text();
// Sanitize any key occurrences
const sanitized = body.replace(new RegExp(key, "g"), "[REDACTED_KEY]");
console.log("Body:", sanitized);
