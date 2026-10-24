import fs from "fs";
import path from "path";

const dir = "node_modules/react-dom/cjs";
for (const file of fs.readdirSync(dir)) {
  if (file.endsWith(".js")) {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    if (content.includes("$RC")) {
      console.log(`Found $RC in ${file}`);
      // Find where $RC is emitted in the stream
      const lines = content.split("\n");
      lines.forEach((l, i) => {
        if (l.includes("$RC") && (l.includes("write") || l.includes("push") || l.includes("clientRenderBoundary") || l.includes("function") || l.includes("completeClientRenderBoundary"))) {
          console.log(`  Line ${i + 1}: ${l.slice(0, 200)}`);
        }
      });
    }
  }
}
