# PMG Control Center — Billing & Settings Task List

**Project:** PMG Control Center — Billing Module + Settings  
**Developer:** Jacob C.  
**Started:** May 2026  
**Reference:** `PHASED-PLAN.md`

> Update the status column at the end of each phase. Use ✅ Done · 🔄 In Progress · ⏳ Pending · ❌ Blocked

---

## Phase 0 — Schema, Utilities & Queries

**Goal:** Database ready, document sequencing works, all queries typed.  
**Status:** ✅ Done

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 0.1 | Create Drizzle billing schema (5 tables) | `packages/db/src/schema/billing.ts` | ✅ Done | |
| 0.2 | Export billing schema from schema index | `packages/db/src/schema/index.ts` | ✅ Done | One-liner: `export * from "./billing"` |
| 0.3 | Create document number utility | `packages/db/src/lib/document-numbers.ts` | ✅ Done | Transactional, locked sequence |
| 0.4 | Create billing query functions (8 functions) | `packages/db/src/queries/billing.ts` | ✅ Done | |
| 0.5 | Export billing queries from DB index | `packages/db/src/index.ts` | ✅ Done | |
| 0.6 | Generate and run Drizzle migration | — | ✅ Done | `drizzle-kit generate` + `migrate` |

### Phase 0 Acceptance Criteria
- [x] `billing.ts` schema with 5 tables — no TypeScript errors
- [x] Migration runs clean — 5 new tables visible in Neon console
- [ ] `getNextDocumentNumber('division-uuid', 'quote', 2026)` → `APX-Q-2026-001`, second call → `APX-Q-2026-002`
- [ ] `getAllQuotations()` returns typed rows without error
- [x] All exports visible from `packages/db/src/index.ts`

**Phase 0 Completed:** May 8, 2026

---

## Phase 1 — Quotations (Wire Up Existing Shell)

**Goal:** Quote create form works end-to-end. List shows real data. Detail shows real data with working status actions.  
**Status:** ✅ Done

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 1.1a | Create Zod billing schemas | `apps/admin/src/app/actions/billing-schema.ts` | ✅ Done | `LineItemSchema`, `CreateQuotationSchema`, `CreateInvoiceSchema` |
| 1.1b | Create quote server actions | `apps/admin/src/app/actions/billing-quotes.ts` | ✅ Done | `createQuotation`, `updateQuotationStatus`, `deleteQuotation` |
| 1.2a | Create `BillingStatusBadge` component | `components/billing/billing-status-badge.tsx` | ✅ Done | |
| 1.2b | Create `BillingLineItemsForm` component | `components/billing/billing-line-items-form.tsx` | ✅ Done | Editable table with add/remove rows |
| 1.2c | Create `BillingLineItemsTable` component | `components/billing/billing-line-items-table.tsx` | ✅ Done | Read-only display |
| 1.2d | Create `BillingTotalsBlock` component | `components/billing/billing-totals-block.tsx` | ✅ Done | Subtotal / VAT / Total |
| 1.2e | Create `ConvertToInvoiceButton` component | `components/billing/convert-to-invoice-button.tsx` | ✅ Done | Confirm + redirect |
| 1.3a | Wire up quote list page (real data) | `billing/quotes/page.tsx` | ✅ Done | Patch shell — async, searchParams, real rows |
| 1.3b | Create quotes client component | `billing/quotes/quotes-client.tsx` | ✅ Done | Pagination, filters, row actions |
| 1.4a | Create quote form client component | `billing/quotes/new/quote-form-client.tsx` | ✅ Done | Controlled state, line items, live totals |
| 1.4b | Patch quote new page to be server component | `billing/quotes/new/page.tsx` | ✅ Done | Fetch divisions + clients, render client form |
| 1.5 | Wire up quote detail page (real data + action bar) | `billing/quotes/[id]/page.tsx` | ✅ Done | Status-based action bar, real sidebar amounts |

### Phase 1 Acceptance Criteria
- [ ] Create a quote with 3 line items (mix of 0% and 15% VAT) — correct totals
- [ ] Document number auto-assigned on save (`APX-Q-2026-001`)
- [ ] Quote appears in list with correct status badge
- [ ] Draft → Sent → Accepted lifecycle works
- [ ] Decline a sent quote
- [ ] Delete a draft (blocked for sent/accepted)
- [ ] Detail page shows real data, correct action bar per status
- [ ] No TypeScript errors

**Phase 1 Completed:** May 8, 2026

---

## Phase 2 — Invoices + Mark Paid

