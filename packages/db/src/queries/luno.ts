import { db } from "../client";
import { lunoAccounts } from "../schema/luno";
import { desc, eq, sql } from "drizzle-orm";

export type LunoAccountRow = typeof lunoAccounts.$inferSelect;

// ── getLunoAccounts ───────────────────────────────────────────────────────────

/**
 * Returns all synced Luno accounts, most valuable first.
 */
export async function getLunoAccounts(): Promise<LunoAccountRow[]> {
  return db.select().from(lunoAccounts).orderBy(desc(lunoAccounts.zarValue));
}

// ── getLunoAccountById ────────────────────────────────────────────────────────

export async function getLunoAccountById(accountId: string): Promise<LunoAccountRow | null> {
  const rows = await db.select().from(lunoAccounts).where(eq(lunoAccounts.accountId, accountId)).limit(1);
  return rows[0] ?? null;
}

// ── getLunoInvestmentsValue ───────────────────────────────────────────────────

/**
 * Total ZAR value of the synced Luno portfolio: sum of zar_value, treating
 * null (ticker unavailable) as 0.
 */
export async function getLunoInvestmentsValue(): Promise<number> {
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${lunoAccounts.zarValue}), 0)` })
    .from(lunoAccounts);
  return Number(rows[0]?.total ?? 0);
}

// ── upsertLunoAccounts ────────────────────────────────────────────────────────

export interface UpsertLunoAccount {
  accountId: string;
  asset: string;
  name?: string;
  balance: string;
  reserved: string;
  unconfirmed: string;
  zarValue: number | null;
}

/**
 * Upserts the latest synced snapshot, keyed on account_id. Returns the number
 * of accounts written.
 */
export async function upsertLunoAccounts(accounts: UpsertLunoAccount[]): Promise<number> {
  if (accounts.length === 0) return 0;

  await db
    .insert(lunoAccounts)
    .values(
      accounts.map((a) => ({
        accountId: a.accountId,
        asset: a.asset,
        name: a.name ?? null,
        balance: a.balance,
        reserved: a.reserved,
        unconfirmed: a.unconfirmed,
        zarValue: a.zarValue === null ? null : String(a.zarValue),
      })),
    )
    .onConflictDoUpdate({
      target: lunoAccounts.accountId,
      set: {
        asset: sql`excluded.asset`,
        name: sql`excluded.name`,
        balance: sql`excluded.balance`,
        reserved: sql`excluded.reserved`,
        unconfirmed: sql`excluded.unconfirmed`,
        zarValue: sql`excluded.zar_value`,
        syncedAt: sql`now()`,
      },
    });

  return accounts.length;
}
