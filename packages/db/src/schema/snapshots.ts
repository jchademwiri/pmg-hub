import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    period: text("period").notNull().unique(),
    revenue:    numeric("revenue",     { precision: 12, scale: 2 }).notNull(),
    expenses:   numeric("expenses",    { precision: 12, scale: 2 }).notNull(),
    pmgShare:   numeric("pmg_share",   { precision: 12, scale: 2 }).notNull(),
    profitPool: numeric("profit_pool", { precision: 12, scale: 2 }).notNull(),
    salary:     numeric("salary",      { precision: 12, scale: 2 }).notNull(),
    reinvest:   numeric("reinvest",    { precision: 12, scale: 2 }).notNull(),
    reserve:    numeric("reserve",     { precision: 12, scale: 2 }).notNull(),
    flex:       numeric("flex",        { precision: 12, scale: 2 }).notNull(),
    createdAt:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("snapshots_period_idx").on(t.period),
  ],
);

export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
