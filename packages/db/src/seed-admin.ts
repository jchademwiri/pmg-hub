/**
 * One-off script to create the first super_admin user.
 * Run once from the monorepo root, then delete this file.
 *
 * Usage:
 *   bun packages/db/src/seed-admin.ts
 */
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { user } from "./schema/auth";

config({ path: resolve(__dirname, "../.env") });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED,
  ssl: { rejectUnauthorized: true },
});
await client.connect();
const db = drizzle(client);

// Better Auth uses nanoid-style text IDs - generate a simple one
const id = crypto.randomUUID().replace(/-/g, "");

await db
  .insert(user)
  .values({
    id,
    name: "Jacob",
    email: "jchademwiri@gmail.com",
    emailVerified: true,
    role: "super_admin",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  .onConflictDoUpdate({
    target: user.email,
    set: { role: "super_admin", isActive: true, updatedAt: new Date() },
  });

console.log("✅ super_admin user created/updated for jchademwiri@gmail.com");
console.log("   Go to /login and request a magic link with that email.");

await client.end();
