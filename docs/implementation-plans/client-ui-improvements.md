# PMG Control Center — Client Billing Workspace
## Complete Implementation Plan (v2)

**Scope:** Three interrelated features to improve client-facing billing operations, triggered by a client requesting copies of all their invoices.

---

## Problem Statement

### Gap 1 — No bulk invoice operations
The current invoices list (`/billing/invoices`) has no way to:
- Select multiple invoices (checkboxes)
- Bulk-download multiple quotes/invoices combined into a single multi-page PDF document
- Bulk-email a batch to a client
- Bulk-issue or bulk-void multiple documents at once

### Gap 2 — Client detail page is incomplete
`/relationships/clients/[id]/page.tsx` shows only **income records**. A client record has no visibility into:
- Quotations created for that client
- Invoices raised for that client (draft or otherwise)
- A client statement
- Any way to open the actual document without navigating away

### Gap 3 — No client financial overview
There is no at-a-glance financial summary for a client account. Users must manually cross-reference invoices, payments, and statements to understand client health, payment behaviour, or outstanding risk.

---

## Feature 1 — Bulk Invoice Actions

### What to build

Add a checkbox-based multi-select layer to `InvoicesClient` (and optionally `QuotesClient`) that unlocks a floating action bar when one or more rows are selected.

### Bulk actions to support

| Action | Description |
|---|---|
| **Bulk Download (Combined PDF)** | Generate a single multi-page PDF combining all selected documents client-side. Render each document sequentially off-screen using `html2canvas`, and append it as a new page onto a single `jsPDF` document. |
| **Bulk Email** | For each selected invoice that has a client email, call the existing `sendDocumentEmailAction` with the generated PDF. Show a progress dialog with per-invoice status. |
| **Bulk Issue** | Transition all selected `draft` invoices to `issued` status in a single batch server action. |
| **Bulk Void** | Confirm once, then void all selected eligible invoices. |

### Files to touch

```
apps/admin/src/app/(admin)/billing/invoices/
  invoices-client.tsx          — add checkbox column, selection state, action bar
  page.tsx                     — no change needed

apps/admin/src/app/actions/
  billing-invoices.ts          — add bulkIssueInvoices(ids[]) and bulkVoidInvoices(ids[])

apps/admin/src/components/billing/
  bulk-invoice-action-bar.tsx  — NEW floating bar component (shown when selection > 0)
  bulk-pdf-downloader.ts       — NEW utility: renders off-screen, compiles multi-page PDF, triggers download
```

### UI sketch

```
┌──────────────────────────────────────────────────────────┐
│ ☑ │ Invoice #  │ Client   │ Date │ Due │ Amount │ Status │
│───┼────────────┼──────────┼──────┼─────┼────────┼────────│
│ ☑ │ AWS-INV-… │ Acme     │ …    │ …   │ R 5 000│ Issued │
│ ☑ │ TES-INV-… │ Acme     │ …    │ …   │ R 2 500│ Draft  │
│ ☐ │ AWS-INV-… │ BopheloM │ …    │ …   │ R 8 000│ Paid   │
└──────────────────────────────────────────────────────────┘

▼  Floating bar appears when ≥ 1 selected

┌──────────────────────────────────────────────────────────┐
│  2 selected   [Download PDFs]  [Email]  [Issue]  [Void]  │
└──────────────────────────────────────────────────────────┘
```

### Key implementation notes

- Checkbox state lives in `InvoicesClient` as `Set<string>` (invoice IDs).
- A "select all on page" master checkbox sits in the `<TableHead>`.
- The floating bar is absolutely positioned at the bottom of the table card, hidden when the set is empty.
- PDF generation for bulk download must render documents not currently in the DOM. Mount a `DocumentPreview` per selected invoice in a hidden off-screen `<div>`, capture each with `html2canvas`, then remove them.
- Bulk email fires sequentially (not in parallel) with a progress indicator to avoid rate-limiting Resend.

---

## Feature 2 — Client Detail Page Overhaul

### What to build

Replace the single income table on `/relationships/clients/[id]/page.tsx` with a **Client Billing Workspace** consisting of:

