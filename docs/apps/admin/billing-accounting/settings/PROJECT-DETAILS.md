# PMG Control Center - Project Details
## Full System Overview

**System:** PMG Control Center (`apps/admin`)  
**Owner:** Jacob C. - Playhouse Media Group  
**Date:** May 2026  
**Stack:** Next.js 16 · TypeScript · Drizzle ORM · Neon PostgreSQL · shadcn/ui · Server Actions · Better Auth

---

## What PMG Control Center Is

PMG Control Center is the internal financial and operational admin for Playhouse Media Group. It tracks revenue, expenses, leads, clients, and internal financial allocations across three business divisions - Apex Web Solutions, TenderEdge Solutions, and PMG Services.

The system is a Next.js 16 monorepo with two workspaces:
- `apps/admin` - the web application
- `packages/db` - shared database schema, queries, and utilities (Drizzle ORM + Neon PostgreSQL)

---

## What Is Already Built and Working

### Core Financial Engine
The foundation of the system is a five-bucket profit allocation model. Every rand of revenue flows through this formula automatically:

```
Revenue − Expenses = Base
Base × 25% → PMG Share (taken off the top, before profit)
Remaining → Profit Pool
  Profit Pool × 35% → Salary
  Profit Pool × 30% → Reinvest
  Profit Pool × 30% → Reserve
  Profit Pool × 5%  → Flex
```

This engine runs on the existing `income` and `expenses` tables. Dashboard metrics, YTD summaries, snapshots, and account balances all derive from these two tables.

### Modules Currently Live

| Module | Route | Status |
|---|---|---|
| Dashboard | `/dashboard` | ✅ Live - charts, metrics, YTD, MoM, division breakdown |
| Income | `/income` | ✅ Live - CRUD, filters, period lock |
| Expenses | `/expenses` | ✅ Live - CRUD, categories, filters, period lock |
| Clients | `/clients` | ✅ Live - CRUD, income history per client |
| Divisions | `/divisions` | ✅ Live - CRUD, revenue/expense stats |
| Leads | `/leads` | ✅ Live - CRUD, status pipeline, filters |
| Accounts | `/accounts` | ✅ Live - per-allocation ledger, withdrawals, running balance |
| Ledger | `/ledger` | ✅ Live - withdrawal history, allocation entries |
| Reports | `/reports` | ✅ Live - charts, CSV export, year filter |
| Snapshots | `/snapshots` | ✅ Live - monthly period lock and close |
| Users | `/settings/users` | ✅ Live - invite, revoke, role management |
| Settings index | `/settings` | ✅ Live - nav grid |

### Infrastructure In Place
- **Period lock system** (`lib/date-rules.ts`) - prevents edits to closed financial months with a grace period
- **Better Auth** - magic link authentication, session management, role-based access (`super_admin`, `admin`, `viewer`)
- **Financial snapshots** - monthly period closing locks figures; auto-close on day 5 if past due
- **Resend** - email sending for user invitations (already wired)
- **`formatZAR`** - currency formatting utility used everywhere

---

## What We Are Adding - Billing Module

The Billing Module adds a quote-to-cash pipeline directly inside the admin. It eliminates manual Word doc quotes and external invoicing tools by building the entire workflow into the system.

### The Three Billing Features

**1. Quotations**

A quotation is a priced proposal sent to a client before work is confirmed. You select a division (which determines the document prefix and branding), pick a client, add line items with quantities, prices, and VAT rates (0% exempt or 15% standard), and the system calculates the totals. A sequential document number is assigned automatically - e.g. `TES-Q-2026-007`.

Quotes move through a lifecycle: Draft → Sent → Accepted / Declined. If accepted, a single button converts it into an invoice, carrying all line items across - nothing needs to be retyped.

**2. Invoices**

Invoices work the same way. Create standalone or convert from an accepted quote. An optional PO number field captures the client's purchase order reference. Each invoice gets its own sequential number - e.g. `APX-INV-2026-003`.

The most important feature: when you mark an invoice as paid, the system automatically inserts a row into the existing `income` table. No manual income entry needed. The allocation engine picks it up immediately - PMG Share, Salary, Reinvest, Reserve, and Flex all update on the dashboard. The income row is linked back to the invoice via `income_id`, creating a permanent audit trail.

**3. Client Statements**

The statement is a financial summary per client. The list view shows every client with billing activity and their outstanding balance at a glance. The detail view shows three sections: all quotations, all invoices, and all income records received - with a summary strip showing Total Quoted, Total Invoiced, Total Paid, Outstanding, and Conversion Rate.

The statement is essentially a client ledger - debits are invoices issued, credits are payments received (income rows).

### Items - Service Catalogue

A reusable catalogue of service line items. Create items once (e.g. "Website Maintenance - R 4,500/month") and select them from a combobox when building quotes and invoices. Selecting an item pre-fills the description, unit price, and VAT rate - all editable per document. Items can also be archived when no longer needed without losing historical data.

### Document Numbering

Every quote and invoice gets a sequential number assigned atomically in the database:

| Division | Quote | Invoice |
|---|---|---|
| Apex Web Solutions | `APX-Q-2026-001` | `APX-INV-2026-001` |
| TenderEdge Solutions | `TES-Q-2026-001` | `TES-INV-2026-001` |
| PMG Services | `PMG-Q-2026-001` | `PMG-INV-2026-001` |

Sequences reset each calendar year and are protected against duplicates using a Postgres row lock.

---

## What We Are Adding - Settings

The Settings section already has a working index page and the Users and Billing settings pages are partially live. Here is what each section covers when complete:

