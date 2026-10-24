const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
async function testModel(m) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Respond with strictly valid JSON: {\"status\":\"ok\"}" }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });
  console.log(m, res.status, res.statusText);
  if (res.ok) {
    const data = await res.json();
    console.log("  Output:", data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
  } else {
    console.log("  Error:", (await res.text()).slice(0, 150));
  }
}
async function run() {
  await testModel("gemini-flash-lite-latest");
}
run().catch(console.error);