**Goal:** Full invoice lifecycle. Mark paid posts to income table. Dashboard updates.  
**Status:** ⏳ Pending

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 2.1 | Create invoice server actions | `apps/admin/src/app/actions/billing-invoices.ts` | ⏳ Pending | `createInvoice`, `convertQuoteToInvoice`, `issueInvoice`, `markInvoicePaid`, `voidInvoice` |
| 2.2a | Create `MarkPaidButton` component | `components/billing/mark-paid-button.tsx` | ⏳ Pending | Disabled + tooltip when no client |
| 2.2b | Create `VoidInvoiceButton` component | `components/billing/void-invoice-button.tsx` | ⏳ Pending | Confirm dialog |
| 2.3a | Wire up invoice list page (real data) | `billing/invoices/page.tsx` | ⏳ Pending | Outstanding total, stats, row actions |
| 2.3b | Create invoice form client component | `billing/invoices/new/invoice-form-client.tsx` | ⏳ Pending | PO number, period lock warning |
| 2.3c | Patch invoice new page to be server component | `billing/invoices/new/page.tsx` | ⏳ Pending | |
| 2.4 | Wire up invoice detail page (real data + action bar) | `billing/invoices/[id]/page.tsx` | ⏳ Pending | Status-based actions, overdue banner, quote link |

### Phase 2 Acceptance Criteria
- [ ] Create standalone invoice
- [ ] Quote → Accept → Convert → Invoice (quote shows "Converted", invoice shows "From Quote")
- [ ] Issue invoice (Draft → Issued)
- [ ] Mark invoice paid → income row appears in `/income` with correct division, client, amount
- [ ] Dashboard revenue total increases by invoice amount
- [ ] Cannot mark paid with no client — button disabled with tooltip
- [ ] Cannot mark paid if period locked — toast error shown
- [ ] Void works for draft/issued, blocked for paid

**Phase 2 Completed:** ___________

---

## Phase 3 — Statements

**Goal:** Statement list and client detail pages show real data.  
**Status:** ⏳ Pending

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 3.1a | Wire up statements list page (real data) | `billing/statements/page.tsx` | ⏳ Pending | `getClientsWithBillingActivity()`, real table rows |
| 3.1b | Wire up client statement detail page | `billing/statements/[clientId]/page.tsx` | ⏳ Pending | Summary strip, transaction history, income records section |

### Phase 3 Acceptance Criteria
- [ ] Statement list shows all clients with billing activity and correct outstanding
- [ ] Client statement summary strip totals match manual calculation
- [ ] Transaction history table shows invoices as debits, payments as credits with running balance
- [ ] Income records section matches `/income` filtered by that client
- [ ] `notFound()` fires for unknown clientId

**Phase 3 Completed:** ___________

---

## Phase 4 — Items Catalogue

**Goal:** Items CRUD working. Combobox wired into line item form.  
**Status:** ⏳ Pending

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 4.1a | Create items server actions | `apps/admin/src/app/actions/billing-items.ts` | ⏳ Pending | `createItem`, `updateItem`, `archiveItem`, `unarchiveItem`, `deleteItem` |
| 4.1b | Wire up items list page (real data) | `billing/items/page.tsx` | ⏳ Pending | `getAllItems()`, real table rows |
| 4.1c | Wire up items new page (real form) | `billing/items/new/page.tsx` | ⏳ Pending | VAT toggle as shadcn Switch |
| 4.1d | Wire up items detail page (real data + actions) | `billing/items/[id]/page.tsx` | ⏳ Pending | Save, Archive, Delete wired up |
| 4.2 | Upgrade `BillingLineItemsForm` with item combobox | `components/billing/billing-line-items-form.tsx` | ⏳ Pending | Command + Popover, pre-fill on select |

### Phase 4 Acceptance Criteria
- [ ] Create, edit, archive, and delete items
- [ ] Delete blocked when item is in use — "Archive instead" error shown
- [ ] Combobox in line items form filters and pre-fills description, price, VAT rate
- [ ] Archived items do not appear in combobox
- [ ] No TypeScript errors

**Phase 4 Completed:** ___________

---

## Phase 5 — Settings Wiring

**Goal:** Organisation settings save. Billing settings save. Notifications toggles functional.  
**Status:** ⏳ Pending

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 5.1a | Add `organisation_settings` table to schema | `packages/db/src/schema/billing.ts` or `settings.ts` | ⏳ Pending | Singleton row, upsert pattern |
| 5.1b | Create settings server action | `apps/admin/src/app/actions/settings.ts` | ⏳ Pending | `updateOrganisationSettings` — upsert |
| 5.1c | Wire up organisation settings page | `settings/organisation/page.tsx` | ⏳ Pending | Real inputs, pre-filled, Save enabled |
| 5.2a | Add `division_billing_settings` table to schema | `packages/db/src/schema/billing.ts` or `settings.ts` | ⏳ Pending | Per-division, upsert on division_id |
| 5.2b | Create `saveDivisionBillingSettings` action | `apps/admin/src/app/actions/settings.ts` | ⏳ Pending | Zod validation, upsert |
| 5.2c | Patch `BillingSettingsClient` with real inputs | `settings/billing/billing-settings-client.tsx` | ⏳ Pending | Pre-fill from `currentSettings`, Save enabled |
| 5.2d | Patch billing settings page to fetch per-division settings | `settings/billing/page.tsx` | ⏳ Pending | Pass `currentSettings` per division |

