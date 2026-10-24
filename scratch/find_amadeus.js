const fs = require("fs");
const path = require("path");

function walk(dir) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const dirs = ["src", "scratch", "docs"];
const results = {};

for (const d of dirs) {
  results[d] = [];
  for (const f of walk(d)) {
    const content = fs.readFileSync(f, "utf8");
    if (/amadeus/i.test(content)) {
      results[d].push(f);
    }
  }
}

console.log("=== SRC FILES ===");
console.log(results["src"].join("\n"));
console.log("\n=== SCRATCH FILES ===");
console.log(results["scratch"].join("\n"));
