import fs from "fs";
import path from "path";

const filesToScan: string[] = [];

function walk(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "scratch") {
        walk(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      filesToScan.push(fullPath);
    }
  }
}

walk("src");

console.log(`Found ${filesToScan.length} files to scan.`);

// Check for direct window/document/localStorage calls in component top-level or state initializers
const browserGlobals = ["window\\.", "document\\.", "localStorage\\.", "sessionStorage\\.", "navigator\\."];

for (const file of filesToScan) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    // Skip imports, comments, or lines guarded with typeof window
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.includes("typeof window")) {
      return;
    }
    for (const bg of browserGlobals) {
      const regex = new RegExp(`(?<!typeof\\s+)` + bg, "g");
      if (regex.test(line)) {
        // Check if inside useState initial value: e.g. useState(window.innerWidth)
        if (line.includes("useState(") || line.includes("useRef(") || line.includes("useMemo(")) {
          console.log(`[SUSPICIOUS SSR HOOK] ${file}:${index + 1}: ${line.trim()}`);
        }
      }
    }
  });
}
