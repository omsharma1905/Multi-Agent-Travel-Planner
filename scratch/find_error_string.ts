import fs from "fs";
import path from "path";

function search(dir: string) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== ".bin" && entry.name !== ".cache") {
        search(full);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".ts"))) {
      try {
        const text = fs.readFileSync(full, "utf-8");
        if (text.includes("could not finish this Suspense boundary")) {
          console.log(`Found in: ${full}`);
          // Print surrounding 200 chars
          const idx = text.indexOf("could not finish this Suspense boundary");
          console.log(text.slice(Math.max(0, idx - 200), idx + 300));
        }
      } catch (e) {}
    }
  }
}

search("node_modules/next");
search("node_modules/react");
search("node_modules/react-dom");
