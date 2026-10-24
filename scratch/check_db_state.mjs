import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

async function check() {
  const migrations = await sql`
    SELECT id, hash, created_at 
    FROM "drizzle"."__drizzle_migrations" 
    ORDER BY id
  `;
  console.log("Migrations in drizzle.__drizzle_migrations:", migrations.length);
  migrations.forEach(m => console.log(" - ID:", m.id, "Hash:", m.hash?.slice(0, 15), "Created at:", m.created_at));

  const users = await sql`SELECT id, name, email FROM "public"."users"`;
  console.log("Users in DB:", users);

  await sql.end();
}

check().catch((err) => {
  console.error("Migration check error:", err);
  process.exit(1);
});
