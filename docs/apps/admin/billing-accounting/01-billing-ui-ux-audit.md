# Billing UI/UX Audit and Improvement Plan

Date: 2026-06-13  
Scope: PMG Hub admin billing pages: quotes, invoices, payments, items, statements, document previews, and related billing actions.

## Executive Summary

The billing module is already functional and has several strong foundations: clickable document rows, reusable document previews, status badges, PDF/print/email actions, payment allocation, client statements, and division-specific billing settings. The biggest UX opportunity is to move the billing area from a set of separate document tables into an **accounts receivable workspace**.

Recommended direction:

1. Add a billing overview/dashboard that answers "what needs attention today?"
2. Standardize list pages around search, filters, saved status tabs, sortable columns, and bulk actions.
3. Make quote/invoice detail pages lifecycle-driven: draft, sent, viewed, accepted, issued, overdue, partially paid, paid, void.
4. Improve payment UX by making allocation clearer, safer, and reusable from invoice and client contexts.
5. Turn statements into a client account cockpit with aging, reminders, communication history, and direct payment actions.
6. Add customer-facing payment links or at least a cleaner public payment/share model later.

## Current Codebase Observations

Relevant files reviewed:

| Area | Files | Current state |
| --- | --- | --- |
| Quotes list/detail/form | `apps/admin/src/app/(admin)/billing/quotes/*` | Quote list has clickable rows, action dropdowns, pagination, status changes, detail preview, email/print/PDF, edit, and conversion actions. Quote form has division/client/date/reference/line items/VAT/discount/sticky summary. |
| Invoices list/detail/form | `apps/admin/src/app/(admin)/billing/invoices/*` | Invoice list mirrors quotes. Invoice detail has document preview, outstanding balance card, record-payment CTA, payment history, summary, activity, issue/mark paid/void actions. |
| Payments list/form/detail | `apps/admin/src/app/(admin)/billing/payments/*` | Payment list has clickable rows, credit balance, closed-period lock display, delete action. Add-payment flow supports client selection, outstanding invoices, FIFO auto-allocation, manual allocation, credit carry-forward, and receipt email option. |
| Statements | `apps/admin/src/app/(admin)/billing/statements/*` | Statements list supports search, all/outstanding filter, sorting, clickable rows. Detail has summary cards, document preview, aging breakdown, rolling period/fiscal year filters, and income records. |
| Shared billing components | `apps/admin/src/components/billing/*` | Reusable status badge, filter bar, line items, totals block, document preview, email dialogs, PDF/print buttons, mark-paid/void/convert/reminder actions. |
| Existing docs | `docs/billing/ui-updates.md`, `docs/billing/billing-fix-plan.md` | Prior notes cover clickable rows, payment table cleanup, payment edit flow, default due/expiry dates, and aging bucket fixes. |

Current strengths:

- Quotes, invoices, payments, and statements are close to a consistent clickable-row pattern.
- Document preview is strong and gives the detail pages a professional billing feel.
- Invoice detail already shows the most important operational CTA: record payment.
- Payment allocation handles real AR complexity: partial payments, FIFO allocation, and unallocated credit.
- Statements detail already behaves like a client account view, not just a static PDF.

Current friction:

- There is no billing overview page that prioritizes overdue invoices, outstanding amount, recent payments, draft documents, and upcoming due dates.
- List pages still feel document-type-first. Users must choose quotes, invoices, payments, or statements before they see what needs action.
- Quote and invoice list pages do not yet expose search, sortable columns, status tabs, saved filters, or bulk actions.
- Document detail actions are split between header and sidebar. It works, but the lifecycle state could be more explicit.
- Payment allocation is powerful but dense. It needs better visual feedback, invoice aging context, and safer error handling.
- Statements use a `91-120 Days` label in some UI, while prior docs recommend `91+`; aging language should be unified.
- Some form controls use native checkboxes where the rest of the app has shadcn-style controls. This makes the payment form feel less polished than quote/invoice forms.

## External Product Research

Sources reviewed:

