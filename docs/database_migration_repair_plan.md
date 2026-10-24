# SAFARIX — FINAL DATABASE MIGRATION SAFETY REVIEW & EXECUTION PLAN

**Date:** October 12, 2026  
**Status:** `MIGRATION_PLAN_READY` (Final Safety Review Completed — No Database Writes Executed)  
**Target Environment:** Neon PostgreSQL  
**Target Project Endpoint:** `ep-restless-art-b5mmzkfg` (AWS `us-east-2`)  
**Target Database:** `neondb`  
**Target Branch:** `production` (default primary branch)  

---

## 1. Executive Summary & Review Objectives

This safety review establishes the exact, non-destructive, and auditable procedure to repair SafariX's database schema and migration history prior to performing any live database writes.

Key review findings:
1. **Zero Public Tables in Neon:** Neon `neondb` currently has 0 public tables and no `__drizzle_migrations` table because no migration or schema push command has ever been run against it.
2. **Orphan Migration File Preserved:** `drizzle/0005_add_password_hash.sql` exists on disk but is absent from `drizzle/meta/_journal.json`. It contains a single statement:
   ```sql
   ALTER TABLE "users" ADD COLUMN "password_hash" text;
   ```
   This exact column definition is already present in [`src/lib/db/schema.ts`](file:///c:/Users/OM%20SHARMA/OneDrive/Desktop/Travel%20Planner/src/lib/db/schema.ts) (`passwordHash: text("password_hash")`). It will not be lost.
3. **Missing Migration for `trip_versions`:** The `trip_versions` table was defined in [`src/lib/db/schema.ts`](file:///c:/Users/OM%20SHARMA/OneDrive/Desktop/Travel%20Planner/src/lib/db/schema.ts) during Phase 20 (itinerary version history) but has never been captured in a migration file.
4. **Connection Endpoint Truthfulness:** [`drizzle.config.ts`](file:///c:/Users/OM%20SHARMA/OneDrive/Desktop/Travel%20Planner/drizzle.config.ts) currently reads `process.env.DATABASE_URL` (the Neon pooled endpoint). It does **not** currently read `DIRECT_URL`. To safely migrate against the direct compute endpoint without PgBouncer transaction-mode locking, the repair plan documents both the current pooled path and the exact, safe method to direct migrations to `DIRECT_URL`.
5. **No Migration Destruction:** Existing migrations `0000` through `0004` and the orphan `0005` file are preserved.

---

## 2. In-Depth Inspection of Artifacts & Metadata

### A. The Orphan File (`drizzle/0005_add_password_hash.sql`)
- **Byte size:** 53 bytes  
- **Line count:** 2 lines  
- **Full contents:**
  ```sql
  ALTER TABLE "users" ADD COLUMN "password_hash" text;
  ```
- **Evaluation:** It adds only the `password_hash` column to `users`. It contains no data migrations, no triggers, and no custom functions. Because `passwordHash: text("password_hash")` is already in `src/lib/db/schema.ts`, a newly generated Drizzle migration diff from `0004_snapshot.json` will naturally include this exact statement alongside the `trip_versions` table.

### B. The Journal & Snapshot State (`drizzle/meta/`)
- `_journal.json` tracks entries:
  - `idx: 0` -> `0000_last_baron_zemo`
  - `idx: 1` -> `0001_purple_living_mummy`
  - `idx: 2` -> `0002_luxuriant_junta`
  - `idx: 3` -> `0003_jazzy_grim_reaper`
  - `idx: 4` -> `0004_slim_menace`
- `0004_snapshot.json` contains:
  - Tables: `trip_preferences`, `trips`, `users`
  - Enums: `budget_tier`, `transport_preference`, `trip_status`
  - Missing: `users.password_hash` and table `trip_versions`

### C. Drizzle Kit CLI Capabilities (Installed v0.31.11)
- Verified via `npx drizzle-kit --help`, `npx drizzle-kit migrate --help`, and `npx drizzle-kit generate --help`:
  - `drizzle-kit` CLI **does not have an `--env-file` argument**.
  - `drizzle-kit` loads `.env` by default. It does **not** automatically read `.env.local`.
  - Node.js runtime is **v24.11.1**, which natively supports `node --env-file=.env.local`.
  - Running CLI tools through `node --env-file=.env.local node_modules/drizzle-kit/bin.cjs <command>` reliably injects `.env.local` into `process.env` without third-party wrapper dependencies.

---

## 3. Connection Configuration: `DATABASE_URL` vs `DIRECT_URL`

### Current Implementation Reality
In [`drizzle.config.ts`](file:///c:/Users/OM%20SHARMA/OneDrive/Desktop/Travel%20Planner/drizzle.config.ts):
```typescript
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/veora_planner",
  },
});
```
- `drizzle.config.ts` currently references **only** `process.env.DATABASE_URL`.
- In `.env.local`:
  - `DATABASE_URL` points to `ep-restless-art-b5mmzkfg-pooler.c-7.us-east-2.aws.neon.tech` (PgBouncer connection pooler).
  - `DIRECT_URL` points to `ep-restless-art-b5mmzkfg.c-7.us-east-2.aws.neon.tech` (Direct compute endpoint).

### Recommended Best Practice for Migrations
Running DDL migrations over PgBouncer (`DATABASE_URL`) can occasionally encounter advisory lock or transaction limitations in PostgreSQL. To ensure migrations use the direct compute connection without modifying `.env.local`, PowerShell can map `DIRECT_URL` to the migration process environment:
```powershell
# Temporarily direct the process to use DIRECT_URL for migration execution
$env:DATABASE_URL = (Get-Content .env.local | Where-Object { $_ -match '^DIRECT_URL\s*=' }) -replace '^DIRECT_URL\s*=\s*', ''
```
Or, if [`drizzle.config.ts`](file:///c:/Users/OM%20SHARMA/OneDrive/Desktop/Travel%20Planner/drizzle.config.ts) is updated in a future code change:
```typescript
url: process.env.DIRECT_URL || process.env.DATABASE_URL || "..."
```

---

## 4. Expected Final Schema & Invariant Verification

When migrations `0000` through `0005` are applied, the database will possess:

### 1. Three PostgreSQL ENUM Types:
- `budget_tier`: `'budget'`, `'moderate'`, `'premium'`, `'luxury'`
- `trip_status`: `'planning'`, `'upcoming'`, `'ongoing'`, `'completed'`, `'cancelled'`, `'failed'`
- `transport_preference`: `'auto'`, `'flight'`, `'train'`, `'bus'`, `'car'`

### 2. Four Public Tables:
- **`users`**:
  - `id text PRIMARY KEY NOT NULL`
  - `name text NOT NULL`
  - `email text UNIQUE NOT NULL`
  - `password_hash text`
  - `avatar_url text`
  - `created_at timestamp with time zone DEFAULT now() NOT NULL`
  - `updated_at timestamp with time zone DEFAULT now() NOT NULL`
- **`trips`**:
  - `id text PRIMARY KEY NOT NULL`
  - `user_id text NOT NULL REFERENCES users(id) ON DELETE cascade`
  - `title text NOT NULL`
  - `origin text`
  - `origin_canonical jsonb`
  - `destination text NOT NULL`
  - `days integer NOT NULL`
  - `travellers integer NOT NULL`
  - `budget budget_tier NOT NULL`
  - `status trip_status DEFAULT 'planning' NOT NULL`
  - `is_saved boolean DEFAULT false NOT NULL`
  - `plan jsonb`
  - `created_at timestamp with time zone DEFAULT now() NOT NULL`
  - `updated_at timestamp with time zone DEFAULT now() NOT NULL`
- **`trip_preferences`**:
  - `id text PRIMARY KEY NOT NULL`
  - `trip_id text UNIQUE NOT NULL REFERENCES trips(id) ON DELETE cascade`
  - `transport_preference transport_preference DEFAULT 'auto' NOT NULL`
  - `interests text[] NOT NULL`
  - `notes text`
  - `created_at timestamp with time zone DEFAULT now() NOT NULL`
  - `updated_at timestamp with time zone DEFAULT now() NOT NULL`
- **`trip_versions`**:
  - `id text PRIMARY KEY NOT NULL`
  - `trip_id text NOT NULL REFERENCES trips(id) ON DELETE cascade`
  - `user_id text NOT NULL REFERENCES users(id) ON DELETE cascade`
  - `version_number integer NOT NULL`
  - `scope text NOT NULL`
  - `instruction text`
  - `change_summary jsonb`
  - `snapshot jsonb NOT NULL`
  - `total_cost integer NOT NULL`
  - `currency text DEFAULT 'USD' NOT NULL`
  - `currency_symbol text DEFAULT '$' NOT NULL`
  - `created_at timestamp with time zone DEFAULT now() NOT NULL`

---

## 5. Non-Destructive Step-by-Step Execution Plan

> [!CAUTION]
> All commands below are **NOT EXECUTED**. They represent the exact sequence to run when applying database changes.

### Step 1: Pre-Migration Target Verification
Verify that the environment targets the correct Neon endpoint (`ep-restless-art-b5mmzkfg`) and database (`neondb`) without printing credentials:

```powershell
# [NOT EXECUTED] Verify target project and database without exposing credentials
node --env-file=.env.local -e "
const u = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
console.log('Target Protocol:', u.protocol);
console.log('Target Host:', u.hostname);
console.log('Target Database:', u.pathname);
console.log('Target Endpoint Prefix:', u.hostname.split('.')[0]);
"
```
*Expected Output:*
- Target Host contains: `ep-restless-art-b5mmzkfg`
- Target Database: `/neondb`

### Step 2: Safe Archival of the Orphan File
Preserve `0005_add_password_hash.sql` by renaming it to a backup file so that Drizzle Kit generate can produce the canonical `0005` migration cleanly without file name collision or data loss:

```powershell
# [NOT EXECUTED] Archive orphan file non-destructively
Copy-Item -Path "drizzle/0005_add_password_hash.sql" -Destination "drizzle/0005_add_password_hash.sql.bak"
Remove-Item -Path "drizzle/0005_add_password_hash.sql"
```

### Step 3: Generate Canonical Migration
Generate the canonical migration capturing both `users.password_hash` and `trip_versions`:

```powershell
# [NOT EXECUTED] Generate canonical migration
node --env-file=.env.local node_modules/drizzle-kit/bin.cjs generate --name trip_versions_and_password_hash
```

### Step 4: Pre-Execution SQL Inspection
Review the generated SQL file in `drizzle/` to verify every generated statement:

```powershell
# [NOT EXECUTED] Inspect generated migration statements
Get-Content (Get-ChildItem -Path drizzle -Filter "*trip_versions_and_password_hash.sql").FullName
```
*Verification Checklist:*
- [ ] Contains `ALTER TABLE "users" ADD COLUMN "password_hash" text;`
- [ ] Contains `CREATE TABLE "trip_versions" (...);`
- [ ] Contains `FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade;`
- [ ] Contains `FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;`
- [ ] Contains `drizzle/meta/0005_snapshot.json`
- [ ] `drizzle/meta/_journal.json` has `idx: 5` registered

### Step 5: Execute Migration against Neon Direct Compute
Apply migrations `0000` through `0005` to the Neon database:

```powershell
# [NOT EXECUTED] Apply migrations to Neon direct compute
$env:DATABASE_URL = (Get-Content .env.local | Where-Object { $_ -match '^DIRECT_URL\s*=' }) -replace '^DIRECT_URL\s*=\s*', ''
node node_modules/drizzle-kit/bin.cjs migrate
```

---

## 6. Rollback & Recovery Plan

1. **Transaction Safety:**
   Drizzle Kit runs each migration inside a PostgreSQL transaction (`BEGIN ... COMMIT`). If any statement encounters a syntax error or constraint conflict, the transaction rolls back automatically.
2. **Clean Slate Guarantee:**
   Because the target Neon database has 0 existing public tables, no existing production data is at risk of corruption or loss.
3. **Emergency Clean Rollback Query:**
   If migration must be fully reverted:
   ```sql
   DROP TABLE IF EXISTS "trip_versions" CASCADE;
   DROP TABLE IF EXISTS "trip_preferences" CASCADE;
   DROP TABLE IF EXISTS "trips" CASCADE;
   DROP TABLE IF EXISTS "users" CASCADE;
   DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;
   DROP TYPE IF EXISTS "transport_preference" CASCADE;
   DROP TYPE IF EXISTS "trip_status" CASCADE;
   DROP TYPE IF EXISTS "budget_tier" CASCADE;
   ```

---

## 7. Post-Migration Verification Queries & Tests

### A. SQL Verification Queries
Run directly on Neon PostgreSQL:

```sql
-- 1. Verify all 4 public application tables and the Drizzle tracking table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
-- Expected output:
-- __drizzle_migrations
-- trip_preferences
-- trip_versions
-- trips
-- users

-- 2. Verify all migration steps recorded in Drizzle journal
SELECT id, hash, created_at 
FROM "__drizzle_migrations" 
ORDER BY id;
-- Expected output: 6 rows (idx 0 through 5)

-- 3. Verify Foreign Keys on trip_versions
SELECT 
    tc.constraint_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'trip_versions';
-- Expected: Foreign keys to trips(id) and users(id) with delete_rule = 'CASCADE'
```

### B. End-to-End Persistence & Lifecycle Test
Execute the automated test script:

```powershell
npx tsx scratch/test_repo_delete.ts
```

*Expected Verification:*
1. Trip created and persisted directly into PostgreSQL table `trips`.
2. No PostgreSQL `42P01` relation errors or memory fallback messages in logs.
3. Trip retrieved from PostgreSQL.
4. Unauthorized deletion rejected.
5. Authorized deletion successfully cascades and removes the row from PostgreSQL.
6. Dev server reboot retains saved journeys across restarts.
