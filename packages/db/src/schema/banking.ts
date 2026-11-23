import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { journalEntries } from './accounting';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const bankReconciliationStatusEnum = pgEnum('bank_reconciliation_status', [
  'reconciled',
  'variance',
]);

// ── bank_reconciliations ──────────────────────────────────────────────────────
// Authoritative monthly ISO 9001 bank statement reconciliation records.
// One record per (period, account_code) for bank accounts 1010, 1020, and 1030.
// Admin-only table protected by RLS (`bank_reconciliations_admin_only`).

export const bankReconciliations = pgTable(
  'bank_reconciliations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Accounting period in YYYY-MM format (e.g. "2026-12") */
    period: varchar('period', { length: 7 }).notNull(),
    /** Bank GL account code: '1010' | '1020' | '1030' */
    accountCode: varchar('account_code', { length: 10 }).notNull(),
    /** Statement cut-off date on the bank PDF/CSV */
    statementDate: date('statement_date').notNull(),
    /** Closing balance per actual bank statement */
    statementBalance: numeric('statement_balance', { precision: 14, scale: 2 }).notNull(),
    /** General ledger book balance as of statementDate */
    bookBalance: numeric('book_balance', { precision: 14, scale: 2 }).notNull(),
    /** statementBalance - bookBalance (must be 0.00 for 'reconciled') */
    variance: numeric('variance', { precision: 14, scale: 2 }).notNull(),
    /** Optional balancing journal entry posted during reconciliation */
    adjustmentJournalId: uuid('adjustment_journal_id').references(() => journalEntries.id, {
      onDelete: 'set null',
    }),
    status: bankReconciliationStatusEnum('status').notNull().default('reconciled'),
    notes: text('notes'),
    reconciledBy: text('reconciled_by'),
    reconciledAt: timestamp('reconciled_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('bank_reconciliations_period_account_uidx').on(t.period, t.accountCode),
    index('bank_reconciliations_period_idx').on(t.period),
    index('bank_reconciliations_status_idx').on(t.status),
    index('bank_reconciliations_adjustment_journal_idx').on(t.adjustmentJournalId),
  ],
);

export type BankReconciliation = typeof bankReconciliations.$inferSelect;
export type NewBankReconciliation = typeof bankReconciliations.$inferInsert;
