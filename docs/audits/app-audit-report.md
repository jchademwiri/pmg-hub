# PMG Control Center — App Audit Report (Revision 6)
**Date:** May 2026  
**Previous revisions:** Rev 1–5 (28 quick wins applied)  
**All previous quick wins confirmed applied ✅**

---

## ✅ Rev 5 Changes — Confirmed Applied

| Change | Status |
|---|---|
| `link-payment-button.tsx` deleted | ✅ File gone |
| `linkInvoiceToIncome` action removed from `billing-invoices.ts` | ✅ Removed |
| `getUnlinkedIncomeForClient` removed from invoice detail page | ✅ Removed |
| `LinkPaymentButton` removed from `invoice-detail-actions.tsx` | ✅ Removed |
| `UnlinkedIncomeRow` interface removed | ✅ Removed |
| `linkPaymentAction` / `unlinkedIncome` props removed | ✅ Removed |
| `getIncomeById` dead import removed from `billing-invoices.ts` | ✅ Removed |

**Exported actions in `billing-invoices.ts` (current):**
`createInvoice` · `updateInvoice` · `convertQuoteToInvoice` · `issueInvoice` · `markInvoicePaid` · `voidInvoice`

---

## ⚡ Quick Wins — Revision 6 (< 30 min each)

### QW-26 — Add `fmtDateTime()` helper and use it for activity timestamps
**Effort:** 10 min  
**Files:** `apps/admin/src/lib/format.ts`, `billing/quotes/[id]/page.tsx`, `billing/invoices/[id]/page.tsx`  
**Issue:** Activity card timestamps in both detail pages use inline `new Date(...).toLocaleString('en-ZA', {...})` calls. The options object is duplicated across 3 places. Inconsistent with the rest of the app which uses shared helpers from `lib/format.ts`.  
**Affected lines:**
- `quotes/[id]/page.tsx` line ~148 — `quote.createdAt`
- `invoices/[id]/page.tsx` line ~160 — `invoice.paidAt`
- `invoices/[id]/page.tsx` line ~170 — `invoice.createdAt`

**Fix:**
```ts
// lib/format.ts — add:
export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  return date.toLocaleString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
```
Then replace all 3 inline calls with `fmtDateTime(...)`.

---

## 📅 Complete Date Format Audit

### ✅ All UI date fields formatted correctly

| Location | Field(s) | Format |
|---|---|---|
| Quotes list | `quoteDate`, `expiryDate` | ✅ `fmtDate()` |
| Invoices list | `invoiceDate`, `dueDate` | ✅ `fmtDate()` |
| Quote detail header | `quoteDate` | ✅ `fmtDate()` |
| Invoice detail header | `invoiceDate` | ✅ `fmtDate()` |
| Invoice detail — paid state | `paidAt` | ✅ `fmtDate()` |
| Client detail — income history | `entry.date` | ✅ `fmtDate()` |
| Division detail — income/expense history | `e.date` | ✅ `fmtDate()` |
| Accounts detail — statement table | `row.date` | ✅ `fmtDate()` |
| Statement detail — income records | `inc.date` | ✅ `fmtDate()` |
| Statements list — last activity | `lastActivityDate` | ✅ `fmtDate()` |
| Document preview — all dates | all | ✅ `fmtDateLong()` |
| Income/expense filter bars — month labels | `month + '-01'` | ✅ `toLocaleString` (month+year only, correct) |
| Snapshots list — period labels | `period + '-01'` | ✅ `toLocaleString` (month+year only, correct) |

### ⚠️ Minor inconsistency (QW-26)

| Location | Field | Issue |
|---|---|---|
| Quote detail — Activity card | `quote.createdAt` | Inline `toLocaleString` — should use `fmtDateTime()` |
| Invoice detail — Activity card | `invoice.paidAt`, `invoice.createdAt` | Inline `toLocaleString` — should use `fmtDateTime()` |

---

## 🟡 Medium Priority

