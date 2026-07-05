// packages/db/src/migrate.ts
// Applies all pending migrations using drizzle-orm directly
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Try packages/db/.env first, then fall back to the monorepo root .env.
// In CI, DATABASE_URL_UNPOOLED is injected via GitHub Secrets so dotenv is a no-op.
config({ path: resolve(import.meta.dir, "../.env") });
config({ path: resolve(import.meta.dir, "../../../.env"), override: false });
config({ path: resolve(import.meta.dir, "../../../.env.local"), override: false });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

const db = drizzle(client);

console.log("🚀 Running migrations...");

await migrate(db, { migrationsFolder: resolve(import.meta.dir, "migrations") });

console.log("✅ Migrations applied.");
await client.end();
