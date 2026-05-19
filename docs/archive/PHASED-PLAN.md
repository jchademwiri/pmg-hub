# PMG Control Center — Phased Development Plan
## With AI Copilot Prompts

**Date:** May 2026  
**Developer:** Jacob C.  
**AI Copilot:** Claude (Sonnet 4)  
**Estimated Total:** 12–16 working days  
**Reference docs:** `BILLING.md` · `ITEMS.md` · `SETTINGS.md` · `PROJECT-DETAILS.md`

---

## Current State Before We Start

The following shell pages already exist and must be kept — do not regenerate them from scratch:

| File | State |
|---|---|
| `billing/quotes/page.tsx` | Shell with stats cards, empty table, mock preview link |
| `billing/quotes/new/page.tsx` | Shell with layout, placeholder form fields |
| `billing/quotes/[id]/page.tsx` | Shell with `DocumentPreview`, sidebar, mock data |
| `billing/invoices/page.tsx` | Shell with stats cards, empty table |
| `billing/invoices/new/page.tsx` | Shell with layout, placeholder form fields |
| `billing/invoices/[id]/page.tsx` | Shell with `DocumentPreview`, sidebar, mock data |
| `billing/statements/page.tsx` | Shell with stats cards, empty table |
| `billing/statements/[clientId]/page.tsx` | Shell with `DocumentPreview`, summary cards |
| `billing/items/page.tsx` | Shell with stats cards, empty table |
| `billing/items/new/page.tsx` | Shell — single card form with mocked fields |
| `billing/items/[id]/page.tsx` | Shell with two-column layout, mock data |
| `settings/billing/page.tsx` | ✅ Live — fetches `getAllDivisions()` |
| `settings/billing/billing-settings-client.tsx` | ✅ Live — tab switching, `divisionPrefix()` logic |
| `settings/organisation/page.tsx` | Shell — all save buttons disabled |
| `settings/notifications/page.tsx` | Shell — toggle rows are visual mocks |

**Strategy:** Every prompt in this plan asks Claude to patch/extend existing files, not replace them. Always paste the current file content alongside the prompt.

---

## How to Use This Plan

Each step has:
- **What you do** — your action
- **What AI does** — what to hand to Claude
- **Copilot Prompt** — paste this at the start of a new conversation, with the file contents attached
- **Done When** — acceptance criteria before moving on

Always open a fresh conversation per step. Paste the prompt, attach the referenced files.

---

## Phase 0 — Schema, Utilities & Queries
**Duration:** 2–3 days  
**Goal:** Database ready, document sequencing works, all queries typed.

---

### Step 0.1 — Billing Schema

**What you do:** Create `packages/db/src/schema/billing.ts`

#### Copilot Prompt
```
I need you to generate a new Drizzle ORM schema file for PMG Control Center's billing module.

File to create: packages/db/src/schema/billing.ts

My existing schema files for reference — copy their style exactly:
[paste packages/db/src/schema/income.ts]
[paste packages/db/src/schema/expenses.ts]
[paste packages/db/src/schema/clients.ts]

Rules from my codebase:
- uuid PKs with .defaultRandom()
- timestamptz columns use { withTimezone: true }
- updatedAt is nullable, app-managed — NO $onUpdate()
- created_by is text (matches user.id which is text, not uuid)
- Indexes and check constraints follow the pattern in income.ts

Generate these tables:

1. document_sequences
   Columns: id (uuid PK), division_id (uuid FK→divisions RESTRICT),
   document_type (text enum 'quote'|'invoice'), year (integer),
   last_sequence (integer NOT NULL default 0),
   updated_at (timestamptz NOT NULL defaultNow)
   Constraint: UNIQUE(division_id, document_type, year)

2. quotations
   Columns: id (uuid PK), division_id (uuid FK→divisions RESTRICT),
   client_id (uuid nullable FK→clients RESTRICT),
   document_number (text NOT NULL UNIQUE),
   status (pgEnum: draft|sent|accepted|declined|expired|converted|cancelled, default 'draft'),
   quote_date (date NOT NULL), expiry_date (date nullable),
   subtotal (numeric 12,2 default '0'), vat_amount (numeric 12,2 default '0'),
   total (numeric 12,2 default '0'),
   notes (text nullable), terms (text nullable),
   created_by (text NOT NULL), created_at (timestamptz NOT NULL defaultNow),
   updated_at (timestamptz nullable)
   Check: total >= 0
   Indexes: division_id, client_id, status, quote_date

3. invoices
   Same as quotations plus: quotation_id (uuid nullable, no FK in schema — add FK comment),
   invoice_date (date NOT NULL), due_date (date nullable), po_number (text nullable),
   income_id (uuid nullable FK→income SET NULL),
   paid_at (timestamptz nullable)
   Status enum: draft|issued|paid|overdue|void

4. billing_line_items
   Columns: id (uuid PK), document_type (text enum 'quote'|'invoice'),
   document_id (uuid NOT NULL — NO FK, polymorphic — add comment explaining this),
   sort_order (integer NOT NULL default 0), description (text NOT NULL),
   quantity (numeric 10,2 NOT NULL), unit_price (numeric 12,2 NOT NULL),
   vat_rate (numeric 5,2 NOT NULL default '0'), line_total (numeric 12,2 NOT NULL),
   created_at (timestamptz NOT NULL defaultNow)
   Index: (document_type, document_id)
   Checks: quantity > 0, unit_price >= 0

5. billing_items
   Columns: id (uuid PK), name (text NOT NULL), description (text nullable),
   unit_price (numeric 12,2 NOT NULL), unit_label (text nullable),
   vat_applicable (boolean NOT NULL default true),
   status (text enum 'active'|'archived' NOT NULL default 'active'),
   created_at (timestamptz NOT NULL defaultNow), updated_at (timestamptz nullable)
   Indexes: status, name

Generate Drizzle relations for quotations and invoices (division, client, lineItems, income).
Export all TypeScript types ($inferSelect and $inferInsert for all 5 tables).
```