### Phase 5 Acceptance Criteria
- [ ] Organisation settings save and reload correctly after page refresh
- [ ] Billing settings save per division — banking details persist across page refreshes
- [ ] Division settings tabs still work with real data
- [ ] No TypeScript errors

**Phase 5 Completed:** ___________

---

## Phase 6 — Polish & Cleanup

**Goal:** Production-ready. No broken states. No dev artefacts.  
**Status:** ⏳ Pending

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 6.1a | Remove mock preview links from list pages | `quotes/page.tsx`, `invoices/page.tsx`, `statements/page.tsx`, `items/page.tsx` | ⏳ Pending | |
| 6.1b | Remove all `const MOCK = {...}` from detail pages | All `[id]/page.tsx` files | ⏳ Pending | All data now from DB |
| 6.1c | Remove mock preview routes if they exist | `/billing/*/mock-preview` | ⏳ Pending | |
| 6.2a | Create billing loading state | `apps/admin/src/app/(admin)/billing/loading.tsx` | ⏳ Pending | Copy from existing loading.tsx |
| 6.2b | Create billing error state | `apps/admin/src/app/(admin)/billing/error.tsx` | ⏳ Pending | Copy from existing error.tsx |
| 6.3 | Final production readiness audit | All billing files | ⏳ Pending | Run audit prompt from PHASED-PLAN.md |

### Phase 6 Audit Checklist (from PHASED-PLAN.md Step 6.3)
- [ ] All server actions call `getSessionOrRedirect()` at the top
- [ ] All date inputs validate date <= today where applicable
- [ ] All date mutations call `isPeriodClosed()` before writing to DB
- [ ] `markInvoicePaid` checks `invoice.clientId !== null` before inserting to income
- [ ] Income insert uses `date=invoice.invoiceDate` (not today), `divisionId`, `clientId`, `amount=invoice.total`
- [ ] Document number utility runs inside a transaction with `.for('update')`
- [ ] All financial mutations `revalidatePath('/dashboard')`
- [ ] `deleteQuotation` and `deleteItem` check status/usage before deleting
- [ ] `ConvertToInvoiceButton` only visible/active when `quote.status === 'accepted'`
- [ ] `MarkPaidButton` disabled when `invoice.clientId` is null
- [ ] Statement income section uses `getAllIncome({ clientId })` — existing function
- [ ] `created_by` fields store `session.user.id` which is text (not uuid)
- [ ] `updatedAt` set explicitly as `new Date()` — no `$onUpdate()` in schema
- [ ] All mock preview links removed from production pages
- [ ] `billing.ts` added to `schema/index.ts` exports

**Phase 6 Completed:** ___________

---

## Overall Progress

| Phase | Description | Status | Completed |
|-------|-------------|--------|-----------|
| 0 | Schema, Utilities & Queries | ✅ Done | May 8, 2026 |
| 1 | Quotations | ✅ Done | May 8, 2026 |
| 2 | Invoices + Mark Paid | ⏳ Pending | — |
| 3 | Statements | ⏳ Pending | — |
| 4 | Items Catalogue | ⏳ Pending | — |
| 5 | Settings Wiring | ⏳ Pending | — |
| 6 | Polish & Cleanup | ⏳ Pending | — |

---

## v2 Backlog (Post-Launch)

| Feature | What's Needed | Priority |
|---------|---------------|----------|
| PDF generation | `@react-pdf/renderer` — `QuotePDF`, `InvoicePDF`, `StatementPDF` | High |
| Email delivery | Resend + React Email — send on `issueInvoice`, `sendQuote` | High |
| Audit log | `billing_audit_log` table — all status transitions | Medium |
| Discount fields | Line-item % discount + document-level fixed/% | Medium |
| Partial payments | `billing_payments` table, `PARTIALLY_PAID` status | Medium |
| Statement export | CSV server action (mirrors `exportFinancialsCsv`) | Low |
| Overdue auto-flag | On-read check: past due + issued → flag overdue | Low |
| Localisation settings | Wire up timezone, date format, financial year start | Low |
| Email settings | Wire up Resend API key, sender identity | Low |
| Notification toggles | `notification_settings` table, toggle save | Low |

---

*Last updated: May 2026 — Update this file at the end of each phase.*
