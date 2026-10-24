import fs from "fs";

// Let's inspect next/dist/server/app-render/app-render.tsx or related streaming files
const files = [
  "node_modules/next/dist/server/app-render/app-render.js",
  "node_modules/next/dist/server/app-render/render-to-string.js",
  "node_modules/next/dist/server/app-render/use-flight-response.js",
];

for (const f of files) {
  if (fs.existsSync(f)) {
    console.log(`Checking ${f}...`);
    const c = fs.readFileSync(f, "utf-8");
    if (c.includes("onRecoverableError") || c.includes("onError") || c.includes("allReady")) {
      console.log(`  Found keywords in ${f}`);
    }
  }
}
