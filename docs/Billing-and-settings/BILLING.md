# Billing

The Billing section covers four areas: **Quotations**, **Invoices**, **Statements**, and **Items** (service catalogue). All pages live under `/billing` and share the same Card-based layout, two-column document preview pattern, and `DocumentPreview` component established in the shell.

---

## Route Map

| Route | Page | Status |
|---|---|---|
| `/billing/quotes` | Quotations list | 🔜 Shell — wire up data |
| `/billing/quotes/new` | New quote form | 🔜 Shell — wire up form |
| `/billing/quotes/[id]` | Quote detail + actions | 🔜 Shell — wire up data + actions |
| `/billing/invoices` | Invoices list | 🔜 Shell — wire up data |
| `/billing/invoices/new` | New invoice form | 🔜 Shell — wire up form |
| `/billing/invoices/[id]` | Invoice detail + actions | 🔜 Shell — wire up data + actions |
| `/billing/statements` | Statements list | 🔜 Shell — wire up data |
| `/billing/statements/[clientId]` | Client statement | 🔜 Shell — wire up data |
| `/billing/items` | Items catalogue list | 🔜 Shell — wire up data |
| `/billing/items/new` | New item form | 🔜 Shell — wire up form |
| `/billing/items/[id]` | Item detail / edit | 🔜 Shell — wire up data |

---

## Layout & Visual Conventions

All billing detail pages (`[id]`) follow the same two-column layout established in the shell:

```
lg:grid-cols-3
  ├── lg:col-span-2  →  DocumentPreview (main content)
  └── col-span-1     →  Sidebar cards (Summary, Activity, Client Info)
```

The `DocumentPreview` component renders a styled document that looks like the actual printed output. It is shared across quotes, invoices, and statements — `type` prop switches the layout.

Page headers follow the pattern:
```
[Ghost back button] [Separator] [Title + Badge]    [Action buttons]
```

Action buttons in the header (Print, Send, Convert to Invoice, More) are disabled in the shell and wired up when implementing each feature.

---

## Quotations

### `/billing/quotes` — List

**File:** `src/app/(admin)/billing/quotes/page.tsx`

**Stats row (4 cards)**

| Stat | Icon | Description |
|---|---|---|
| Total Quotes | FileText | All time count |
| Pending | Clock | Awaiting client response |
| Accepted | CheckCircle | Converted to invoice |
| Declined | XCircle | Not accepted |

Stats are currently hardcoded to `'—'`. Wire up to `getAllQuotations()` aggregates when implementing.

**Table columns**

| Column | Notes |
|---|---|
| Quote # | Monospace, links to `/billing/quotes/{id}` |
| Client | `clientName ?? '—'` |
| Issue Date | `quoteDate` |
| Expiry Date | `expiryDate ?? '—'` |
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

### `/billing/quotes/new` — Create

**File:** `src/app/(admin)/billing/quotes/new/page.tsx`

Two-column layout: `lg:col-span-2` form + `col-span-1` sidebar.

**Main form (left) — three cards:**

1. **Quote Details card** — Client (select, **required** — cannot save without a client), Quote # (auto-generated, read-only), Reference (optional free-text input for client's own reference number), Issue Date, Expiry Date
2. **Line Items card** — `BillingLineItemsForm` (dynamic rows). All line items must be selected from the pre-saved items catalogue via the item combobox — free-form one-off entries are not permitted. Shell shows dashed placeholder + disabled "+ Add Line Item" button
3. **Terms & Notes card** — textarea for optional terms and client-facing notes

**Sidebar (right) — two cards (sidebar is `sticky top-6`):**

- **Summary card** — Subtotal, Discount (optional — see below), VAT toggle (default **off** — owner is not VAT registered; when toggled on, shows VAT at 15%), Total (live-calculated from line items), Save Quote button, Save as Draft button
- **Status card** — "Quote will be saved as **Draft** until sent to the client."

**Discount field (inside Summary card):**
- Input with a mode toggle: **%** (percentage) or **R** (fixed amount)
- Applied after subtotal, before VAT
- Displayed as a negative line in the summary: `Discount (10%) — R −450.00`
- Stored as `discountType: 'percent' | 'amount'` and `discountValue: number` on the quotation

**VAT toggle (inside Summary card):**
- shadcn `Switch` labelled "Include VAT (15%)"
- Default: **off** (no VAT shown or calculated)
- When on: shows VAT row at 15% of (subtotal − discount)
- Stored as `vatEnabled: boolean` on the quotation

**Client validation:** The form must not allow submission without a client selected. Show an inline error on the Client field if attempted.

**On submit:** call `createQuotation(data)` → redirect to `/billing/quotes/{id}`

**Form state** (controlled React state, not FormData — line items are nested):
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

### `/billing/quotes/[id]` — Detail

**File:** `src/app/(admin)/billing/quotes/[id]/page.tsx`

**Header actions (in order):**
- Print — disabled (v2: PDF)
- Send — disabled (v2: email)
- **Export as PDF** — disabled (v2: PDF generation)
- **Convert to Invoice** — `ConvertToInvoiceButton`, only active when `status === 'accepted'`
- More (MoreHorizontal) — disabled

