# PMG Invoicing Module
### Feature Specification — Phase 11 of PMG Control Center

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
automatically branded to the division it belongs to — Apex Web Solutions, Tender
Edge Solutions, PMG, or any future division.

**The core workflow:**

```
Draft Quote → Send to Client → Accepted → Convert to Invoice → Client Pays → Mark Paid
                                ↘ Declined → Archive
```

**What makes this valuable for PMG specifically:**
- Every invoice you issue currently is a manual document (Word/Canva). This replaces that.
- Your clients, divisions, and income are already in the database. Invoices close the loop.
- When an invoice is marked Paid, you can optionally auto-create the corresponding income entry — no double entry.
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
- `clients` and `divisions` tables already exist — no need to rebuild them
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
divisions ──< invoices          (one division, many invoices — brand is determined by division)
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

- `packages/db/src/schema/` — you add new files, touch nothing existing
- `lib/financial.ts` — untouched
- `lib/format.ts` — `formatZAR` is reused directly
- Dashboard — revalidation handles updates automatically
- Existing income/expenses flows — fully independent

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
Quotes and invoices share the same structure — the `type` field differentiates them.

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
    // Line items are CLONED — they are not shared.
    sourceQuoteId:          uuid("source_quote_id"),   // invoice: which quote it came from
    convertedToInvoiceId:   uuid("converted_to_invoice_id"), // quote: which invoice was created

    // Financials (denormalised for fast display — recalculated on every line item save)
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

### Export additions — `packages/db/src/schema/index.ts`

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
**Never trust the client with totals — always recalculate on the server.**

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
for this — use a query that finds the current max and increments it.

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

Division codes — derive from division name:
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
            ↘ overdue  (past due date, not paid — set by cron or manual trigger)
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
| converted / paid / cancelled / archived | none — terminal |

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
// NOT a standard React component — uses PDF-specific primitives only.

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

For the first working version, text only — no images, no logo files.
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

### The `LineItemEditor` — the most complex component

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
Phase 11b. For v1, download PDF and email manually — keeps the scope tight.

**4. Partial payments — do you need them for v1?**
If most of your clients pay in full, skip `invoice_payments` table complexity for v1.
Just add a "Mark as Paid" button that sets `status = 'paid'` and optionally creates
an income entry. Add partial payments in v1.1.

**5. Credit notes — do you need them for v1?**
Probably not. Include the `credit_note` enum value in the schema but don't build the
UI until you actually need to issue one. Scope creep starts with "just in case".

---

## 16. What You Get When This Is Done

A complete invoicing system that lives inside your existing Control Center:

- **Multi-brand invoices** — switch division, letterhead changes automatically
- **Quote-to-invoice pipeline** — no re-entering data
- **PDF download** — branded A4, professional enough to send to a client same day
- **Payment tracking** — know exactly what is outstanding, what is overdue, what is paid
- **Auto income sync** — paid invoices feed your financial dashboard without double entry
- **Client statements** — one-click aged debt report per client for month-end follow-up
- **All data in one place** — clients, divisions, income, invoices — one database, one system

**The realistic win:** you stop creating invoices in Word or Canva, you stop maintaining
a separate spreadsheet of who owes what, and your Control Center becomes the single source
of financial truth for PMG. Given you generated ~R2.1M in the seed data alone, having
proper invoice tracking at that scale is not optional — it is overdue.

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
-- (Generated by drizzle-kit generate — do not write by hand)
```

---

*Last updated: March 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
*"Every rand has a job. Every invoice is a job well done."*
