import fs from "fs";

const content = fs.readFileSync("node_modules/react-dom/cjs/react-dom-client.development.js", "utf-8");
const lines = content.split("\n");
lines.forEach((l, i) => {
  if (l.includes("REACT_RECOVERABLE_DIGEST")) {
    console.log(`Line ${i + 1}: ${l}`);
  }
});
