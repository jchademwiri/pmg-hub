# Client Pages UI/UX Improvement Plan

**Date:** 2026-06-10
**Status:** Draft for implementation
**Scope:** Client list page and client detail billing workspace
**Reviewed by:** Claude (Anthropic) — review notes integrated inline

## Design Principles

- scan for codebase changes that will conflict with what we want to do, if any inform the user and recommend quick actions

- Keep the overall design consistent with the existing PMG Hub/Shadcn aesthetic.
- Do not use emojis in the production UI. Use Lucide icons only.
- Ensure that the design works in both Light and Dark mode.
- Improve information density so users can see more relevant information without scrolling, but avoid making the UI look cluttered.
- Prioritise actionability. The most common next actions should be immediately obvious and easy to access.
- Ensure that the UI is responsive and works well on both desktop and mobile devices.

---

## Goal

Make the client pages more useful for day-to-day billing work. The client list should help users find the right account quickly and understand account health before opening it. The client detail page should work as a compact client billing command center, with recent billing activity becoming a useful timeline rather than a hidden summary.

**Primary pages:**
- `/relationships/clients`
- `/relationships/clients/[id]`

**Current implementation anchors:**
- `apps/admin/src/app/(admin)/relationships/clients/clients-client.tsx`
- `apps/admin/src/components/clients/clients-table.tsx`
- `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`
- `apps/admin/src/app/(admin)/relationships/clients/[id]/client-financial-dashboard.tsx`
- `apps/admin/src/lib/client-billing-helpers.ts`

---

## Research Notes

Comparable accounting and CRM products treat a client/customer page as both a contact record and a transaction workspace.

Zoho Books connects customer setup with sales transactions, invoices, payments received, statements, payment terms, credit limits, contact persons, and related customer actions. Customers are not treated as just name/email rows — they are the entry point for billing workflows and transaction history.

**Patterns to borrow for PMG Hub:**
- Client records should expose billing context directly, not force users to jump between separate invoice, payment, and statement pages.
- The client list should show account status and financial urgency, not only contact details.
- The detail page should place the most common next actions near the account summary.
- Recent activity should mix invoices, quotes, and payments into one chronological view so users can understand what happened without checking each tab.
- Transactions should remain linked to their source documents so activity is not a dead feed.

---

## Current Page Assessment

### Client List

The current list page is simple and readable, but not yet useful enough for operational billing work.

**Strengths:**
- Clear page title and Add Client action.
- Inline add form keeps users in context.
- Active/disabled status is visible.
- Delete action is protected when the client has income records.

**Gaps:**
- Rows navigate to `/clients/{id}` — the real route is `/relationships/clients/{id}`. **This is a live bug.**
- No search, filtering, or sorting.
- `Income Records` is a weak signal; it shows history exists but not whether action is needed.
- No outstanding balance, overdue balance, last payment, or last activity.
- No quick actions for creating client-specific invoices, quotes, or payments.
- Mobile usability will degrade as columns increase.

### Client Detail

The client detail page is much more capable. It already loads invoices, quotes, payments, statement data, document previews, and billing settings. The main opportunity is information hierarchy.

**Strengths:**
- Combines invoice, quote, payment, and statement workflows in one place.
- Supports document preview modals.
- Has useful financial metrics: total invoiced, total paid, outstanding, overdue, quote conversion, ageing, health, average days to pay, collection efficiency.
- Supports tab-specific selections and URL-driven selection for invoices, quotes, and payments.

**Gaps:**
- The page feels like a document workspace before it feels like a client account overview.
- Recent Billing Activity is hidden behind an accordion and limited to a flat latest-10 feed.
- Activity rows are not actionable even though the page has preview state available.
- Activity uses emoji markers instead of the app's icon system.
- Header actions do not consistently preserve client context for invoices and quotes.
- Client details are collapsed, so basic contact context is not immediately visible.
- **Statement dialog renders `DocumentPreview` twice** — once conditionally and once unconditionally at the bottom of the dialog. This is a live rendering defect. See Phase 1.
- **`ClientEditForm` navigates away on save** — after editing client details, `router.push('/relationships/clients')` navigates the user off the page. It should stay on the page and collapse the form. See Phase 5.
- **`payments.sort()` mutates the props array** in `ClientFinancialDashboard` when finding the last payment. Should clone before sorting. See Phase 1.

---

## Implementation Phases

> Phases are sequential. Each phase should be fully complete and tested before the next begins. Phase 1 items are correctness fixes that can ship immediately without design review.