### M-1 — Overdue invoice auto-flagging ⭐ (still pending)
**Issue:** `getAllInvoices` returns the raw DB `status` column. No computed transform exists. Invoices past their due date stay as `issued` in the DB indefinitely. The "Overdue" stat card on the invoices page counts `status = 'overdue'` rows — which will always be 0 unless someone manually sets that status via a direct DB update.  
**Note:** `invoice-detail-actions.tsx` does compute `isOverdue` client-side from `dueDate` to show the amber banner, but this doesn't affect the stored status or the list page stat.  
**Fix:** Add a computed transform in `getAllInvoices` (and `getInvoiceById`) after the DB fetch:
```ts
const today = new Date().toISOString().slice(0, 10)
data = data.map(inv => ({
  ...inv,
  status: inv.status === 'issued' && inv.dueDate && inv.dueDate < today
    ? 'overdue'
    : inv.status,
}))
```
No DB write needed — purely computed at read time.

### M-2 — Free-text search on Clients and Invoices ⭐ (still pending)
**Issue:** No text search on any list page. Invoices and quotes support `divisionId` + `status` URL filters but no name/number search. Clients page has no filter bar at all.  
**Fix:** Add a search input to the filter bars; pass a `query` param to `getAllInvoices` / `getAllQuotations` / `getClientsWithIncomeCount` and add `ILIKE '%query%'` conditions on client name and document number.

### M-3 — Mark Paid from invoice list dropdown (still pending)
**Issue:** `MarkPaidButton` exists and works on the invoice detail page, but the invoices list row dropdown only has View, Issue Invoice, and Void. Users must navigate into each invoice to mark it paid.  
**Fix:** Add a "Mark Paid" `DropdownMenuItem` in `invoices-client.tsx` for `issued`/`overdue` rows, wired to the existing `markInvoicePaid` server action (already imported in `invoices/page.tsx`).

### M-4 — Client detail → New Invoice shortcut (still pending)
**Issue:** No "New Invoice" button on the client detail page. Users must navigate to `/billing/invoices/new` and manually re-select the client.  
**Fix:** Add a "New Invoice" button linking to `/billing/invoices/new?clientId={id}`. Pre-fill the client field in the invoice form when `clientId` is present in search params.

### M-5 — Dynamic account locking (still pending — 1 TODO comment)
**Issue:** `LOCKED_ACCOUNTS` in `apps/admin/src/lib/accounts.ts` is a hardcoded `const` array. Locking or unlocking an account requires a code change and redeploy. A `// TODO` comment acknowledges this.  
**Fix:** Move locked accounts to a DB settings table; read via a cached query. Remove the TODO.

### M-6 — Unsaved changes warning on settings forms (still pending)
**Issue:** Settings forms have no `isDirty` guard. Navigating away silently discards edits.  
**Fix:** Track `isDirty` state; add a `beforeunload` listener and/or a confirmation dialog on navigation when there are unsaved changes.

### M-7 — Statement list — year filter (still pending)
**Issue:** The statements list (`/billing/statements`) shows all clients with no year filter. The statement detail page already supports `?year=` filtering, but there's no way to reach it from the list with a year pre-selected.  
**Fix:** Add a year dropdown to the statements list page; pass the selected year through to the client statement links.

---

## 🔴 Functional Gaps (v2 backlog — unchanged)

| Gap | Status |
|---|---|
| PDF generation | Shell button (disabled, `title="Coming soon"`) |
| Email delivery | Shell button (disabled, `title="Coming soon"`) |
| Security settings | "Soon" badge |
| Data & Exports | "Soon" badge |
| Notification settings | Not started |
| Logo upload | Disabled button (`title="Coming soon"`) |

---

## 📊 Complete Date Format Reference

### `lib/format.ts` — current helpers

| Function | Output | Use case |
|---|---|---|
| `fmtDate(value)` | `08 May 2026` | All UI date fields |
| `fmtDateLong(value)` | `08 May 2026` (long month) | Printed documents |
| `formatZAR(amount)` | `R 1 234.56` | All currency fields |
| *(missing)* `fmtDateTime(value)` | `08 May 2026, 14:30` | Activity timestamps (QW-26) |

---

## ✅ Confirmed Working — Full Inventory