| Section | What It Does |
|---|---|
| **Organisation** | Company name, registration number, VAT number, address, contact details, and logo - shown on all documents |
| **Billing & Invoicing** | Per-division: invoice/quote prefixes, next sequence number, default VAT rate, payment terms, banking details, division logo, default notes and terms |
| **Users** | Invite team members, assign roles (super_admin / admin / viewer), revoke access, manage pending invitations |
| **Localisation** | Timezone (`Africa/Johannesburg` default), date format, financial year start (March default for SA), number format |
| **Email** | Outbound email provider (Resend or SMTP), sender identity (From Name, From Address) - used for invoice delivery and notifications |
| **Notifications** | Toggle alerts for: overdue invoices, invoice paid, quote expiring, quote accepted, monthly snapshot, new lead, user invited |
| **Appearance** | Theme (system / light / dark), display density (comfortable / compact), sidebar behaviour |
| **Security** | Password update, 2FA, active sessions, audit log |
| **Data & Exports** | Download income/expenses/invoices/clients as CSV or JSON; danger zone actions |

---

## New Database Tables

The Billing Module adds five new tables to `packages/db/src/schema/billing.ts`:

| Table | Purpose |
|---|---|
| `document_sequences` | Atomic per-division / per-type / per-year counter for document numbers |
| `quotations` | One row per quotation - stores header fields and denormalised totals |
| `invoices` | One row per invoice - links to quotation (if converted) and income row (when paid) |
| `billing_line_items` | Shared table for quote and invoice line items (polymorphic by `document_type`) |
| `billing_items` | Reusable service catalogue items |

All existing tables (`clients`, `divisions`, `income`, `expenses`) are **reused as-is**. No changes to the existing schema.

---

## Integration Points

### Mark Paid → Income → Dashboard

```
Invoice marked PAID
  ↓
Row inserted into existing income table:
  { date: invoice.invoiceDate, divisionId, clientId, amount: invoice.total,
    description: "APX-INV-2026-003 - Client Name" }
  ↓
income_id stored on invoice → permanent audit link
  ↓
revalidatePath('/income') + revalidatePath('/dashboard')
  ↓
Dashboard, YTD summary, account balances - all update immediately
  ↓
Allocation engine (PMG Share → Salary/Reinvest/Reserve/Flex) picks it up automatically
```

No changes needed to the allocation engine. Billing just feeds it cleanly.

### Period Lock

All billing date inputs go through the same `isPeriodClosed()` gate used by income and expense entries. You cannot create an invoice dated in a locked period, and you cannot mark it paid if the invoice date's period is locked.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |
| UI Components | shadcn/ui |
| Data mutations | Next.js Server Actions |
| Validation | Zod |
| Auth | Better Auth (magic link, session, roles) |
| Email | Resend |
| Currency | ZAR - `formatZAR` utility |
| Styling | Tailwind CSS |
| Monorepo | Turborepo |

---

## Pages Being Added

### Billing

| Route | Purpose |
|---|---|
| `/billing/quotes` | Quotation list - stats, table, filter by division/status |
| `/billing/quotes/new` | Create quotation - dynamic line items, live totals |
| `/billing/quotes/[id]` | Quotation detail - document preview, status actions, convert to invoice |
| `/billing/invoices` | Invoice list - outstanding amount in header, stats, table |
| `/billing/invoices/new` | Create invoice - same as quote form + PO number, period lock warning |
| `/billing/invoices/[id]` | Invoice detail - mark paid, void, linked quote reference |
| `/billing/statements` | All clients with billing activity and outstanding balances |
| `/billing/statements/[clientId]` | Full client statement - quotes, invoices, payments, summary |

### Items

| Route | Purpose |
|---|---|
| `/billing/items` | Service catalogue - all items, archive/active filter |
| `/billing/items/new` | Create item - name, description, unit price, VAT toggle |
| `/billing/items/[id]` | Item detail - edit, archive, usage stats |

### Settings (completing)

| Route | Purpose |
|---|---|
| `/settings/organisation` | Wire up save - company identity and logo |
| `/settings/billing` | Wire up save - division billing defaults and banking details |
| `/settings/localisation` | Build from shell - timezone, date format, financial year |
| `/settings/email` | Build from shell - Resend/SMTP config |
| `/settings/notifications` | Wire toggles - billing and system alerts |

---

## What Is Deliberately Not in v1

| Feature | Reason |
|---|---|
| PDF generation | Needs stable CRUD first - planned for v2 |
| Email sending (invoices/quotes) | Needs PDF first - planned for v2 |
| Partial payments | Requires separate `billing_payments` table - planned for v2 |
| Discount fields | Adds form complexity - planned for v2 |
| Audit log | Placeholder in shell - full table planned for v2 |
| Statement export (CSV/PDF) | View works first, export in v2 |
| Client portal | Separate application |
| Recurring invoices | Requires scheduler |
| Payment gateway | Out of scope for internal admin |
| Multi-currency | ZAR only for now |

---

## Companion Documents

| Document | Contents |
|---|---|
| `BILLING.md` | Billing module spec - routes, pages, components, lifecycle, conventions |
| `ITEMS.md` | Items catalogue spec - routes, pages, schema, queries, combobox behaviour |
| `SETTINGS.md` | Settings spec - all sub-pages, what is live vs shell vs planned |
| `PROJECT-DETAILS.md` | This document - full system overview |
| `PHASED-PLAN.md` | Phase-by-phase development plan with AI Copilot prompts |

---

*PMG Control Center - Project Details - May 2026*
