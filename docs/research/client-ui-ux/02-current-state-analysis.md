# PMG Hub — Current Client Detail Page Analysis
*Audit of `client-billing-workspace.tsx` and `client-financial-dashboard.tsx` | June 2026*

---

## Component Structure

```
ClientDetailPage (server — page.tsx)
└── ClientBillingWorkspace (client)
    ├── Off-screen render container (hidden div for PDF canvas export)
    ├── Header panel
    │   ├── Breadcrumb + client name + active badge
    │   └── "Edit Details" toggle button
    ├── Collapsible edit form (ClientEditForm)
    ├── ClientFinancialDashboard
    │   ├── KPI cards strip (5 cards)
    │   ├── Ageing bar + 4-bucket legend
    │   ├── Health & Payment Behaviour card
    │   └── Activity feed accordion (collapsed by default)
    ├── Quick action buttons (New Invoice, New Quote, Record Payment)
    └── Tabbed document browser
        ├── Invoices tab (table + checkbox selection)
        ├── Quotations tab (table + checkbox selection)
        ├── Payments tab (table)
        ├── Statement tab (period filter + transactions table + preview button)
        └── Preview Dialog (full-screen document viewer with action buttons)
    ├── Floating Action Bar (bulk: Combined PDF, Bulk Email, Issue, Void)
    └── Bulk Progress Dialog (sequential queue render)
```

---

## Server Data Flow

```
page.tsx (server)
│
├── Parallel batch 1 (Promise.all):
│   ├── getClientById(id)
│   ├── getAllIncome({ clientId })
│   ├── getAllQuotations({ clientId })
│   ├── getAllInvoices({ clientId })
│   ├── getClientStatement(id, filter)
│   └── getStatementYears(id)
│
└── Parallel batch 2 (Promise.all, after batch 1):
    ├── getInvoiceById(id) × n    ← line items per invoice
    ├── getQuotationById(id) × n  ← line items per quote
    └── getIncomeAllocations(id) × n
```

**Note:** `getInvoiceById` is called once per invoice in a `Promise.all`. For clients with 50+ invoices this is 50+ database queries in a single page load. `force-dynamic` means no caching — every visit hits the DB.

---

## Strengths — What Works Well

### Financial Dashboard
The `ClientFinancialDashboard` is more analytically advanced than any direct competitor:
- **5 KPI cards:** Total Invoiced, Total Paid, Outstanding, Overdue, Quote Conversion Rate
- **Ageing breakdown:** Stacked visual bar + 4-bucket legend (Current / 1–30 / 31–60 / 61+ days)
- **Health score:** Calculated rating (Excellent / Good / At Risk / Critical) — no competitor offers this
- **Payment behaviour metrics:** Avg days to pay, collection efficiency, last payment date, largest payment
- **Activity feed:** Chronological list of recent billing events across invoices, quotes, and payments

### Tabbed Document Browser
Four clearly separated tabs (Invoices, Quotations, Payments, Statement) prevent information overload and align with industry best practice.

### Inline Document Preview
The preview dialog opens a full document view without navigating away. Xero and most competitors require navigating to a separate document page; PMG Hub keeps the user in context.

### Bulk Operations
The floating action bar (bulk PDF compilation, bulk email, bulk issue/void) is a significant differentiator — no major invoicing platform offers this level of batch processing at the client level.

### URL-Driven State
`useSearchParams` integration allows deep links to specific tabs, documents, or statement periods (e.g., `?tab=invoices&invoiceId=xxx`). Enables clean navigation from other parts of the app.

### Off-Screen Canvas PDF System
The sequential off-screen rendering approach for bulk PDF generation is technically clever. Documents are rendered in a hidden container and captured via `html2canvas-pro`, then compiled into a single PDF or emailed individually.

---

## Problems & Friction Points

### 🔴 P0 — Bugs

#### 1. Edit Form Redirects Away from Client Page
After saving client details, the router navigates to the clients list instead of staying on the current page.

**File:** `apps/admin/src/components/clients/client-edit-form.tsx`
```typescript
// WRONG — navigates away from the client detail page
router.push('/relationships/clients');

// FIX
router.refresh(); // Re-fetches server data, stays on current page
```

#### 2. Statement Default Period Not Highlighted
When neither `statementPeriodParam` nor `statementYearParam` is present in the URL, the page defaults to "current month" — but none of the period filter buttons appear highlighted. The effective period is computed but not reflected in the UI state.

```typescript
// Current: uses statementPeriodParam for button variant comparisons
// Problem: statementPeriodParam is null on first load, so no button is active

// Fix: derive an effective period
const effectivePeriod = statementPeriodParam ?? (!statementYearParam ? 'current' : null);
// Use effectivePeriod for all button variant comparisons
```

