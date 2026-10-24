import fs from "fs";
import path from "path";

const content = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
let key = null;
for (const rawLine of content.split(/\r?\n/)) {
  const line = rawLine.trim();
  const m = line.match(/^GOOGLE_GENERATIVE_AI_API_KEY\s*=\s*(.*)$/);
  if (m) key = m[1].replace(/^["']|["']$/g, "").trim();
}

async function test(modelName) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Respond in JSON: {\"status\": \"ok\", \"name\": \"Tokyo\"}" }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });
  console.log(`${modelName}: HTTP ${res.status}`);
  const json = await res.json();
  console.log("Text:", json.candidates?.[0]?.content?.parts?.[0]?.text);
}

test("gemini-3.5-flash-lite");
test("gemini-flash-lite-latest");
