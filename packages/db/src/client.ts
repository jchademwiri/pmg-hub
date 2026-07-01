import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema/index";
import { getEnv } from "./env";

let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Returns the shared Drizzle ORM database instance.
 *
 * Uses a `Pool` from `@neondatabase/serverless` (WebSocket-based) with the
 * `drizzle-orm/neon-serverless` driver, which supports SQL transactions
 * (unlike the stateless `neon-http` driver).
 *
 * The pool is lazily initialised and cached across requests/hot-reloads.
 */
export function getDb() {
  if (!_db) {
    const env = getEnv();
    const pool = new Pool({ connectionString: env.DATABASE_URL });
    _db = drizzle({ client: pool, schema });
  }
  return _db;
}

/** @deprecated use getDb() instead */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
