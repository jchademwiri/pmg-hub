import { check, date, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    date: date("date").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    check("withdrawals_amount_positive", sql`${t.amount} > 0`),
    index("withdrawals_date_idx").on(t.date),
  ],
);

export type Withdrawal = typeof withdrawals.$inferSelect;
export type NewWithdrawal = typeof withdrawals.$inferInsert;