1. A **Client Financial Dashboard** (mini-dashboard at the top — see Feature 3)
2. A **split-pane document browser** below it
   - **Left pane** — tabbed list of Quotations / Invoices / Payments / Statement
   - **Right pane** — live `DocumentPreview` of whichever document is selected

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Client: Acme Corp                              [Edit]              │
├─────────────────────────────────────────────────────────────────────┤
│  CLIENT FINANCIAL DASHBOARD (KPI strip + ageing + health score)     │
│  See Feature 3 for full spec                                        │
├─────────────────────────────────────────────────────────────────────┤
│  QUICK ACTIONS: [New Invoice] [New Quote] [Record Payment]          │
│                 [Generate Statement] [Download All] [Send Reminder] │
├─────────────────────────────────────────────────────────────────────┤
│  [Quotations]  [Invoices]  [Payments]  [Statement]                  │
├──────────────────────┬──────────────────────────────────────────────┤
│  LEFT — Document List│  RIGHT — Document Preview                    │
│                      │                                              │
│  ☑ AWS-Q-2026-003 ←──│  ┌────────────────────────────────────────┐ │
│  ☐ AWS-Q-2026-002    │  │                                        │ │
│  ☐ TES-Q-2026-001    │  │   DocumentPreview renders here         │ │
│                      │  │   (invoice or quotation)               │ │
│  [Download Selected] │  │                                        │ │
│                      │  └────────────────────────────────────────┘ │
└──────────────────────┴──────────────────────────────────────────────┘
```

On mobile (< 1024px): layout collapses to list-only. Tapping a row navigates to the existing full detail page.

### Tabs

| Tab | Content |
|---|---|
| **Quotations** | All quotes for this client (any status), sorted by date desc. Columns: doc number, date, total, status badge. Checkboxes for bulk download. |
| **Invoices** | All invoices for this client (any status), same columns plus outstanding balance. Checkboxes for bulk download. |
| **Payments** | Existing income/payment records — keep current display. |
| **Statement** | Renders `DocumentPreview` with `type="statement"`. Includes Print and Export PDF buttons. Defaults to current FY. |

### Document preview pane behaviour

- Clicking a row updates React state: `selectedDocId` + `selectedDocType`.
- All document detail data (including line items) is pre-loaded upfront in the server component via `Promise.all`. This avoids waterfall fetches and is appropriate for clients with < 100 documents. Add a TODO comment for pagination if needed.
- The pane mirrors the sidebar action buttons from the existing detail pages (Issue, Mark Paid, Void, etc.).

### Data loading in `page.tsx`

```ts
const [client, quotes, invoices, payments] = await Promise.all([
  getClientById(id),
  getAllQuotations({ clientId: id }),           // already exists
  getAllInvoices({ clientId: id }),             // already exists
  getAllIncome({ clientId: id }),               // already exists
]);
```

No new DB queries needed — all data fetchers already accept `clientId` as a filter.

### Files to touch

```ts
apps/admin/src/app/(admin)/relationships/clients/[id]/
  page.tsx                          — restructure: load quotes + invoices + payments
  client-billing-workspace.tsx      — NEW 'use client' top-level workspace component
  client-document-browser.tsx       — NEW split-pane document browser
  client-document-list.tsx          — NEW left-pane list with tabs + checkboxes
  client-document-preview-pane.tsx  — NEW right-pane wrapper around DocumentPreview
  client-financial-dashboard.tsx    — NEW dashboard strip (see Feature 3)
