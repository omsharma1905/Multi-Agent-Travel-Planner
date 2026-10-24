import { getAuthenticatedUser } from "../src/lib/auth/server";

async function measure() {
  const t0 = performance.now();
  const user = await getAuthenticatedUser();
  const t1 = performance.now();
  console.log(`getAuthenticatedUser took ${(t1 - t0).toFixed(2)}ms, result:`, user);
}

measure().catch(console.error);

export {};