---

### Step 0.2 — Update Schema Index

**What you do:** Add one line to `packages/db/src/schema/index.ts`

```typescript
export * from "./billing";
```

No AI needed.

---

### Step 0.3 — Document Number Utility

**What you do:** Create `packages/db/src/lib/document-numbers.ts`

#### Copilot Prompt
```
Generate a document number utility for PMG Control Center.

File: packages/db/src/lib/document-numbers.ts

My db client pattern (paste packages/db/src/client.ts for reference):
[paste packages/db/src/client.ts]

Function signature:
  getNextDocumentNumber(divisionId: string, type: 'quote' | 'invoice', year: number): Promise<string>

Requirements:
- Run inside a Drizzle transaction using getDb()
- SELECT the matching row from document_sequences with .for('update') to lock it
- If no row: INSERT with last_sequence = 1, use sequence 1
- If row exists: UPDATE last_sequence += 1, use new value
- Derive the prefix: query divisions table for division name, then:
    * Split name on whitespace
    * Take first 3 words, use first uppercase letter of each
    * e.g. "Apex Web Solutions" → "AWS" or first word if already all-caps 2–5 chars
    * BUT the existing billing-settings-client.tsx uses this exact logic:
      if first word is /^[A-Z]{2,5}$/ use it; otherwise take initials of first 3 words
    * Follow that exact same logic for consistency
- Format: {PREFIX}-{TYPE_CODE}-{YEAR}-{SEQ padded to 3 digits}
  type_code: 'quote' → 'Q', 'invoice' → 'INV'
  Examples: APX-Q-2026-001, TES-INV-2026-012

Import documentSequences and divisions from the billing schema.
Export getNextDocumentNumber.
```

---

### Step 0.4 — Billing Query Functions

**What you do:** Create `packages/db/src/queries/billing.ts`

#### Copilot Prompt
```
Generate the billing query file for PMG Control Center.

File: packages/db/src/queries/billing.ts

Follow the exact style of getAllIncome and getAllExpenses in:
[paste packages/db/src/queries.ts — lines 200–350 covering getAllIncome]

Generate these 8 functions with complete TypeScript types:

1. getAllQuotations(filters: { divisionId?, status?, clientId?, month? }, pagination?)
   Returns { data: QuotationRow[], total: number, sum: number }
   JOIN: divisions.name as divisionName
   LEFT JOIN: COALESCE(clients.business_name, clients.name) as clientName
   ORDER: quote_date DESC, created_at DESC

2. getAllInvoices(filters: { divisionId?, status?, clientId?, month? }, pagination?)
   Returns { data: InvoiceRow[], total: number, sum: number, outstanding: number }
   outstanding = SUM(total) WHERE status IN ('issued', 'overdue')
   Also JOIN quotations.document_number as quotationNumber

3. getQuotationById(id: string): Promise<QuotationDetail | null>
   Includes: division, client, lineItems (sorted by sort_order),
   convertedInvoiceId (reverse lookup: SELECT id FROM invoices WHERE quotation_id = $id LIMIT 1)

4. getInvoiceById(id: string): Promise<InvoiceDetail | null>
   Includes: division, client, lineItems, quotationNumber, incomeId, paidAt

5. getClientStatement(clientId: string, filters?: { year?: number }): Promise<ClientStatement>
   Returns: { client, summary: { totalQuoted, totalInvoiced, totalPaid, totalOutstanding,
   quoteCount, invoiceCount, conversionRate }, quotes: QuotationRow[], invoices: InvoiceRow[] }
   conversionRate = accepted_count / sent_count (0 if sent_count = 0)

6. getClientsWithBillingActivity(): Promise<ClientBillingRow[]>
   Clients with at least 1 quotation OR 1 invoice
   Each row: { id, name, businessName, quoteCount, invoiceCount,
               totalInvoiced, totalPaid, totalOutstanding, lastActivityDate }

7. getAllItems(filters?: { status?: 'active' | 'archived' }): Promise<BillingItem[]>
   Default: status = 'active'. Order: name ASC.

8. getItemById(id: string): Promise<BillingItemDetail | null>
   Includes usage counts: usageInvoices (count of line items for this item), usageQuotes

Also export all row types: QuotationRow, InvoiceRow, QuotationDetail, InvoiceDetail,
ClientStatement, ClientBillingRow, LineItemDetail, BillingItemDetail.
```

---

### Step 0.5 — Update DB Index Exports

**What you do:** Add billing exports to `packages/db/src/index.ts`

```typescript
export * from './queries/billing';
export { getNextDocumentNumber } from './lib/document-numbers';
export type { QuotationRow, InvoiceRow, QuotationDetail, InvoiceDetail,
              ClientStatement, ClientBillingRow, BillingItemDetail } from './queries/billing';
```

