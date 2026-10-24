import fs from "fs";

const html = fs.readFileSync("scratch/landing.html", "utf-8");

// Extract all self.__next_f.push calls
const regex = /self\.__next_f\.push\(\[(\d+),("[\s\S]*?")\]\)/g;
let match;
while ((match = regex.exec(html)) !== null) {
  try {
    const rawContent = JSON.parse(match[2]);
    const lines = rawContent.split("\n");
    for (const line of lines) {
      if (line.includes("digest") || line.includes("error") || line.includes("Error") || line.startsWith("E:") || line.startsWith("S:")) {
        console.log(`Line in chunk ${match[1]}:`, line);
      }
    }
  } catch (e) {
    //
  }
}

// Also check the end of the HTML for any inline error comments or scripts
const tail = html.slice(-2000);
console.log("--- Tail of HTML ---");
console.log(tail);
