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

const { itineraryOutputSchema } = await import("../src/lib/agents/itinerary/schemas.ts");
const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const prompt = `
[ROLE: ITINERARY_AGENT]
You are the SafariX Itinerary Planning Agent.
Synthesize the selected recommendations into an exact 3-day itinerary.

CRITICAL INVARIANTS:
1. You MUST generate EXACTLY 3 days (dayNumber: 1 through 3).
2. Every item's referenceId MUST strictly equal one of the IDs provided below:
   - Stay ID: "stay_paris_hotel"
   - Transport ID: "trans_eurostar"
   - Valid Place IDs: "place_eiffel", "place_louvre", "place_notre_dame"
   - Valid Restaurant IDs: "rest_bistro", "rest_cafe"
3. DO NOT invent IDs.
4. Schedule items chronologically without impossible overlaps.

REQUIRED OUTPUT JSON FORMAT:
You MUST return a JSON object with EXACTLY this structure:
{
  "days": [
    {
      "dayNumber": 1,
      "theme": "Arrival & Historic Paris",
      "items": [
        {
          "type": "transport" | "stay" | "activity" | "food" | "free_time",
          "referenceId": "exact_matching_id",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "reasoning": "Reason for scheduling this item"
        }
      ]
    }
  ],
  "orchestrationNotes": "High-level summary of the synthesized schedule"
}

Return strictly valid JSON conforming to the schema above.
`;

const systemInstruction = {
  parts: [{ text: "You are the SafariX Itinerary Agent. Generate an exact 3-day schedule. Return strictly valid JSON conforming to the requested schema with top-level 'days' array and 'orchestrationNotes' string." }]
};

const body = {
  systemInstruction,
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.2,
  },
};

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const json = await res.json();
const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
console.log("Candidate text:\n", text);

const parsed = JSON.parse(text);
const validated = itineraryOutputSchema.safeParse(parsed);
console.log("Validation result:", validated.success);
if (!validated.success) {
  console.log("Validation errors:", validated.error.issues);
} else {
  console.log("SUCCESS! Parsed days count:", validated.data.days.length);
}
