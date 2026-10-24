import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Central database client.
 * Uses postgres-js driver with connection pooling.
 * Gracefully exposes whether a live PostgreSQL connection is established.
 */

declare global {
  var __dbInstance: PostgresJsDatabase<typeof schema> | undefined;
  var __pgClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

export const isDatabaseConfigured = Boolean(
  connectionString &&
    !connectionString.includes("localhost:5432/veora_planner") &&
    connectionString.startsWith("postgres"),
);

let db: PostgresJsDatabase<typeof schema>;

if (connectionString) {
  try {
    const client =
      global.__pgClient ??
      postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 15,
        prepare: false,
      });

    if (process.env.NODE_ENV !== "production") {
      global.__pgClient = client;
    }

    db =
      global.__dbInstance ??
      drizzle(client, {
        schema,
      });

    if (process.env.NODE_ENV !== "production") {
      global.__dbInstance = db;
    }
  } catch (err) {
    console.warn("PostgreSQL connection error, operating with local store fallback:", err);
    // Dummy reference to satisfy type
    const fallbackClient = postgres("postgresql://localhost:5432/mock", { max: 1 });
    db = drizzle(fallbackClient, { schema });
  }
} else {
  // Unconfigured DATABASE_URL -> create dummy fallback client
  const fallbackClient = postgres("postgresql://localhost:5432/mock", { max: 1 });
  db = drizzle(fallbackClient, { schema });
}

export { db, schema };
