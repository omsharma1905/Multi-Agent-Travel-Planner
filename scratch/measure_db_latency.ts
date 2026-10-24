import { db, schema } from "../src/lib/db";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Measuring real DB query latency...");
  const t0 = performance.now();
  const user = await db.query.users.findFirst();
  const t1 = performance.now();
  console.log(`First query took ${(t1 - t0).toFixed(1)}ms:`, user?.email);

  const t2 = performance.now();
  const user2 = await db.query.users.findFirst({ where: eq(schema.users.id, user!.id) });
  const t3 = performance.now();
  console.log(`Second query took ${(t3 - t2).toFixed(1)}ms:`, user2?.email);
}

main().catch(console.error);

export {};