- Stripe Invoicing docs: https://docs.stripe.com/invoicing
- Stripe Hosted Invoice Page: https://docs.stripe.com/invoicing/hosted-invoice-page
- Stripe Automatic Collection: https://docs.stripe.com/invoicing/automatic-collection
- Stripe Automatic Reconciliation: https://docs.stripe.com/invoicing/automatic-reconciliation
- QuickBooks Invoicing: https://quickbooks.intuit.com/accounting/invoicing/
- Xero Invoicing: https://www.xero.com/us/accounting-software/send-invoices/
- Zoho Invoice: https://www.zoho.com/us/invoice/
- Wave Invoicing: https://www.waveapps.com/invoicing

Key patterns:

- Stripe treats invoices as lifecycle objects from draft through paid/finalized, supports hosted invoice pages, email/PDF sharing, customer payment pages, automatic collection, and reconciliation.
- Xero emphasizes templates, sending/tracking invoices, automatic reminders, view notifications, payment notifications, unpaid invoice visibility, payment buttons, and audit trails.
- QuickBooks emphasizes automated reminders, real-time alerts, instantly payable invoices, matching payments to invoices, progress/partial payments, and showing clients what has been invoiced, paid, and still owed.
- Zoho Invoice uses a simple workflow model: create, send, receive. It also supports quote-to-invoice conversion, payment reminders, customer portals, dashboards, AR aging, top customers, and reports.
- Wave emphasizes knowing which invoices are on the way, when they should be paid, average time to pay, customer history, recurring billing, payment/communication tracking, overdue reminders, and online payment buttons.

Product lesson for PMG Hub:

Billing UX should optimize for **cash collection and client account clarity**, not just document management.

## Recommended Information Architecture

```text
Billing
├─ Overview
│  ├─ Receivables summary
│  ├─ Attention queue
│  ├─ Overdue invoices
│  ├─ Drafts waiting to send
│  ├─ Recent payments
│  └─ Aging summary
├─ Quotes
│  ├─ List
│  ├─ Detail / preview
│  └─ Create / edit
├─ Invoices
│  ├─ List
│  ├─ Detail / preview
│  └─ Create / edit
├─ Payments
│  ├─ List
│  ├─ Record payment
│  └─ Detail / edit
├─ Statements
│  ├─ Client accounts list
│  └─ Client statement detail
└─ Items
   ├─ Catalogue
   └─ Item detail / edit
```

## Best Layout Direction

### 1. Billing Overview

Add a first screen at `/billing` or make the existing billing group landing route a dashboard:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Billing                                      [New Quote] [New Invoice]       │
│ Track receivables, send documents, and collect payments.                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Outstanding       Overdue        Due this week       Paid this month         │
│ R 142,000         R 38,200       R 64,500            R 91,000                │
├──────────────────────────────────────┬───────────────────────────────────────┤
│ Attention Queue                      │ Aging Summary                         │
│ 5 overdue invoices                   │ Current | 1-14 | 15-30 | 31-60 | 91+ │
│ 3 draft invoices not sent            │                                       │
│ 2 accepted quotes not invoiced       │                                       │
├──────────────────────────────────────┴───────────────────────────────────────┤
│ Recent Activity                                                              │
│ Invoice issued, payment received, reminder sent, quote accepted              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Why this matters:

- Users should not need to inspect invoices, payments, and statements separately to know what needs follow-up.
- The most important billing question is usually "what money is outstanding and what should I do next?"

### 2. List Pages

Standardize all document list pages:

- Header: title, total amount, primary create action.
- KPI strip: count/amount by status.
- Filter bar: search, status, division, client, date range, amount range.
- Tabs or chips: all, draft, sent/issued, overdue, paid/accepted, void/cancelled.
- Table: clickable rows, sortable columns, clear status badges.
- Bulk actions: send reminders, export, mark sent/issued, archive/void where allowed.

Recommended invoice columns:

| Column | Purpose |
| --- | --- |
| Invoice # | Stable document identity. |
| Client | Main scan target. |
| Status | Lifecycle state. |
| Issue date | Accounting date. |
| Due date | Collection urgency. |
| Outstanding | Better than only total on AR views. |
| Last activity | Sent/viewed/reminded/paid timestamp later. |
| Actions | Overflow only. |

Recommended quote columns:

| Column | Purpose |
| --- | --- |
| Quote # | Stable identity. |
| Client | Main scan target. |
| Status | Draft/sent/accepted/declined/converted/expired. |
| Issue date | Timeline context. |
| Expiry date | Urgency. |
| Total | Value. |
| Next action | Send, convert, follow up, expired. |

