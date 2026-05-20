# PMG Billing & Invoicing System Specification

---

## Part 1: High Level Module Specification

# PMG Invoicing Module
### Feature Specification - Phase 11 of PMG Control Center

> **Internal developer reference · Playhouse Media Group**
> `pmg-hub / docs / pmg-invoicing-module.md` · March 2026 · v1.0
>
> This document specifies the invoicing system to be added to `apps/admin`.
> It follows the exact conventions established in Phases 0–3: Drizzle ORM,
> Server Actions, shadcn/ui, Zod validation, `revalidatePath`, no REST layer.

---

## Table of Contents

1. [Overview & Vision](#1-overview--vision)
2. [Honest Scope Assessment](#2-honest-scope-assessment)
3. [How It Fits the Existing System](#3-how-it-fits-the-existing-system)
4. [Database Schema](#4-database-schema)
5. [Financial Logic](#5-financial-logic)
6. [Document Number Format](#6-document-number-format)
7. [Status Flows](#7-status-flows)
8. [Brand System](#8-brand-system)
9. [PDF Generation Strategy](#9-pdf-generation-strategy)
10. [Route Structure](#10-route-structure)
11. [Server Actions](#11-server-actions)
12. [Query Helpers](#12-query-helpers)
13. [UI Component Breakdown](#13-ui-component-breakdown)
14. [Build Sequence](#14-build-sequence)
15. [Key Decisions to Make Before Starting](#15-key-decisions-to-make-before-starting)
16. [What You Get When This Is Done](#16-what-you-get-when-this-is-done)

---

## 1. Overview & Vision

The PMG Invoicing Module lets you create, send, and track financial documents
(quotes, invoices, statements) from inside the Control Center, with each document
automatically branded to the division it belongs to - Apex Web Solutions, Tender
Edge Solutions, PMG, or any future division.

**The core workflow:**

```
Draft Quote → Send to Client → Accepted → Convert to Invoice → Client Pays → Mark Paid
                                ↘ Declined → Archive
```

**What makes this valuable for PMG specifically:**
- Every invoice you issue currently is a manual document (Word/Canva). This replaces that.
- Your clients, divisions, and income are already in the database. Invoices close the loop.
- When an invoice is marked Paid, you can optionally auto-create the corresponding income entry - no double entry.
- The statement feature gives you a clean per-client aged report to send at month end.
- Multi-brand from day one: switching from an Apex invoice to a TES invoice is just changing the `divisionId`.

---

## 2. Honest Scope Assessment

**Short answer: Yes, you can build this. It will take longer than you expect, but it is well within reach.**

Here is the honest breakdown:

### What makes this tractable

The hardest architectural decisions are already made. You have:
- A working Drizzle schema pattern to copy exactly
- A working Server Action pattern (`income.ts` is the template for `invoices.ts`)
- A working form pattern (`IncomeAddForm` is the starting point for `LineItemForm`)
- A working page pattern (`/income/page.tsx` → `/invoices/page.tsx`)
- `formatZAR` already exists
- `clients` and `divisions` tables already exist - no need to rebuild them
- Zod validation already wired
- `revalidatePath` already used correctly throughout

You are not building from scratch. You are extending a working system with established patterns.

### What is genuinely hard

**PDF generation** is the one area with no existing pattern in your codebase. You need
a library that runs server-side, produces branded A4 output, and handles dynamic line
items. This is the single biggest unknown. Budget extra time here. See Section 9.

**The quote-to-invoice conversion** has edge cases. When you convert a quote to an
invoice, do you clone the line items or reference them? What happens if you edit the
quote after conversion? Decide this upfront and keep it simple (clone the line items,
sever the link).

**The auto-income-entry feature** (mark invoice paid → create income entry) sounds simple
but requires transaction safety. One DB write must succeed or both fail.

### Realistic time estimate (mid-level developer + AI co-pilot)

| Phase | Work | Estimated Time |
|---|---|---|
| Schema + migrations | New tables, seed data | 1–2 days |
| Quote CRUD | Create, edit, delete, list | 3–4 days |
| Invoice CRUD | Create from quote, edit, list | 2–3 days |
| Line item builder | Dynamic add/remove rows | 2–3 days |
| Status management | Status transitions, validation | 1–2 days |
| PDF generation | Branded A4 output, download | 4–6 days |
| Statement view | Per-client aged summary | 2–3 days |
| Auto income entry | Mark paid → income record | 1–2 days |
| Settings page | Brand configs, payment details | 1–2 days |
| Polish & edge cases | Testing, empty states, error handling | 3–4 days |
| **Total** | | **~20–29 working days** |

That is roughly **4–6 weeks** of focused part-time work. With AI assistance on the
boilerplate (schema, Server Actions, form wiring), the mechanical parts compress
significantly. The thinking parts (PDF layout, state machine, edge cases) do not compress.

### The one risk worth naming

**PDF is a time sink.** If you choose the wrong library or try to make the PDF too
fancy on the first pass, you will burn a week. Start with the simplest possible branded
output (letterhead, line items table, total) and iterate. The goal of v1 is correct, not beautiful.

---

## 3. How It Fits the Existing System

### Relationship to existing tables

```
divisions ──< invoices          (one division, many invoices - brand is determined by division)
clients   ──< invoices          (one client, many invoices)
invoices  ──< invoice_line_items (one invoice, many line items)
invoices  ──< invoice_payments  (one invoice, many partial payments)
invoices  ──> income            (optional: paid invoice creates income entry)
```

### Relationship to the financial engine

Invoices are **not** income until they are paid. The financial engine currently reads
from the `income` table. When you mark an invoice as paid and elect to create an
income entry, that entry flows into the existing dashboard automatically via
`revalidatePath('/dashboard')`. No changes to `lib/financial.ts` are required.

### What does NOT need to change

- `packages/db/src/schema/` - you add new files, touch nothing existing
- `lib/financial.ts` - untouched
- `lib/format.ts` - `formatZAR` is reused directly
- Dashboard - revalidation handles updates automatically
- Existing income/expenses flows - fully independent

---

## 4. Database Schema

Add these files to `packages/db/src/schema/`.

### `invoice_settings.ts`

Per-division configuration: banking details, VAT number, footer text.
Created once per division via a settings page.

```ts
import { pgTable, text, uuid, timestamp, boolean } from "drizzle-orm/pg-core";
import { divisions } from "./divisions";

export const invoiceSettings = pgTable("invoice_settings", {
  id:              uuid("id").primaryKey().defaultRandom(),
  divisionId:      uuid("division_id").notNull().unique()
                     .references(() => divisions.id, { onDelete: "cascade" }),

  // Letterhead
  tradingName:     text("trading_name").notNull(),       // "Apex Web Solutions"
  tagline:         text("tagline"),                       // "Where Great Websites Begin"
  email:           text("email").notNull(),
  phone:           text("phone").notNull(),
  website:         text("website"),
  address:         text("address").notNull(),

  // Legal & tax
  registrationNo:  text("registration_no"),              // CIPC reg number
  vatNo:           text("vat_number"),                   // if VAT registered
  isVatRegistered: boolean("is_vat_registered").notNull().default(false),

  // Banking
  bankName:        text("bank_name"),
  accountName:     text("account_name"),
  accountNo:       text("account_no"),
  branchCode:      text("branch_code"),
  accountType:     text("account_type"),                 // "Cheque" | "Savings"

  // Defaults
  defaultPaymentTermsDays: integer("default_payment_terms_days").notNull().default(14),
  defaultNotes:    text("default_notes"),                // "Thank you for your business."
  defaultFooter:   text("default_footer"),

  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }),
});
```

### `invoices.ts`

Single table for both quotes and invoices (document type field).
Quotes and invoices share the same structure - the `type` field differentiates them.

```ts
import { pgEnum, pgTable, text, uuid, date, numeric,
         integer, timestamp, boolean, check } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { divisions } from "./divisions";
import { clients } from "./clients";

export const documentTypeEnum = pgEnum("document_type", ["quote", "invoice", "credit_note"]);
export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "sent",
  "accepted",   // quotes only
  "declined",   // quotes only
  "converted",  // quote has been converted to invoice
  "paid",
  "partial",
  "overdue",
  "cancelled",
  "archived",
]);

export const invoices = pgTable(
  "invoices",
  {
    id:             uuid("id").primaryKey().defaultRandom(),

    // Document identity
    type:           documentTypeEnum("type").notNull().default("invoice"),
    number:         text("number").notNull().unique(),   // "AWS-INV-2026-001"
    divisionId:     uuid("division_id").notNull()
                      .references(() => divisions.id, { onDelete: "restrict" }),
    clientId:       uuid("client_id")
                      .references(() => clients.id, { onDelete: "set null" }),

    // Status
    status:         documentStatusEnum("status").notNull().default("draft"),

    // Dates
    issueDate:      date("issue_date").notNull(),
    dueDate:        date("due_date"),
    expiryDate:     date("expiry_date"),               // quotes: offer expiry

    // Quote → Invoice link
    // When a quote is converted, a new invoice row is created.
    // The quote's convertedToInvoiceId is set. The invoice's sourceQuoteId is set.
    // Line items are CLONED - they are not shared.
    sourceQuoteId:          uuid("source_quote_id"),   // invoice: which quote it came from
    convertedToInvoiceId:   uuid("converted_to_invoice_id"), // quote: which invoice was created

    // Financials (denormalised for fast display - recalculated on every line item save)
    subtotal:       numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    vatAmount:      numeric("vat_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    total:          numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    amountPaid:     numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0"),
    amountDue:      numeric("amount_due", { precision: 12, scale: 2 }).notNull().default("0"),

    // Tax
    vatRate:        numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("15.00"),
    vatInclusive:   boolean("vat_inclusive").notNull().default(false), // if true, prices include VAT

    // Payment terms
    paymentTermsDays: integer("payment_terms_days").notNull().default(14),

    // Content
    clientRef:      text("client_ref"),                // client's PO number or reference
    notes:          text("notes"),                     // visible to client
    internalNotes:  text("internal_notes"),            // not on PDF
    footer:         text("footer"),

    // Auto-income flag
    incomeEntryId:  uuid("income_entry_id"),           // set when paid → income created

    createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:      timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    check("invoices_subtotal_non_negative", sql`${t.subtotal} >= 0`),
    check("invoices_total_non_negative",    sql`${t.total} >= 0`),
  ]
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  division:   one(divisions, { fields: [invoices.divisionId], references: [divisions.id] }),
  client:     one(clients,   { fields: [invoices.clientId],   references: [clients.id] }),
  lineItems:  many(invoiceLineItems),
  payments:   many(invoicePayments),
}));

export type Invoice    = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
```

### `invoice_line_items.ts`

```ts
import { pgTable, text, uuid, numeric, integer, timestamp, check } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { invoices } from "./invoices";

export const invoiceLineItems = pgTable(
  "invoice_line_items",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    invoiceId:   uuid("invoice_id").notNull()
                   .references(() => invoices.id, { onDelete: "cascade" }),
    sortOrder:   integer("sort_order").notNull().default(0),

    description: text("description").notNull(),
    quantity:    numeric("quantity",   { precision: 10, scale: 2 }).notNull().default("1"),
    unitPrice:   numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    vatRate:     numeric("vat_rate",   { precision: 5,  scale: 2 }).notNull().default("15.00"),
    discount:    numeric("discount",   { precision: 5,  scale: 2 }).notNull().default("0"),
    amount:      numeric("amount",     { precision: 12, scale: 2 }).notNull(),
    // amount = quantity × unitPrice × (1 - discount/100)

    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("line_item_quantity_positive",  sql`${t.quantity} > 0`),
    check("line_item_unit_price_non_neg", sql`${t.unit_price} >= 0`),
  ]
);

export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceLineItems.invoiceId], references: [invoices.id] }),
}));
```

### `invoice_payments.ts`

Records partial or full payments against an invoice.

```ts
import { pgTable, uuid, date, numeric, text, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { invoices } from "./invoices";

export const invoicePayments = pgTable(
  "invoice_payments",
  {
    id:          uuid("id").primaryKey().defaultRandom(),
    invoiceId:   uuid("invoice_id").notNull()
                   .references(() => invoices.id, { onDelete: "cascade" }),
    date:        date("date").notNull(),
    amount:      numeric("amount", { precision: 12, scale: 2 }).notNull(),
    method:      text("method"),    // "EFT" | "Cash" | "Card" | "SnapScan"
    reference:   text("reference"), // bank reference / proof of payment note
    notes:       text("notes"),
    createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("payment_amount_positive", sql`${t.amount} > 0`),
  ]
);
```

### Export additions - `packages/db/src/schema/index.ts`

```ts
// Add these three lines:
export * from "./invoice_settings";
export * from "./invoices";
export * from "./invoice_line_items";
export * from "./invoice_payments";
```

---

## 5. Financial Logic

All calculations happen in a utility function called on every line item save.
**Never trust the client with totals - always recalculate on the server.**

```ts
// packages/db/src/invoice-calc.ts

export type LineItemInput = {
  quantity: number;
  unitPrice: number;
  vatRate: number;    // 15 by default
  discount: number;  // percentage, 0–100
};

export function calcLineItem(item: LineItemInput) {
  const base     = item.quantity * item.unitPrice;
  const discAmt  = base * (item.discount / 100);
  const amount   = base - discAmt;
  const vatAmt   = amount * (item.vatRate / 100);
  return { amount, vatAmount: vatAmt };
}

export function calcInvoiceTotals(lineItems: LineItemInput[]) {
  let subtotal = 0;
  let vatAmount = 0;
  for (const item of lineItems) {
    const { amount, vatAmount: itemVat } = calcLineItem(item);
    subtotal  += amount;
    vatAmount += itemVat;
  }
  const total    = subtotal + vatAmount;
  return { subtotal, vatAmount, total };
}
```

When an invoice is saved, the Server Action must:
1. Upsert all line items
2. Recalculate `subtotal`, `vatAmount`, `total` from the saved line items
3. Update `amountDue = total - amountPaid`
4. Update the `invoices` row with the new totals

---

## 6. Document Number Format

Numbers are generated server-side at creation time. Never auto-increment a DB sequence
for this - use a query that finds the current max and increments it.

```
Format:  {DIVISION_CODE}-{TYPE_CODE}-{YEAR}-{SEQUENCE}

Examples:
  AWS-Q-2026-001     Apex Web Solutions Quote
  AWS-INV-2026-001   Apex Web Solutions Invoice
  TES-Q-2026-001     Tender Edge Solutions Quote
  TES-INV-2026-001   Tender Edge Solutions Invoice
  PMG-Q-2026-001     PMG Quote
  PMG-CN-2026-001    Credit Note
```

Division codes - derive from division name:
- "Apex Web Solutions"    → AWS
- "Tender Edge Solutions" → TES
- "Playhouse Media Group" → PMG
- Any new division        → first 3 chars uppercased

Type codes: `Q` (quote), `INV` (invoice), `CN` (credit note)

```ts
// In packages/db/src/queries.ts

export async function generateDocumentNumber(
  divisionId: string,
  type: "quote" | "invoice" | "credit_note"
): Promise<string> {
  const division = await db
    .select({ name: divisions.name })
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .then((r) => r[0]);

  if (!division) throw new Error("Division not found");

  const codeMap: Record<string, string> = {
    "Apex Web Solutions":    "AWS",
    "Tender Edge Solutions": "TES",
    "Playhouse Media Group": "PMG",
  };

  const divCode  = codeMap[division.name] ?? division.name.slice(0, 3).toUpperCase();
  const typeCode = type === "quote" ? "Q" : type === "invoice" ? "INV" : "CN";
  const year     = new Date().getFullYear();
  const prefix   = `${divCode}-${typeCode}-${year}-`;

  const existing = await db
    .select({ number: invoices.number })
    .from(invoices)
    .where(sql`${invoices.number} LIKE ${prefix + "%"}`)
    .orderBy(desc(invoices.number));

  const seq = existing.length === 0
    ? 1
    : parseInt(existing[0]!.number.split("-").at(-1)!, 10) + 1;

  return `${prefix}${String(seq).padStart(3, "0")}`;
}
```

---

## 7. Status Flows

### Quote status flow

```
draft → sent → accepted → converted (invoice created)
            ↘ declined  → archived
```

### Invoice status flow

```
draft → sent → partial (payment received, not full)
            ↘ paid     (full payment received)
            ↘ overdue  (past due date, not paid - set by cron or manual trigger)
            ↘ cancelled
```

### Status transition rules (enforced in Server Actions)

| From | Allowed next states |
|---|---|
| draft | sent, cancelled |
| sent (quote) | accepted, declined, draft |
| sent (invoice) | partial, paid, overdue, cancelled |
| accepted | converted (system-only), draft |
| partial | paid, overdue, cancelled |
| overdue | paid, partial, cancelled |
| converted / paid / cancelled / archived | none - terminal |

---

## 8. Brand System

Each division has its own visual identity for the PDF. This is driven by `invoice_settings`
plus a code-level brand config.

```ts
// apps/admin/src/lib/invoice-brands.ts

export type BrandConfig = {
  primaryColor:   string;  // hex
  accentColor:    string;
  logoText:       string;  // fallback if no logo image
  fontStyle:      "serif" | "sans";
};

export const BRAND_CONFIGS: Record<string, BrandConfig> = {
  "Apex Web Solutions": {
    primaryColor: "#0F172A",
    accentColor:  "#38BDF8",
    logoText:     "APEX WEB SOLUTIONS",
    fontStyle:    "sans",
  },
  "Tender Edge Solutions": {
    primaryColor: "#0b2a4a",
    accentColor:  "#c9a227",
    logoText:     "TENDER EDGE SOLUTIONS",
    fontStyle:    "sans",
  },
  "Playhouse Media Group": {
    primaryColor: "#0D1B2A",
    accentColor:  "#F97316",
    logoText:     "PLAYHOUSE MEDIA GROUP",
    fontStyle:    "sans",
  },
};

export function getBrandConfig(divisionName: string): BrandConfig {
  return BRAND_CONFIGS[divisionName] ?? {
    primaryColor: "#0D1B2A",
    accentColor:  "#F97316",
    logoText:     divisionName.toUpperCase(),
    fontStyle:    "sans",
  };
}
```

---

## 9. PDF Generation Strategy

### Recommended library: `@react-pdf/renderer`

This is the right choice for your stack. It runs server-side in a Next.js Route Handler,
renders React components to PDF, and supports custom fonts and styling.

```bash
bun --filter admin add @react-pdf/renderer
bun --filter admin add -D @types/react-pdf
```

### Architecture

Do **not** render PDFs in Server Actions. Use a Route Handler that streams the PDF.

```
GET /api/invoices/[id]/pdf  →  Route Handler  →  @react-pdf/renderer  →  application/pdf
```

```ts
// apps/admin/src/app/api/invoices/[id]/pdf/route.ts

import { renderToStream } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoices/invoice-pdf";
import { getInvoiceWithDetails } from "@pmg/db";
import { getBrandConfig } from "@/lib/invoice-brands";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoiceWithDetails(id);
  if (!invoice) return new Response("Not found", { status: 404 });

  const brand  = getBrandConfig(invoice.divisionName);
  const stream = await renderToStream(<InvoicePDF invoice={invoice} brand={brand} />);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number}.pdf"`,
    },
  });
}
```

### PDF component structure

```ts
// apps/admin/src/components/invoices/invoice-pdf.tsx
// A React component using @react-pdf/renderer primitives (Document, Page, View, Text, etc.)
// NOT a standard React component - uses PDF-specific primitives only.

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// Structure:
// <Document>
//   <Page size="A4">
//     <Header />          brand logo text, division name, tagline
//     <SellerDetails />   address, email, phone, VAT no
//     <Divider />
//     <DocumentMeta />    Invoice No, Date, Due Date, Client Ref
//     <ClientAddress />   client name, business name, address
//     <LineItemsTable />  description | qty | unit price | VAT | amount
//     <Totals />          subtotal, VAT, TOTAL
//     <PaymentDetails />  bank name, account no, branch code
//     <Notes />           notes field
//     <Footer />          footer text, "Thank you for your business."
//   </Page>
// </Document>
```

### V1 rule: keep the PDF simple

For the first working version, text only - no images, no logo files.
The division name styled in the brand primary colour is enough to make it
look professional. Add logo images in v2 once the layout is proven.

---

## 10. Route Structure

Add these routes to `apps/admin/src/app/(admin)/`:

```
/invoices
  page.tsx           List: all invoices + quick stats (outstanding, overdue, paid)
  new/page.tsx       Create new invoice or quote (type param: ?type=invoice|quote)

/invoices/[id]
  page.tsx           Invoice detail view (read-only summary + action buttons)
  edit/page.tsx      Edit invoice (line items, dates, notes)

/quotes
  page.tsx           List: all quotes (separate from invoices for focus)
  new/page.tsx       Create new quote

/quotes/[id]
  page.tsx           Quote detail (accept, decline, convert to invoice)
  edit/page.tsx      Edit quote

/statements
  page.tsx           Client selector → generate statement
  [clientId]/page.tsx  Per-client statement (all invoices, payments, balance)

/invoice-settings
  page.tsx           Per-division configuration (banking, letterhead, VAT)
```

---

## 11. Server Actions

All actions in `apps/admin/src/app/actions/invoices.ts`.

```ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db, invoices, invoiceLineItems, invoicePayments, income, eq } from '@pmg/db';
import { generateDocumentNumber, recalcInvoiceTotals } from '@pmg/db';

// ── Create invoice or quote ───────────────────────────────────────────────────
export async function createInvoice(formData: FormData): Promise<{ error?: string; id?: string }> {}

// ── Update invoice header (dates, notes, client, terms) ──────────────────────
export async function updateInvoice(id: string, formData: FormData): Promise<{ error?: string }> {}

// ── Upsert a line item (add or update) ───────────────────────────────────────
// Recalculates invoice totals after every line item change.
export async function upsertLineItem(invoiceId: string, formData: FormData): Promise<{ error?: string }> {}

// ── Delete a line item ────────────────────────────────────────────────────────
export async function deleteLineItem(lineItemId: string, invoiceId: string): Promise<{ error?: string }> {}

// ── Update invoice status ─────────────────────────────────────────────────────
// Validates the transition is allowed before writing.
export async function updateInvoiceStatus(
  id: string,
  newStatus: string
): Promise<{ error?: string }> {}

// ── Record a payment ──────────────────────────────────────────────────────────
// Inserts into invoice_payments, recalculates amountDue, updates status.
// If fully paid and createIncomeEntry=true, inserts into income table in same transaction.
export async function recordPayment(
  invoiceId: string,
  formData: FormData
): Promise<{ error?: string }> {}

// ── Convert quote to invoice ──────────────────────────────────────────────────
// Creates a new invoice row, clones all line items, links both rows.
// Quote status → "converted". Returns the new invoice id.
export async function convertQuoteToInvoice(
  quoteId: string
): Promise<{ error?: string; invoiceId?: string }> {}

// ── Delete draft document ─────────────────────────────────────────────────────
// Only allowed when status = "draft"
export async function deleteInvoice(id: string): Promise<{ error?: string }> {}

// ── Duplicate invoice as new draft ───────────────────────────────────────────
export async function duplicateInvoice(id: string): Promise<{ error?: string; id?: string }> {}
```

All actions revalidate:
```ts
revalidatePath('/invoices');
revalidatePath('/quotes');
revalidatePath(`/invoices/${id}`);
revalidatePath('/dashboard');  // if a payment was recorded
```

---

## 12. Query Helpers

Add to `packages/db/src/queries.ts`:

```ts
// ── Invoice list with summary ─────────────────────────────────────────────────
export async function getAllInvoices(filters?: {
  type?: "invoice" | "quote";
  status?: string;
  divisionId?: string;
  clientId?: string;
  month?: string;
}): Promise<InvoiceListRow[]> {}

// ── Invoice detail with line items + payments ─────────────────────────────────
export async function getInvoiceWithDetails(id: string): Promise<InvoiceDetail | null> {}

// ── Invoice summary stats (for dashboard card) ────────────────────────────────
export async function getInvoiceStats(): Promise<{
  totalOutstanding: number;
  totalOverdue: number;
  totalPaidThisMonth: number;
  overdueCount: number;
}> {}

// ── Per-client statement data ─────────────────────────────────────────────────
export async function getClientStatement(clientId: string, from?: string, to?: string): Promise<{
  client: { name: string; businessName: string | null };
  invoices: InvoiceListRow[];
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  agingBuckets: { current: number; days30: number; days60: number; days90plus: number };
}> {}

// ── Invoice settings per division ─────────────────────────────────────────────
export async function getInvoiceSettings(divisionId: string): Promise<InvoiceSettings | null> {}
export async function upsertInvoiceSettings(settings: NewInvoiceSettings): Promise<void> {}
```

---

## 13. UI Component Breakdown

### Page components (Server Components)

| Component | File | Description |
|---|---|---|
| `InvoiceListPage` | `/invoices/page.tsx` | Server: fetches list + stats, renders shell |
| `InvoiceDetailPage` | `/invoices/[id]/page.tsx` | Server: fetches full invoice, renders detail |
| `InvoiceEditPage` | `/invoices/[id]/edit/page.tsx` | Server: fetches invoice + divisions + clients |
| `QuoteListPage` | `/quotes/page.tsx` | Server: filtered to type=quote |

### Client components

| Component | File | Description |
|---|---|---|
| `InvoiceShell` | `components/invoices/invoice-shell.tsx` | Layout wrapper, tab navigation |
| `InvoiceForm` | `components/invoices/invoice-form.tsx` | Header fields (client, dates, terms, notes) |
| `LineItemEditor` | `components/invoices/line-item-editor.tsx` | Dynamic add/remove rows with live total |
| `InvoiceTotal` | `components/invoices/invoice-total.tsx` | Subtotal / VAT / Total display |
| `StatusBadge` | `components/invoices/status-badge.tsx` | Coloured badge per status |
| `StatusActions` | `components/invoices/status-actions.tsx` | Context-aware action buttons (Send, Mark Paid, etc.) |
| `PaymentModal` | `components/invoices/payment-modal.tsx` | Dialog to record a payment |
| `ConvertModal` | `components/invoices/convert-modal.tsx` | Confirm quote → invoice conversion |
| `InvoicePreview` | `components/invoices/invoice-preview.tsx` | HTML preview (mirrors PDF layout) |
| `StatementView` | `components/invoices/statement-view.tsx` | Client statement with aging buckets |

### The `LineItemEditor` - the most complex component

This is the component that needs the most care. It manages a list of line items,
each with description, qty, unit price, VAT, and discount. It calculates line totals
in real time on the client, and debounce-saves each row via a Server Action.

Pattern: optimistic UI for the row totals, Server Action for persistence.

```
[ Description field     ] [Qty] [Unit Price] [VAT%] [Discount%] [Amount] [Delete]
[ Description field     ] [Qty] [Unit Price] [VAT%] [Discount%] [Amount] [Delete]
[ + Add line item       ]
                                              ─────────────────────────────
                                              Subtotal:  R 0.00
                                              VAT (15%): R 0.00
                                              TOTAL:     R 0.00
```

---

## 14. Build Sequence

Build in this exact order. Each step is independently testable.

```
Step 1: Schema + migration
  - Add all 4 new schema files
  - Run bun db:generate && bun db:migrate
  - Add to schema/index.ts
  - Verify bun db:studio shows new tables

Step 2: Invoice settings page
  - /invoice-settings route
  - UpsertInvoiceSettings Server Action
  - One settings form per division
  - Test: save and reload settings for AWS, TES, PMG

Step 3: Generate document number utility
  - generateDocumentNumber() in queries.ts
  - Unit test it with vitest

Step 4: Create invoice (draft, no line items)
  - /invoices/new page
  - createInvoice Server Action
  - Test: create draft invoice, verify number format, verify it appears in DB

Step 5: Line item editor
  - LineItemEditor client component
  - upsertLineItem + deleteLineItem Server Actions
  - calcInvoiceTotals recalc on every save
  - Test: add 3 items, verify totals update in DB

Step 6: Invoice list page
  - /invoices page
  - getAllInvoices query
  - Test: list shows correct items, filter by status works

Step 7: Invoice detail + status actions
  - /invoices/[id] page
  - updateInvoiceStatus Server Action with transition validation
  - Test: draft → sent → mark paid flow works

Step 8: Payment recording
  - PaymentModal component
  - recordPayment Server Action
  - Test: partial payment updates amountDue, full payment sets status=paid

Step 9: Quote flow
  - /quotes pages (reuse invoice components with type=quote)
  - convertQuoteToInvoice Server Action
  - Test: quote → invoice conversion creates correct invoice number

Step 10: PDF generation
  - Route Handler at /api/invoices/[id]/pdf
  - InvoicePDF React PDF component (simple text-only v1)
  - Test: download PDF for each brand, verify letterhead and totals are correct

Step 11: Statement view
  - /statements route
  - getClientStatement query with aging buckets
  - StatementView component + PDF export

Step 12: Dashboard integration
  - Add InvoiceStats card to dashboard (outstanding / overdue / paid this month)
  - Add "Invoices" to sidebar nav
```

---

## 15. Key Decisions to Make Before Starting

Answer these before writing a single line of code:

**1. VAT: are you VAT-registered?**
If not, set `isVatRegistered: false` in invoice settings and hide the VAT column.
If yes, ensure your VAT number is in settings and VAT appears on all invoices.

**2. Do you want auto income entry when an invoice is paid?**
Recommended: yes, with a checkbox on the payment form: "Also create income entry".
This keeps your dashboard financial data in sync without manual double-entry.

**3. Will you send invoices via email from the system?**
Resend is already in your stack. If yes, add a `sendInvoiceEmail` Server Action in
Phase 11b. For v1, download PDF and email manually - keeps the scope tight.

**4. Partial payments - do you need them for v1?**
If most of your clients pay in full, skip `invoice_payments` table complexity for v1.
Just add a "Mark as Paid" button that sets `status = 'paid'` and optionally creates
an income entry. Add partial payments in v1.1.

**5. Credit notes - do you need them for v1?**
Probably not. Include the `credit_note` enum value in the schema but don't build the
UI until you actually need to issue one. Scope creep starts with "just in case".

---

## 16. What You Get When This Is Done

A complete invoicing system that lives inside your existing Control Center:

- **Multi-brand invoices** - switch division, letterhead changes automatically
- **Quote-to-invoice pipeline** - no re-entering data
- **PDF download** - branded A4, professional enough to send to a client same day
- **Payment tracking** - know exactly what is outstanding, what is overdue, what is paid
- **Auto income sync** - paid invoices feed your financial dashboard without double entry
- **Client statements** - one-click aged debt report per client for month-end follow-up
- **All data in one place** - clients, divisions, income, invoices - one database, one system

**The realistic win:** you stop creating invoices in Word or Canva, you stop maintaining
a separate spreadsheet of who owes what, and your Control Center becomes the single source
of financial truth for PMG. Given you generated ~R2.1M in the seed data alone, having
proper invoice tracking at that scale is not optional - it is overdue.

---

## Appendix: Migration Script Stub

```ts
// packages/db/src/migrations/0001_invoicing_module.sql
// Generated by: bun db:generate after adding the new schema files

-- Run after 0000_wooden_tombstone.sql

CREATE TYPE "public"."document_type" AS ENUM('quote', 'invoice', 'credit_note');
CREATE TYPE "public"."document_status" AS ENUM(
  'draft', 'sent', 'accepted', 'declined', 'converted',
  'paid', 'partial', 'overdue', 'cancelled', 'archived'
);

-- invoice_settings, invoices, invoice_line_items, invoice_payments
-- (Generated by drizzle-kit generate - do not write by hand)
```

---

*Last updated: March 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
*"Every rand has a job. Every invoice is a job well done."*


---

## Part 2: Billing Route Map & Views

# Billing

The Billing section covers four areas: **Quotations**, **Invoices**, **Statements**, and **Items** (service catalogue). All pages live under `/billing` and share the same Card-based layout, two-column document preview pattern, and `DocumentPreview` component established in the shell.

---

## Route Map

| Route | Page | Status |
|---|---|---|
| `/billing/quotes` | Quotations list | 🔜 Shell - wire up data |
| `/billing/quotes/new` | New quote form | 🔜 Shell - wire up form |
| `/billing/quotes/[id]` | Quote detail + actions | 🔜 Shell - wire up data + actions |
| `/billing/invoices` | Invoices list | 🔜 Shell - wire up data |
| `/billing/invoices/new` | New invoice form | 🔜 Shell - wire up form |
| `/billing/invoices/[id]` | Invoice detail + actions | 🔜 Shell - wire up data + actions |
| `/billing/statements` | Statements list | 🔜 Shell - wire up data |
| `/billing/statements/[clientId]` | Client statement | 🔜 Shell - wire up data |
| `/billing/items` | Items catalogue list | 🔜 Shell - wire up data |
| `/billing/items/new` | New item form | 🔜 Shell - wire up form |
| `/billing/items/[id]` | Item detail / edit | 🔜 Shell - wire up data |

---

## Layout & Visual Conventions

All billing detail pages (`[id]`) follow the same two-column layout established in the shell:

```
lg:grid-cols-3
  ├── lg:col-span-2  →  DocumentPreview (main content)
  └── col-span-1     →  Sidebar cards (Summary, Activity, Client Info)
```

The `DocumentPreview` component renders a styled document that looks like the actual printed output. It is shared across quotes, invoices, and statements - `type` prop switches the layout.

Page headers follow the pattern:
```
[Ghost back button] [Separator] [Title + Badge]    [Action buttons]
```

Action buttons in the header (Print, Send, Convert to Invoice, More) are disabled in the shell and wired up when implementing each feature.

---

## Quotations

### `/billing/quotes` - List

**File:** `src/app/(admin)/billing/quotes/page.tsx`

**Stats row (4 cards)**

| Stat | Icon | Description |
|---|---|---|
| Total Quotes | FileText | All time count |
| Pending | Clock | Awaiting client response |
| Accepted | CheckCircle | Converted to invoice |
| Declined | XCircle | Not accepted |

Stats are currently hardcoded to `'-'`. Wire up to `getAllQuotations()` aggregates when implementing.

**Table columns**

| Column | Notes |
|---|---|
| Quote # | Monospace, links to `/billing/quotes/{id}` |
| Client | `clientName ?? '-'` |
| Issue Date | `quoteDate` |
| Expiry Date | `expiryDate ?? '-'` |
| Amount | `formatZAR(total)`, right-aligned, `text-green-500` |
| Status | `BillingStatusBadge` |
| Actions | Dropdown: View, Mark Sent, Mark Accepted, Mark Declined, Delete |

Shows `EmptyState` with CTA to `/billing/quotes/new` when no quotes exist. Includes a `Preview mock quote →` dev link (remove before production).

**Data to fetch (server component):**
```typescript
const [result, divisions, clients] = await Promise.all([
  getAllQuotations({ divisionId, status }, { page, pageSize: 20 }),
  getAllDivisions(),
  getAllClients(),
])
// SetPageTotal → formatZAR(result.sum), variant: 'green'
```

---

### `/billing/quotes/new` - Create

**File:** `src/app/(admin)/billing/quotes/new/page.tsx`

Two-column layout: `lg:col-span-2` form + `col-span-1` sidebar.

**Main form (left) - three cards:**

1. **Quote Details card** - Client (select, **required** - cannot save without a client), Quote # (auto-generated, read-only), Reference (optional free-text input for client's own reference number), Issue Date, Expiry Date
2. **Line Items card** - `BillingLineItemsForm` (dynamic rows). All line items must be selected from the pre-saved items catalogue via the item combobox - free-form one-off entries are not permitted. Shell shows dashed placeholder + disabled "+ Add Line Item" button
3. **Terms & Notes card** - textarea for optional terms and client-facing notes

**Sidebar (right) - two cards (sidebar is `sticky top-6`):**

- **Summary card** - Subtotal, Discount (optional - see below), VAT toggle (default **off** - owner is not VAT registered; when toggled on, shows VAT at 15%), Total (live-calculated from line items), Save Quote button, Save as Draft button
- **Status card** - "Quote will be saved as **Draft** until sent to the client."

**Discount field (inside Summary card):**
- Input with a mode toggle: **%** (percentage) or **R** (fixed amount)
- Applied after subtotal, before VAT
- Displayed as a negative line in the summary: `Discount (10%) - R −450.00`
- Stored as `discountType: 'percent' | 'amount'` and `discountValue: number` on the quotation

**VAT toggle (inside Summary card):**
- shadcn `Switch` labelled "Include VAT (15%)"
- Default: **off** (no VAT shown or calculated)
- When on: shows VAT row at 15% of (subtotal − discount)
- Stored as `vatEnabled: boolean` on the quotation

**Client validation:** The form must not allow submission without a client selected. Show an inline error on the Client field if attempted.

**On submit:** call `createQuotation(data)` → redirect to `/billing/quotes/{id}`

**Form state** (controlled React state, not FormData - line items are nested):
```typescript
{
  divisionId, clientId, quoteDate, expiryDate, reference,
  notes, terms, lineItems,
  discountType: 'percent' | 'amount', discountValue: number,
  vatEnabled: boolean,
  isSubmitting, error
}
```

---

### `/billing/quotes/[id]` - Detail

**File:** `src/app/(admin)/billing/quotes/[id]/page.tsx`

**Header actions (in order):**
- Print - disabled (v2: PDF)
- Send - disabled (v2: email)
- **Export as PDF** - disabled (v2: PDF generation)
- **Convert to Invoice** - `ConvertToInvoiceButton`, only active when `status === 'accepted'`
- More (MoreHorizontal) - disabled

**Edit quote:** An "Edit" button is shown in the header for all non-terminal statuses (`draft`, `sent`). Clicking navigates to `/billing/quotes/{id}/edit`. Quotes with status `accepted`, `converted`, `declined`, `cancelled`, or `expired` cannot be edited (button hidden or disabled with tooltip).

**Main content (left):** `DocumentPreview type="quote"` - renders the styled quotation document including org details, client details, reference (if set), line items table, discount (if set), totals, terms, and banking details.

**Sidebar (right, `sticky top-6`):**

- **Summary card** - Subtotal, Discount (if set, shown as negative), VAT (only if `vatEnabled` is true), Total (from denormalised fields)
- **Activity card** - Timeline of state changes (e.g. "Quote sent to client", "Quote created"). In shell uses mock data; wire to audit log in v2.

**Action bar (below document) by status:**

| Status | Actions |
|---|---|
| `draft` | Mark Sent, Delete |
| `sent` | Mark Accepted, Mark Declined, Cancel |
| `accepted` | **Convert to Invoice** (ConvertToInvoiceButton) |
| `converted` | "Converted to Invoice {number}" → link to invoice |
| `declined / cancelled / expired` | "No further actions available." |

**Data to fetch:**
```typescript
const quote = await getQuotationById(id)
if (!quote) notFound()
```

---

## Invoices

### `/billing/invoices` - List

**File:** `src/app/(admin)/billing/invoices/page.tsx`

Same structure as quotes list with invoice-specific columns and stats.

**Stats row (4 cards)**

| Stat | Icon | Description |
|---|---|---|
| Total Invoices | FileText | All time count |
| Pending | Clock | Awaiting payment |
| Paid | CheckCircle | This month |
| Overdue | AlertCircle | Past due date |

**Table columns**

| Column | Notes |
|---|---|
| Invoice # | Monospace, links to `/billing/invoices/{id}` |
| Client | `clientName ?? '-'` |
| Issue Date | `invoiceDate` |
| Due Date | `dueDate ?? '-'` |
| Amount | `formatZAR(total)`, right-aligned |
| Status | `BillingStatusBadge` |
| Actions | Dropdown: View, Issue (if draft), Mark Paid (if issued/overdue), Void |

`SetPageTotal` uses `result.outstanding` (unpaid total), variant `'amber'`.

Includes `Preview mock invoice →` dev link (remove before production).

---

### `/billing/invoices/new` - Create

**File:** `src/app/(admin)/billing/invoices/new/page.tsx`

Same two-column layout as quote form with these differences:

**Invoice Details card fields:** Client (select, **required**), Invoice # (auto-generated), Issue Date, Due Date (default +30 days), PO Number (optional)

**Line Items:** All line items must be selected from the pre-saved items catalogue via the item combobox - same constraint as quotes.

**Period lock warning:** If `invoiceDate` falls in a grace-period or locked month, show an amber banner:
```
⚠ This invoice date may fall in a restricted financial period. Marking as paid may be blocked.
```

**Sidebar (`sticky top-6`):** Summary card with Subtotal, Discount (optional - same % or R toggle as quotes), VAT toggle (default **off**), Total. Save Invoice button + Save as Draft button. Status card reads "Invoice will be saved as **Draft** until sent."

**On submit:** call `createInvoice(data)` → redirect to `/billing/invoices/{id}`

---

### `/billing/invoices/[id]` - Detail

**File:** `src/app/(admin)/billing/invoices/[id]/page.tsx`

**Header actions:**
- Print - disabled (v2: PDF)
- Send - disabled (v2: email)
- **Export as PDF** - disabled (v2: PDF generation)
- More (MoreHorizontal) - disabled

**Edit invoice:** An "Edit" button is shown in the header **only when the invoice has not been paid** (status is `draft`, `issued`, or `overdue`). Once status is `paid` or `void`, the Edit button is hidden entirely - paid invoices cannot be edited or deleted.

**Main content (left):** `DocumentPreview type="invoice"` - same as quote preview but shows banking details prominently and payment reference instructions.

**Sidebar (right, `sticky top-6`):**
- **Summary card** - Subtotal, Discount (if set, shown as negative), VAT (only if `vatEnabled` is true), Total
- **Activity card** - timeline (mock in shell, real in v2)

**Action bar by status:**

| Status | Actions |
|---|---|
| `draft` | Issue Invoice, Void |
| `issued` | **Mark Paid** (MarkPaidButton - disabled if no client), Void |
| `paid` | "Paid on {paidAt}. Revenue posted to income." + "View in Income →" link. **No edit, no delete.** |
| `overdue` | Mark Paid, Void. Amber banner: "⚠ This invoice is overdue." |
| `void` | "This invoice has been voided." (no actions) |

**Critical: Mark Paid flow**

`MarkPaidButton` must be disabled with a tooltip if `invoice.clientId` is null - the `income` table requires a non-null `clientId`. Confirm dialog message: _"Mark this invoice as paid? This will post the revenue to the income ledger and cannot be undone."_

On success: posts a row to `income` table → `revalidatePath('/income')` + `revalidatePath('/dashboard')`.

**Linked quote:** If `quotationId` is set, show "From Quote: {quotationNumber}" as a link to `/billing/quotes/{quotationId}`.

---

## Statements

### `/billing/statements` - List

**File:** `src/app/(admin)/billing/statements/page.tsx`

Lists all clients who have at least one quotation or invoice. Stats and table are populated from `getClientsWithBillingActivity()`.

**Stats row (4 cards)**

| Stat | Icon | Description |
|---|---|---|
| Active Clients | Users | With billing activity |
| Total Billed | TrendingUp | All time |
| Statements | FileText | Generated |
| Last Generated | Calendar | Most recent |

**Table columns**

| Column | Notes |
|---|---|
| Client | `businessName ?? name` |
| Total Invoiced | Sum of all invoice totals |
| Total Paid | Sum of paid invoice totals |
| Outstanding | Total invoiced − total paid. `text-red-500` if > 0 |
| Last Activity | Most recent quote or invoice date |
| View | Link → `/billing/statements/{clientId}` |

Includes `Preview mock statement →` dev link (remove before production). "Generate Statement" button is currently disabled.

---

### `/billing/statements/[clientId]` - Client Statement Detail

**File:** `src/app/(admin)/billing/statements/[clientId]/page.tsx`

**Header actions:**
- Print - disabled (v2)
- Export PDF - disabled (v2)

**Summary cards (3-up row):**

| Card | Source |
|---|---|
| Total Invoiced | Sum of all invoice totals for this client |
| Total Paid | Sum of paid invoices |
| Balance Due | Outstanding = invoiced − paid |

**Two-column layout (lg:grid-cols-3):**

**Main content (left) - `DocumentPreview type="statement"`:**

The statement document renders a transaction history table:

| Column | Description |
|---|---|
| Date | Transaction date |
| Reference | Invoice # or payment reference |
| Description | What the entry is for |
| Debit | Amount charged (invoice issued) |
| Credit | Amount received (payment recorded) |
| Balance | Running balance |

In v1 this table is built from: all `invoices` for this client (each `issued` invoice = a debit row) + all `income` records for this client (each income row = a credit row). Sort by date ascending to compute running balance correctly.

**Sidebar (right):**
- **Client Info card** - Name, Email, Phone, Address
- **Statement Period card** - From / To date range. "Change Period" button (disabled in v1, active in v2 with date pickers)

**Data to fetch:**
```typescript
const [statement, allIncome] = await Promise.all([
  getClientStatement(clientId, { year }),
  getAllIncome({ clientId }),   // existing function - reused as-is
])
if (!statement.client) notFound()
```

**Summary strip** (same card style as `/accounts/[account]`):
- Total Quoted - sum of all quote totals
- Total Invoiced - sum of invoice totals
- Total Paid - sum of paid invoice totals
- Outstanding - `text-red-500` if > 0, `text-green-500` if 0
- Conversion Rate - `accepted / sent quotes` as percentage

---

## Document Preview Component

**File:** `src/components/billing/document-preview.tsx`

Shared across quotes, invoices, and statements. Props:

```typescript
interface DocumentPreviewProps {
  type: 'quote' | 'invoice' | 'statement'
  number: string
  status: string
  issueDate: string
  dueDate?: string
  periodFrom?: string      // statement only
  periodTo?: string        // statement only
  reference?: string       // quote only - client's own reference
  org: OrgDetails
  client: ClientDetails
  lineItems?: LineItem[]   // quote + invoice
  transactions?: Transaction[]  // statement
  notes?: string
  terms?: string           // quote only
  banking?: BankingDetails // invoice + statement
  vatEnabled?: boolean     // quote + invoice - default false
  vatRate?: number         // only used when vatEnabled is true, default 15
  discountType?: 'percent' | 'amount'
  discountValue?: number
  href?: string
}
```

**Type variants:**
- `quote` - shows line items, totals, terms, no banking
- `invoice` - shows line items, totals, notes, banking details
- `statement` - shows transaction history table (debit / credit / balance), no line items

---

## Document Lifecycle

```
Quote (draft)
  → Quote (sent)
    → Quote (accepted)
      → [Convert to Invoice] → Invoice (draft)
    → Quote (declined)      [terminal]
    → Quote (expired)       [terminal - auto, past expiry]
  → Quote (cancelled)       [terminal]
  → Quote (converted)       [terminal - set when invoice created]

Invoice (draft)
  → Invoice (issued)
    → Invoice (paid)        [terminal - posts to income table]
    → Invoice (overdue)     [auto - past due date + not paid]
    → Invoice (void)        [terminal]
  → Invoice (void)          [terminal]
```

---

## Document Numbering

Format: `{DIVISION_PREFIX}-{TYPE}-{YEAR}-{SEQ}`

Prefix derived from division name - first 3 uppercase alpha chars:
- "Apex Web Solutions" → `APX`
- "TenderEdge Solutions" → `TES`
- "PMG Services" → `PMG`

Examples: `APX-Q-2026-001`, `TES-INV-2026-007`

Sequence is per-division, per-type, resets each calendar year. Assigned atomically in a Postgres transaction using `SELECT ... FOR UPDATE` on `document_sequences` table. Number is shown as read-only "Auto-generated" in the create form.

---

## Implementation Notes

- **All billing detail pages** use the `DocumentPreview` component for the main content area - do not build separate line item tables inline in the page.
- **All create forms** use controlled React state (not FormData) because line items are nested arrays.
- **Client is required** on both quotes and invoices - the form must not submit without a client selected. Show an inline validation error on the Client field.
- **All line items must come from the pre-saved items catalogue.** The `BillingLineItemsForm` combobox must only allow selecting from `getActiveItems()`. Free-form one-off text entries are not permitted.
- **VAT is off by default.** The owner is not VAT registered. The Summary sidebar shows a `Switch` labelled "Include VAT (15%)". When toggled on, VAT is calculated at 15% of (subtotal − discount). The `vatEnabled` boolean is stored on the document.
- **Discount field** in the Summary sidebar accepts either a percentage or a fixed ZAR amount (toggle between `%` and `R`). Applied after subtotal, before VAT. Stored as `discountType` and `discountValue` on the document.
- **Reference field** on quotes - a free-text input in the Quote Details card for the client's own reference number (e.g. their PO or job number). Stored as `reference` on the quotation.
- **Summary sidebar is sticky** (`sticky top-6`) on both create and detail pages.
- **Edit quote:** available for `draft` and `sent` statuses only. Terminal statuses (`accepted`, `converted`, `declined`, `cancelled`, `expired`) cannot be edited.
- **Edit invoice:** available only when status is `draft`, `issued`, or `overdue`. Once `paid`, the invoice cannot be edited or deleted - the Edit button is hidden and the Delete action is removed from the actions dropdown.
- **Export as PDF** button is shown in the header of quote and invoice detail pages (disabled in v1, wired in v2).
- **Convert to Invoice** button on the quote detail page is the only way to create a linked invoice. The standalone "New Invoice" form creates unlinked invoices.
- **Mark Paid** inserts into the existing `income` table (not a new table). The `income.clientId` column is `NOT NULL` - always check before enabling the button.
- **Period lock** gates both create and mark-paid actions via `isPeriodClosed(date)` from `lib/date-rules.ts`.
- **`created_by`** is `text` matching `user.id` in the auth schema - not `uuid`.
- **`updatedAt`** is application-managed - set explicitly in `.set({ updatedAt: new Date() })`.
- **Banking details and logo** on generated documents come from the division's billing settings at `/settings/billing`.
- **Dev preview links** (`Preview mock quote →`, `Preview mock invoice →`, `Preview mock statement →`) are in the current shells - remove before production.
- **Activity card** in the detail sidebar uses mock data in v1 - wire to a real audit log table in v2.


---

## Part 3: Billing Implementation Details (V2)

# PMG Control Hub - Billing Update Spec
## Precise Changes Based on Actual Codebase

**Date:** May 2026  
**Based on:** Actual files reviewed - `billing.ts` schema, `billing/queries.ts`, all page and component files  
**Approach:** Surgical patches only - do not rewrite working files

---

## What Is Already Done (Do Not Touch)

Reading the actual code, these are already working correctly:

- ✅ Schema: `quotations`, `invoices`, `billing_line_items`, `billing_items`, `document_sequences` - all exist and are correct
- ✅ `getAllQuotations`, `getAllInvoices`, `getQuotationById`, `getInvoiceById`, `getClientStatement`, `getClientsWithBillingActivity`, `getAllItems`, `getItemById` - all working
- ✅ Quote list, invoice list, statement list, statement detail - all wired with real data
- ✅ Quote detail page - real data, action bar, `ConvertToInvoiceButton`
- ✅ Invoice detail page - real data, `InvoiceDetailActions`, mark paid flow
- ✅ Items list, item detail edit, new item form - working
- ✅ `BillingStatusBadge`, `BillingTotalsBlock`, `ConvertToInvoiceButton`, `MarkPaidButton`, `VoidInvoiceButton` - working

---

## Changes Required

### Change 1 - Client Is Required on Quotes and Invoices

**Problem:** Both forms currently allow "No client" via `<SelectItem value="none">No client</SelectItem>` and pass `null` to the server action. The server actions also accept `null`.

**Files to patch:**

#### `apps/admin/src/app/(admin)/billing/quotes/new/quote-form-client.tsx`

1. Remove `<SelectItem value="none">No client</SelectItem>` from the client select
2. Change initial state: `const [clientId, setClientId] = useState('')`
3. Add client validation in `handleSubmit`:
```typescript
if (!clientId) {
  setError('A client is required.');
  return;
}
```
4. Change the `createQuotation` call: `clientId: clientId` (remove the `=== 'none'` check)
5. Change client select placeholder to `"Select a client… *"` and add `<span className="text-destructive">*</span>` to the label

#### `apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx`

Same four changes as above - same file structure.

1. Remove `<SelectItem value="none">No client</SelectItem>`
2. Change initial state: `const [clientId, setClientId] = useState('')`
3. Add validation: `if (!clientId) { setError('A client is required.'); return; }`
4. Change the `createInvoice` call: `clientId: clientId`
5. Update label

#### `apps/admin/src/app/actions/billing-quotes.ts`

In `createQuotation`, change `clientId` validation in the Zod schema or guard:
```typescript
if (!data.clientId) {
  return { error: 'A client is required.' };
}
```
This is the server-side guard - do not rely on frontend only.

#### `apps/admin/src/app/actions/billing-invoices.ts`

Same server-side guard in `createInvoice`.

---

### Change 2 - Line Items Must Come From Saved Items

**Problem:** `BillingLineItemsForm` currently renders a plain `Input` for description where users can type anything. Need to replace with a strict item combobox.

**What needs to happen:**
- When a user adds a line item, they must select from `billing_items` where `status = 'active'`
- Selecting an item pre-fills description and unitPrice
- They can still edit quantity and unit price after selection
- If no active items exist, show a message with a link to create one

**Files to patch:**

#### `packages/db/src/queries/billing.ts`

Add this function at the bottom:
```typescript
/**
 * Returns active billing items for use in line item selectors.
 * Only active items are returned - archived items cannot be selected.
 */
export async function getActiveItems(): Promise<
  { id: string; name: string; description: string | null; unitPrice: string; unitLabel: string | null }[]
> {
  return db
    .select({
      id: billingItems.id,
      name: billingItems.name,
      description: billingItems.description,
      unitPrice: billingItems.unitPrice,
      unitLabel: billingItems.unitLabel,
    })
    .from(billingItems)
    .where(eq(billingItems.status, 'active'))
    .orderBy(asc(billingItems.name));
}
```

Export from `packages/db/src/index.ts`:
```typescript
export { getActiveItems } from './queries/billing';
```

#### `packages/db/src/index.ts`

Ensure this export exists (add if missing):
```typescript
export { getActiveItems } from './queries/billing';
export type { BillingItemRow, BillingItemDetail } from './queries/billing';
```

#### `apps/admin/src/app/(admin)/billing/quotes/new/page.tsx`

Add `getActiveItems` to the parallel fetch:
```typescript
import { getAllDivisions, getAllClients, getActiveItems } from '@pmg/db';

const [divisions, clients, activeItems] = await Promise.all([
  getAllDivisions(),
  getAllClients(),
  getActiveItems(),
]);
```
Pass `activeItems` to `<QuoteFormClient>`.

#### `apps/admin/src/app/(admin)/billing/invoices/new/page.tsx`

Same change - add `getActiveItems` and pass to `<InvoiceFormClient>`.

#### `apps/admin/src/components/billing/billing-line-items-form.tsx`

**This is the main component change.**

Add `activeItems` prop and replace the description `Input` with an item selector:

```typescript
// Add to props interface
interface BillingLineItemsFormProps {
  value: LineItemFormRow[];
  onChange: (rows: LineItemFormRow[]) => void;
  activeItems: { id: string; name: string; description: string | null; unitPrice: string; unitLabel: string | null }[];
}
```

Replace the description input cell with a `Select` component:
```typescript
// Replace the description Input with:
<Select
  value={row.itemId ?? ''}
  onValueChange={(itemId) => {
    const item = activeItems.find((i) => i.id === itemId);
    if (!item) return;
    const updated = value.map((r) =>
      r.id === row.id
        ? {
            ...r,
            itemId: item.id,
            description: item.description ?? item.name,
            unitPrice: item.unitPrice,
          }
        : r,
    );
    onChange(updated);
  }}
>
  <SelectTrigger className="min-w-[200px]">
    <SelectValue placeholder="Select an item…" />
  </SelectTrigger>
  <SelectContent>
    {activeItems.map((item) => (
      <SelectItem key={item.id} value={item.id}>
        {item.name}
        {item.unitLabel ? ` / ${item.unitLabel}` : ''}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

Add `itemId` to `LineItemFormRow` type:
```typescript
export type LineItemFormRow = {
  id: string;
  itemId?: string;        // ← add this
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: '0' | '15';
};
```

If `activeItems` is empty, show:
```typescript
{activeItems.length === 0 && (
  <p className="text-sm text-muted-foreground py-4">
    No active items found.{' '}
    <a href="/billing/items/new" className="underline hover:text-foreground">
      Create an item
    </a>{' '}
    before adding line items.
  </p>
)}
```

Update `QuoteFormClient` and `InvoiceFormClient` to pass `activeItems` to `BillingLineItemsForm`.

**Validation update in both form clients** - remove the description check and add item check:
```typescript
// Replace:
if (lineItems.some((r) => !r.description.trim())) {
// With:
if (lineItems.some((r) => !r.itemId)) {
  setError('All line items must have an item selected.');
  return;
}
```

---

### Change 3 - Remove Inline VAT, Add Document-Level VAT Toggle to Sidebar

**Problem:** Currently `vatRate` is set per row ('0' or '15'). Need to remove per-row VAT and replace with a single sidebar toggle. Default is OFF (not VAT registered).

**Schema note:** No migration needed. The `vat_rate` column stays but will always be stored as `'0'`. VAT is calculated at document level.

**Files to patch:**

#### `apps/admin/src/components/billing/billing-line-items-form.tsx`

Remove the VAT rate select column entirely from the table. Remove `vatRate` from `LineItemFormRow` type (or keep it but don't render it - removing is cleaner):

```typescript
// Remove from LineItemFormRow:
vatRate: '0' | '15';

// Remove this column header:
<TableHead>VAT</TableHead>

// Remove the vatRate Select from each row
```

When passing line items to server actions, always set `vatRate: 0`.

#### `apps/admin/src/components/billing/billing-totals-block.tsx`

Add `vatEnabled` prop and conditional VAT row:

```typescript
interface BillingTotalsBlockProps {
  subtotal: number;
  vatAmount: number;
  total: number;
  vatEnabled?: boolean;   // ← add
  discountAmount?: number; // ← add (for Change 5)
}

// In render - show VAT row only when vatEnabled:
{vatEnabled && vatAmount > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">VAT (15%)</span>
    <span className="tabular-nums">{formatZAR(vatAmount)}</span>
  </div>
)}
```

When `vatEnabled` is false (or undefined), VAT row is hidden and `total = subtotal`.

#### `apps/admin/src/app/(admin)/billing/quotes/new/quote-form-client.tsx`

1. Add state: `const [vatEnabled, setVatEnabled] = useState(false)`
2. Update `calcTotals` function to accept and use `vatEnabled`:
```typescript
function calcTotals(lineItems: LineItemFormRow[], vatEnabled: boolean) {
  let subtotal = 0;
  for (const item of lineItems) {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    subtotal += qty * price;
  }
  const vatAmount = vatEnabled ? subtotal * 0.15 : 0;
  return { subtotal, vatAmount, total: subtotal + vatAmount };
}
```
3. Update call: `const totals = calcTotals(lineItems, vatEnabled)`
4. Add VAT toggle to the sidebar card, **above** the totals:
```tsx
<div className="flex items-center justify-between py-1">
  <span className="text-sm">VAT (15%)</span>
  <button
    type="button"
    role="switch"
    aria-checked={vatEnabled}
    onClick={() => setVatEnabled((v) => !v)}
    className={`relative h-5 w-9 rounded-full transition-colors ${
      vatEnabled ? 'bg-primary' : 'bg-input'
    }`}
  >
    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
      vatEnabled ? 'translate-x-4' : 'translate-x-0.5'
    }`} />
  </button>
</div>
```
5. Pass `vatEnabled` to `BillingTotalsBlock`
6. Pass `vatEnabled` to `createQuotation` call - the action needs to store `vatAmount` and `total` correctly

#### `apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx`

Same changes as above.

#### `apps/admin/src/app/actions/billing-quotes.ts` - `createQuotation`

Update totals calculation - remove per-item VAT, use document-level:
```typescript
// Accept vatEnabled in input
let subtotal = 0;
for (const item of parsed.lineItems) {
  subtotal += item.quantity * item.unitPrice;
}
const vatAmount = parsed.vatEnabled ? subtotal * 0.15 : 0;
const total = subtotal + vatAmount;

// Store vatRate as 0 on all line items
lineItems: parsed.lineItems.map((item, i) => ({
  ...
  vatRate: '0',
  lineTotal: String(item.quantity * item.unitPrice),
}))
```

**Schema migration needed** - add `vat_enabled` to both tables:

In `packages/db/src/schema/billing.ts`, add to `quotations` and `invoices`:
```typescript
vatEnabled: boolean('vat_enabled').notNull().default(false),
```

Run: `npx drizzle-kit generate && npx drizzle-kit migrate`

Update `QuotationRow`, `InvoiceRow` types in `packages/db/src/queries/billing.ts` to include `vatEnabled: boolean`.

Update `quotationRowSelect` and `invoiceRowSelect` helper objects to include `vatEnabled: quotations.vatEnabled`.

Update `CreateQuotationSchema` / `CreateInvoiceSchema` in `billing-schema.ts`:
```typescript
vatEnabled: z.boolean().default(false),
```

---

### Change 4 - Sticky Summary Sidebar

**Problem:** The sidebar in the create forms (`QuoteFormClient`, `InvoiceFormClient`) is not sticky. The detail pages already have `lg:sticky lg:top-16` on the sidebar wrapper - those are fine.

**Files to patch:**

#### `apps/admin/src/app/(admin)/billing/quotes/new/quote-form-client.tsx`

Find the sidebar wrapper div:
```tsx
{/* Sidebar summary */}
<div className="flex flex-col gap-4">
```

Change to:
```tsx
<div className="flex flex-col gap-4 lg:sticky lg:top-16 self-start">
```

#### `apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx`

Same change - same sidebar wrapper div.

---

### Change 5 - Discount Field

**Schema migration needed** - add to both `quotations` and `invoices` tables in `packages/db/src/schema/billing.ts`:

```typescript
// Add to quotations AND invoices:
discountType: text('discount_type'),        // 'percent' | 'amount' | null
discountValue: numeric('discount_value', { precision: 12, scale: 2 }),  // nullable
discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
```

Run migration after schema update.

**Files to patch:**

#### `apps/admin/src/app/(admin)/billing/quotes/new/quote-form-client.tsx`

1. Add state:
```typescript
const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
const [discountValue, setDiscountValue] = useState('');
```

2. Update `calcTotals`:
```typescript
function calcTotals(lineItems, vatEnabled, discountType, discountValue) {
  let subtotal = 0;
  for (const item of lineItems) {
    subtotal += (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);
  }
  const discountVal = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'percent'
    ? subtotal * (discountVal / 100)
    : Math.min(discountVal, subtotal);
  const vatBase = subtotal - discountAmount;
  const vatAmount = vatEnabled ? vatBase * 0.15 : 0;
  return { subtotal, discountAmount, vatAmount, total: vatBase + vatAmount };
}
```

3. Add discount section to sidebar, between VAT toggle and BillingTotalsBlock:
```tsx
{/* Discount */}
<div className="flex items-center gap-2">
  <select
    value={discountType}
    onChange={(e) => setDiscountType(e.target.value as 'percent' | 'amount')}
    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
  >
    <option value="percent">%</option>
    <option value="amount">R</option>
  </select>
  <Input
    type="number"
    min="0"
    step="0.01"
    value={discountValue}
    onChange={(e) => setDiscountValue(e.target.value)}
    placeholder="Discount"
    className="h-8"
  />
</div>
```

4. Pass `discountAmount` to `BillingTotalsBlock`:
```tsx
<BillingTotalsBlock
  subtotal={totals.subtotal}
  discountAmount={totals.discountAmount}
  vatEnabled={vatEnabled}
  vatAmount={totals.vatAmount}
  total={totals.total}
/>
```

5. Pass `discountType`, `discountValue`, `discountAmount` to `createQuotation` call.

#### `apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx`

Same changes.

#### `apps/admin/src/components/billing/billing-totals-block.tsx`

Add discount row:
```tsx
{discountAmount > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">Discount</span>
    <span className="tabular-nums text-amber-600">−{formatZAR(discountAmount)}</span>
  </div>
)}
```

Order in the block: Subtotal → Discount → VAT → Total.

#### `apps/admin/src/app/actions/billing-quotes.ts` + `billing-invoices.ts`

Update schema and calculation to store `discountType`, `discountValue`, `discountAmount`.

Validation: `discountAmount` cannot exceed `subtotal`.

#### Update `QuotationRow` / `InvoiceRow` types

Add:
```typescript
discountType: string | null;
discountValue: string | null;
discountAmount: string;
```

Update `quotationRowSelect` and `invoiceRowSelect` to include these fields.

---

### Change 6 - Reference Field on Quotes

**Schema migration needed** - add to `quotations` in `packages/db/src/schema/billing.ts`:
```typescript
reference: text('reference'),  // nullable
```

Run migration.

**Files to patch:**

#### `apps/admin/src/app/(admin)/billing/quotes/new/quote-form-client.tsx`

1. Add state: `const [reference, setReference] = useState('')`
2. Add input field in the quote details grid (place after expiry date, before Quote #):
```tsx
<div className="flex flex-col gap-1.5 sm:col-span-2">
  <label className="text-sm font-medium">Reference</label>
  <Input
    value={reference}
    onChange={(e) => setReference(e.target.value)}
    placeholder="e.g. Project name, PO-1234, Tender Ref 12/2026"
    disabled={isSubmitting}
  />
  <p className="text-xs text-muted-foreground">Optional internal or client reference</p>
</div>
```
3. Pass `reference: reference || null` to `createQuotation` call.

#### `apps/admin/src/app/actions/billing-quotes.ts`

Add `reference` to `CreateQuotationSchema`:
```typescript
reference: z.string().max(200).optional().nullable(),
```
Store in DB insert.

#### `packages/db/src/queries/billing.ts`

Add `reference: quotations.reference` to `quotationRowSelect`.
Add `reference: string | null` to `QuotationRow` type.

#### `apps/admin/src/app/(admin)/billing/quotes/[id]/page.tsx`

Pass `quote.reference` to `DocumentPreview` - the `reference` prop already exists on `DocumentPreviewProps`:
```typescript
const docPreviewProps = {
  ...
  reference: quote.reference ?? undefined,
  ...
}
```

---

### Change 7 - Edit Quotes and Invoices

**New routes needed:**
- `apps/admin/src/app/(admin)/billing/quotes/[id]/edit/page.tsx`
- `apps/admin/src/app/(admin)/billing/invoices/[id]/edit/page.tsx`

**New server actions needed:**
- `updateQuotation(id, data)` in `billing-quotes.ts`
- `updateInvoice(id, data)` in `billing-invoices.ts`

**Edit rules (enforced both in UI and server):**

| Document | Editable when status is |
|---|---|
| Quote | `draft`, `sent`, `accepted` |
| Invoice | `draft`, `issued`, `overdue` |
| Invoice (PAID) | ❌ Cannot edit or delete |
| Invoice (VOID) | ❌ Cannot edit |

#### `apps/admin/src/app/actions/billing-quotes.ts` - add `updateQuotation`

```typescript
export async function updateQuotation(
  id: string,
  data: CreateQuotationInput,
): Promise<{ error?: string }> {
  try {
    const session = await getSessionOrRedirect();
    const existing = await getQuotationById(id);
    if (!existing) return { error: 'Quotation not found.' };
    
    const editableStatuses = ['draft', 'sent', 'accepted'];
    if (!editableStatuses.includes(existing.status)) {
      return { error: 'This quotation can no longer be edited.' };
    }
    
    // ... validate, recalculate totals ...
    
    // Delete existing line items and reinsert
    await db.delete(billingLineItems).where(
      and(eq(billingLineItems.documentType, 'quote'), eq(billingLineItems.documentId, id))
    );
    
    // Update quotation record
    await db.update(quotations).set({
      clientId: data.clientId,
      quoteDate: data.quoteDate,
      expiryDate: data.expiryDate ?? null,
      reference: data.reference ?? null,
      subtotal: String(subtotal),
      discountType: data.discountType ?? null,
      discountValue: data.discountValue ? String(data.discountValue) : null,
      discountAmount: String(discountAmount),
      vatEnabled: data.vatEnabled,
      vatAmount: String(vatAmount),
      total: String(total),
      notes: data.notes ?? null,
      terms: data.terms ?? null,
      updatedAt: new Date(),
    }).where(eq(quotations.id, id));
    
    // Reinsert line items
    await db.insert(billingLineItems).values(/* new line items */);
    
    revalidatePath('/billing/quotes');
    revalidatePath(`/billing/quotes/${id}`);
    return {};
  } catch {
    return { error: 'Failed to save. Please try again.' };
  }
}
```

#### `apps/admin/src/app/actions/billing-invoices.ts` - add `updateInvoice`

```typescript
export async function updateInvoice(
  id: string,
  data: CreateInvoiceInput,
): Promise<{ error?: string }> {
  // Guard: block if paid or void
  const existing = await getInvoiceById(id);
  if (!existing) return { error: 'Invoice not found.' };
  
  const lockedStatuses = ['paid', 'void'];
  if (lockedStatuses.includes(existing.status)) {
    return { error: 'Paid or voided invoices cannot be edited.' };
  }
  
  // ... same pattern as updateQuotation ...
}
```

#### `apps/admin/src/app/(admin)/billing/quotes/[id]/edit/page.tsx`

```typescript
import { getQuotationById, getAllDivisions, getAllClients, getActiveItems } from '@pmg/db';
// Fetch the existing quote, pass data to QuoteFormClient (edit mode)
// QuoteFormClient needs an `initialData` prop to pre-populate all fields
// On submit: calls updateQuotation(id, data) instead of createQuotation
```

The edit page reuses `QuoteFormClient` with an `initialData` prop. Refactor `QuoteFormClient` to accept:
```typescript
interface QuoteFormClientProps {
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  activeItems: ActiveItem[];
  initialData?: QuotationDetail;  // ← add
  editId?: string;                // ← add (if present, calls updateQuotation)
}
```

When `initialData` is provided, initialize all state from it instead of blank values.
When `editId` is provided, call `updateQuotation(editId, data)` on submit instead of `createQuotation`.

#### `apps/admin/src/app/(admin)/billing/invoices/[id]/edit/page.tsx`

Same pattern using `InvoiceFormClient` with `initialData` and `editId`.

#### `apps/admin/src/app/(admin)/billing/quotes/[id]/page.tsx`

Add Edit button to the header action bar. Show only when status is `draft`, `sent`, or `accepted`:
```tsx
{['draft', 'sent', 'accepted'].includes(quote.status) && (
  <Button variant="outline" size="sm" asChild>
    <Link href={`/billing/quotes/${quote.id}/edit`}>
      <Pencil className="size-4" />
      Edit
    </Link>
  </Button>
)}
```

#### `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx`

Add Edit button. Show only when status is NOT `paid` or `void`:
```tsx
{!['paid', 'void'].includes(invoice.status) && (
  <Button variant="outline" size="sm" asChild>
    <Link href={`/billing/invoices/${invoice.id}/edit`}>
      <Pencil className="size-4" />
      Edit
    </Link>
  </Button>
)}
```

Also add message when paid:
```tsx
{invoice.status === 'paid' && (
  <p className="text-xs text-muted-foreground">Paid invoices cannot be modified.</p>
)}
```

---

### Change 8 - Export as PDF

**This is the largest change. Break it into two sub-steps.**

#### Sub-step 8A - Install and scaffold

```bash
npm install @react-pdf/renderer
```

Create `packages/documents/` as a new package (or add directly to `apps/admin` if you want to keep it simple for now):

**Simpler approach - add directly to `apps/admin`:**

```
apps/admin/src/lib/pdf/
  quote-pdf.tsx       ← @react-pdf/renderer component
  invoice-pdf.tsx     ← @react-pdf/renderer component
  generate-pdf.ts     ← server utility
```

#### Sub-step 8B - Route handler

Create `apps/admin/src/app/api/billing/pdf/[type]/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getQuotationById, getInvoiceById } from '@pmg/db';
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotePDF } from '@/lib/pdf/quote-pdf';
import { InvoicePDF } from '@/lib/pdf/invoice-pdf';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type, id } = await params;

  if (type === 'quote') {
    const quote = await getQuotationById(id);
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const buffer = await renderToBuffer(<QuotePDF quote={quote} />);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.documentNumber}.pdf"`,
      },
    });
  }

  if (type === 'invoice') {
    const invoice = await getInvoiceById(id);
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const buffer = await renderToBuffer(<InvoicePDF invoice={invoice} />);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.documentNumber}.pdf"`,
      },
    });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
```

#### Sub-step 8C - Wire the button

In `apps/admin/src/app/(admin)/billing/quotes/[id]/page.tsx`, replace the disabled Print button:
```tsx
// Replace:
<Button variant="outline" size="sm" disabled>
  <Printer className="size-4" />
  Print
</Button>

// With:
<Button variant="outline" size="sm" asChild>
  <a href={`/api/billing/pdf/quote/${quote.id}`} download={`${quote.documentNumber}.pdf`}>
    <Printer className="size-4" />
    Export PDF
  </a>
</Button>
```

Same in `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx` - replace disabled Print button with:
```tsx
<Button variant="outline" size="sm" asChild>
  <a href={`/api/billing/pdf/invoice/${invoice.id}`} download={`${invoice.documentNumber}.pdf`}>
    <Printer className="size-4" />
    Export PDF
  </a>
</Button>
```

#### Sub-step 8D - PDF template (minimal working version)

Create `apps/admin/src/lib/pdf/quote-pdf.tsx`:

```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { QuotationDetail } from '@pmg/db';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  label: { color: '#64748b', fontSize: 9 },
  table: { marginTop: 16 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderColor: '#f1f5f9' },
  col1: { flex: 4 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  totals: { marginTop: 16, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', gap: 24, marginBottom: 4 },
  bold: { fontWeight: 'bold' },
});

function formatZAR(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function QuotePDF({ quote }: { quote: QuotationDetail }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{quote.divisionName}</Text>
            <Text style={styles.label}>QUOTATION</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.bold}>{quote.documentNumber}</Text>
            <Text style={styles.label}>Date: {quote.quoteDate}</Text>
            {quote.expiryDate && <Text style={styles.label}>Expiry: {quote.expiryDate}</Text>}
          </View>
        </View>

        {/* Client */}
        {quote.clientName && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Bill To</Text>
            <Text>{quote.clientName}</Text>
          </View>
        )}

        {/* Reference */}
        {quote.reference && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Reference</Text>
            <Text>{quote.reference}</Text>
          </View>
        )}

        {/* Line items */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.bold]}>Description</Text>
            <Text style={[styles.col2, styles.bold]}>Qty</Text>
            <Text style={[styles.col3, styles.bold]}>Unit Price</Text>
            <Text style={[styles.col4, styles.bold]}>Amount</Text>
          </View>
          {quote.lineItems.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.col1}>{item.description}</Text>
              <Text style={styles.col2}>{Number(item.quantity)}</Text>
              <Text style={styles.col3}>{formatZAR(Number(item.unitPrice))}</Text>
              <Text style={styles.col4}>{formatZAR(Number(item.lineTotal))}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.label}>Subtotal</Text>
            <Text>{formatZAR(Number(quote.subtotal))}</Text>
          </View>
          {Number(quote.discountAmount ?? 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.label}>Discount</Text>
              <Text>−{formatZAR(Number(quote.discountAmount))}</Text>
            </View>
          )}
          {Number(quote.vatAmount) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.label}>VAT (15%)</Text>
              <Text>{formatZAR(Number(quote.vatAmount))}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 4 }]}>
            <Text style={styles.bold}>Total</Text>
            <Text style={styles.bold}>{formatZAR(Number(quote.total))}</Text>
          </View>
        </View>

        {/* Notes */}
        {quote.notes && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.label, { marginBottom: 4 }]}>Notes</Text>
            <Text>{quote.notes}</Text>
          </View>
        )}

        {/* Terms */}
        {quote.terms && (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.label, { marginBottom: 4 }]}>Terms & Conditions</Text>
            <Text>{quote.terms}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
