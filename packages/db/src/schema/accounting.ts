import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  boolean,
  integer,
  pgEnum,
  index,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const accountTypeEnum = pgEnum("account_type", [
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

export const journalEntryStatusEnum = pgEnum("journal_entry_status", [
  "draft",
  "posted",
  "void",
]);

export const periodStatusEnum = pgEnum("period_status", [
  "open",
  "closed",
  "locked",
]);

// ── chart_accounts ────────────────────────────────────────────────────────────
// The chart of accounts — the foundation of double-entry bookkeeping.
// Each account has a type (asset, liability, equity, revenue, expense),
// a unique code for ordering, and an optional parent for grouping.

export const chartAccounts = pgTable(
  "chart_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 200 }).notNull(),
    type: accountTypeEnum("type").notNull(),
    /** Optional parent account id for sub-accounts (e.g. "Bank" -> "Main Bank Account") */
    parentId: uuid("parent_id"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    /** Whether this account can have journal entries posted directly */
    isPostingAccount: boolean("is_posting_account").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("chart_accounts_type_idx").on(t.type),
    index("chart_accounts_is_active_idx").on(t.isActive),
    index("chart_accounts_parent_id_idx").on(t.parentId),
  ],
);

export type ChartAccount = typeof chartAccounts.$inferSelect;
export type NewChartAccount = typeof chartAccounts.$inferInsert;

// ── accounting_periods ────────────────────────────────────────────────────────
// Tracks open, closed, and locked accounting periods (months).
// A "closed" period prevents new journal entries but can be reopened.
// A "locked" period is permanently sealed and cannot be changed.

export const accountingPeriods = pgTable(
  "accounting_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Period identifier in YYYY-MM format */
    period: varchar("period", { length: 7 }).notNull().unique(),
    status: periodStatusEnum("status").notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: text("closed_by"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("accounting_periods_status_idx").on(t.status),
  ],
);

export type AccountingPeriod = typeof accountingPeriods.$inferSelect;
export type NewAccountingPeriod = typeof accountingPeriods.$inferInsert;

// ── journal_entries ───────────────────────────────────────────────────────────
// Header for a journal entry. Each entry has a date, reference, and status.
// Lines are stored separately in journal_lines.
// The total debits must equal total credits for the entry to be valid.

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human-readable entry number (e.g. JE-2026-0001) */
    entryNumber: varchar("entry_number", { length: 30 }).notNull().unique(),
    entryDate: date("entry_date").notNull(),
    /** The accounting period this entry belongs to (YYYY-MM) */
    period: varchar("period", { length: 7 }).notNull(),
    description: text("description").notNull(),
    status: journalEntryStatusEnum("status").notNull().default("draft"),
    /** Source module that created this entry (e.g. "income", "expense", "manual") */
    sourceModule: varchar("source_module", { length: 50 }),
    /** Source table name */
    sourceTable: varchar("source_table", { length: 100 }),
    /** Source row ID */
    sourceId: uuid("source_id"),
    /** Source document number/reference */
    sourceDocumentNumber: varchar("source_document_number", { length: 50 }),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    postedBy: text("posted_by"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: text("voided_by"),
    voidReason: text("void_reason"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("journal_entries_entry_date_idx").on(t.entryDate),
    index("journal_entries_period_idx").on(t.period),
    index("journal_entries_status_idx").on(t.status),
    index("journal_entries_source_idx").on(t.sourceModule, t.sourceTable, t.sourceId),
  ],
);

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;

// ── journal_lines ─────────────────────────────────────────────────────────────
// Individual debit or credit lines within a journal entry.
// Each line references exactly one chart account.
// The sum of all debit amounts must equal the sum of all credit amounts
// across all lines in a single journal entry.

export const journalLines = pgTable(
  "journal_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartAccounts.id, { onDelete: "restrict" }),
    /** Debit amount (null if this is a credit line) */
    debit: numeric("debit", { precision: 14, scale: 2 }),
    /** Credit amount (null if this is a debit line) */
    credit: numeric("credit", { precision: 14, scale: 2 }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("journal_lines_journal_entry_id_idx").on(t.journalEntryId),
    index("journal_lines_account_id_idx").on(t.accountId),
    index("journal_lines_account_id_created_at_idx").on(t.accountId, t.createdAt),
    check(
      "journal_lines_debit_or_credit",
      sql`(${t.debit} IS NOT NULL AND ${t.credit} IS NULL) OR (${t.debit} IS NULL AND ${t.credit} IS NOT NULL)`
    ),
    check(
      "journal_lines_amount_positive",
      sql`(${t.debit} IS NULL OR ${t.debit} > 0) AND (${t.credit} IS NULL OR ${t.credit} > 0)`
    ),
  ],
);

export type JournalLine = typeof journalLines.$inferSelect;
export type NewJournalLine = typeof journalLines.$inferInsert;

// ── journal_sequences ──────────────────────────────────────────────────────────
// Tracks sequence numbers for journal entries per year.
// Rows are locked and updated atomically to prevent duplicate entry numbers.
export const journalSequences = pgTable(
  "journal_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    year: integer("year").notNull().unique(),
    lastSequence: integer("last_sequence").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export type JournalSequence = typeof journalSequences.$inferSelect;
export type NewJournalSequence = typeof journalSequences.$inferInsert;

