import fs from "fs";

const html = fs.readFileSync("scratch/landing.html", "utf-8");

console.log("Does HTML contain 'INTELLIGENT TRAVEL'?", html.includes("INTELLIGENT TRAVEL"));
console.log("Does HTML contain 'Hero' content?", html.includes("Plan the journey"));
console.log("Does HTML contain 'Destination Gallery'?", html.includes("Kyoto"));

// Where does "Plan the journey" appear?
const idx = html.indexOf("Plan the journey");
console.log("Index of 'Plan the journey':", idx);
if (idx !== -1) {
  console.log("Context around 'Plan the journey':");
  console.log(html.slice(Math.max(0, idx - 200), idx + 200));
}