```

---

## Feature 3 — Client Financial Dashboard (Mini-Dashboard)

Positioned at the top of the Client Billing Workspace. Provides an at-a-glance financial summary without requiring users to review documents individually.

---

### Section A — KPI Strip

Top row of summary cards (matches the existing `KpiGrid` visual language on the main dashboard):

| Metric | Value | Colour |
|---|---|---|
| Outstanding Balance | Amount still owed | Amber |
| Total Paid | Lifetime payments received | Green |
| Total Invoiced | Sum of all non-void invoices | Default |
| Overdue Balance | Sum of overdue invoices | Red (if > 0) |
| Quote Conversion Rate | Accepted ÷ Sent quotes | Default |

```
┌───────────────────────────────────────────────────────────────────┐
│ Outstanding │ Total Paid │ Total Invoiced │ Overdue  │ Conv. Rate │
│  R 12,500   │  R 80,000  │   R 92,500     │ R 2,000  │   87%      │
└───────────────────────────────────────────────────────────────────┘
```

---

### Section B — Revenue Metrics (expandable or always-visible)

| Metric | Description |
|---|---|
| Total Quoted | Total value of all quotations issued |
| Average Invoice Value | Mean invoice amount |
| Largest Invoice | Highest single invoice value |
| Total Invoices | Count of all invoices |
| Draft / Issued / Paid / Overdue | Count per status |
| Total Quotations | Count of all quotes |
| Draft / Accepted / Declined / Expired | Count per status |

---

### Section C — Accounts Receivable Ageing Analysis

Dedicated ageing section using client-specific data (not the global ageing report).

**Buckets:**

| Bucket | Amount |
|---|---|
| Current (not yet due) | R 0.00 |
| 1–30 Days overdue | R 0.00 |
| 31–60 Days overdue | R 0.00 |
| 61+ Days overdue | R 0.00 |
| **Total Outstanding** | R 0.00 |

**Visualisation (Option A — recommended):**

Horizontal stacked progress bar, one segment per bucket, colour-coded green → amber → orange → red:

```
Current   ██████████████████  R 5,000
1-30 Days ████████            R 2,500
31-60 Days ████               R 1,000
61+ Days  ██                  R 500
```

This reuses the existing `AllocationTooltipBar` pattern from the dashboard.

---

### Section D — Client Health Score

A single calculated indicator shown as a coloured badge + label.

| Score | Criteria | Colour |
|---|---|---|
| **Excellent** | No overdue invoices, average days-to-pay ≤ 30 | Green |
| **Good** | Minor overdue balance (< 20% of outstanding), avg days ≤ 45 | Blue |
| **At Risk** | Consistent overdue, increasing outstanding balance | Orange |
| **Critical** | Multiple invoices > 90 days overdue | Red |

Calculation logic lives in a pure `calculateClientHealth(invoices, payments)` utility function — no DB query needed, computed from already-loaded data.

---

### Section E — Payment Behaviour Analytics

| Metric | Description |
|---|---|
| Average Days to Pay | Mean gap between invoice date and payment date |
| Last Payment Date | Most recent payment received |
| Largest Single Payment | Largest payment amount |
| Total Payments Received | Count of payment records |
| Collection Efficiency | Total paid ÷ Total invoiced (as %) |

Displayed as a compact stat grid (2 columns on mobile, 5 on desktop).

---

### Section F — Recent Activity Feed

Latest 10 activity events for this client, derived from the already-loaded quotes, invoices, and payments data (no additional DB call). Each event shows an icon, description, and relative timestamp.

Example events:
- Invoice `AWS-INV-2026-042` created
- Invoice `AWS-INV-2026-040` paid — R 12,000
- Payment received — R 12,000
- Quotation `TES-Q-2026-021` accepted
- Statement generated

Activity is synthesised from `createdAt` / `paidAt` / `updatedAt` timestamps on documents already in memory. No audit log table required for this feature.

---

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  SECTION A — KPI STRIP                                              │
│  Outstanding │ Paid │ Invoiced │ Overdue │ Conv. Rate               │
├─────────────────────────────────────────────────────────────────────┤
│  SECTION C — AGEING ANALYSIS (stacked progress bar)                 │
│  Current ████████████  1-30 ████  31-60 ██  61+ █                   │
├─────────────────────────┬───────────────────────────────────────────┤
│  SECTION D              │  SECTION E                                │
│  Client Health Score    │  Payment Behaviour                        │
│  🟢 Excellent           │  Avg Days: 18  │  Last: 5 days ago        │
│                         │  Collection: 97%│  Payments: 24           │
├─────────────────────────┴───────────────────────────────────────────┤
│  SECTION F — RECENT ACTIVITY FEED (latest 10 events)               │
└─────────────────────────────────────────────────────────────────────┘
```

Section B (detailed invoice/quote counts) is shown as a secondary expandable panel or as a secondary tab below the KPI strip — keep the primary dashboard compact.

---

### Dashboard files

```
apps/admin/src/app/(admin)/relationships/clients/[id]/
  client-financial-dashboard.tsx     — NEW 'use client' dashboard component
  client-health-score.tsx            — NEW health score badge
  client-ageing-bar.tsx              — NEW stacked ageing bar (reuses AllocationTooltipBar)
  client-activity-feed.tsx           — NEW activity feed

apps/admin/src/lib/
  client-health.ts                   — NEW pure utility: calculateClientHealth()
  client-activity.ts                 — NEW pure utility: buildActivityFeed()
```

