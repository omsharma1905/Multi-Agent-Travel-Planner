/**
 * Safe, sanitized diagnostic tool for Duffel Stays API.
 * Never prints tokens, credentials, or personal data.
 */

async function main() {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) {
    console.error("ERROR: DUFFEL_ACCESS_TOKEN is not set in environment.");
    process.exit(1);
  }

  // Token metadata (safe, non-sensitive)
  const tokenType = token.startsWith("duffel_test_")
    ? "TEST_TOKEN"
    : token.startsWith("duffel_live_")
    ? "LIVE_TOKEN"
    : "UNKNOWN_TOKEN_FORMAT";
  const tokenLength = token.length;
  console.log(`[Token Info] Type: ${tokenType}, Length: ${tokenLength} chars`);

  // Probe 1: Verify token authentication against an Air endpoint
  console.log("\n--- PROBE 1: Authenticated Base Check (GET /air/aircraft) ---");
  try {
    const res = await fetch("https://api.duffel.com/air/aircraft?limit=1", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Duffel-Version": "v2",
        Accept: "application/json",
      },
    });
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    console.log(`Duffel Request ID: ${res.headers.get("x-request-id")}`);
    const body = await res.text();
    if (res.ok) {
      console.log("Token Auth: VALID");
    } else {
      console.log(`Response Body: ${body.slice(0, 300)}`);
    }
  } catch (err: any) {
    console.error(`Fetch error: ${err.message}`);
  }

  // Common stays payload parameters
  const checkIn = new Date(Date.now() + 86400000 * 14).toISOString().split("T")[0];
  const checkOut = new Date(Date.now() + 86400000 * 17).toISOString().split("T")[0];
  const staysParams = {
    rooms: 1,
    check_in_date: checkIn,
    check_out_date: checkOut,
    guests: [{ type: "adult" }],
    location: {
      radius: 20,
      geographic_coordinates: {
        latitude: 51.5074,
        longitude: -0.1278,
      },
    },
  };

  // Probe 2: POST /stays/search without data wrapper (as currently in duffel-stay-provider)
  console.log("\n--- PROBE 2: POST /stays/search (Flat payload - currently in code) ---");
  try {
    const res = await fetch("https://api.duffel.com/stays/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer [REDACTED]`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Real request uses actual token
    });
  } catch (e) {}

  async function testStaysRequest(label: string, payload: any, duffelVersion: string) {
    console.log(`\n--- PROBE: ${label} (Duffel-Version: ${duffelVersion}) ---`);
    try {
      const res = await fetch("https://api.duffel.com/stays/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Duffel-Version": duffelVersion,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      console.log(`HTTP Status: ${res.status} ${res.statusText}`);
      console.log(`Duffel Request ID: ${res.headers.get("x-request-id")}`);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.errors) {
          console.log(`Duffel Errors:`, JSON.stringify(json.errors, null, 2));
        } else if (json.data) {
          const results = json.data.results || json.data;
          console.log(`Success! Result count: ${Array.isArray(results) ? results.length : "not an array"}`);
          if (Array.isArray(results) && results.length > 0) {
            console.log(`Sample Accommodation:`, {
              id: results[0].accommodation?.id,
              name: results[0].accommodation?.name,
              cheapest_rate: results[0].cheapest_rate_total_amount,
              currency: results[0].cheapest_rate_currency,
            });
          }
        } else {
          console.log(`Response: ${text.slice(0, 300)}`);
        }
      } catch {
        console.log(`Raw Response: ${text.slice(0, 300)}`);
      }
    } catch (err: any) {
      console.error(`Request failed: ${err.message}`);
    }
  }

  // Test 1: Flat payload with v2
  await testStaysRequest("Flat payload (no data wrapper)", staysParams, "v2");

  // Test 2: Wrapped payload with v2
  await testStaysRequest("Wrapped payload ({ data: { ... } })", { data: staysParams }, "v2");

  // Test 3: Wrapped payload with v1
  await testStaysRequest("Wrapped payload with v1", { data: staysParams }, "v1");

  // Test 4: Wrapped payload with beta
  await testStaysRequest("Wrapped payload with beta", { data: staysParams }, "beta");
}

main().catch(console.error);

export {};
