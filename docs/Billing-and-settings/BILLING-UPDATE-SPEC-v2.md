# PMG Control Hub — Billing Update Spec
## Precise Changes Based on Actual Codebase

**Date:** May 2026  
**Based on:** Actual files reviewed — `billing.ts` schema, `billing/queries.ts`, all page and component files  
**Approach:** Surgical patches only — do not rewrite working files

---

## What Is Already Done (Do Not Touch)

Reading the actual code, these are already working correctly:

- ✅ Schema: `quotations`, `invoices`, `billing_line_items`, `billing_items`, `document_sequences` — all exist and are correct
- ✅ `getAllQuotations`, `getAllInvoices`, `getQuotationById`, `getInvoiceById`, `getClientStatement`, `getClientsWithBillingActivity`, `getAllItems`, `getItemById` — all working
- ✅ Quote list, invoice list, statement list, statement detail — all wired with real data
- ✅ Quote detail page — real data, action bar, `ConvertToInvoiceButton`
- ✅ Invoice detail page — real data, `InvoiceDetailActions`, mark paid flow
- ✅ Items list, item detail edit, new item form — working
- ✅ `BillingStatusBadge`, `BillingTotalsBlock`, `ConvertToInvoiceButton`, `MarkPaidButton`, `VoidInvoiceButton` — working

---

## Changes Required

### Change 1 — Client Is Required on Quotes and Invoices

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

Same four changes as above — same file structure.

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
This is the server-side guard — do not rely on frontend only.

#### `apps/admin/src/app/actions/billing-invoices.ts`

Same server-side guard in `createInvoice`.

---

### Change 2 — Line Items Must Come From Saved Items

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
 * Only active items are returned — archived items cannot be selected.
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

Same change — add `getActiveItems` and pass to `<InvoiceFormClient>`.

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

**Validation update in both form clients** — remove the description check and add item check:
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

### Change 3 — Remove Inline VAT, Add Document-Level VAT Toggle to Sidebar

**Problem:** Currently `vatRate` is set per row ('0' or '15'). Need to remove per-row VAT and replace with a single sidebar toggle. Default is OFF (not VAT registered).

**Schema note:** No migration needed. The `vat_rate` column stays but will always be stored as `'0'`. VAT is calculated at document level.

**Files to patch:**

#### `apps/admin/src/components/billing/billing-line-items-form.tsx`

Remove the VAT rate select column entirely from the table. Remove `vatRate` from `LineItemFormRow` type (or keep it but don't render it — removing is cleaner):

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

// In render — show VAT row only when vatEnabled:
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
6. Pass `vatEnabled` to `createQuotation` call — the action needs to store `vatAmount` and `total` correctly

#### `apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx`

Same changes as above.

#### `apps/admin/src/app/actions/billing-quotes.ts` — `createQuotation`

Update totals calculation — remove per-item VAT, use document-level:
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

**Schema migration needed** — add `vat_enabled` to both tables:

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

### Change 4 — Sticky Summary Sidebar

**Problem:** The sidebar in the create forms (`QuoteFormClient`, `InvoiceFormClient`) is not sticky. The detail pages already have `lg:sticky lg:top-16` on the sidebar wrapper — those are fine.

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

Same change — same sidebar wrapper div.

---

### Change 5 — Discount Field

**Schema migration needed** — add to both `quotations` and `invoices` tables in `packages/db/src/schema/billing.ts`:

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

### Change 6 — Reference Field on Quotes

**Schema migration needed** — add to `quotations` in `packages/db/src/schema/billing.ts`:
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

Pass `quote.reference` to `DocumentPreview` — the `reference` prop already exists on `DocumentPreviewProps`:
```typescript
const docPreviewProps = {
  ...
  reference: quote.reference ?? undefined,
  ...
}
```

---

### Change 7 — Edit Quotes and Invoices

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

#### `apps/admin/src/app/actions/billing-quotes.ts` — add `updateQuotation`

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

#### `apps/admin/src/app/actions/billing-invoices.ts` — add `updateInvoice`

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

### Change 8 — Export as PDF

**This is the largest change. Break it into two sub-steps.**

#### Sub-step 8A — Install and scaffold

```bash
npm install @react-pdf/renderer
```

Create `packages/documents/` as a new package (or add directly to `apps/admin` if you want to keep it simple for now):

**Simpler approach — add directly to `apps/admin`:**

```
apps/admin/src/lib/pdf/
  quote-pdf.tsx       ← @react-pdf/renderer component
  invoice-pdf.tsx     ← @react-pdf/renderer component
  generate-pdf.ts     ← server utility
```

#### Sub-step 8B — Route handler

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

#### Sub-step 8C — Wire the button

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

Same in `apps/admin/src/app/(admin)/billing/invoices/[id]/page.tsx` — replace disabled Print button with:
```tsx
<Button variant="outline" size="sm" asChild>
  <a href={`/api/billing/pdf/invoice/${invoice.id}`} download={`${invoice.documentNumber}.pdf`}>
    <Printer className="size-4" />
    Export PDF
  </a>
</Button>
```

#### Sub-step 8D — PDF template (minimal working version)

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

Create `apps/admin/src/lib/pdf/invoice-pdf.tsx` — same structure but uses `InvoiceDetail` type, shows PO number, shows "Invoice" instead of "Quotation", includes payment terms and banking details (from settings when available).

---

### Change 9 — Items: Remove VAT Applicable Toggle

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

The Details sidebar card currently shows no VAT row (confirmed from code review — `formatZAR(Number(item.unitPrice))` is shown with "excl. VAT" label, no VAT row). This is already correct — leave as-is.

---

### Change 10 — Archive = Deactivate, Restore = Activate (Items)

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

The `billing_items` schema uses `status` as the single source of truth (no separate `isActive` boolean — confirmed from `schema/billing.ts`). Archiving sets `status = 'archived'`. `getActiveItems()` filters `status = 'active'`. This already means archived items cannot appear in the line item selector. No schema change needed.

---

## Migration Summary

Run these in order after schema changes:

```bash
cd packages/db
npx drizzle-kit generate
npx drizzle-kit migrate
```

**Schema changes required:**
1. `quotations` — add `vat_enabled boolean NOT NULL default false`
2. `invoices` — add `vat_enabled boolean NOT NULL default false`
3. `quotations` — add `reference text nullable`
4. `quotations` — add `discount_type text nullable`
5. `quotations` — add `discount_value numeric(12,2) nullable`
6. `quotations` — add `discount_amount numeric(12,2) NOT NULL default '0'`
7. `invoices` — add `discount_type text nullable`
8. `invoices` — add `discount_value numeric(12,2) nullable`
9. `invoices` — add `discount_amount numeric(12,2) NOT NULL default '0'`

All with `default` values so existing rows are not broken.

---

## Apply Order (Prevents Breaking the App)

Apply in this exact order to avoid TypeScript errors and broken imports:

1. **Schema + migration** (adds columns with defaults — existing rows stay valid)
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
13. **Detail pages** (`quotes/[id]/page.tsx`, `invoices/[id]/page.tsx`) — add Edit button, wire reference, fix PDF button
14. **Items forms** (remove VAT toggle from new and edit forms)
15. **PDF route handler + templates** (install `@react-pdf/renderer`, create route, create templates)

---

*PMG Control Hub — Billing Update Spec — May 2026*