---

## Phase 1 — Correctness Fixes (Ship Immediately)

These are defects, not enhancements. They should be fixed before any other work proceeds.

### 1.1 Fix Client Table Navigation Route

**File:** `apps/admin/src/components/clients/clients-table.tsx`

Change:
```ts
router.push('/clients/' + client.id)
```
To:
```ts
router.push('/relationships/clients/' + client.id)
```

### 1.2 Fix Statement Dialog Double-Render

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

In the `<Dialog>` component, the statement `DocumentPreview` is rendered twice — once inside the conditional block and once unconditionally at the bottom of the dialog content. Remove the unconditional render. Only the conditional block (inside `selectedDocType === 'statement'`) should remain.

### 1.3 Fix Payment Array Mutation

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-financial-dashboard.tsx`

Change:
```ts
const lastPayment = payments.length > 0
  ? payments.sort((a, b) => b.date.localeCompare(a.date))[0]
  : null;
```
To:
```ts
const lastPayment = payments.length > 0
  ? [...payments].sort((a, b) => b.date.localeCompare(a.date))[0]
  : null;
```

### 1.4 Add Client-Aware Action URLs

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

Update quick action links so they preselect the current client:
```ts
/billing/invoices/new?clientId={client.id}
/billing/quotes/new?clientId={client.id}
/billing/payments/add?clientId={client.id}  // already correct — confirm and keep
```

If quote creation does not yet support `clientId` as a query param, add that support as part of this phase.

### 1.5 Replace Emoji Icons in Activity Feed

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-financial-dashboard.tsx`

Replace emoji markers (`📥`, `📄`, `📜`) with `lucide-react` icons. Use:
- `FileText` for invoices
- `ScrollText` or `FileSignature` for quotes
- `CircleDollarSign` or `Receipt` for payments

Do not use emoji in production UI.

