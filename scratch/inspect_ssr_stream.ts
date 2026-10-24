import http from "http";

const req = http.request(
  "http://localhost:3000/",
  {
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
    },
  },
  (res) => {
    console.log("Status:", res.statusCode);
    console.log("Headers:", res.headers);

    let fullBody = "";
    res.on("data", (chunk) => {
      const str = chunk.toString();
      fullBody += str;
      if (str.includes("digest") || str.includes("Error") || str.includes("Switched") || str.includes("$E") || str.includes("self.__next_f")) {
        console.log("\n--- CHUNK WITH SUSPICIOUS CONTENT ---");
        console.log(str.slice(0, 1000));
      }
    });

    res.on("end", () => {
      console.log("\n--- END OF STREAM. Total bytes:", fullBody.length);
      // Search for any digest: "..." or error: "..." in fullBody
      const digests = fullBody.match(/digest:"([^"]+)"/g);
      console.log("Digests in full body:", digests);

      // Search for any error boundaries
      const errorRegex = /<template id="B:(\d+)"><\/template>/g;
      const boundaries = fullBody.match(errorRegex);
      console.log("Suspense error templates (B:x):", boundaries);

      // Check $RC or $RA or $RX in fullBody
      const rcs = fullBody.match(/\$RC\("([^"]+)","([^"]+)"/g);
      console.log("$RC calls in fullBody:", rcs);

      // Check $RM in fullBody
      const rms = fullBody.match(/\$RM\("([^"]+)"/g);
      console.log("$RM calls in fullBody:", rms);
    });
  }
);

req.end();
