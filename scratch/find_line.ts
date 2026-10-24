import fs from "fs";

const file = "node_modules/react-dom/cjs/react-dom-client.development.js";
const content = fs.readFileSync(file, "utf-8");
const lines = content.split("\n");
lines.forEach((l, i) => {
  if (l.includes("The server could not finish this Suspense boundary")) {
    console.log(`Line ${i + 1}: ${l}`);
    console.log("Lines before and after:");
    console.log(lines.slice(Math.max(0, i - 25), i + 25).join("\n"));
  }
});