| Area | Detail |
|---|---|
| All 28 previous quick wins | Applied and verified |
| Date formatting | Consistent `fmtDate()` / `fmtDateLong()` across all UI |
| Disabled buttons | All have `title="Coming soon"` or tooltip |
| Link Payment flow | Fully removed (migration complete) |
| Invoice actions | `createInvoice`, `updateInvoice`, `convertQuoteToInvoice`, `issueInvoice`, `markInvoicePaid`, `voidInvoice` |
| Quote actions | `createQuotation`, `updateQuotation`, `updateQuotationStatus`, `deleteQuotation` |
| Statement year filter | Working via `?year=` param on detail page |
| Overdue banner | Shows client-side on invoice detail when past due date |
| TypeScript | Zero errors |

---

## 📊 Scores

| Area | Rev 5 | Rev 6 | Notes |
|---|---|---|---|
| Functionality | 9/10 | 9/10 | Overdue flagging, search, Mark Paid from list still pending |
| Usability | 8.5/10 | 8.5/10 | QW-26 (fmtDateTime) still pending |
| Code Quality | 9.5/10 | 9.5/10 | 1 TODO remains (LOCKED_ACCOUNTS); link payment dead code fully removed |
| Performance | 8/10 | 8/10 | No change |
| Security | 9.5/10 | 9.5/10 | No change |
| Accessibility | 7/10 | 7/10 | No change |
| **Overall** | **8.6** | **8.6** | Stable — cleanup complete, medium items remain |

---

## 🎯 Recommended Next Actions

**Do now (< 15 min):**
1. QW-26 — Add `fmtDateTime()` to `lib/format.ts` and replace 3 inline `toLocaleString` calls

**Do this week:**
2. M-1 — Overdue invoice auto-flagging (1 hour) ⭐ highest impact — fixes the always-zero stat
3. M-3 — Mark Paid from invoice list dropdown (30 min)

**Do this sprint:**
4. M-2 — Free-text search on Clients and Invoices (2–3 hours)
5. M-4 — Client detail → New Invoice shortcut (1 hour)
6. M-5 — Dynamic account locking (2 hours)
7. M-6 — Unsaved changes warning (1 hour)
8. M-7 — Statement list year filter (1 hour)

---

*Updated: May 2026 — PMG Control Center Audit Revision 6*


---

## Appendix: Initial Codebase Assessment (from notes.md)

I've read through your entire PMG Control Center codebase. It's a well-structured, production-quality admin system. Here's my honest assessment organized by priority:

---

**Strengths worth keeping**
Your Server Actions pattern is clean and consistent. The `{ error?: string }` return type, Zod validation before DB operations, and `revalidatePath` calls are all solid. The component architecture — page fetches data, passes Server Actions down as props — is exactly right for Next.js 15.

---

**High Priority Issues**

**1. The `proxy.ts` / `middleware.ts` auth check is insufficient**
The middleware only checks for the existence of a session cookie, not its validity. An expired or tampered cookie would pass through. You need to validate the session server-side in the middleware, or at minimum add Better Auth's session verification there.

**2. No VAT handling on income**
Given this is a South African business, income recorded should probably distinguish between VAT-inclusive and VAT-exclusive amounts, and track VAT output liability separately. Right now all income flows in as a raw number with no VAT awareness.

**3. `autoClosePreviousMonthIfNeeded` runs on every dashboard load**
This is called `await autoClosePreviousMonthIfNeeded()` in the dashboard page on every request. It hits the DB every time. It should be guarded with a flag, a cron job, or at least memoized per-request.

**4. `recordWithdrawal` in `withdraw.ts` vs `withdrawals.ts` — duplicate action files**
You have `apps/admin/src/app/actions/withdraw.ts` and `withdrawals.ts`. The former is used by `salary-card.tsx` but bypasses the `account` field validation (hardcodes `'salary'`). This is a data integrity risk — salary withdrawals via the dashboard modal won't record to the correct account if it ever changes.

**5. Raw SQL in `users.ts` actions**
`UPDATE "user" SET "role" = ...` using raw SQL bypasses Drizzle's type safety entirely. You have Drizzle with the users table available via Better Auth's adapter — you should use the ORM or at minimum parameterize carefully. It works, but it's a maintenance liability.

---

**Medium Priority**