---

### Step 0.6 — Run Migration

```bash
cd packages/db
npx drizzle-kit generate
npx drizzle-kit migrate
```

**Done When Phase 0 Is Complete:**
- [ ] `billing.ts` schema with 5 tables — no TypeScript errors
- [ ] Migration runs clean — 5 new tables in Neon console
- [ ] `getNextDocumentNumber('division-uuid', 'quote', 2026)` → `APX-Q-2026-001`, second call → `APX-Q-2026-002`
- [ ] `getAllQuotations()` returns typed rows without error
- [ ] All exports visible from `packages/db/src/index.ts`

---

## Phase 1 — Quotations (Wire Up Existing Shell)
**Duration:** 3–4 days  
**Goal:** Quote create form works end-to-end. List shows real data. Detail shows real data with working status actions.

---

### Step 1.1 — Billing Zod Schemas + Quote Actions

#### Copilot Prompt
```
Generate two files for PMG Control Center billing.

Context — follow these existing action files exactly:
[paste apps/admin/src/app/actions/income.ts]
[paste apps/admin/src/app/actions/expenses.ts]

FILE 1: apps/admin/src/app/actions/billing-schema.ts

Export:
- LineItemSchema: { description (string min 1), quantity (coerce.number positive),
  unitPrice (coerce.number min 0), vatRate (coerce.number — must be 0 or 15) }
- CreateQuotationSchema: { divisionId (uuid required), clientId (uuid optional nullable),
  quoteDate (string min 1), expiryDate (string optional nullable),
  notes (string max 2000 optional nullable), terms (string max 2000 optional nullable),
  lineItems: array(LineItemSchema) min 1 }
- CreateInvoiceSchema: same as quotation but invoiceDate, dueDate, plus
  poNumber (string max 100 optional nullable)
- Export types: CreateQuotationInput, CreateInvoiceInput

FILE 2: apps/admin/src/app/actions/billing-quotes.ts

'use server'. Export:

1. createQuotation(data: CreateQuotationInput): Promise<{ error?: string; id?: string }>
   Guards: getSessionOrRedirect(), quoteDate <= today string, isPeriodClosed(quoteDate)
   Calc: subtotal = sum(qty × unitPrice), vatAmount = sum(qty × unitPrice × vatRate/100),
         total = subtotal + vatAmount, lineTotal per item = qty × unitPrice × (1 + vatRate/100)
   Steps: validate → calc → getNextDocumentNumber(divisionId, 'quote', year) →
   db.insert(quotations).returning({ id }) → db.insert(billingLineItems) →
   revalidatePath('/billing/quotes') + revalidatePath('/dashboard')
   Return: { id }

2. updateQuotationStatus(id: string, status: 'sent'|'accepted'|'declined'|'cancelled')
   Guards: getSessionOrRedirect(), load quote, validate allowed transitions:
     draft → sent, cancelled
     sent → accepted, declined, cancelled
     else → { error: 'Invalid status transition.' }
   Steps: db.update set status + updatedAt → revalidatePath both list and [id]

3. deleteQuotation(id: string): Promise<{ error?: string }>
   Guards: getSessionOrRedirect(), status must be 'draft' → else error
   Steps: delete billingLineItems where documentId = id → delete quotations where id
   revalidatePath('/billing/quotes')
```

---

### Step 1.2 — Shared Billing Components

#### Copilot Prompt
```
Generate 5 shared billing components for PMG Control Center.
All use shadcn/ui, Tailwind CSS, TypeScript. Follow existing component patterns.

[paste one existing component for style reference, e.g. apps/admin/src/components/ui/empty-state.tsx]

COMPONENT 1: components/billing/billing-status-badge.tsx
Props: { status: string }
Inline-flex pill, rounded-full px-2 py-0.5 text-xs font-medium, small dot before label.
Colours:
  draft       → bg-muted text-muted-foreground
  sent        → bg-blue-500/15 text-blue-500
  accepted    → bg-green-500/15 text-green-500
  declined    → bg-red-500/15 text-red-500
  expired     → bg-orange-500/15 text-orange-500
  converted   → bg-purple-500/15 text-purple-500
  cancelled   → bg-muted text-muted-foreground
  issued      → bg-blue-500/15 text-blue-500
  paid        → bg-green-500/15 text-green-500
  overdue     → bg-red-500/15 text-red-500
  void        → bg-muted text-muted-foreground
Capitalise status label.

COMPONENT 2: components/billing/billing-line-items-form.tsx
'use client'
Props: { value: LineItemFormRow[]; onChange: (rows: LineItemFormRow[]) => void }
LineItemFormRow = { id: string; description: string; quantity: string; unitPrice: string; vatRate: '0' | '15' }
Table with rows: description (Input flex-grow), quantity (Input w-20),
unitPrice (Input w-28, placeholder "0.00"), vatRate (Select: "Exempt (0%)" | "VAT 15%"),
lineTotal (read-only, text-right, formatZAR), delete button (Trash2 — disabled if 1 row).
"+ Add Line Item" button appends blank row with crypto.randomUUID() id.
Call onChange whenever any field changes.

COMPONENT 3: components/billing/billing-line-items-table.tsx
Props: { lineItems: LineItemDetail[] }
Read-only. shadcn Table.
Columns: # | Description | Qty | Unit Price | VAT | Line Total
VAT column: "15%" or "Exempt". All amounts via formatZAR.

COMPONENT 4: components/billing/billing-totals-block.tsx
Props: { subtotal: number; vatAmount: number; total: number }
Right-aligned block. Three rows: Subtotal / VAT (15%) [hidden if vatAmount=0] / Total (bold).

COMPONENT 5: components/billing/convert-to-invoice-button.tsx
'use client'
Props: { quotationId: string; convertAction: (id: string) => Promise<{ error?: string; id?: string }> }
Uses useRouter for redirect on success.
Uses window.confirm: "Convert this quotation to an invoice? The quote will be marked as converted."
On success: toast.success("Invoice created.") → router.push('/billing/invoices/' + result.id)
On error: toast.error(result.error)
Button label "Convert to Invoice", variant="default", CheckCircle icon.
```