All data is derived from documents already loaded in `page.tsx` — **zero additional DB queries** for the dashboard.

---

## Suggested Build Order

```
Phase 1 — Client page tabs (1–2 days)
  ├─ Add Quotations + Invoices + Payments tabs to client detail page
  ├─ No split pane or dashboard yet — just tabbed tables with links
  └─ Immediately solves "I can't see quotes/invoices on the client page"

Phase 2 — Bulk selection infrastructure (1–2 days)
  ├─ Checkbox + selection state in InvoicesClient
  ├─ BulkInvoiceActionBar component
  └─ bulkIssueInvoices() + bulkVoidInvoices() server actions

Phase 3 — Client Financial Dashboard (2–3 days)
  ├─ KPI strip (Section A)
  ├─ Ageing bar (Section C)
  ├─ Health score (Section D)
  ├─ Payment behaviour (Section E)
  └─ Activity feed (Section F)

Phase 4 — Split-pane document browser (1–2 days)
  ├─ Left-pane document list with tabs + checkboxes
  └─ Right-pane DocumentPreview with action buttons

Phase 5 — Bulk PDF + Email (2–3 days)
  ├─ Off-screen render utility + multi-page PDF compilation (jsPDF)
  └─ Bulk email with per-invoice progress indicator
```

---

## Dependencies to add

No new external dependencies are required. The existing `html2canvas` and `jsPDF` libraries in the project (used by `ExportPdfButton`) are sufficient to perform off-screen rendering and append canvas captures to a single multi-page PDF document.

---

## Open Questions / Decisions Needed

1. **Bulk email UX** — Simplified "send to all selected" confirmation modal (recommended, mirrors `SendOverdueRemindersButton` pattern) vs per-document preview dialog.

2. **Off-screen PDF rendering** — Render all selected documents in hidden containers at once (simpler, may be slow for > 10 docs) vs render one at a time in a recycled container (better performance, more code).

3. **Statement tab default period** — Current FY recommended for the client detail page (vs the global statement page which defaults to current month).

4. **Section B visibility** — Show revenue metric counts always-visible below the KPI strip, or collapsed behind an "expand" toggle? Recommend collapsed by default to keep the dashboard compact.

5. **Health score thresholds** — The criteria above (e.g. "avg days ≤ 30 = Excellent") are starting points. Confirm these thresholds match your business expectations before building.

---

## Recommendations & Considerations

1. **Off-Screen PDF Rendering (Performance):** Re-rendering multiple PDFs client-side using `html2canvas` is CPU-intensive. Instead of rendering all selected documents in parallel, a sequential queue pattern should be used to prevent browser crashes/hanging.
2. **Bulk Email Partial Failures:** Sequential sending must handle API rate limits and partial successes. The UI should display progress and show status per document (e.g. Success vs Failed) with the ability to retry only failed items.
3. **Statement Date Selection:** The Statement tab should support custom Date Range selection (using a date range picker) rather than only displaying a static Current FY default.
4. **Mobile Layout Constraints:** The dashboard metrics panel should collapse gracefully on screens under `1024px` width to avoid excessive vertical scrolling before reaching the list tabs.

---

## Components Already Available (No Re-build Needed)

| Component | Reuse |
|---|---|
| `DocumentPreview` | Renders invoice, quote, or statement from props |
| `BillingStatusBadge` | Status chips |
| `ExportPdfButton` | Single-doc PDF export — reuse internals for bulk |
| `PrintButton` | Browser print trigger |
| `EmailDocumentDialog` | Per-document email — reuse in bulk loop |
| `BillingTotalsBlock` | Totals display |
| `AllocationTooltipBar` | Stacked bar — reuse for ageing visualisation |
| `KpiCard` / `KpiGrid` | KPI cards — reuse visual pattern for client KPI strip |
| `confirm` | Confirmation dialogs |
| `AgingReportGrid` | Ageing buckets display — adapt for per-client data |

All work is **additive** — no existing pages or routes are broken.

---

## Future Enhancements (Out of Scope for This Build)

- Credit limit management
- Collection notes per client
- Automated payment reminder scheduling
- Client profitability analysis (revenue vs expenses attributed to client)
- Monthly spend/revenue trend graphs
- AI-powered payment risk prediction
