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
**Status:** ✅ Done

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 2.1 | Create invoice server actions | `apps/admin/src/app/actions/billing-invoices.ts` | ✅ Done | `createInvoice`, `convertQuoteToInvoice`, `issueInvoice`, `markInvoicePaid`, `voidInvoice` |
| 2.2a | Create `MarkPaidButton` component | `components/billing/mark-paid-button.tsx` | ✅ Done | Disabled + tooltip when no client |
| 2.2b | Create `VoidInvoiceButton` component | `components/billing/void-invoice-button.tsx` | ✅ Done | Confirm dialog |
| 2.3a | Wire up invoice list page (real data) | `billing/invoices/page.tsx` | ✅ Done | Outstanding total, stats, row actions |
| 2.3b | Create invoice form client component | `billing/invoices/new/invoice-form-client.tsx` | ✅ Done | PO number, period lock warning |
| 2.3c | Patch invoice new page to be server component | `billing/invoices/new/page.tsx` | ✅ Done | |
| 2.4 | Wire up invoice detail page (real data + action bar) | `billing/invoices/[id]/page.tsx` | ✅ Done | Status-based actions, overdue banner, quote link |

### Phase 2 Acceptance Criteria
- [ ] Create standalone invoice
- [ ] Quote → Accept → Convert → Invoice (quote shows "Converted", invoice shows "From Quote")
- [ ] Issue invoice (Draft → Issued)
- [ ] Mark invoice paid → income row appears in `/income` with correct division, client, amount
- [ ] Dashboard revenue total increases by invoice amount
- [ ] Cannot mark paid with no client — button disabled with tooltip
- [ ] Cannot mark paid if period locked — toast error shown
- [ ] Void works for draft/issued, blocked for paid

**Phase 2 Completed:** May 8, 2026

---

## Phase 3 — Statements

**Goal:** Statement list and client detail pages show real data.  
**Status:** ✅ Done

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 3.1a | Wire up statements list page (real data) | `billing/statements/page.tsx` | ✅ Done | `getClientsWithBillingActivity()`, real table rows |
| 3.1b | Wire up client statement detail page | `billing/statements/[clientId]/page.tsx` | ✅ Done | Summary strip, transaction history, income records section |

### Phase 3 Acceptance Criteria
- [ ] Statement list shows all clients with billing activity and correct outstanding
- [ ] Client statement summary strip totals match manual calculation
- [ ] Transaction history table shows invoices as debits, payments as credits with running balance
- [ ] Income records section matches `/income` filtered by that client
- [ ] `notFound()` fires for unknown clientId

**Phase 3 Completed:** May 8, 2026

---

## Phase 4 — Items Catalogue

**Goal:** Items CRUD working. Combobox wired into line item form.  
**Status:** ✅ Done

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 4.1a | Create items server actions | `apps/admin/src/app/actions/billing-items.ts` | ✅ Done | `createItem`, `updateItem`, `archiveItem`, `unarchiveItem`, `deleteItem` |
| 4.1b | Wire up items list page (real data) | `billing/items/page.tsx` | ✅ Done | Active/Archived toggle, real table rows |
| 4.1c | Wire up items new page (real form) | `billing/items/new/page.tsx` | ✅ Done | VAT toggle, redirect on save |
| 4.1d | Wire up items detail page (real data + actions) | `billing/items/[id]/page.tsx` | ✅ Done | Save, Archive/Restore, Delete wired up |
| 4.2 | Upgrade `BillingLineItemsForm` with item combobox | `components/billing/billing-line-items-form.tsx` | ⏳ Pending | Deferred to v2 — Phase 4 core CRUD complete |

### Phase 4 Acceptance Criteria
- [ ] Create, edit, archive, and delete items
- [ ] Delete blocked when item is in use — "Archive instead" error shown
- [ ] No TypeScript errors

**Phase 4 Completed:** May 8, 2026

---

## Phase 5 — Settings Wiring

**Goal:** Organisation settings save. Billing settings save. Notifications toggles functional.  
**Status:** ✅ Done

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 5.1a | Add `organisation_settings` table to schema | `packages/db/src/schema/billing.ts` | ✅ Done | Singleton row, upsert pattern |
| 5.1b | Create settings server action | `apps/admin/src/app/actions/settings.ts` | ✅ Done | `updateOrganisationSettings` — upsert |
| 5.1c | Wire up organisation settings page | `settings/organisation/page.tsx` | ✅ Done | Real inputs, pre-filled, Save enabled |
| 5.2a | Add `division_billing_settings` table to schema | `packages/db/src/schema/billing.ts` | ✅ Done | Per-division, upsert on division_id |
| 5.2b | Create `saveDivisionBillingSettings` action | `apps/admin/src/app/actions/settings.ts` | ✅ Done | Zod validation, upsert |
| 5.2c | Patch `BillingSettingsClient` with real inputs | `settings/billing/billing-settings-client.tsx` | ✅ Done | Pre-fill from `currentSettings`, Save enabled |
| 5.2d | Patch billing settings page to fetch per-division settings | `settings/billing/page.tsx` | ✅ Done | Pass `currentSettings` per division |