---

### Step 1.3 — Wire Up Quote List Page

#### Copilot Prompt
```
I need to wire up the existing quotations list shell page in PMG Control Center.
DO NOT rewrite the file from scratch — patch it to add real data fetching.

Here is the current shell file:
[paste apps/admin/src/app/(admin)/billing/quotes/page.tsx]

Here is how the income list page works for reference:
[paste apps/admin/src/app/(admin)/income/page.tsx]
[paste apps/admin/src/app/(admin)/income/income-client.tsx]

Changes needed to quotes/page.tsx:
1. Make it async, add export const dynamic = 'force-dynamic'
2. Accept searchParams: Promise<{ divisionId?, status?, page? }>
3. Fetch in parallel: getAllQuotations({ divisionId, status }, { page, pageSize: 20 }),
   getAllDivisions(), getAllClients()
4. Replace the 4 hardcoded '—' stats with real counts from result
5. Add SetPageTotal with result.sum formatted as ZAR, variant 'green'
6. Keep the existing table structure but render real rows from result.data
7. Each row: Doc# (link to /billing/quotes/{id}), clientName, quoteDate, expiryDate,
   formatZAR(total), BillingStatusBadge, actions dropdown (View, Mark Sent, Mark Accepted,
   Mark Declined, Delete — show/hide based on status)
8. Keep the mock preview link for now (remove in Phase 4 polish)
9. Add pagination below table — copy income-client.tsx pagination pattern exactly

Also create apps/admin/src/app/(admin)/billing/quotes/quotes-client.tsx
as the client component that receives: entries, total, sum, currentPage, pageSize,
divisions, clients, divisionId?, status?, deleteAction, updateStatusAction
```

---

### Step 1.4 — Quote Create Form (Client Component)

#### Copilot Prompt
```
Generate the quote create form client component for PMG Control Center.

File: apps/admin/src/app/(admin)/billing/quotes/new/quote-form-client.tsx

The shell new/page.tsx already has the layout structure (two-column, three cards).
I need the client component that makes it functional.

Here is the current shell:
[paste apps/admin/src/app/(admin)/billing/quotes/new/page.tsx]

The page.tsx should become a server component that:
1. Fetches getAllDivisions() and getAllClients()
2. Renders the shell layout (keep as-is) but replaces the placeholder div fields
   with a <QuoteFormClient divisions={divisions} clients={clients} /> client component

The QuoteFormClient must:
- Be 'use client'
- Use controlled React state (NOT FormData — line items are nested)
- State: { divisionId, clientId, quoteDate (default today), expiryDate (default +30 days),
  notes, terms, lineItems: LineItemFormRow[] (start with 1 blank row), isSubmitting, error }
- Replace the "Select a client…" div with a real shadcn Select
- Replace the "Pick a date…" divs with real date inputs (type="date", max=today for quoteDate)
- Replace the dashed line items placeholder with <BillingLineItemsForm />
- Show live totals using <BillingTotalsBlock /> calculated from line items
- Replace the disabled Save Quote and Save as Draft buttons with working buttons
  (both call createQuotation — Draft saves with status 'draft', Save Quote also status 'draft'
   since status advances manually — keep it simple)
- On submit: call createQuotation(data) imported from '@/app/actions/billing-quotes'
- On success: router.push('/billing/quotes/' + result.id)
- On error: show error message above the buttons in text-destructive

Import createQuotation from '@/app/actions/billing-quotes'.
Import BillingLineItemsForm, BillingTotalsBlock from '@/components/billing/'.
```

---

### Step 1.5 — Wire Up Quote Detail Page

#### Copilot Prompt
```
Wire up the quote detail page in PMG Control Center. Patch the existing shell.

Here is the current shell:
[paste apps/admin/src/app/(admin)/billing/quotes/[id]/page.tsx]

Changes needed:
1. Make it async server component with export const dynamic = 'force-dynamic'
2. Fetch: const quote = await getQuotationById(id) — if null, notFound()
3. Replace the MOCK const with real quote data passed to DocumentPreview
4. Replace the hardcoded Badge status with real quote.status via BillingStatusBadge
5. Replace the hardcoded sidebar summary amounts with real quote.subtotal/vatAmount/total
6. Replace mock Activity entries with a placeholder (real audit log in v2) — keep the
   Activity card but show only "Quote created" entry using quote.createdAt
7. Add the action bar BELOW the two-column grid (not inside it):
   - draft:     "Mark Sent" button (calls updateQuotationStatus('sent'))
                "Delete" button (calls deleteQuotation, confirm first)
   - sent:      "Mark Accepted", "Mark Declined", "Cancel" buttons
   - accepted:  <ConvertToInvoiceButton> (wires to convertQuoteToInvoice from billing-invoices actions)
   - converted: show link to the invoice (fetch convertedInvoiceId from getQuotationById result)
   - declined/cancelled/expired: muted text "No further actions available."
8. Keep all header buttons (Print, Send, More) disabled — they stay as shells
9. Keep the "Convert to Invoice" header button — make it functional only when status === 'accepted',
   disabled otherwise (wire to same ConvertToInvoiceButton logic)

All status-change buttons call updateQuotationStatus with toast feedback.
Import actions from '@/app/actions/billing-quotes' and '@/app/actions/billing-invoices'.
```

