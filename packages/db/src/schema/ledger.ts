import { pgEnum, pgTable, uuid, date, numeric, text, timestamp, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const allocationEnum = pgEnum('allocation_type', [
  'salary',
  'reinvest',
  'reserve',
  'flex',
]);

export const entryTypeEnum = pgEnum('entry_type', [
  'spend',
  'transfer',
  'adjustment',
]);

export const ledger = pgTable(
  'ledger',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    date: date('date').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    allocationType: allocationEnum('allocation_type').notNull().default('salary'),
    entryType: entryTypeEnum('entry_type').notNull().default('spend'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    createdBy: text('created_by'),
  },
  (t) => [
    check('ledger_amount_positive', sql`${t.amount} > 0`),
    index('ledger_date_idx').on(t.date),
    index('ledger_allocation_type_idx').on(t.allocationType),
  ],
);

export type LedgerEntry = typeof ledger.$inferSelect;
export type NewLedgerEntry = typeof ledger.$inferInsert;