### 3. Detail Pages

The current document preview plus sidebar is good. Improve it with a lifecycle/action bar:

```text
Draft → Sent → Viewed → Accepted/Issued → Paid
```

For quotes:

- Primary action should depend on status.
- Draft: `Send quote`, `Edit`.
- Sent: `Mark accepted`, `Mark declined`, `Send reminder`.
- Accepted: `Convert to invoice`.
- Converted: `View invoice`.

For invoices:

- Draft: `Issue invoice`, `Edit`.
- Issued: `Record payment`, `Send reminder`, `Void`.
- Overdue: `Send overdue reminder`, `Record payment`, `View statement`.
- Partially paid: `Record balance`, `View payment history`.
- Paid: `View receipt`, `Send receipt`, locked/no edit.

The header should keep print/PDF/email, but the sidebar should show the next operational action more prominently than secondary utilities.

### 4. Payment Flow

The payment form is one of the highest-value screens. Keep its two-column structure but improve clarity:

- Put the cash amount summary at the top of the allocation panel.
- Add aging/due-date context per invoice.
- Use badges for overdue/current.
- Show allocation progress as a small bar: received -> allocated -> credit.
- Replace native checkboxes with shared `Switch` or `Checkbox` components.
- Add quick allocation actions per row: `Fill`, `Clear`, `Pay balance`.
- Add validation near the allocation summary and disable submit only with a clear reason.
- After save, route to the payment detail page instead of back to the payment list if the user needs confirmation/receipt.

Recommended allocation panel:

```text
Payment: R 12,000
Allocated: R 9,500
Credit: R 2,500

Invoice     Due        Aging       Outstanding    Allocate
INV-001     Jun 1      Overdue     R 4,000        [R 4,000]
INV-002     Jun 8      Current     R 5,500        [R 5,500]
```

### 5. Statements

Statements are close to a client account cockpit. Improve them by adding:

- Client AR health card: outstanding, overdue, average days to pay, last payment.
- Reminder history.
- Last sent statement date.
- Direct actions: send statement, record payment, send reminder.
- Filter state in the header, not only the sidebar.
- Unified aging labels: current, 1-14, 15-30, 31-60, 61-90, 91+.

The current statement preview is useful, but the operational sidebar should answer:

- How much does this client owe?
- What is overdue?
- What was sent already?
- What should we do next?

### 6. Items Catalogue

Items should support faster quote/invoice creation:

- Search by name/code/description.
- Filter active/inactive.
- Show usage count or last used date.
- Show default price and VAT applicability.
- Inline status toggle for active/inactive.
- Item detail page should show recent usage in quotes/invoices.

## Visual and Interaction Recommendations

### Navigation and Page Headers

- Keep titles compact and operational.
- Add amounts to page totals, but do not rely only on the global header total.
- Use consistent primary actions: `New Quote`, `New Invoice`, `Record Payment`.
- Avoid putting unrelated actions in the same visual cluster.

### Tables

- Make row click behavior consistent everywhere.
- Add keyboard accessibility to clickable rows where possible.
- Use hover plus focus states.
- Keep the actions column narrow and isolated.
- Show empty states with the next useful action.
- Add search to every list where records can grow.

### Status Badges

Statuses should communicate state and next action:

- `draft`: neutral.
- `sent` / `issued`: blue.
- `accepted` / `paid`: green.
- `overdue`: red.
- `partially_paid`: amber or blue/amber hybrid.
- `void` / `cancelled`: muted.
- `expired` / `declined`: orange/red depending severity.

Add tooltips or helper text for uncommon statuses.

### Forms

- Keep quote/invoice forms as document builders with a sticky total panel.
- Add live document preview as an optional right-side mode later.
- Use the same date-term logic for quote expiry and invoice due dates.
- Show client/division defaults immediately after selection.
- Use stronger inline validation for missing client, empty line item, invalid dates, and impossible discounts.

### Document Preview

The preview is already a major strength. Improve it with:

- Better mobile handling: preview width toggle or "Preview / Details" tabs.
- Consistent public/client-facing wording.
- A clear "amount due" block for invoices, not only statements.
- Payment instruction visibility on invoices.
- Optional "Pay now" button or payment link placeholder when online payment is added.