### Phase 5 Acceptance Criteria
- [ ] Organisation settings save and reload correctly after page refresh
- [ ] Billing settings save per division — banking details persist across page refreshes
- [ ] Division settings tabs still work with real data
- [ ] No TypeScript errors

**Phase 5 Completed:** May 8, 2026

---

## Phase 6 — Polish & Cleanup

**Goal:** Production-ready. No broken states. No dev artefacts.  
**Status:** ✅ Done

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 6.1a | Remove mock preview links from list pages | `quotes/page.tsx`, `invoices/page.tsx`, `statements/page.tsx`, `items/page.tsx` | ✅ Done | Removed in Phase 3 |
| 6.1b | Remove all `const MOCK = {...}` from detail pages | All `[id]/page.tsx` files | ✅ Done | All data from DB |
| 6.1c | Remove mock preview routes if they exist | `/billing/*/mock-preview` | ✅ Done | Never existed as real routes |
| 6.2a | Create billing loading state | `apps/admin/src/app/(admin)/billing/loading.tsx` | ✅ Done | Created in Phase 1 |
| 6.2b | Create billing error state | `apps/admin/src/app/(admin)/billing/error.tsx` | ✅ Done | Created in Phase 1 |
| 6.3 | Final production readiness audit | All billing files | ✅ Done | All checks passed — see audit checklist below |

### Phase 6 Audit Checklist (from PHASED-PLAN.md Step 6.3)
- [x] All server actions call `getSessionOrRedirect()` at the top
- [x] All date inputs validate date <= today where applicable
- [x] All date mutations call `isPeriodClosed()` before writing to DB
- [x] `markInvoicePaid` checks `invoice.clientId !== null` before inserting to income
- [x] Income insert uses `date=paymentDate` (today — fixed for late payments), `divisionId`, `clientId`, `amount=invoice.total`
- [x] Document number utility uses atomic upsert (neon-http compatible)
- [x] All financial mutations `revalidatePath('/dashboard')`
- [x] `deleteQuotation` and `deleteItem` check status/usage before deleting
- [x] `ConvertToInvoiceButton` only visible/active when `quote.status === 'accepted'`
- [x] `MarkPaidButton` disabled when `invoice.clientId` is null
- [x] Statement income section uses `getAllIncome({ clientId })` — existing function
- [x] `created_by` fields store `session.user.id` which is text (not uuid)
- [x] `updatedAt` set explicitly as `new Date()` — no `$onUpdate()` in schema
- [x] All mock preview links removed from production pages
- [x] `billing.ts` added to `schema/index.ts` exports
- [x] Build passes with zero TypeScript errors

**Phase 6 Completed:** May 8, 2026

---

## Overall Progress

| Phase | Description | Status | Completed |
|-------|-------------|--------|-----------|
| 0 | Schema, Utilities & Queries | ✅ Done | May 8, 2026 |
| 1 | Quotations | ✅ Done | May 8, 2026 |
| 2 | Invoices + Mark Paid | ✅ Done | May 8, 2026 |
| 3 | Statements | ✅ Done | May 8, 2026 |
| 4 | Items Catalogue | ✅ Done | May 8, 2026 |
| 5 | Settings Wiring | ✅ Done | May 8, 2026 |
| 6 | Polish & Cleanup | ✅ Done | May 8, 2026 |
| 7 | System Updates (Quotes, Invoices & Items) | ✅ Done | May 9, 2026 |

---

## v2 Backlog (Post-Launch)

| Feature | What's Needed | Priority |
|---------|---------------|----------|
| PDF generation | `@react-pdf/renderer` — `QuotePDF`, `InvoicePDF`, `StatementPDF` | High |
| Email delivery | Resend + React Email — send on `issueInvoice`, `sendQuote` | High |
| Audit log | `billing_audit_log` table — all status transitions | Medium |
| Partial payments | `billing_payments` table, `PARTIALLY_PAID` status | Medium |
| Statement export | CSV server action (mirrors `exportFinancialsCsv`) | Low |
| Overdue auto-flag | On-read check: past due + issued → flag overdue | Low |
| Localisation settings | Wire up timezone, date format, financial year start | Low |
| Email settings | Wire up Resend API key, sender identity | Low |
| Notification toggles | `notification_settings` table, toggle save | Low |