---

### 🟡 P1 — UX Friction

#### 3. Financial Dashboard Is Below the Fold
The page stacks vertically: header → edit form area → full financial dashboard → action buttons → tabbed browser. On a standard 1080p screen, the document browser (the most frequently used section) requires scrolling past approximately 300px of analytics content.

**Impact:** Users who simply want to open an invoice must scroll past a dashboard they may not need on every visit.

#### 4. No Contact Info Visible Without Expanding the Edit Form
Email, phone, and business name are not displayed anywhere on the page unless the user clicks "Edit Details" to expand the collapsible form. Every competitor shows contact info at the top of the client page without any interaction required.

**Impact:** To find a client's email address, the user must open the edit form — which is designed for editing, not reading.

#### 5. KPI Cards Are Static (Not Interactive)
The 5 KPI tiles in the financial dashboard display numbers but do nothing when clicked. The industry's most effective pattern (QuickBooks' Money Bar) makes each tile a filter that shows only the relevant documents.

**Impact:** Missed opportunity — clicking "Overdue" should filter the invoice list to show only overdue invoices.

#### 6. Preview Dialog Is Full-Screen and Contextless
The document preview opens as a `max-w-4xl` Dialog that blocks the entire page. Closing it drops the user back to the list with no visual continuity. There is no "next / previous document" navigation within the dialog.

**Impact:** Reviewing multiple invoices requires repeatedly opening and closing the dialog. Industry best practice (Stripe, FreshBooks, QBO) uses slide-over drawers that preserve the list behind them.

#### 7. Statement Requires 3 Interactions to Preview
1. Click the Statement tab
2. Select a period
3. Click "Preview Statement PDF"

Xero, QuickBooks, and Zoho achieve statement preview in 1–2 interactions.

#### 8. Quick Action Buttons Are Visually Weak
The New Invoice / New Quote / Record Payment buttons appear as a small `flex-wrap gap-2` strip between the dashboard and the tab browser — after approximately 300px of scrolling. They are easy to miss, particularly on mobile.

#### 9. Bulk Operations Have No Discovery Affordance
The floating bulk action bar only appears after checkboxes are selected. New users have no indication that checkboxes exist or what they enable. There is no hint text or tooltip pointing to this feature.

#### 10. Activity Feed Is Always Collapsed
The activity feed is collapsed by default. Users who want recent context (what happened with this client recently?) must manually expand it. Showing 3–5 events by default would improve situational awareness without significantly increasing page weight.

---

### 🟢 P2 — Minor Issues

#### 11. Payments Tab Missing Receipt Number Column
The payments table shows Date, Invoice Number, and Amount — but payment receipts have a computed `REC-XXXXXXXX` identifier. This is only visible after clicking into the receipt. The table should include a Receipt # column.

#### 12. No "Days Overdue" Context in Invoice Table
The invoice table shows a status badge of "Overdue" but no numeric context. Knowing that INV-003 is 47 days overdue vs. 3 days overdue is operationally significant. A "Days Overdue" column with colour coding (amber → orange → red) would make this scannable.

---

## Summary Issue Table

| Issue | Severity | Type |
|---|---|---|
| Edit form redirects to clients list | 🔴 P0 | Bug |
| Statement default period not highlighted | 🔴 P0 | Bug |
| Financial dashboard below fold | 🟡 P1 | UX |
| Contact info requires edit form to see | 🟡 P1 | UX |
| KPI cards are static (not interactive) | 🟡 P1 | UX |
| Preview Dialog has no list context | 🟡 P1 | UX |
| Statement requires 3 steps to preview | 🟡 P1 | UX |
| Quick action buttons below fold | 🟡 P1 | UX |
| Bulk ops have no discovery affordance | 🟡 P1 | UX |
| Activity feed always collapsed | 🟡 P1 | UX |
| Payments table missing Receipt # column | 🟢 P2 | UX |
| No "Days Overdue" column | 🟢 P2 | UX |
| O(n) DB queries for invoice details | 🟢 P2 | Performance |

---

## Performance Notes

- **O(n) DB queries:** `getInvoiceById` and `getQuotationById` are called once per document in `Promise.all`. Correct approach, but not batched at the DB level. For clients with 50+ documents, this could be 100+ queries per page load.
- **`force-dynamic`:** No page-level caching — every visit hits the database.
- **`html2canvas-pro`:** The off-screen PDF canvas system is functional but fragile. It has known issues with complex CSS (gradients, custom fonts) and depends on timing delays (`setTimeout 250ms`) for React to mount the hidden render container before capture begins.
