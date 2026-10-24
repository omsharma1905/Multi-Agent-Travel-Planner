import fs from "fs";

const html = fs.readFileSync("scratch/landing.html", "utf-8");

// Search for B:0 and S:0
const b0Index = html.indexOf('id="B:0"');
console.log("--- Surrounding HTML around id=\"B:0\" ---");
if (b0Index !== -1) {
  console.log(html.slice(Math.max(0, b0Index - 500), b0Index + 1500));
}

const rcIndex = html.indexOf('$RC("B:0"');
console.log("\n--- Surrounding HTML around $RC(\"B:0\" ---");
if (rcIndex !== -1) {
  console.log(html.slice(Math.max(0, rcIndex - 500), rcIndex + 1000));
}