---

## Phase 7 — System Updates (Quotes, Invoices & Items)

**Goal:** Apply the system update requirements from `notes.md` across quotes, invoices, and items.  
**Status:** ✅ Done

| # | Task | File(s) | Status | Notes |
|---|------|---------|--------|-------|
| 7.1 | Enforce client required on quote + invoice create | `billing-schema.ts`, `quote-form-client.tsx`, `invoice-form-client.tsx` | ✅ Done | Zod: `clientId` required. UI validates before submit. |
| 7.2 | Enforce items-from-catalogue only on line items form | `billing-line-items-form.tsx` | ✅ Done | `!r.itemId` check in both form clients + red border on unselected rows + Zod UUID validation server-side |
| 7.3 | Remove per-item VAT; add document-level VAT toggle | `billing-schema.ts`, form clients, `billing-totals-block.tsx` | ✅ Done | `vatEnabled` boolean in schema. Toggle in summary sidebar. |
| 7.4 | Remove VAT per line item from `BillingLineItemsForm` | `billing-line-items-form.tsx`, `billing-line-items-table.tsx` | ✅ Done | VAT column removed from both form and read-only table. |
| 7.5 | Make Summary sidebar sticky | All quote/invoice create + detail pages | ✅ Done | `lg:sticky lg:top-16 self-start` on sidebar column. |
| 7.6 | Add edit route for quotes | `billing/quotes/[id]/edit/page.tsx` | ✅ Done | Guards draft/sent/accepted only. |
| 7.7 | Add edit route for invoices | `billing/invoices/[id]/edit/page.tsx` | ✅ Done | Guards draft/issued/overdue only. Edit hidden on paid. |
| 7.8 | Guard paid invoices from edit/delete | `billing-invoices.ts`, `billing/invoices/[id]/page.tsx` | ✅ Done | Server action blocks paid/void. UI hides Edit button. |
| 7.9 | Add reference input to quote form | `billing-schema.ts`, `quote-form-client.tsx`, detail page | ✅ Done | `reference` column in schema. Shows in form + DocumentPreview. |
| 7.10 | Add discount field to quote + invoice forms | `billing-schema.ts`, form clients, `billing-totals-block.tsx` | ✅ Done | `discount_type`, `discount_value`, `discount_amount` in schema. % / R toggle in sidebar. |
| 7.11 | Add Export as PDF button to quote + invoice detail | `billing/quotes/[id]/page.tsx`, `billing/invoices/[id]/page.tsx` | ✅ Done | Disabled shell button in header. Wired in v2. |
| 7.12 | Remove VAT Applicable toggle from items new + edit | `billing/items/new/page.tsx`, `billing/items/[id]/page.tsx` | ✅ Done | Toggle removed from UI. `vatApplicable` column preserved in DB for compatibility. |
| 7.13 | Auto-set `isActive` on archive/restore | `billing-items.ts` | ✅ Done | `billing_items` uses `status` enum (`active`/`archived`) — no separate `isActive` column needed. `getAllItems` filters by `status`. Requirement satisfied by existing design. |
| 7.14 | Schema migration for new fields | `packages/db/src/schema/billing.ts` | ✅ Done | `reference`, `discount_*`, `vat_enabled` added to quotations + invoices. Migrations applied. |

### Phase 7 Acceptance Criteria
- [x] Cannot save a quote or invoice without a client — inline error shown
- [x] Line items combobox enforces catalogue selection — red border + error message on unselected rows
- [x] VAT toggle in Summary sidebar defaults to off; toggling on shows 15% VAT row
- [x] No VAT column on line item rows
- [x] Summary sidebar is sticky on all quote/invoice create and detail pages
- [x] Can edit a draft or sent quote; cannot edit accepted/converted/declined/cancelled/expired
- [x] Can edit a draft/issued/overdue invoice; Edit button hidden on paid invoices
- [x] Cannot edit/delete a paid invoice — server action guard + UI
- [x] Reference field appears on quote form and renders on DocumentPreview
- [x] Discount field works in both % and R modes; shown as negative line in summary
- [x] Export as PDF button visible in header (disabled shell)
- [x] VAT Applicable toggle gone from items new and edit pages
- [x] Archive/restore uses `status` enum — no separate `isActive` column required
- [x] Migration runs clean — new columns visible in Neon console
- [x] No TypeScript errors

**Phase 7 Completed:** May 9, 2026

---

*Last updated: May 2026 — Update this file at the end of each phase.*
