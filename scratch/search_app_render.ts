import fs from "fs";

const content = fs.readFileSync("node_modules/next/dist/server/app-render/app-render.js", "utf-8");
const lines = content.split("\n");
lines.forEach((l, i) => {
  if (l.includes("allReady") || l.includes("onError:") || l.includes("onShellReady")) {
    console.log(`Line ${i + 1}: ${l.trim().slice(0, 150)}`);
  }
});