**Edit quote:** An "Edit" button is shown in the header for all non-terminal statuses (`draft`, `sent`). Clicking navigates to `/billing/quotes/{id}/edit`. Quotes with status `accepted`, `converted`, `declined`, `cancelled`, or `expired` cannot be edited (button hidden or disabled with tooltip).

**Main content (left):** `DocumentPreview type="quote"` — renders the styled quotation document including org details, client details, reference (if set), line items table, discount (if set), totals, terms, and banking details.

**Sidebar (right, `sticky top-6`):**

- **Summary card** — Subtotal, Discount (if set, shown as negative), VAT (only if `vatEnabled` is true), Total (from denormalised fields)
- **Activity card** — Timeline of state changes (e.g. "Quote sent to client", "Quote created"). In shell uses mock data; wire to audit log in v2.

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

### `/billing/invoices` — List

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
| Client | `clientName ?? '—'` |
| Issue Date | `invoiceDate` |
| Due Date | `dueDate ?? '—'` |
| Amount | `formatZAR(total)`, right-aligned |
| Status | `BillingStatusBadge` |
| Actions | Dropdown: View, Issue (if draft), Mark Paid (if issued/overdue), Void |

`SetPageTotal` uses `result.outstanding` (unpaid total), variant `'amber'`.

Includes `Preview mock invoice →` dev link (remove before production).

---

### `/billing/invoices/new` — Create

**File:** `src/app/(admin)/billing/invoices/new/page.tsx`

Same two-column layout as quote form with these differences:

**Invoice Details card fields:** Client (select, **required**), Invoice # (auto-generated), Issue Date, Due Date (default +30 days), PO Number (optional)

**Line Items:** All line items must be selected from the pre-saved items catalogue via the item combobox — same constraint as quotes.

**Period lock warning:** If `invoiceDate` falls in a grace-period or locked month, show an amber banner:
```
⚠ This invoice date may fall in a restricted financial period. Marking as paid may be blocked.
```

**Sidebar (`sticky top-6`):** Summary card with Subtotal, Discount (optional — same % or R toggle as quotes), VAT toggle (default **off**), Total. Save Invoice button + Save as Draft button. Status card reads "Invoice will be saved as **Draft** until sent."

**On submit:** call `createInvoice(data)` → redirect to `/billing/invoices/{id}`

---

### `/billing/invoices/[id]` — Detail

**File:** `src/app/(admin)/billing/invoices/[id]/page.tsx`

**Header actions:**
- Print — disabled (v2: PDF)
- Send — disabled (v2: email)
- **Export as PDF** — disabled (v2: PDF generation)
- More (MoreHorizontal) — disabled

**Edit invoice:** An "Edit" button is shown in the header **only when the invoice has not been paid** (status is `draft`, `issued`, or `overdue`). Once status is `paid` or `void`, the Edit button is hidden entirely — paid invoices cannot be edited or deleted.

**Main content (left):** `DocumentPreview type="invoice"` — same as quote preview but shows banking details prominently and payment reference instructions.

**Sidebar (right, `sticky top-6`):**
- **Summary card** — Subtotal, Discount (if set, shown as negative), VAT (only if `vatEnabled` is true), Total
- **Activity card** — timeline (mock in shell, real in v2)

**Action bar by status:**

| Status | Actions |
|---|---|
| `draft` | Issue Invoice, Void |
| `issued` | **Mark Paid** (MarkPaidButton — disabled if no client), Void |
| `paid` | "Paid on {paidAt}. Revenue posted to income." + "View in Income →" link. **No edit, no delete.** |
| `overdue` | Mark Paid, Void. Amber banner: "⚠ This invoice is overdue." |
| `void` | "This invoice has been voided." (no actions) |

**Critical: Mark Paid flow**

`MarkPaidButton` must be disabled with a tooltip if `invoice.clientId` is null — the `income` table requires a non-null `clientId`. Confirm dialog message: _"Mark this invoice as paid? This will post the revenue to the income ledger and cannot be undone."_

On success: posts a row to `income` table → `revalidatePath('/income')` + `revalidatePath('/dashboard')`.

**Linked quote:** If `quotationId` is set, show "From Quote: {quotationNumber}" as a link to `/billing/quotes/{quotationId}`.

---

## Statements

### `/billing/statements` — List

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

### `/billing/statements/[clientId]` — Client Statement Detail

**File:** `src/app/(admin)/billing/statements/[clientId]/page.tsx`

**Header actions:**
- Print — disabled (v2)
- Export PDF — disabled (v2)

**Summary cards (3-up row):**

| Card | Source |
|---|---|
| Total Invoiced | Sum of all invoice totals for this client |
| Total Paid | Sum of paid invoices |
| Balance Due | Outstanding = invoiced − paid |

**Two-column layout (lg:grid-cols-3):**

**Main content (left) — `DocumentPreview type="statement"`:**

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
- **Client Info card** — Name, Email, Phone, Address
- **Statement Period card** — From / To date range. "Change Period" button (disabled in v1, active in v2 with date pickers)