**Done When Phase 1 Is Complete:**
- [ ] Create a quote with 3 line items (mix of 0% and 15% VAT) — see correct totals
- [ ] Document number auto-assigned on save (`APX-Q-2026-001`)
- [ ] Quote appears in list with correct status badge
- [ ] Draft → Sent → Accepted lifecycle works
- [ ] Decline a sent quote
- [ ] Delete a draft (blocked for sent/accepted)
- [ ] Detail page shows real data, correct action bar per status
- [ ] No TypeScript errors

---

## Phase 2 — Invoices + Mark Paid
**Duration:** 3–4 days  
**Goal:** Full invoice lifecycle. Mark paid posts to income table. Dashboard updates.

---

### Step 2.1 — Invoice Actions

#### Copilot Prompt
```
Generate apps/admin/src/app/actions/billing-invoices.ts for PMG Control Center.

Follow the exact pattern of billing-quotes.ts (which you generated in Phase 1).
[paste apps/admin/src/app/actions/billing-quotes.ts]

Also reference how income is inserted in the existing actions:
[paste apps/admin/src/app/actions/income.ts]

Export:

1. createInvoice(data: CreateInvoiceInput): Promise<{ error?: string; id?: string }>
   Same as createQuotation but uses invoiceDate, dueDate, poNumber.
   document type: 'invoice'.

2. convertQuoteToInvoice(quotationId: string): Promise<{ error?: string; id?: string }>
   Guards: getSessionOrRedirect(), load quote (status must be 'accepted'),
   isPeriodClosed(today's date string)
   Steps:
   - Load quote + its billing_line_items (documentType='quote', documentId=quotationId)
   - getNextDocumentNumber(quote.divisionId, 'invoice', currentYear)
   - db.insert(invoices): copy divisionId, clientId, subtotal, vatAmount, total, notes, terms,
     set quotationId=quote.id, invoiceDate=today, status='draft', createdBy=session.user.id
     returning({ id })
   - db.insert(billingLineItems): copy all quote line items, documentType='invoice', documentId=invoice.id
   - db.update(quotations): status='converted', updatedAt=new Date()
   - revalidatePath: '/billing/invoices', '/billing/quotes', '/billing/quotes/'+quotationId
   Return: { id: invoice.id }

3. issueInvoice(id: string): Promise<{ error?: string }>
   Guard: status must be 'draft'. Set status='issued', updatedAt.

4. markInvoicePaid(id: string): Promise<{ error?: string }>
   Guards:
   - getSessionOrRedirect()
   - status not 'paid' → 'Invoice is already paid.'
   - status not 'void' → 'Cannot mark a voided invoice as paid.'
   - invoice.clientId must not be null → 'A client must be set before marking as paid.'
   - isPeriodClosed(invoice.invoiceDate) → period lock error
   Steps:
   1. Load invoice. Load client (for description).
   2. description = invoice.documentNumber + ' — ' + (client.businessName ?? client.name)
   3. db.insert(income): { date: invoice.invoiceDate, divisionId: invoice.divisionId,
      clientId: invoice.clientId, description, amount: invoice.total }
      .returning({ id })
      THIS IS THE EXISTING income TABLE — not a new table. Import income from '@pmg/db'.
   4. db.update(invoices): { status:'paid', paidAt: new Date(), incomeId: incomeRow.id, updatedAt }
   5. revalidatePath: '/billing/invoices', '/billing/invoices/'+id, '/income', '/dashboard'

5. voidInvoice(id: string): Promise<{ error?: string }>
   Guard: status not 'paid' → 'Cannot void a paid invoice.'
   Set status='void', updatedAt.
```

---

### Step 2.2 — Mark Paid + Void Buttons

#### Copilot Prompt
```
Generate two action button components for PMG Control Center invoices.

COMPONENT 1: apps/admin/src/components/billing/mark-paid-button.tsx
'use client'
Props: { invoiceId: string; hasClient: boolean; markPaidAction: (id: string) => Promise<{ error?: string }> }

If hasClient is false:
  Render a disabled Button. Wrap in a Tooltip showing:
  "Add a client to this invoice before marking as paid."

If hasClient is true:
  Button that on click: window.confirm("Mark this invoice as paid? This will post the revenue
  to the income ledger and cannot be undone.")
  On confirm: await markPaidAction(invoiceId), toast.success or toast.error
  Button label: "Mark Paid", variant="default"
  Show loading state while in flight.

COMPONENT 2: apps/admin/src/components/billing/void-invoice-button.tsx
'use client'  
Props: { invoiceId: string; voidAction: (id: string) => Promise<{ error?: string }> }
window.confirm: "Void this invoice? This cannot be undone."
Button: variant="outline", className includes "text-destructive border-destructive/50"
```

