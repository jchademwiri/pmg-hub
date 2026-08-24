import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { divisions } from './divisions';
import { clients } from './clients';
import { billingItems } from './billing';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const recurringInvoiceStatusEnum = pgEnum('recurring_invoice_status', [
  'active',
  'paused',
  'cancelled',
]);

export const recurringExpenseStatusEnum = pgEnum('recurring_expense_status', [
  'active',
  'paused',
  'cancelled',
]);

// ── recurring_invoices (Client Retainers / Monthly Hosting) ───────────────────

export const recurringInvoices = pgTable(
  'recurring_invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    divisionId: uuid('division_id')
      .notNull()
      .references(() => divisions.id, { onDelete: 'restrict' }),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    reference: text('reference'), // e.g. "Monthly Retainer & Cloud Hosting"
    status: recurringInvoiceStatusEnum('status').notNull().default('active'),
    billingCycleDay: integer('billing_cycle_day').notNull().default(25), // Defaults to 25th of month
    dueDaysOffset: integer('due_days_offset').notNull().default(6), // 25th + 6 days = 1st of next month
    autoSendEmail: boolean('auto_send_email').notNull().default(true),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
    discountType: text('discount_type'),
    discountValue: numeric('discount_value', { precision: 12, scale: 2 }),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    vatEnabled: boolean('vat_enabled').notNull().default(false),
    vatAmount: numeric('vat_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
    notes: text('notes'),
    terms: text('terms'),
    lastRunDate: date('last_run_date'),
    nextRunDate: date('next_run_date').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    check('recurring_invoices_total_non_negative', sql`${t.total} >= 0`),
    index('recurring_invoices_division_id_idx').on(t.divisionId),
    index('recurring_invoices_client_id_idx').on(t.clientId),
    index('recurring_invoices_status_idx').on(t.status),
    index('recurring_invoices_next_run_date_idx').on(t.nextRunDate),
  ],
);

export type RecurringInvoice = typeof recurringInvoices.$inferSelect;
export type NewRecurringInvoice = typeof recurringInvoices.$inferInsert;

// ── recurring_line_items ───────────────────────────────────────────────────────

export const recurringLineItems = pgTable(
  'recurring_line_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recurringInvoiceId: uuid('recurring_invoice_id')
      .notNull()
      .references(() => recurringInvoices.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').references(() => billingItems.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').notNull().default(0),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    discountType: text('discount_type'),
    discountValue: numeric('discount_value', { precision: 12, scale: 2 }),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
    vatRate: numeric('vat_rate', { precision: 5, scale: 2 }).notNull().default('0'),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check('recurring_line_items_quantity_positive', sql`${t.quantity} > 0`),
    check('recurring_line_items_unit_price_non_negative', sql`"unit_price" >= 0`),
    index('recurring_line_items_recurring_id_idx').on(t.recurringInvoiceId),
  ],
);

export type RecurringLineItem = typeof recurringLineItems.$inferSelect;
export type NewRecurringLineItem = typeof recurringLineItems.$inferInsert;

// ── recurring_expenses (Outbound Vendor Software / VPS Hosting) ───────────────

export const recurringExpenses = pgTable(
  'recurring_expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    divisionId: uuid('division_id')
      .notNull()
      .references(() => divisions.id, { onDelete: 'restrict' }),
    vendorName: text('vendor_name').notNull(), // e.g. "Claude Anthropic", "Antigravity", "Hetzner Cloud"
    category: text('category').notNull(), // e.g. "Software & SaaS", "Hosting & Infrastructure"
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    billingCycleDay: integer('billing_cycle_day').notNull().default(1), // Day of month subscription charges
    nextDueDate: date('next_due_date').notNull(),
    lastPaidDate: date('last_paid_date'),
    status: recurringExpenseStatusEnum('status').notNull().default('active'),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }), // Optional link if pass-through project expense
    notes: text('notes'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    check('recurring_expenses_amount_positive', sql`${t.amount} > 0`),
    index('recurring_expenses_division_id_idx').on(t.divisionId),
    index('recurring_expenses_status_idx').on(t.status),
    index('recurring_expenses_next_due_date_idx').on(t.nextDueDate),
  ],
);

export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export type NewRecurringExpense = typeof recurringExpenses.$inferInsert;

// ── Relations ─────────────────────────────────────────────────────────────────

export const recurringInvoicesRelations = relations(recurringInvoices, ({ one, many }) => ({
  division: one(divisions, {
    fields: [recurringInvoices.divisionId],
    references: [divisions.id],
  }),
  client: one(clients, {
    fields: [recurringInvoices.clientId],
    references: [clients.id],
  }),
  lineItems: many(recurringLineItems),
}));

export const recurringExpensesRelations = relations(recurringExpenses, ({ one }) => ({
  division: one(divisions, {
    fields: [recurringExpenses.divisionId],
    references: [divisions.id],
  }),
  client: one(clients, {
    fields: [recurringExpenses.clientId],
    references: [clients.id],
  }),
}));