### 1.6 Add Counts to Detail Page Tabs

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-billing-workspace.tsx`

Update tab labels:
```tsx
<TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
<TabsTrigger value="quotes">Quotations ({quotes.length})</TabsTrigger>
<TabsTrigger value="payments">Payments ({payments.data.length})</TabsTrigger>
<TabsTrigger value="statement">Statement</TabsTrigger>
```

**Phase 1 acceptance criteria:**
- [ ] Rows in the client list navigate to `/relationships/clients/[id]`.
- [ ] Statement dialog renders `DocumentPreview` exactly once.
- [ ] Payment array is not mutated when finding the last payment.
- [ ] Quick actions pass `clientId` as a query parameter.
- [ ] No emoji icons in the activity feed.
- [ ] Tab labels include document counts.

---

## Phase 2 — Client List Upgrade

Improve the client list page to be useful for operational billing work. All changes in this phase are client-side only — no query changes required.

### 2.1 Improve the Page Header

Replace the minimal header with a compact operational header:
- Title: `Clients`
- Supporting copy: `Find clients, review billing health, and act on outstanding accounts.`
- Primary action: `Add Client`
- Secondary actions (placeholder, not wired): `Import`, `Export`

Add summary chips below the header using existing loaded data:
- `Total clients` — count of all clients
- `Active` — count where `isActive === true`
- `Disabled` — count where `isActive === false`
- `Overdue` and `Outstanding` — placeholder chips, enabled in Phase 3 once query data is available

### 2.2 Add Client-Side Search and Status Filter

**File:** `apps/admin/src/components/clients/clients-table.tsx`

Add a toolbar above the table:
- Search input (`Search clients...`) filtering across `name`, `businessName`, `email`, and `phone`.
- Status segmented control: `All` / `Active` / `Disabled`.

Initial implementation uses the existing loaded rows — no server-side filtering yet. Billing filters (`Outstanding`, `Overdue`, `No activity`) should render but remain disabled until Phase 3 adds the required query fields.

### 2.3 Improve Table Columns

Move from a contact-only table to a billing-aware client table.

**Recommended desktop columns:**

| Column | Notes |
|---|---|
| Client | Business name primary; contact name secondary when distinct |
| Contact | Email + phone; muted placeholders when missing, not empty cells |
| Status | Active/Disabled badge; optional `No activity` badge |
| Outstanding | Right-aligned, `tabular-nums`; amber emphasis when > 0 — **placeholder in Phase 2, wired in Phase 3** |
| Overdue | Right-aligned, `tabular-nums`; red emphasis when > 0 — **placeholder in Phase 2, wired in Phase 3** |
| Last payment | Date — **placeholder in Phase 2, wired in Phase 3** |
| Last activity | Date — **placeholder in Phase 2, wired in Phase 3** |
| Actions | Icon buttons with tooltips |

Remove the `Income Records` column — it will be superseded by billing-aware columns.

### 2.4 Add Row Quick Actions

Each row should support:
- Open client (entire row clickable)
- New invoice → `/billing/invoices/new?clientId={clientId}`
- New quote → `/billing/quotes/new?clientId={clientId}`
- Record payment → `/billing/payments/add?clientId={clientId}`
- Activate/Disable toggle (existing)
- Delete — only when allowed (existing guard)

Use icon buttons with tooltips for secondary actions. Action buttons must call `e.stopPropagation()` to prevent row navigation.

### 2.5 Mobile Layout

At narrow widths, replace the wide table with compact client cards:
- Line 1: Client name + status badge
- Line 2: Outstanding and overdue amounts
- Line 3: Email / phone
- Actions: tucked into a right-side icon group or overflow menu

Avoid horizontal table overflow on mobile. The primary mobile experience is identify and act, not inspect every column.

**Phase 2 acceptance criteria:**
- [ ] Users can search by name, business name, email, and phone.
- [ ] Status filter (All / Active / Disabled) works correctly.
- [ ] Table uses updated column set; `Income Records` column removed.
- [ ] Row click navigates to `/relationships/clients/[id]`.
- [ ] Quick action buttons are present and pass correct `clientId` params.
- [ ] Action buttons do not trigger row navigation.
- [ ] Mobile layout renders as cards, not a scrolling wide table.
- [ ] Summary chips show correct totals from loaded data.

---

## Phase 3 — Billing Metrics Query

Add server-side billing health data to the client list. This phase unlocks the placeholder columns and filters added in Phase 2.

### 3.1 New Query: `getClientsOverview()`

Replace or augment `getClientsWithIncomeCount()` with a new query that returns billing health per client row.

**Recommended row shape:**
```ts
export type ClientOverviewRow = {
  id: string;
  name: string;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  incomeCount: number;
  invoiceCount: number;
  quoteCount: number;
  outstandingBalance: number;
  overdueBalance: number;
  overdueInvoiceCount: number;
  lastPaymentDate: string | null;
  lastActivityDate: string | null;
};
```

> **Performance note:** Outstanding and overdue balances require joining invoices with income allocations. At low client counts this is fine. As the dataset grows, consider whether these totals should be materialised (e.g. written back to a `clients` summary column on invoice/payment write) rather than computed live on every list load. This decision should be made before the query is written, not after.

### 3.2 Wire Financial Columns and Filters

Once `getClientsOverview()` is available:
- Wire the outstanding, overdue, last payment, and last activity columns.
- Enable the billing filter: `All` / `Outstanding` / `Overdue` / `No activity`.
- Add sort options: `Name`, `Last activity`, `Outstanding`, `Overdue`, `Created`.
- Enable the `Overdue` and `Outstanding` summary chips in the page header.

### 3.3 Tests

- Unit tests for query balance calculations (outstanding, overdue, last activity).
- Edge cases: client with no invoices, client with fully paid invoices, client with partially paid invoices, voided invoices excluded from balances.

**Phase 3 acceptance criteria:**
- [ ] `getClientsOverview()` returns correct outstanding and overdue balances.
- [ ] Balances exclude voided invoices.
- [ ] `lastActivityDate` reflects the most recent invoice, quote, or payment date.
- [ ] Billing filter options work correctly.
- [ ] Sort by outstanding and overdue works correctly.
- [ ] Summary chips show live overdue and outstanding totals.
- [ ] Query tests cover balance calculations and edge cases.

---

## Phase 4 — Activity Timeline

Rebuild Recent Billing Activity from a collapsed, non-interactive feed into a useful, actionable timeline.

### 4.1 Extend `ActivityEvent`

**File:** `apps/admin/src/lib/client-billing-helpers.ts`

Replace the current display-only shape with:

```ts
export interface ActivityEvent {
  id: string;
  type: 'invoice' | 'quote' | 'payment';
  action:
    | 'created'
    | 'issued'
    | 'sent'
    | 'accepted'
    | 'declined'
    | 'converted'
    | 'paid'
    | 'partially_paid'
    | 'voided'
    | 'overdue'
    | 'received';
  title: string;
  description: string;
  amount?: number;
  amountDirection?: 'inflow' | 'outflow' | 'neutral';
  date: string;
  sortDate: string;
  status: string;
  docNumber: string;
  targetId: string;
  targetType: 'invoice' | 'quote' | 'payment';
  severity: 'normal' | 'success' | 'warning' | 'danger';
}
```

No new database tables are needed. Map existing invoice, quote, and payment data into this shape inside `buildActivityFeed()`.

### 4.2 Activity Types to Include

**Invoices:** raised, issued, partially paid, paid, voided, overdue (computed: due date past and balance > 0).

**Quotes:** created, sent, accepted, declined, converted.

**Payments:** received, allocated to invoice (when allocation data is present).

### 4.3 Extract `ClientRecentActivity` Component

**Reason:** The activity feed needs to coordinate with tab and preview state inside `ClientBillingWorkspace`. Currently it lives inside `ClientFinancialDashboard`, which has no access to that state.

Extract `ClientRecentActivity` as a sibling component rendered directly by `ClientBillingWorkspace`. It should receive an `onEventSelect` callback:

```ts
// Invoice event:
setSelectedDocId(event.targetId);
setSelectedDocType('invoice');
setActiveTab('invoices');
setIsPreviewOpen(true);

