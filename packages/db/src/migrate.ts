// packages/db/src/migrate.ts
// Applies all pending migrations using drizzle-orm directly
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

config({ path: resolve(import.meta.dir, "../.env") });

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

const db = drizzle(client);

console.log("🚀 Running migrations...");

await migrate(db, { migrationsFolder: resolve(import.meta.dir, "migrations") });

console.log("✅ Migrations applied.");
await client.end();
