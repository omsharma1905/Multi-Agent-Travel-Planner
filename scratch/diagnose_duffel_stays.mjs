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

const token = process.env.DUFFEL_ACCESS_TOKEN;
console.log("DUFFEL_ACCESS_TOKEN present:", Boolean(token));

const url = "https://api.duffel.com/stays/search";
const requestBody = {
  location: {
    radius: 20,
    geographic_coordinates: {
      latitude: 35.0116,
      longitude: 135.7681,
    },
  },
  check_in_date: "2026-11-01",
  check_out_date: "2026-11-04",
  guests: [{ type: "adult" }],
  rooms: 1,
};

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Duffel-Version": "v2",
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify(requestBody),
});

console.log("Status:", res.status, res.statusText);
const body = await res.text();
const sanitized = body.replace(new RegExp(token, "g"), "[REDACTED_TOKEN]");
console.log("Body:\n", sanitized);
