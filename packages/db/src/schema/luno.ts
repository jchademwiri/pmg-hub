import { index, numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// ── luno_accounts ─────────────────────────────────────────────────────────────
// Latest synced snapshot of the user's Luno wallets, upserted by the
// /api/luno/sync route. Holds the live crypto balance plus the ZAR conversion
// (balance × ticker last_trade) so the assets page renders fast and stays
// useful even when Luno is temporarily unreachable. zar_value is nullable
// because a ticker may be unavailable for an asset on a given sync.

export const lunoAccounts = pgTable(
  'luno_accounts',
  {
    accountId: text('account_id').primaryKey(),
    asset: text('asset').notNull(),
    name: text('name'),
    balance: text('balance').notNull(),
    reserved: text('reserved').notNull(),
    unconfirmed: text('unconfirmed').notNull(),
    zarValue: numeric('zar_value', { precision: 20, scale: 8 }),
    syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('luno_accounts_asset_idx').on(t.asset)],
);

export type LunoAccount = typeof lunoAccounts.$inferSelect;
export type NewLunoAccount = typeof lunoAccounts.$inferInsert;