```

Create `apps/admin/src/lib/pdf/invoice-pdf.tsx` - same structure but uses `InvoiceDetail` type, shows PO number, shows "Invoice" instead of "Quotation", includes payment terms and banking details (from settings when available).

---

### Change 9 - Items: Remove VAT Applicable Toggle

**Files to patch:**

#### `apps/admin/src/app/(admin)/billing/items/new/item-form-client.tsx`

Remove the entire VAT toggle button element:
```tsx
// Remove this block entirely:
<button
  type="button"
  role="switch"
  aria-checked={vatApplicable}
  ...
>
  ...VAT Applicable...
</button>
```

Remove `vatApplicable` from state and from the `createItem` call. Keep `vatApplicable: true` as a hardcoded default in the action so existing records are not broken.

#### `apps/admin/src/app/(admin)/billing/items/[id]/item-edit-client.tsx`

Remove the VAT toggle button element. Keep `vatApplicable` in the `updateItem` call as a passthrough of the existing value so it does not change on update.

#### `apps/admin/src/app/(admin)/billing/items/[id]/page.tsx`

The Details sidebar card currently shows no VAT row (confirmed from code review - `formatZAR(Number(item.unitPrice))` is shown with "excl. VAT" label, no VAT row). This is already correct - leave as-is.

---

### Change 10 - Archive = Deactivate, Restore = Activate (Items)

**Current state:** Looking at `item-edit-client.tsx`, `archiveItem` and `unarchiveItem` are called but we need to confirm what they do in the action file.

**Files to patch:**

#### `apps/admin/src/app/actions/billing-items.ts`

Ensure `archiveItem` sets BOTH `status` and any future `isActive` field in sync:

```typescript
export async function archiveItem(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    await db
      .update(billingItems)
      .set({
        status: 'archived',
        // isActive: false  ← add this if/when isActive column is added
        updatedAt: new Date(),
      })
      .where(eq(billingItems.id, id));
    revalidatePath('/billing/items');
    return {};
  } catch {
    return { error: 'Failed to archive item.' };
  }
}

