/**
 * Check landing page render for errors, digests, or Suspense bailouts
 */

async function main() {
  const res = await fetch("http://localhost:3000/");
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Length:", text.length);

  const digestMatch = text.match(/digest:"([^"]+)"/);
  console.log("Digest match:", digestMatch ? digestMatch[0] : "none");

  const suspenseErrors = text.match(/The server could not finish this Suspense boundary[^<]*/g);
  console.log("Suspense errors in stream:", suspenseErrors);

  // Check if there are any error chunks in the stream: e.g. "E:" or "x" or similar in self.__next_f
  const nextChunks = text.match(/self\.__next_f\.push\(\[1,"[^"]*"\]\)/g) || [];
  console.log("Total next chunks:", nextChunks.length);
  for (const chunk of nextChunks) {
    if (chunk.includes("digest") || chunk.includes("Error") || chunk.includes("bailout")) {
      console.log("Suspicious chunk:", chunk);
    }
  }
}

main().catch(console.error);

export {};
