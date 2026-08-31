import {
  pgEnum,
  pgTable,
  uuid,
  date,
  numeric,
  text,
  timestamp,
  check,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 'salary', 'reinvest', 'reserve', 'flex' are legacy allocation types — those
// distribution buckets were removed. The enum values are kept (Postgres can't
// drop enum values while rows reference them) so historical ledger entries
// remain valid; new code should only write 'pmg_share'.
export const allocationEnum = pgEnum('allocation_type', [
  'salary',
  'reinvest',
  'reserve',
  'flex',
  'pmg_share',
]);

export const entryTypeEnum = pgEnum('entry_type', ['spend', 'transfer', 'adjustment']);

export const ledger = pgTable(
  'ledger',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    date: date('date').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    allocationType: allocationEnum('allocation_type').notNull().default('pmg_share'),
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

/** Allocation type accepted by new code. Legacy values ('salary', 'reinvest',
 * 'reserve', 'flex') still exist in the DB enum and historical rows, but are
 * not part of this forward-facing type. */
export type AllocationType = 'pmg_share';