**Data to fetch:**
```typescript
const [statement, allIncome] = await Promise.all([
  getClientStatement(clientId, { year }),
  getAllIncome({ clientId }),   // existing function — reused as-is
])
if (!statement.client) notFound()
```

**Summary strip** (same card style as `/accounts/[account]`):
- Total Quoted — sum of all quote totals
- Total Invoiced — sum of invoice totals
- Total Paid — sum of paid invoice totals
- Outstanding — `text-red-500` if > 0, `text-green-500` if 0
- Conversion Rate — `accepted / sent quotes` as percentage

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
  reference?: string       // quote only — client's own reference
  org: OrgDetails
  client: ClientDetails
  lineItems?: LineItem[]   // quote + invoice
  transactions?: Transaction[]  // statement
  notes?: string
  terms?: string           // quote only
  banking?: BankingDetails // invoice + statement
  vatEnabled?: boolean     // quote + invoice — default false
  vatRate?: number         // only used when vatEnabled is true, default 15
  discountType?: 'percent' | 'amount'
  discountValue?: number
  href?: string
}
```

**Type variants:**
- `quote` — shows line items, totals, terms, no banking
- `invoice` — shows line items, totals, notes, banking details
- `statement` — shows transaction history table (debit / credit / balance), no line items

---

## Document Lifecycle

```
Quote (draft)
  → Quote (sent)
    → Quote (accepted)
      → [Convert to Invoice] → Invoice (draft)
    → Quote (declined)      [terminal]
    → Quote (expired)       [terminal — auto, past expiry]
  → Quote (cancelled)       [terminal]
  → Quote (converted)       [terminal — set when invoice created]

Invoice (draft)
  → Invoice (issued)
    → Invoice (paid)        [terminal — posts to income table]
    → Invoice (overdue)     [auto — past due date + not paid]
    → Invoice (void)        [terminal]
  → Invoice (void)          [terminal]
```

---

## Document Numbering

Format: `{DIVISION_PREFIX}-{TYPE}-{YEAR}-{SEQ}`

Prefix derived from division name — first 3 uppercase alpha chars:
- "Apex Web Solutions" → `APX`
- "TenderEdge Solutions" → `TES`
- "PMG Services" → `PMG`

Examples: `APX-Q-2026-001`, `TES-INV-2026-007`

Sequence is per-division, per-type, resets each calendar year. Assigned atomically in a Postgres transaction using `SELECT ... FOR UPDATE` on `document_sequences` table. Number is shown as read-only "Auto-generated" in the create form.

---

## Implementation Notes

- **All billing detail pages** use the `DocumentPreview` component for the main content area — do not build separate line item tables inline in the page.
- **All create forms** use controlled React state (not FormData) because line items are nested arrays.
- **Client is required** on both quotes and invoices — the form must not submit without a client selected. Show an inline validation error on the Client field.
- **All line items must come from the pre-saved items catalogue.** The `BillingLineItemsForm` combobox must only allow selecting from `getActiveItems()`. Free-form one-off text entries are not permitted.
- **VAT is off by default.** The owner is not VAT registered. The Summary sidebar shows a `Switch` labelled "Include VAT (15%)". When toggled on, VAT is calculated at 15% of (subtotal − discount). The `vatEnabled` boolean is stored on the document.
- **Discount field** in the Summary sidebar accepts either a percentage or a fixed ZAR amount (toggle between `%` and `R`). Applied after subtotal, before VAT. Stored as `discountType` and `discountValue` on the document.
- **Reference field** on quotes — a free-text input in the Quote Details card for the client's own reference number (e.g. their PO or job number). Stored as `reference` on the quotation.
- **Summary sidebar is sticky** (`sticky top-6`) on both create and detail pages.
- **Edit quote:** available for `draft` and `sent` statuses only. Terminal statuses (`accepted`, `converted`, `declined`, `cancelled`, `expired`) cannot be edited.
- **Edit invoice:** available only when status is `draft`, `issued`, or `overdue`. Once `paid`, the invoice cannot be edited or deleted — the Edit button is hidden and the Delete action is removed from the actions dropdown.
- **Export as PDF** button is shown in the header of quote and invoice detail pages (disabled in v1, wired in v2).
- **Convert to Invoice** button on the quote detail page is the only way to create a linked invoice. The standalone "New Invoice" form creates unlinked invoices.
- **Mark Paid** inserts into the existing `income` table (not a new table). The `income.clientId` column is `NOT NULL` — always check before enabling the button.
- **Period lock** gates both create and mark-paid actions via `isPeriodClosed(date)` from `lib/date-rules.ts`.
- **`created_by`** is `text` matching `user.id` in the auth schema — not `uuid`.
- **`updatedAt`** is application-managed — set explicitly in `.set({ updatedAt: new Date() })`.
- **Banking details and logo** on generated documents come from the division's billing settings at `/settings/billing`.
- **Dev preview links** (`Preview mock quote →`, `Preview mock invoice →`, `Preview mock statement →`) are in the current shells — remove before production.
- **Activity card** in the detail sidebar uses mock data in v1 — wire to a real audit log table in v2.
