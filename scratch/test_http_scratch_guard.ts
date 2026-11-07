import assert from "node:assert/strict";
import { ScratchTestFixtures, runScratchTest } from "./test-safety";

async function main(): Promise<void> {
  const fixtures = new ScratchTestFixtures();
  assert.throws(
    () => fixtures.assertIsolatedDatabase("http://127.0.0.1:3000"),
    /API server's active database identity cannot be independently verified/,
  );
  assert.throws(
    () => fixtures.assertIsolatedDatabase(""),
    /API server's active database identity cannot be independently verified/,
  );

  let fixtureCreationAttempted = false;
  await assert.rejects(
    runScratchTest(async () => {
      fixtureCreationAttempted = true;
    }, "http://127.0.0.1:3000"),
    /API server's active database identity cannot be independently verified/,
  );
  assert.equal(fixtureCreationAttempted, false, "HTTP guard fails before fixtures can be created");

  console.log("HTTP scratch guard checks: 4 passed, 0 failed.");
}

main().catch((error) => {
  console.error("HTTP scratch guard checks failed:", error);
  process.exitCode = 1;
});