## Priority Findings

### High Priority

1. **No Billing Overview**
   - Impact: users lack a single operational view of outstanding AR.
   - Fix: add dashboard with outstanding, overdue, due soon, paid this month, aging, and attention queue.

2. **List Filtering Is Too Thin**
   - Impact: document tables will become hard to use as data grows.
   - Fix: shared `BillingFilterBar` with search/status/division/client/date and status chips.

3. **Invoices Need Outstanding-Focused Columns**
   - Impact: total invoice amount is less useful than outstanding balance for collection work.
   - Fix: add `outstanding`, `paid`, or `balance` column to invoice list.

4. **Payment Allocation Needs Clearer Feedback**
   - Impact: dense allocation UI can cause user mistakes.
   - Fix: progress summary, aging badges, quick-fill actions, shared checkbox/switch components.

5. **Aging Labels Need Consistency**
   - Impact: statements and aging reports can disagree, damaging trust.
   - Fix: standardize on `Current`, `1-14`, `15-30`, `31-60`, `61-90`, `91+`.

### Medium Priority

1. Add lifecycle timeline to quote/invoice detail pages.
2. Add send/view/reminder/payment activity history.
3. Add bulk actions on invoices and quotes.
4. Add statement send/reminder actions directly from statement detail.
5. Add client account drawer or summary panel from invoice/payment rows.
6. Improve mobile behavior for wide document previews and allocation tables.

### Lower Priority

1. Customer portal.
2. Online payment links.
3. Recurring invoices.
4. Deposits/progress invoicing.
5. Automated reminder schedules.
6. Smart payment reconciliation/import.

## Suggested Implementation Roadmap

### Phase 1: Consistency and Scanability

- Add shared filter/search/status-chip controls to quotes, invoices, payments, items.
- Add outstanding/balance column to invoices.
- Add KPI/status strips to quotes and invoices.
- Unify aging bucket labels.
- Replace native payment checkboxes with shared UI controls.
- Improve empty states with page-specific CTAs.

### Phase 2: Billing Overview

- Create `/billing` overview page.
- Add AR KPI cards.
- Add aging summary.
- Add attention queue:
  - overdue invoices,
  - draft invoices,
  - sent quotes nearing expiry,
  - accepted quotes not converted,
  - unapplied credits.
- Add recent activity feed.

### Phase 3: Lifecycle Detail Pages

- Add lifecycle timeline to quote/invoice detail pages.
- Add activity history for sent emails, reminders, status changes, payments, PDF exports.
- Promote one primary next action per status.
- Add "View client account" links on document details.

### Phase 4: Collection Automation

- Add reminder templates and send history.
- Add bulk overdue reminders.
- Add recurring invoice support if needed.
- Add payment link architecture if online payment collection becomes a product goal.

## Acceptance Criteria

Billing overview:

- A user can tell total outstanding, overdue amount, and due-soon amount without opening a table.
- A user can see the top 5 follow-up actions immediately.
- A user can jump directly to the relevant invoice/client/payment workflow.

List pages:

- A user can search by document number or client.
- A user can filter by status and division.
- A user can sort by date, amount, and due date.
- Row click and action-menu behavior are consistent.

Document detail pages:

- A user can see document state, amount due, client, dates, and next action above the fold.
- A user can understand what has happened to the document from activity history.
- A user can print, export, email, edit, or record payment without hunting.

Payments:

- A user can see how much of a payment is allocated before saving.
- A user can identify overdue invoices during allocation.
- A user cannot accidentally allocate more than the payment amount.
- A user can save credit intentionally and see where it went.

Statements:

- A user can see client balance, aging, and recent activity at a glance.
- A user can send/export/print the statement from the same page.
- Aging buckets match the rest of the billing system.

## Recommended Next Step

Start with **Phase 1** and the **Billing Overview** foundation. The best first implementation slice is:

1. Add `/billing` overview with AR KPI cards and attention queue.
2. Add shared search/status filters to quote and invoice lists.
3. Add outstanding balance to invoice list.
4. Improve payment allocation summary and aging labels.

This gives PMG Hub the most practical UX lift: fewer clicks to know who owes money, clearer next actions, and a billing module that feels like a cash-collection system instead of separate document folders.
