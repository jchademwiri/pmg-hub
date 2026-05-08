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
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { divisions } from "./divisions";
import { clients } from "./clients";
import { income } from "./income";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const quotationStatusEnum = pgEnum("quotation_status", [
  "draft",
  "sent",
  "accepted",
  "declined",
  "expired",
  "converted",
  "cancelled",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "issued",
  "paid",
  "overdue",
  "void",
]);

export const billingDocumentTypeEnum = pgEnum("billing_document_type", [
  "quote",
  "invoice",
]);

export const billingItemStatusEnum = pgEnum("billing_item_status", [
  "active",
  "archived",
]);

// ── document_sequences ────────────────────────────────────────────────────────
// Tracks the last-used sequence number per division / document type / year.
// Rows are locked with SELECT ... FOR UPDATE before incrementing to prevent
// duplicate document numbers under concurrent requests.

export const documentSequences = pgTable(
  "document_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "restrict" }),
    documentType: billingDocumentTypeEnum("document_type").notNull(),
    year: integer("year").notNull(),
    lastSequence: integer("last_sequence").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("document_sequences_division_type_year_unique").on(
      t.divisionId,
      t.documentType,
      t.year,
    ),
  ],
);

export type DocumentSequence = typeof documentSequences.$inferSelect;
export type NewDocumentSequence = typeof documentSequences.$inferInsert;

// ── quotations ────────────────────────────────────────────────────────────────

export const quotations = pgTable(
  "quotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "restrict" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
    documentNumber: text("document_number").notNull().unique(),
    status: quotationStatusEnum("status").notNull().default("draft"),
    quoteDate: date("quote_date").notNull(),
    expiryDate: date("expiry_date"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    // Discount fields — both nullable; discountAmount is always stored (0 when no discount)
    discountType: text("discount_type"),   // 'percent' | 'amount' | null
    discountValue: numeric("discount_value", { precision: 12, scale: 2 }),  // nullable
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    vatEnabled: boolean("vat_enabled").notNull().default(false),
    vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    // reference — optional client-facing reference (PO number, tender ref, etc.)
    reference: text("reference"),
    notes: text("notes"),
    terms: text("terms"),
    // created_by stores session.user.id which is text (not uuid) — matches Better Auth user table
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // updatedAt is managed by the application layer on update. Any database-level operation
    // that bypasses the application (direct SQL fixes, migrations, external services) will
    // leave updatedAt stale. Teams requiring guaranteed accuracy should implement a
    // PostgreSQL trigger.
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("quotations_total_non_negative", sql`${t.total} >= 0`),
    index("quotations_division_id_idx").on(t.divisionId),
    index("quotations_client_id_idx").on(t.clientId),
    index("quotations_status_idx").on(t.status),
    index("quotations_quote_date_idx").on(t.quoteDate),
  ],
);

export type Quotation = typeof quotations.$inferSelect;
export type NewQuotation = typeof quotations.$inferInsert;

// ── invoices ──────────────────────────────────────────────────────────────────

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    divisionId: uuid("division_id")
      .notNull()
      .references(() => divisions.id, { onDelete: "restrict" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
    documentNumber: text("document_number").notNull().unique(),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    invoiceDate: date("invoice_date").notNull(),
    dueDate: date("due_date"),
    poNumber: text("po_number"),
    // quotation_id: soft reference to quotations.id — no FK constraint in schema to avoid
    // circular dependency issues and to allow invoices to exist independently.
    // Application layer enforces referential integrity.
    quotationId: uuid("quotation_id"),
    // income_id: FK to income table — set when invoice is marked paid and revenue is posted
    incomeId: uuid("income_id").references(() => income.id, { onDelete: "set null" }),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    // Discount fields — both nullable; discountAmount is always stored (0 when no discount)
    discountType: text("discount_type"),   // 'percent' | 'amount' | null
    discountValue: numeric("discount_value", { precision: 12, scale: 2 }),  // nullable
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    vatEnabled: boolean("vat_enabled").notNull().default(false),
    vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    terms: text("terms"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    // created_by stores session.user.id which is text (not uuid) — matches Better Auth user table
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // updatedAt is managed by the application layer on update. Any database-level operation
    // that bypasses the application (direct SQL fixes, migrations, external services) will
    // leave updatedAt stale. Teams requiring guaranteed accuracy should implement a
    // PostgreSQL trigger.
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("invoices_total_non_negative", sql`${t.total} >= 0`),
    index("invoices_division_id_idx").on(t.divisionId),
    index("invoices_client_id_idx").on(t.clientId),
    index("invoices_status_idx").on(t.status),
    index("invoices_invoice_date_idx").on(t.invoiceDate),
    index("invoices_quotation_id_idx").on(t.quotationId),
  ],
);

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

// ── billing_line_items ────────────────────────────────────────────────────────
// Polymorphic line items shared by both quotations and invoices.
// document_id has NO FK constraint because it references two different tables
// depending on document_type. Application layer is responsible for ensuring
// document_id points to a valid row in the correct table.

export const billingLineItems = pgTable(
  "billing_line_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentType: billingDocumentTypeEnum("document_type").notNull(),
    // NO FK — polymorphic reference: points to quotations.id or invoices.id
    // depending on document_type. Application layer enforces integrity.
    documentId: uuid("document_id").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("billing_line_items_quantity_positive", sql`${t.quantity} > 0`),
    check("billing_line_items_unit_price_non_negative", sql`"unit_price" >= 0`),
    index("billing_line_items_document_idx").on(t.documentType, t.documentId),
  ],
);

