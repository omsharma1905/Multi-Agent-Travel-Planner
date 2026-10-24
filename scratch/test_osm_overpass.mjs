async function testMirrors() {
  const mirrors = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
  ];
  const q = `[out:json][timeout:8];
node["tourism"="museum"](35.65,139.69,35.75,139.79);
out body 5;`;

  for (const m of mirrors) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(m, {
        method: "POST",
        body: "data=" + encodeURIComponent(q),
        signal: controller.signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "SafariX-TravelPlanner/1.0" }
      });
      clearTimeout(timer);
      const data = await res.json();
      console.log(m, "SUCCESS in", Date.now() - start, "ms, elements:", data.elements?.length);
      if (data.elements && data.elements.length > 0) {
        console.log("  Sample:", data.elements[0].tags?.name || data.elements[0].tags?.["name:en"], "at", data.elements[0].lat, data.elements[0].lon);
      }
    } catch (e) {
      console.log(m, "FAILED in", Date.now() - start, "ms:", e.message);
    }
  }
}

testMirrors().catch(console.error);
