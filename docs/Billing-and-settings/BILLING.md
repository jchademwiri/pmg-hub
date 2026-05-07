# Billing

The Billing section covers three core document types: **Invoices**, **Quotations**, and **Statements**. All pages live under `/billing` and share the same layout conventions used across the admin app.

---

## Route Map

| Route | Page | Type | Status |
|---|---|---|---|
| `/billing/invoices` | Invoices list | Server | 🔜 Placeholder |
| `/billing/invoices/new` | New invoice form | Server | 🔜 Placeholder |
| `/billing/invoices/[id]` | Invoice detail | Server | 🔜 Placeholder |
| `/billing/quotes` | Quotations list | Server | 🔜 Placeholder |
| `/billing/quotes/new` | New quote form | Server | 🔜 Placeholder |
| `/billing/quotes/[id]` | Quote detail | Server | 🔜 Placeholder |
| `/billing/statements` | Statements list | Server | 🔜 Placeholder |
| `/billing/statements/[clientId]` | Client statement | Server | 🔜 Placeholder |

> All pages are currently structural shells with placeholder data. Forms and tables need to be wired up to real data and server actions.

---

## Invoices

### `/billing/invoices` — List

**File:** `src/app/(admin)/billing/invoices/page.tsx`

The main invoices overview.

**Stats row (4 cards)**
| Stat | Description |
|---|---|
| Total Invoices | All time count |
| Pending | Awaiting payment |
| Paid | Paid this month |
| Overdue | Past due date |

**Table columns**
- Invoice #
- Client
- Issue Date
- Due Date
- Amount
- Status
- Actions (overflow menu)

Shows `EmptyState` with a CTA to `/billing/invoices/new` when no invoices exist.

---

### `/billing/invoices/new` — Create

**File:** `src/app/(admin)/billing/invoices/new/page.tsx`

Two-column layout: 2/3 form + 1/3 sidebar.

**Main form (left)**
- Invoice Details card — Client, Invoice # (auto-generated), Issue Date, Due Date
- Line Items card — dashed empty state + "Add Line Item" button
- Notes card — optional notes or payment instructions

**Sidebar (right)**
- Summary card — Subtotal, VAT (15%), Total, Save Invoice button, Save as Draft button
- Status card — shows "Draft" until sent

---

### `/billing/invoices/[id]` — Detail

**File:** `src/app/(admin)/billing/invoices/[id]/page.tsx`

**URL param:** `id` — the invoice identifier

Two-column layout: 2/3 content + 1/3 sidebar.

**Header actions**
- Print
- Send
- More (overflow menu)

**Main content (left)**
- Invoice Details card — Client, Issue Date, Due Date, Reference (4-up grid)
- Line Items table — Description, Qty, Unit Price, Amount
- Notes card

**Sidebar (right)**
- Summary card — Subtotal, VAT (15%), Total
- Activity card — timeline of actions on this invoice

**Status badge** shown next to the invoice number in the header (e.g. Draft, Sent, Paid, Overdue).

---

## Quotations

### `/billing/quotes` — List

**File:** `src/app/(admin)/billing/quotes/page.tsx`

**Stats row (4 cards)**
| Stat | Description |
|---|---|
| Total Quotes | All time count |
| Pending | Awaiting client response |
| Accepted | Converted to invoice |
| Declined | Not accepted |

**Table columns**
- Quote #
- Client
- Issue Date
- Expiry Date
- Amount
- Status
- Actions

Shows `EmptyState` with a CTA to `/billing/quotes/new` when no quotes exist.

---

### `/billing/quotes/new` — Create

**File:** `src/app/(admin)/billing/quotes/new/page.tsx`

Two-column layout: 2/3 form + 1/3 sidebar.

**Main form (left)**
- Quote Details card — Client, Quote # (auto-generated), Issue Date, Expiry Date
- Line Items card — dashed empty state + "Add Line Item" button
- Terms & Notes card — optional terms, conditions, or client notes

**Sidebar (right)**
- Summary card — Subtotal, VAT (15%), Total, Save Quote button, Save as Draft button
- Status card — shows "Draft" until sent to client

---

### `/billing/quotes/[id]` — Detail

**File:** `src/app/(admin)/billing/quotes/[id]/page.tsx`

**URL param:** `id` — the quote identifier

Two-column layout: 2/3 content + 1/3 sidebar.

**Header actions**
- Print
- Send
- Convert to Invoice
- More (overflow menu)

**Main content (left)**
- Quote Details card — Client, Issue Date, Expiry Date, Reference (4-up grid)
- Line Items table — Description, Qty, Unit Price, Amount
- Terms & Notes card

**Sidebar (right)**
- Summary card — Subtotal, VAT (15%), Total
- Activity card

**Status badge** shown next to the quote number (e.g. Draft, Sent, Accepted, Declined, Expired).

---

## Statements

### `/billing/statements` — List

**File:** `src/app/(admin)/billing/statements/page.tsx`

Statements are generated per client from their invoice history. This page lists all clients with statement data.

**Stats row (4 cards)**
| Stat | Description |
|---|---|
| Active Clients | Clients with statements |
| Total Billed | All time |
| Statements | Generated count |
| Last Generated | Most recent date |

**Table columns**
- Client
- Total Invoiced
- Total Paid
- Outstanding
- Last Activity
- View link

Shows `EmptyState` when no statements exist. Statements are derived from invoices — no invoices means no statements.

---

### `/billing/statements/[clientId]` — Client Statement

**File:** `src/app/(admin)/billing/statements/[clientId]/page.tsx`

**URL param:** `clientId` — the client identifier

**Header actions**
- Print
- Export PDF

**Summary cards (3-up)**
- Total Invoiced
- Total Paid
- Outstanding Balance

Two-column layout: 2/3 transactions + 1/3 sidebar.

**Transaction History table (left)**
| Column | Description |
|---|---|
| Date | Transaction date |
| Reference | Invoice or payment reference |
| Description | What the entry is for |
| Debit | Amount charged |
| Credit | Amount received |
| Balance | Running balance |

**Sidebar (right)**
- Client Info card — Name, Email, Phone, Address
- Statement Period card — From / To date range with "Change Period" button

---

## Document Lifecycle

```
Quote (Draft)
  → Quote (Sent)
    → Quote (Accepted) → Invoice (Draft)
    → Quote (Declined)
    → Quote (Expired)

Invoice (Draft)
  → Invoice (Sent)
    → Invoice (Paid)
    → Invoice (Overdue)
```

Quotes can be converted directly to invoices via the "Convert to Invoice" action on the quote detail page.

---

## Implementation Notes

- **Prefix format** — Invoice and quote numbers follow the division prefix pattern configured in `/settings/billing`. Format: `{DIVISION}-INV-0001` and `{DIVISION}-QTE-0001`.
- **VAT** — Default rate is 15% (ZAR). Configurable per division in `/settings/billing`.
- **Line items** — Each line item has: Description, Quantity, Unit Price, Amount (Qty × Unit Price). VAT is calculated on the subtotal.
- **All pages are server components** — when wiring up real data, fetch in the page and pass down to client components for interactivity (same pattern as `/expenses`, `/clients`, etc.).
- **Form fields** are currently placeholder `div` elements. Replace with `Input`, `Select`, and `DatePicker` components and connect to server actions when implementing.
- **Banking details and logo** on generated documents come from the division's billing settings at `/settings/billing`.
