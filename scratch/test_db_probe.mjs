import fs from "fs";
import path from "path";
import postgres from "postgres";

const content = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
let dbUrl = null;
for (const rawLine of content.split(/\r?\n/)) {
  const line = rawLine.trim();
  const m = line.match(/^DATABASE_URL\s*=\s*(.*)$/);
  if (m) dbUrl = m[1].replace(/^["']|["']$/g, "").trim();
}

if (!dbUrl) {
  console.log("No DATABASE_URL configured");
  process.exit(1);
}

try {
  const parsed = new URL(dbUrl);
  console.log("Database Host:", parsed.hostname);
  console.log("Database Port:", parsed.port || "5432");
  console.log("Database Name:", parsed.pathname.slice(1));
  console.log("SSL Mode Query:", parsed.searchParams.get("sslmode"));
} catch (e) {
  console.log("Failed to parse URL:", e.message);
}

async function testConnection() {
  console.log("\nAttempting connection with 10s connect_timeout...");
  const sql = postgres(dbUrl, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 10,
    ssl: dbUrl.includes("sslmode=require") || dbUrl.includes("neon.tech") || dbUrl.includes("supabase.co") ? "require" : undefined,
  });

  try {
    const start = Date.now();
    const res = await sql`SELECT 1 as ping, current_database() as db, version() as ver`;
    const elapsed = Date.now() - start;
    console.log(`Connection successful in ${elapsed}ms!`);
    console.log("Result:", { ping: res[0].ping, db: res[0].db, ver: res[0].ver.slice(0, 40) });

    // Check existing tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log("Existing public tables:", tables.map(t => t.table_name));
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await sql.end();
  }
}

testConnection();
