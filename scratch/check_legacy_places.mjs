import fs from "fs";
import path from "path";

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

// 1. Check legacy Places API text search
console.log("Testing Legacy Places API textsearch endpoint...");
const legacyUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=Kyoto+attractions&key=${key}`;
const resLegacy = await fetch(legacyUrl);
const jsonLegacy = await resLegacy.json();
console.log("Legacy Places status:", jsonLegacy.status, jsonLegacy.error_message || "");

// 2. Check legacy Geocoding
console.log("Testing Geocoding endpoint with this key...");
const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Kyoto&key=${key}`;
const resGeo = await fetch(geoUrl);
const jsonGeo = await resGeo.json();
console.log("Geocoding status:", jsonGeo.status, jsonGeo.error_message || "");
