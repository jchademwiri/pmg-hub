import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as schema from './schema/index';
import { getEnv } from './env';

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
    const isServerless = !!process.env.VERCEL;

    const pool = new Pool({
      connectionString: env.DATABASE_URL,
      // In serverless runtimes (Vercel), allow up to 5 concurrent connections to prevent
      // pool starvation/deadlocks when concurrent operations occur during transactions.
      max: isServerless ? 5 : 10,
      idleTimeoutMillis: isServerless ? 3_000 : 30_000,
      connectionTimeoutMillis: 10_000,
    });
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

export type DbClient = ReturnType<typeof getDb>;
export type DbTransaction = Parameters<Parameters<DbClient['transaction']>[0]>[0];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Executes a callback within a database transaction scoped to a specific client tenant.
 * Uses `is_local = true` in set_config so that the session setting is strictly bound to the
 * transaction and automatically cleared when the transaction ends, preventing pool contamination.
 */
export async function withClientContext<T>(
  clientId: string,
  callback: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  if (!clientId || typeof clientId !== 'string') {
    throw new Error('withClientContext requires a valid, non-empty clientId string');
  }
  const cleanId = clientId.trim().toLowerCase();
  if (!UUID_REGEX.test(cleanId)) {
    throw new Error(`withClientContext requires a valid UUID string, received: "${clientId}"`);
  }
  const db = getDb();
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_client_id', ${cleanId}, true)`);
    await tx.execute(sql`SELECT set_config('app.is_client_mode', 'true', true)`);
    return await callback(tx);
  });
}

/**
 * Executes a callback within a database transaction with admin privileges (bypassing RLS).
 * Uses `is_local = true` in set_config to prevent session variable leakage across pooled connections.
 */
export async function withAdminContext<T>(callback: (tx: DbTransaction) => Promise<T>): Promise<T> {
  const db = getDb();
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.is_admin', 'true', true)`);
    return await callback(tx);
  });
}
