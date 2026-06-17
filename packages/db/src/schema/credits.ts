import { check, date, index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { clients } from "./clients";
import { divisions } from "./divisions";
import { invoices } from "./billing";
import { income } from "./income";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const creditNoteStatusEnum = pgEnum("credit_note_status", [
  "active",
  "partially_applied",
  "fully_applied",
  "expired",
  "void",
]);

export const creditNoteTypeEnum = pgEnum("credit_note_type", [
  "overpayment",
  "manual_adjustment",
  "credit_note",
  "promotional",
  "refund_reversal",
]);

// ── credit_notes ──────────────────────────────────────────────────────────────
// Formal credit documents — the audit trail for credit adjustments.
// Each credit note tracks how much credit was issued and how much remains.

export const creditNotes = pgTable(
  "credit_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "restrict" }),
    documentNumber: text("document_number").notNull().unique(),
    status: creditNoteStatusEnum("status").notNull().default("active"),
    type: creditNoteTypeEnum("type").notNull(),
    reason: text("reason"),
    originalInvoiceId: uuid("original_invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),
    originalPaymentId: uuid("original_payment_id").references(() => income.id, {
      onDelete: "set null",
    }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    amountRemaining: numeric("amount_remaining", { precision: 12, scale: 2 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: text("voided_by"),
  },
  (t) => [
    check("credit_notes_amount_positive", sql`${t.amount} > 0`),
    check("credit_notes_amount_remaining_non_negative", sql`${t.amountRemaining} >= 0`),
    index("credit_notes_client_id_idx").on(t.clientId),
    index("credit_notes_status_idx").on(t.status),
    index("credit_notes_type_idx").on(t.type),
    index("credit_notes_expires_at_idx").on(t.expiresAt),
  ],
);

export type CreditNote = typeof creditNotes.$inferSelect;
export type NewCreditNote = typeof creditNotes.$inferInsert;

// ── credit_applications ───────────────────────────────────────────────────────
// Tracks every credit-to-invoice application — the audit trail.

export const creditApplications = pgTable(
  "credit_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creditNoteId: uuid("credit_note_id")
      .notNull()
      .references(() => creditNotes.id, { onDelete: "restrict" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true }).defaultNow().notNull(),
    appliedBy: text("applied_by").notNull(),
  },
  (t) => [
    check("credit_applications_amount_positive", sql`${t.amount} > 0`),
    index("credit_applications_credit_note_id_idx").on(t.creditNoteId),
    index("credit_applications_invoice_id_idx").on(t.invoiceId),
  ],
);

export type CreditApplication = typeof creditApplications.$inferSelect;
export type NewCreditApplication = typeof creditApplications.$inferInsert;

// ── credit_refunds ───────────────────────────────────────────────────────────
// Tracks cash refunds issued against credits.

export const creditRefunds = pgTable(
  "credit_refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creditNoteId: uuid("credit_note_id")
      .notNull()
      .references(() => creditNotes.id, { onDelete: "restrict" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    refundDate: date("refund_date").notNull(),
    refundMethod: text("refund_method").notNull().default("bank_transfer"), // bank_transfer | cash | other
    reference: text("reference"),
    description: text("description"),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("credit_refunds_amount_positive", sql`${t.amount} > 0`),
    index("credit_refunds_client_id_idx").on(t.clientId),
    index("credit_refunds_credit_note_id_idx").on(t.creditNoteId),
  ],
);

export type CreditRefund = typeof creditRefunds.$inferSelect;
export type NewCreditRefund = typeof creditRefunds.$inferInsert;

// ── Relations ─────────────────────────────────────────────────────────────────

export const creditNotesRelations = relations(creditNotes, ({ one, many }) => ({
  client: one(clients, {
    fields: [creditNotes.clientId],
    references: [clients.id],
  }),
  division: one(divisions, {
    fields: [creditNotes.divisionId],
    references: [divisions.id],
  }),
  originalInvoice: one(invoices, {
    fields: [creditNotes.originalInvoiceId],
    references: [invoices.id],
  }),
  originalPayment: one(income, {
    fields: [creditNotes.originalPaymentId],
    references: [income.id],
  }),
  applications: many(creditApplications),
  refunds: many(creditRefunds),
}));

export const creditApplicationsRelations = relations(creditApplications, ({ one }) => ({
  creditNote: one(creditNotes, {
    fields: [creditApplications.creditNoteId],
    references: [creditNotes.id],
  }),
  invoice: one(invoices, {
    fields: [creditApplications.invoiceId],
    references: [invoices.id],
  }),
}));

export const creditRefundsRelations = relations(creditRefunds, ({ one }) => ({
  creditNote: one(creditNotes, {
    fields: [creditRefunds.creditNoteId],
    references: [creditNotes.id],
  }),
  client: one(clients, {
    fields: [creditRefunds.clientId],
    references: [clients.id],
  }),
}));
