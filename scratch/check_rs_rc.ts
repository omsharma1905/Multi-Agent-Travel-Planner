import fs from "fs";

const html = fs.readFileSync("scratch/landing.html", "utf-8");
console.log("RS matches:", html.match(/\$RS/g));
console.log("RC matches:", html.match(/\$RC/g));
console.log("RX matches:", html.match(/\$RX/g));

// Print where $RC is defined and called
const idx = html.indexOf("$RC(");
if (idx !== -1) {
  console.log("Context around $RC call:");
  console.log(html.slice(idx - 200, idx + 200));
}