**6. `ACCOUNT_RATES` in `accounts.ts` has a math bug**
```ts
salary:    0.35,  // of profit pool
pmg_share: 0.20,  // of revenue — different base!
reinvest:  0.30,
reserve:   0.30,
flex:      0.05,
```
The rates for `salary + reinvest + reserve + flex` sum to 1.00, but `pmg_share` is on a different base (revenue, not profit pool). This is commented but the `ACCOUNT_RATES` object is misleading — it implies a uniform rate base. Someone consuming this object without reading the comment will calculate wrong. Separate these cleanly or add a type discriminator.

**7. The `WithdrawModal` doesn't pass the account key**
`recordWithdrawal` in `withdraw.ts` defaults `account` to `'salary'`. But if someone uses the dashboard salary card's withdraw button for a different period or account context, it always records to salary. The account should be passed explicitly.

**8. Statement page running balance uses `effectiveRate` approximation**
In `accounts/[account]/page.tsx`, each income entry is proportionally credited using `earned / totalRevenue`. This is a reasonable approximation but means the per-transaction balance is not the actual flow — it's a synthetic allocation. This could cause confusion if users expect it to reflect real cash movements. It should be clearly labeled as "allocated" not "deposited."

**9. No pagination anywhere**
`getAllIncome()`, `getAllExpenses()`, `getAllWithdrawals()` — all return full result sets. As data grows this will become slow and memory-intensive. You should add cursor-based or offset pagination to the table pages, at minimum with a `LIMIT` at the DB query level.

**10. `leads-table.tsx` badge classes use light-mode Tailwind colors**
```ts
new: 'bg-blue-100 text-blue-800',
converted: 'bg-green-100 text-green-800',
```
Your app is dark-mode locked (`className="dark"`). These hardcoded light classes look washed out in dark mode. They should use the CSS variable-based pattern the rest of your components use (e.g. `bg-chart-2/20 text-chart-2`).

---

**Lower Priority / Polish**

**11. `expense-categories` page exists as actions but has no route**
`apps/admin/src/app/actions/expense-categories.ts` and `ExpenseCategoryAddForm` exist but there's no `/expense-categories` page in the route structure, and no sidebar link. Categories are managed via the datalist on the expense form, which means you can create stranded categories. Either add the management page or remove the unused actions.

**12. `RevenueSparkline` component is imported nowhere**
`revenue-sparkline.tsx` is a full component that appears to have been removed from `DashboardShell` at some point but the file remains. Dead code.

**13. `AllocationBar` component is also not rendered in `DashboardShell`**
`allocation-bar.tsx` exists but `DashboardShell` doesn't render it. Another dead component — either integrate it or remove it.

**14. Invitation flow accepts the invite but doesn't redirect to account setup**
`/invite?token=...` is referenced in the email but there's no `/invite` route in the codebase. Users who click that link will hit the 404 page.

---

**Where would you like to dig in first?** The auth middleware gap and the missing `/invite` route are the most operationally risky. The pagination issue is the most likely to cause real pain as data grows. And the dead components are quick wins to clean up.


---

## Component Deep Scan Findings

An automated component-by-component deep scan was performed to identify pending implementations, mocked data, and Coming soon states. The overall application is highly complete (95%+), with the following specific items pending:

### 1. Billing Module
- **pp/(admin)/billing/invoices/[id]/page.tsx**: Export to PDF and Print actions are currently disabled with Coming soon tooltips.
- **pp/(admin)/billing/quotes/[id]/page.tsx**: Export to PDF and Print actions are currently disabled with Coming soon tooltips.
- **pp/(admin)/billing/statements/page.tsx**: Generate Statement bulk action button is disabled with Coming soon.

### 2. Finance Core
- **pp/(admin)/finance/accounts/page.tsx**: Account withdrawal lock is hardcoded. Contains TODO: make withdrawalLocked dynamic — admin should be able to lock/unlock.

### 3. Settings Module
- **pp/(admin)/settings/data/page.tsx**: Data export buttons (Export DB, Sync, Archive) are disabled with Coming soon.
- **pp/(admin)/settings/organisation/org-settings-form.tsx**: Organisation Logo upload button is disabled with Coming soon (PNG/SVG max 2MB).
- **pp/(admin)/settings/security/page.tsx**: Two-Factor Authentication (2FA) and Audit Log export actions are disabled with Coming soon.
