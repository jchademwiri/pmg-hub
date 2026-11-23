import {
  pgTable,
  uuid,
  integer,
  varchar,
  numeric,
  boolean,
  date,
  text,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { journalEntries } from './accounting';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const dividendPayoutTypeEnum = pgEnum('dividend_payout_type', [
  'director_bonus',
  'dividend',
]);

// ── dividend_policies ─────────────────────────────────────────────────────────
// Per-fiscal-year governance parameters: 2-Gate cash floor, payout ratio,
// SA 0% PAYE personal tax threshold, DWT rate (20%), and SBC qualification.
// Admin-only table protected by RLS (`dividend_policies_admin_only`).

export const dividendPolicies = pgTable(
  'dividend_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Ending year of the SA financial year (e.g. 2028 = FY2027/28) */
    fiscalYear: integer('fiscal_year').notNull(),
    /** Gate 2 minimum True Spendable Cash floor kept in bank before payout */
    minCashReserve: numeric('min_cash_reserve', { precision: 14, scale: 2 })
      .notNull()
      .default('15000.00'),
    /** Max % of net surplus eligible for quarterly distribution */
    payoutRatioPercent: numeric('payout_ratio_percent', { precision: 5, scale: 2 })
      .notNull()
      .default('50.00'),
    /** Configurable SA primary 0% PAYE personal tax threshold for the FY */
    payeTaxFreeThreshold: numeric('paye_tax_free_threshold', { precision: 14, scale: 2 })
      .notNull()
      .default('95750.00'),
    /** SA Dividends Withholding Tax rate (default 20%) */
    dwtRatePercent: numeric('dwt_rate_percent', { precision: 5, scale: 2 })
      .notNull()
      .default('20.00'),
    /** Whether company qualifies for SARS Small Business Corporation (s12E) rates */
    isSbcQualified: boolean('is_sbc_qualified').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('dividend_policies_fy_uidx').on(t.fiscalYear)],
);

export type DividendPolicy = typeof dividendPolicies.$inferSelect;
export type NewDividendPolicy = typeof dividendPolicies.$inferInsert;

// ── dividend_payouts ──────────────────────────────────────────────────────────
// Immutable audit log of quarterly director bonuses (0% PAYE within threshold)
// and formal Companies Act s46 dividends (with 20% DWT & optional 1250 loan offset).
// Admin-only table protected by RLS (`dividend_payouts_admin_only`).

export const dividendPayouts = pgTable(
  'dividend_payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fiscalYear: integer('fiscal_year').notNull(),
    /** Quarter identifier: 'Q1' | 'Q2' | 'Q3' | 'Q4' */
    quarter: varchar('quarter', { length: 2 }).notNull(),
    payoutDate: date('payout_date').notNull(),
    payoutType: dividendPayoutTypeEnum('payout_type').notNull(),
    grossAmount: numeric('gross_amount', { precision: 14, scale: 2 }).notNull(),
    dwtWithheld: numeric('dwt_withheld', { precision: 14, scale: 2 }).notNull().default('0.00'),
    loanOffsetAmount: numeric('loan_offset_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0.00'),
    netCashPaid: numeric('net_cash_paid', { precision: 14, scale: 2 }).notNull(),
    /** Mandatory Companies Act s46 Solvency & Liquidity Board Sign-Off */
    solvencySignedOff: boolean('solvency_signed_off').notNull().default(false),
    solvencySignedBy: text('solvency_signed_by'),
    solvencySignedAt: timestamp('solvency_signed_at', { withTimezone: true }),
    journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    index('dividend_payouts_fy_idx').on(t.fiscalYear),
    index('dividend_payouts_quarter_idx').on(t.fiscalYear, t.quarter),
    index('dividend_payouts_journal_idx').on(t.journalEntryId),
  ],
);

export type DividendPayout = typeof dividendPayouts.$inferSelect;
export type NewDividendPayout = typeof dividendPayouts.$inferInsert;