---

### Step 2.3 — Wire Up Invoice List + Form

#### Copilot Prompt
```
Wire up the invoice list page and create form in PMG Control Center.
Patch the existing shell files — do not rewrite from scratch.

Here are the shells:
[paste billing/invoices/page.tsx]
[paste billing/invoices/new/page.tsx]

Follow the same pattern used in Phase 1 for the quote pages (which you already generated).

For invoices/page.tsx:
- SetPageTotal uses result.outstanding (NOT result.sum), variant 'amber'
- Stats: Total Invoices, Pending (issued+overdue), Paid (this month), Overdue
- Table adds: Due Date column, row action "Issue" if draft, "Mark Paid" if issued/overdue

For invoices/new/page.tsx → invoice-form-client.tsx:
- Same structure as QuoteFormClient
- Add poNumber text input in the details card
- Fields: invoiceDate (default today), dueDate (default +30 days)
- Add period lock warning: compare invoiceDate to getMinAllowedDate() result
  If invoice date is within the grace period, show amber banner:
  "⚠ This invoice date may fall in a restricted financial period. Marking as paid may be blocked."
- On submit: call createInvoice(data)
```

---

### Step 2.4 — Wire Up Invoice Detail Page

#### Copilot Prompt
```
Wire up the invoice detail page in PMG Control Center. Patch the existing shell.

Here is the current shell:
[paste billing/invoices/[id]/page.tsx]

Follow the same pattern as the quote detail page you wired up in Step 1.5.

Changes needed:
1. Fetch: const invoice = await getInvoiceById(id) — if null, notFound()
2. Replace MOCK data with real invoice data passed to DocumentPreview
3. Real status badge via BillingStatusBadge
4. Real sidebar summary amounts
5. Add action bar below the grid:
   draft:   [Issue Invoice button → issueInvoice] [Void button → voidInvoice]
   issued:  [MarkPaidButton invoiceId hasClient={!!invoice.clientId}]
            [VoidInvoiceButton]
            If invoice.dueDate < today: amber banner "⚠ This invoice is overdue."
   paid:    Green text "Paid on {format(invoice.paidAt)}.
            Revenue posted to income." + Link "/income" "View in Income →"
   overdue: Same as issued
   void:    Muted text "This invoice has been voided."
6. If invoice.quotationId exists: show "From Quote: {invoice.quotationNumber}" as a Link
   to /billing/quotes/{invoice.quotationId}. Add this inside the header section.
7. Keep Print, Send, More header buttons disabled.

Import markInvoicePaid, issueInvoice, voidInvoice from '@/app/actions/billing-invoices'.
```

**Done When Phase 2 Is Complete:**
- [ ] Create standalone invoice
- [ ] Quote → Accept → Convert → Invoice (quote shows "Converted", invoice shows "From Quote")
- [ ] Issue invoice (Draft → Issued)
- [ ] Mark invoice paid → income row appears in `/income` with correct division, client, amount
- [ ] Dashboard revenue total increases by invoice amount
- [ ] Cannot mark paid with no client — button disabled with tooltip
- [ ] Cannot mark paid if period locked — toast error shown
- [ ] Void works for draft/issued, blocked for paid

---

## Phase 3 — Statements
**Duration:** 2–3 days  
**Goal:** Statement list and client detail pages show real data.

---

### Step 3.1 — Wire Up Statements

#### Copilot Prompt
```
Wire up the billing statements pages in PMG Control Center. Patch existing shells.

Here are the shells:
[paste billing/statements/page.tsx]
[paste billing/statements/[clientId]/page.tsx]

Reference how the existing clients/[id]/page.tsx shows income history:
[paste apps/admin/src/app/(admin)/clients/[id]/page.tsx]

For statements/page.tsx:
1. Make async, dynamic = 'force-dynamic'
2. Fetch: getClientsWithBillingActivity()
3. Replace the 4 hardcoded '—' stats with real values
4. Render real table rows — each row: client name (link to /billing/statements/{id}),
   totalInvoiced (formatZAR), totalPaid (formatZAR, text-green-500),
   outstanding (formatZAR — text-red-500 if > 0, text-muted-foreground if 0),
   lastActivityDate, "View" link button
5. Keep the mock preview link and disabled Generate Statement button for now

For statements/[clientId]/page.tsx:
1. Make async, dynamic = 'force-dynamic'
2. Fetch in parallel:
   - getClientStatement(clientId, { year }) — year from searchParams, default current year
   - getAllIncome({ clientId }) — existing function, reused as-is
3. If statement.client is null: notFound()
4. Replace the MOCK summary cards with real data:
   Total Invoiced, Total Paid, Balance Due (outstanding)
5. Add a summary strip above the two-column grid (same card style as /accounts/[account]):
   Total Quoted | Total Invoiced | Total Paid | Outstanding | Conversion Rate (%)
   Outstanding: text-red-500 if > 0
6. The DocumentPreview type="statement" already renders the transaction history table
   from the MOCK transactions prop. Replace MOCK with real transactions built from:
   - Each invoice (all statuses except void): { date: invoiceDate, reference: documentNumber,
     description: documentNumber + ' — Invoice', debit: Number(total), credit: undefined,
     balance: 0 (calculated after sort) }
   - Each income row for this client: { date, reference: description,
     description: 'Payment received', debit: undefined, credit: Number(amount), balance: 0 }
   Sort all by date ASC. Compute running balance.
7. Sidebar Client Info card: real client.name, client.email, client.phone, client.address (from client data)
8. Add Section 3 BELOW the two-column grid — "Income Records":
   Heading + total. Table: Date | Division | Description | Amount (text-green-500, + prefix)
   Use allIncome.data for this section. Empty state if no income records.
   This mirrors the income history section in clients/[id]/page.tsx exactly.
```

