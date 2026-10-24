import fs from "fs";

const html = fs.readFileSync("scratch/landing.html", "utf-8");

// Search for P:1
const regex = /self\.__next_f\.push\(\[(\d+),("[\s\S]*?")\]\)/g;
let match;
while ((match = regex.exec(html)) !== null) {
  const content = match[2];
  if (content.includes("P:1") || content.includes("\"1\":") || content.includes("1:I") || content.includes("1:\"")) {
    console.log(`Chunk ${match[1]} mentions 1:`, content.slice(0, 500));
  }
}