export type BillingLineItem = typeof billingLineItems.$inferSelect;
export type NewBillingLineItem = typeof billingLineItems.$inferInsert;

// ── billing_items ─────────────────────────────────────────────────────────────
// Reusable catalogue items that can be selected when building line items.

export const billingItems = pgTable(
  "billing_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    unitLabel: text("unit_label"),
    vatApplicable: boolean("vat_applicable").notNull().default(true),
    status: billingItemStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // updatedAt is managed by the application layer on update. Any database-level operation
    // that bypasses the application (direct SQL fixes, migrations, external services) will
    // leave updatedAt stale. Teams requiring guaranteed accuracy should implement a
    // PostgreSQL trigger.
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("billing_items_status_idx").on(t.status),
    index("billing_items_name_idx").on(t.name),
  ],
);

export type BillingItem = typeof billingItems.$inferSelect;
export type NewBillingItem = typeof billingItems.$inferInsert;

// ── Relations ─────────────────────────────────────────────────────────────────

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  division: one(divisions, {
    fields: [quotations.divisionId],
    references: [divisions.id],
  }),
  client: one(clients, {
    fields: [quotations.clientId],
    references: [clients.id],
  }),
  lineItems: many(billingLineItems),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  division: one(divisions, {
    fields: [invoices.divisionId],
    references: [divisions.id],
  }),
  client: one(clients, {
    fields: [invoices.clientId],
    references: [clients.id],
  }),
  lineItems: many(billingLineItems),
  income: one(income, {
    fields: [invoices.incomeId],
    references: [income.id],
  }),
}));

// ── organisation_settings ─────────────────────────────────────────────────────
// Singleton table — always exactly one row. Use upsert on a fixed id.

export const organisationSettings = pgTable("organisation_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: text("company_name"),
  registrationNumber: text("registration_number"),
  vatNumber: text("vat_number"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  addressStreet: text("address_street"),
  addressCity: text("address_city"),
  addressPostal: text("address_postal"),
  addressProvince: text("address_province"),
  country: text("country").default("South Africa"),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export type OrganisationSettings = typeof organisationSettings.$inferSelect;
export type NewOrganisationSettings = typeof organisationSettings.$inferInsert;

// ── division_billing_settings ─────────────────────────────────────────────────
// One row per division. Upsert on division_id.

export const divisionBillingSettings = pgTable(
  "division_billing_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    divisionId: uuid("division_id")
      .notNull()
      .unique()
      .references(() => divisions.id, { onDelete: "cascade" }),
    defaultVatRate: numeric("default_vat_rate", { precision: 5, scale: 2 }).default("15"),
    paymentTermsDays: integer("payment_terms_days").default(30),
    bankName: text("bank_name"),
    bankAccountName: text("bank_account_name"),
    bankAccountNumber: text("bank_account_number"),
    bankBranchCode: text("bank_branch_code"),
    invoiceNotes: text("invoice_notes"),
    quoteNotes: text("quote_notes"),
    logoUrl: text("logo_url"),
    // Division contact details — appear on invoices and quotes
    salesRepName: text("sales_rep_name"),
    salesRepPhone: text("sales_rep_phone"),
    salesRepEmail: text("sales_rep_email"),
    divisionWebsite: text("division_website"),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
);

export type DivisionBillingSettings = typeof divisionBillingSettings.$inferSelect;
export type NewDivisionBillingSettings = typeof divisionBillingSettings.$inferInsert;