// Quote event:
setSelectedDocId(event.targetId);
setSelectedDocType('quote');
setActiveTab('quotes');
setIsPreviewOpen(true);

// Payment event:
setSelectedDocId(event.targetId);
setSelectedDocType('payment');
setActiveTab('payments');
setIsPreviewOpen(true);
```

### 4.4 Visual Design

Use a timeline/list hybrid layout:
- Left icon column using `lucide-react` icons (already introduced in Phase 1)
- Main event text with document number and status badge
- Right-aligned amount (with `amountDirection` colouring) and date

**Icon mapping:**
- `FileText` — invoices
- `ScrollText` or `FileSignature` — quotes
- `CircleDollarSign` or `Receipt` — payments
- `AlertTriangle` — overdue/attention events
- `CheckCircle2` — paid/accepted events
- `XCircle` — voided/declined events

### 4.5 Display Behaviour

- Visible by default on desktop (not collapsed).
- Collapsible on mobile.
- Show first 8 events, then a `Show more` control up to 20.
- Group events by date bucket: Today / This week / This month / Older.

**Filters:**
- All
- Invoices
- Quotes
- Payments
- Attention Needed (overdue invoices, partially paid invoices, stale draft/sent quotes, voided items)

### 4.6 Empty State

When there is no activity:

```
No billing activity yet.
Create an invoice, quote, or payment to start this client's timeline.
```

Include quick actions: New Invoice / New Quote / Record Payment.

### 4.7 Tests

- Unit tests for `buildActivityFeed()`: correct ordering, event types, target IDs, and overdue/paid/voided classification.
- Confirm voided invoices produce a `voided` event, not an `overdue` event.

**Phase 4 acceptance criteria:**
- [ ] `ClientRecentActivity` is extracted and rendered from `ClientBillingWorkspace`.
- [ ] Activity feed is visible by default on desktop.
- [ ] Events are ordered newest-first.
- [ ] Events are grouped by date bucket.
- [ ] Clicking an event opens the correct preview modal and switches to the correct tab.
- [ ] Filters work for all types and Attention Needed.
- [ ] Show more control loads up to 20 events.
- [ ] Empty state is useful and includes quick action links.
- [ ] No emoji icons.
- [ ] `buildActivityFeed()` unit tests pass.

---

## Phase 5 — Detail Header and Dashboard Polish

Refine the information hierarchy of the client detail page so that account state and primary actions are immediately visible without expanding sections.

### 5.1 Make the Header an Account Command Center

The top of the page should immediately answer:
- Who is this client?
- Are they active?
- Do they owe money?
- What should I do next?

**Recommended header layout:**
- Breadcrumb / back link to Clients.
- Client identity block: business name or name, contact person if distinct, email, phone, active/disabled badge.
- Financial summary strip: Outstanding / Overdue / Last payment / Average days to pay.
- Action toolbar: New Invoice / New Quote / Record Payment / Edit Client.

Keep the edit form accessible, but do not make users expand a section just to confirm basic contact context.

### 5.2 Fix Edit Form Navigation

**File:** `apps/admin/src/components/clients/client-edit-form.tsx`

Currently, `ClientEditForm` calls `router.push('/relationships/clients')` on successful save, navigating the user away from the client they just edited. This is disorienting.

Change the success behaviour to:
- Stay on the current page.
- Collapse the edit form (call the existing `setIsDetailsOpen(false)` or equivalent).
- Show a success toast.

This mirrors the behaviour of the Add Client form on the list page, which closes itself on success without navigating away.

### 5.3 Reorder KPIs Around Actionability

Current order in `ClientFinancialDashboard`: Total Invoiced / Total Paid / Outstanding / Overdue / Quote Conversion.

**Recommended order:**
1. Outstanding
2. Overdue
3. Total Invoiced
4. Total Paid
5. Quote Conversion

The most important question on a client page is whether action is needed. Outstanding and overdue are more actionable than all-time totals.

### 5.4 Remove Pulsing Overdue Badge

**File:** `apps/admin/src/app/(admin)/relationships/clients/[id]/client-financial-dashboard.tsx`

The overdue badge in the ageing card uses `animate-pulse`. Remove the pulse. Use clear status colour and text instead — pulsing badges are visually distracting in a workspace that users look at repeatedly.

### 5.5 Add Helper Tooltips

Add compact `Tooltip` components to explain:
- Average days to pay
- Collection efficiency
- Quote conversion rate
- Client health score

Keep tooltip copy concise — one sentence each.

### 5.6 Tighten Selected Row Affordances

Improve selected document feedback in all tabs:
- Stronger selected row background.
- Left accent border on the selected row.
- A visible `Preview` affordance on hover/focus (icon or text label).

**Phase 5 acceptance criteria:**
- [ ] Client identity, account state, and primary actions visible without expanding any section.
- [ ] Edit form stays on page after save and collapses the form.
- [ ] KPIs ordered: Outstanding / Overdue / Total Invoiced / Total Paid / Quote Conversion.
- [ ] Overdue badge does not pulse.
- [ ] Helper tooltips present for avg. days to pay, collection efficiency, quote conversion, and client health.
- [ ] Selected rows have stronger visual feedback and hover preview affordance.
- [ ] Light and dark themes remain readable.

---

## Acceptance Criteria (Full)

### Client List
- [ ] Rows open `/relationships/clients/[id]`.
- [ ] Users can search by name, business name, email, and phone.
- [ ] Users can filter active/disabled clients.
- [ ] Users can identify clients with outstanding or overdue balances (Phase 3+).
- [ ] Users can create an invoice, quote, or payment directly from a client row.
- [ ] Mobile layout remains readable without horizontal scrolling.

### Client Detail
- [ ] Client identity, account state, and primary actions visible without expanding a section.
- [ ] Quick actions preserve client context via `clientId` query params.
- [ ] Tabs show document counts.
- [ ] Recent Billing Activity shows mixed invoice, quote, and payment events in newest-first order.
- [ ] Activity rows open the correct preview modal.
- [ ] Empty activity states are useful and action-oriented.
- [ ] Long names, long document numbers, large amounts, and missing data render cleanly.
- [ ] Light and dark themes remain readable.
- [ ] Edit form stays on page after save.
- [ ] Statement dialog renders document preview exactly once.

---

## Test Plan

### Automated
- TypeScript build for `apps/admin`.
- Unit tests for `buildActivityFeed()`: ordering, event types, target IDs, overdue/paid/voided cases.
- Query tests for `getClientsOverview()`: balance totals, last activity, edge cases.
- Component tests for client search/filter behaviour if test setup supports it.

### Manual
- Client with no invoices, quotes, or payments.
- Client with only quotes.
- Client with issued, overdue, partially paid, paid, and void invoices.
- Client with multiple payments allocated to invoices.
- Disabled client.
- Very long business name and missing email/phone.
- Desktop, tablet, and mobile widths.
- Light and dark themes.

---

## Defaults and Assumptions

- Keep the current route structure.
- Keep shadcn/ui components and existing table/tabs patterns.
- Use `lucide-react` for all new icons. No emoji in production UI.
- Do not add a new activity database table for this iteration — synthesise activity from existing invoices, quotes, and payments.
- Keep destructive actions behind confirmation dialogs.
- Prioritise billing usefulness over CRM features (notes, tasks, contact-person management) for this pass.
- Use existing helpers: `formatZAR`, `fmtDate`, `getSASTToday`.
- Respect PMG's financial year convention: 1 March to 28/29 February, for any period labels, year-to-date figures, or statement filters.