export async function unarchiveItem(id: string): Promise<{ error?: string }> {
  try {
    await getSessionOrRedirect();
    await db
      .update(billingItems)
      .set({
        status: 'active',
        // isActive: true  ← add this if/when isActive column is added
        updatedAt: new Date(),
      })
      .where(eq(billingItems.id, id));
    revalidatePath('/billing/items');
    return {};
  } catch {
    return { error: 'Failed to restore item.' };
  }
}
```

The `billing_items` schema uses `status` as the single source of truth (no separate `isActive` boolean - confirmed from `schema/billing.ts`). Archiving sets `status = 'archived'`. `getActiveItems()` filters `status = 'active'`. This already means archived items cannot appear in the line item selector. No schema change needed.

---

## Migration Summary

Run these in order after schema changes:

```bash
cd packages/db
npx drizzle-kit generate
npx drizzle-kit migrate
```

**Schema changes required:**
1. `quotations` - add `vat_enabled boolean NOT NULL default false`
2. `invoices` - add `vat_enabled boolean NOT NULL default false`
3. `quotations` - add `reference text nullable`
4. `quotations` - add `discount_type text nullable`
5. `quotations` - add `discount_value numeric(12,2) nullable`
6. `quotations` - add `discount_amount numeric(12,2) NOT NULL default '0'`
7. `invoices` - add `discount_type text nullable`
8. `invoices` - add `discount_value numeric(12,2) nullable`
9. `invoices` - add `discount_amount numeric(12,2) NOT NULL default '0'`

All with `default` values so existing rows are not broken.

---

## Apply Order (Prevents Breaking the App)

Apply in this exact order to avoid TypeScript errors and broken imports:

1. **Schema + migration** (adds columns with defaults - existing rows stay valid)
2. **`packages/db/src/queries/billing.ts`** (add `getActiveItems`, update row types and select shapes)
3. **`packages/db/src/index.ts`** (add new export)
4. **`apps/admin/src/app/actions/billing-schema.ts`** (update Zod schemas)
5. **`apps/admin/src/app/actions/billing-items.ts`** (fix archive/unarchive)
6. **`apps/admin/src/app/actions/billing-quotes.ts`** (update createQuotation, add updateQuotation)
7. **`apps/admin/src/app/actions/billing-invoices.ts`** (update createInvoice, add updateInvoice)
8. **`apps/admin/src/components/billing/billing-line-items-form.tsx`** (item selector, remove VAT column)
9. **`apps/admin/src/components/billing/billing-totals-block.tsx`** (add vatEnabled, discountAmount props)
10. **`apps/admin/src/app/(admin)/billing/quotes/new/quote-form-client.tsx`** (client required, items, VAT toggle, discount, reference, sticky sidebar)
11. **`apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx`** (same changes)
12. **New edit routes** (`quotes/[id]/edit/page.tsx`, `invoices/[id]/edit/page.tsx`)
13. **Detail pages** (`quotes/[id]/page.tsx`, `invoices/[id]/page.tsx`) - add Edit button, wire reference, fix PDF button
14. **Items forms** (remove VAT toggle from new and edit forms)
15. **PDF route handler + templates** (install `@react-pdf/renderer`, create route, create templates)

---

*PMG Control Hub - Billing Update Spec - May 2026*