**Done When Phase 3 Is Complete:**
- [ ] Statement list shows all clients with billing activity and correct outstanding
- [ ] Client statement summary strip totals match manual calculation
- [ ] Transaction history table shows invoices as debits, payments as credits with running balance
- [ ] Income records section matches `/income` filtered by that client
- [ ] `notFound()` fires for unknown clientId

---

## Phase 4 — Items Catalogue
**Duration:** 2 days  
**Goal:** Items CRUD working. Combobox wired into line item form.

---

### Step 4.1 — Items Actions + Wire Up Pages

#### Copilot Prompt
```
Generate the items server actions and wire up the billing items pages in PMG Control Center.

FILE 1: apps/admin/src/app/actions/billing-items.ts
'use server'. Follow the pattern of billing-quotes.ts.
Export:
- createItem(data): guard getSessionOrRedirect(), validate with ItemSchema, insert billing_items
- updateItem(id, data): guard, validate, update
- archiveItem(id): set status='archived'
- unarchiveItem(id): set status='active'
- deleteItem(id): check if used in billing_line_items — if yes, return error 'Archive instead of deleting used items.'
  Otherwise delete.

ItemSchema (Zod): { name: string min 1 max 200, description: string optional, 
  unitPrice: coerce.number min 0, unitLabel: string optional, vatApplicable: coerce.boolean }

FILE 2: Wire up billing/items/page.tsx
Make async, fetch getAllItems() and getItemStats(). Replace '—' stats with real values.
Render real table rows. Keep mock preview link.

FILE 3: Wire up billing/items/new/page.tsx
Replace placeholder div fields with real inputs. VAT Applicable: use shadcn Switch component.
On submit: call createItem(data) → redirect to /billing/items/{id}

FILE 4: Wire up billing/items/[id]/page.tsx
Fetch getItemById(id). Replace MOCK with real data. Wire Save Changes, Archive, Delete buttons.
Replace VAT toggle div with real shadcn Switch.

Shell files for reference:
[paste billing/items/page.tsx]
[paste billing/items/new/page.tsx]
[paste billing/items/[id]/page.tsx]
```

---

### Step 4.2 — Combobox in Line Items Form

#### Copilot Prompt
```
Upgrade the BillingLineItemsForm component to support item selection via combobox.

Here is the current form component:
[paste apps/admin/src/components/billing/billing-line-items-form.tsx]

Add a new prop: activeItems: { id: string; name: string; description: string | null; unitPrice: string; vatApplicable: boolean }[]

For each row's description field, replace the plain Input with a combobox built from
shadcn Command + Popover:
- Trigger: an Input-style field showing the current description text
- Dropdown: shows filtered items matching the typed text (filter client-side)
- On select: pre-fill description from item.description, unitPrice from item.unitPrice,
  vatRate from item.vatApplicable ? '15' : '0'
- All pre-filled values remain editable
- If user types without selecting: treat as free-form description, no item link
- Archived items do NOT appear (filtered out in the passed activeItems prop)
- The parent form pages must now also fetch getActiveItems() and pass down via this prop
```

---

## Phase 5 — Settings Wiring
**Duration:** 2 days  
**Goal:** Organisation settings save. Billing settings save. Notifications toggles functional.

---

### Step 5.1 — Organisation Settings Save

#### Copilot Prompt
```
Wire up the organisation settings save flow in PMG Control Center.

Here is the current shell:
[paste settings/organisation/page.tsx]

I need:
1. A new database table: organisation_settings (singleton — one row)
   Columns: id uuid PK, company_name text, registration_number text nullable,
   vat_number text nullable, email text nullable, phone text nullable, website text nullable,
   address_street text nullable, address_city text nullable, address_postal text nullable,
   address_province text nullable, country text default 'South Africa',
   logo_url text nullable, updated_at timestamptz
   Add this to packages/db/src/schema/billing.ts (or a new settings.ts)

2. A server action: apps/admin/src/app/actions/settings.ts
   updateOrganisationSettings(formData: FormData): Promise<{ error?: string }>
   Uses upsert (INSERT ... ON CONFLICT DO UPDATE) — there is only ever one row.

3. Patch settings/organisation/page.tsx:
   - Make async, fetch current settings from getOrganisationSettings()
   - Replace div placeholder fields with real Input components pre-filled with current values
   - Enable the Save button — calls updateOrganisationSettings server action
   - Show success toast on save

Follow the existing form pattern from settings/billing/billing-settings-client.tsx for
field layout. Use FormData approach (not controlled state — this is a simple flat form).
```

---

### Step 5.2 — Billing Settings Save

