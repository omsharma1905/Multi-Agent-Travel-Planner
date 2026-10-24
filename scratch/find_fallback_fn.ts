import fs from "fs";

const file = "node_modules/react-dom/cjs/react-dom-client.development.js";
const content = fs.readFileSync(file, "utf-8");
const lines = content.split("\n");
lines.forEach((l, i) => {
  if (l.includes("function isSuspenseInstanceFallback(") || l.includes("var isSuspenseInstanceFallback =")) {
    console.log(`Line ${i + 1}: ${l}`);
    console.log(lines.slice(Math.max(0, i - 5), i + 20).join("\n"));
  }
});
