# Zoho Invoice Migration Plan
## Assigning historical invoices to existing income records

**Date:** May 2026  
**Scope:** < 10 invoices, all already recorded as direct income entries  
**Goal:** Each historical Zoho invoice becomes a real invoice in PMG, linked to its existing income record, so it appears correctly on client statements.

---

## The Problem

You have income records like this:

```
income table
├── id: uuid
├── date: "2026-03-01"
├── divisionId: "..."
├── clientId: "..."        ← client exists
├── description: "INV-0042 — Acme Corp"
└── amount: "18981.25"
```

But no corresponding row in the `invoices` table. So on the client statement, the payment shows as a credit but there's no matching debit (invoice), making the statement look incomplete.

---

## Target State

For each historical Zoho invoice:

```
invoices table
├── id: uuid
├── documentNumber: "AWS-INV-2026-001"   ← new PMG number
├── status: "paid"
├── invoiceDate: "2026-03-01"            ← original invoice date
├── clientId: "..."
├── divisionId: "..."
├── total: "18981.25"
├── incomeId: "..."                      ← linked to existing income row
└── paidAt: timestamp

billing_line_items table
└── (one or more line items reconstructed from Zoho export)
```

The statement will then show:
- Debit: invoice total (the invoice)
- Credit: payment received (the income record)
- Balance: R 0.00 ✓

---

## Approach Options

### Option A — Manual entry via the UI (recommended for < 10 invoices)

Use the existing `/billing/invoices/new` form to create each invoice, then manually link it to the existing income record.

**Problem:** The current "Mark Paid" flow creates a *new* income record. You already have the income record — you don't want a duplicate.

**Solution needed:** A "Link to existing income" action that:
1. Sets `invoice.status = 'paid'`
2. Sets `invoice.incomeId = existingIncomeRow.id`
3. Sets `invoice.paidAt = existingIncomeRow.date` (or now)
4. Does NOT insert a new income row

### Option B — Admin data-entry page (purpose-built)

Build a small `/billing/invoices/[id]/link-income` page or modal that lets you:
1. Pick an existing income record for this client
2. Confirm the link
3. Marks the invoice as paid without creating a duplicate income entry

### Option C — Direct DB script (fastest, no UI needed)

Write a one-time migration script that:
1. Reads your Zoho CSV export
2. Creates invoice + line item rows
3. Links each invoice to its matching income row by client + amount + date
4. Marks status = 'paid'

---

## Recommended Approach: Option A + small UI addition

Since there are fewer than 10 invoices, manual entry is fine. The only missing piece is a way to mark an invoice as paid *without* creating a duplicate income record.

### Step 1 — Export from Zoho
Export invoices as CSV. You need per invoice:
- Client name
- Invoice date
- Due date (if applicable)
- Line items: description, quantity, unit price, VAT rate
- Total amount
- Division (if Zoho tracks this)

### Step 2 — Create each invoice in PMG
Go to `/billing/invoices/new` and fill in:
- Division, client, invoice date, due date
- Line items from the Zoho export
- Notes (optional — can include original Zoho invoice number)

Save as draft. A new PMG document number is auto-assigned (e.g. `AWS-INV-2026-001`).

### Step 3 — Issue each invoice
On the detail page, click **Issue Invoice** (Draft → Issued).

### Step 4 — Link to existing income (new feature needed)
Instead of "Mark Paid" (which creates a new income row), use a new **"Link Payment"** action that:
- Shows a dropdown of unlinked income records for this client
- Lets you select the matching one
- Sets `invoice.status = 'paid'`, `invoice.incomeId`, `invoice.paidAt`
- Does NOT insert to the income table

### Step 5 — Verify on statement
Go to `/billing/statements/{clientId}` — the statement should now show:
- Debit: invoice amount
- Credit: payment received (existing income record)
- Running balance: R 0.00

---

## What Needs to Be Built

### New server action: `linkInvoiceToIncome`

```ts
// apps/admin/src/app/actions/billing-invoices.ts

export async function linkInvoiceToIncome(
  invoiceId: string,
  incomeId: string,
): Promise<{ error?: string }>
```

Guards:
- Invoice must exist and be in `draft` or `issued` status
- Income record must exist and belong to the same client
- Income record must not already be linked to another invoice

Steps:
1. Load invoice + income record
2. Validate client match: `invoice.clientId === income.clientId`
3. Validate amount match (warn if different, don't block)
4. `UPDATE invoices SET status='paid', income_id=$incomeId, paid_at=income.date, updated_at=NOW() WHERE id=$invoiceId`
5. `revalidatePath` for invoice, income, statements, dashboard

### New UI: "Link Payment" button on invoice detail

On the invoice detail page, when status is `draft` or `issued` and the client has unlinked income records:

- Show a **"Link Existing Payment"** button alongside the existing action bar
- Opens a simple select: lists unlinked income records for this client (date + amount + description)
- On confirm: calls `linkInvoiceToIncome`

---

## Migration Checklist

- [ ] Export Zoho invoices to CSV
- [ ] Build `linkInvoiceToIncome` server action
- [ ] Add "Link Payment" UI to invoice detail page
- [ ] For each historical invoice:
  - [ ] Create invoice in PMG (`/billing/invoices/new`)
  - [ ] Issue it
  - [ ] Link to existing income record
  - [ ] Verify on client statement — balance should be R 0.00
- [ ] Check `/finance/income` — no duplicate entries
- [ ] Check `/billing/statements` — all clients show correct balances

---

## Risk: Duplicate income records

The biggest risk is accidentally clicking "Mark Paid" instead of "Link Payment" and creating a duplicate income entry. Mitigations:

1. The "Link Payment" button should be visually distinct and appear first in the action bar
2. "Mark Paid" should be hidden (or show a warning) when the client already has unlinked income records matching the invoice amount
3. After migration, verify `/finance/income` row count matches pre-migration count

---

## Timeline

| Step | Effort |
|---|---|
| Export Zoho CSV | 5 min |
| Build `linkInvoiceToIncome` action + UI | ~2 hours |
| Enter < 10 invoices manually | ~30 min |
| Link payments + verify statements | ~15 min |
| **Total** | **~3 hours** |

---

*Created: May 2026*