#### Copilot Prompt
```
Wire up the billing settings save for PMG Control Center.

Here are the current files (already working for display):
[paste settings/billing/page.tsx]
[paste settings/billing/billing-settings-client.tsx]

I need:
1. A new table: division_billing_settings
   Columns: id uuid PK, division_id uuid NOT NULL UNIQUE FK→divisions,
   default_vat_rate numeric 5,2 default 15, payment_terms_days integer default 30,
   bank_name text nullable, bank_account_name text nullable,
   bank_account_number text nullable, bank_branch_code text nullable,
   invoice_notes text nullable, quote_notes text nullable,
   logo_url text nullable, updated_at timestamptz

2. A server action: saveDivisionBillingSettings(divisionId: string, formData: FormData)
   Uses upsert on division_id. Validates fields with Zod.

3. Patch billing-settings-client.tsx:
   - DivisionBillingForm now accepts currentSettings?: DivisionBillingSettings prop
   - Replace all div placeholders in Tax & Payment and Banking Details sections with
     real Input components pre-filled from currentSettings
   - Enable Save button — calls saveDivisionBillingSettings with the division's id
   - Show toast on success/error

4. Patch settings/billing/page.tsx:
   - Also fetch getAllDivisionBillingSettings() alongside getAllDivisions()
   - Pass currentSettings per division to BillingSettingsClient
```

**Done When Phase 5 Is Complete:**
- [ ] Organisation settings save and reload correctly
- [ ] Billing settings save per division — banking details persist across page refreshes
- [ ] Division settings tabs still work with real data

---

## Phase 6 — Polish & Cleanup
**Duration:** 1–2 days  
**Goal:** Production-ready. No broken states. No dev artefacts.

---

### Step 6.1 — Remove Dev Artefacts

**What you do manually:**
- [ ] Remove all `Preview mock quote →`, `Preview mock invoice →`, `Preview mock statement →`, `Preview mock item →` links from list pages
- [ ] Remove mock data `const MOCK = {...}` from all detail pages — all data now comes from DB
- [ ] Remove `/billing/quotes/mock-preview`, `/billing/invoices/mock-preview`, `/billing/statements/mock-preview`, `/billing/items/mock-preview` routes if they exist

---

### Step 6.2 — Loading + Error States

#### Copilot Prompt
```
Generate loading and error states for the billing module.
Copy the exact pattern from:
[paste apps/admin/src/app/(admin)/loading.tsx]
[paste apps/admin/src/app/(admin)/error.tsx]

Generate:
1. apps/admin/src/app/(admin)/billing/loading.tsx — same skeleton
2. apps/admin/src/app/(admin)/billing/error.tsx — same error UI

These inherit to all /billing/* routes automatically.
```

---

### Step 6.3 — Final Verification

#### Copilot Prompt (audit prompt)
```
Review this PMG Control Center billing implementation for production readiness.
Check each item and flag any gaps:

1. All server actions call getSessionOrRedirect() at the top
2. All date inputs validate date <= today where applicable
3. All date mutations call isPeriodClosed() before writing to DB
4. markInvoicePaid checks invoice.clientId !== null before inserting to income
5. income insert uses: date=invoice.invoiceDate (not today), divisionId, clientId, amount=invoice.total
6. document number utility runs inside a transaction with .for('update')
7. All financial mutations revalidatePath('/dashboard')
8. deleteQuotation and deleteItem check status/usage before deleting
9. ConvertToInvoiceButton only visible/active when quote.status === 'accepted'
10. MarkPaidButton disabled when invoice.clientId is null
11. Statement income section uses getAllIncome({ clientId }) — existing function
12. created_by fields store session.user.id which is text (not uuid)
13. updatedAt set explicitly as new Date() — no $onUpdate() in schema
14. All mock preview links removed from production pages
15. billing.ts added to schema/index.ts exports

Report any issues found with the file and line reference.
```

---

## Summary Timeline

| Phase | Focus | Days | Cumulative |
|---|---|---|---|
| 0 | Schema, utilities, queries | 2–3 | Day 3 |
| 1 | Quotations — wire up shells | 3–4 | Day 7 |
| 2 | Invoices + Mark Paid | 3–4 | Day 11 |
| 3 | Statements | 2–3 | Day 14 |
| 4 | Items catalogue | 2 | Day 16 |
| 5 | Settings wiring | 2 | Day 18 |
| 6 | Polish + verification | 1–2 | Day 19 |

**Total: 15–19 working days** (accounting for real shells reducing rework vs. building from scratch)

---

## v2 Backlog

When v1 is stable in production, these are next:

| Feature | What's Needed |
|---|---|
| PDF generation | `@react-pdf/renderer` in `packages/documents` — `QuotePDF`, `InvoicePDF`, `StatementPDF` |
| Email delivery | Resend + React Email templates — send on issueInvoice, sendQuote |
| Audit log | `billing_audit_log` table — all status transitions |
| Discount fields | Line-item % discount + document-level fixed/% |
| Partial payments | `billing_payments` table, `PARTIALLY_PAID` status |
| Statement export | CSV server action (mirrors `exportFinancialsCsv`) |
| Overdue auto-flag | On-read check: past due + issued → flag overdue |
| Localisation settings | Wire up timezone, date format, financial year start |
| Email settings | Wire up Resend API key, sender identity |
| Notification toggles | `notification_settings` table, toggle save |

---

*PMG Control Center — Phased Development Plan — May 2026*
