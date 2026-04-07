# Comprehensive Project Requirements

This document captures custom requirements alongside high, medium, and low priority fixes identified in `docs/notes.md`.

## 1. Custom Requirements & Rules

### Withdrawal Rules
- **Dashboard Removal:** The withdrawal functionality must be removed completely from the dashboard (`DashboardShell`).
- **Boundaries Server Actions:** Withdrawals are validated via Server Actions:
  - **Minimum Constraint:** Disallow withdrawals if the target account falls below an R20 balance. The respective UI button must graphically appear disabled.
  - **Maximum Constraint (No Overdraft):** Strictly prevent any requested withdrawal from exceeding that account's actual current balance.

### Expenditure & Categories
- **Expense Client Linking:** Introduce optional `client_id` linking capabilities inside expense creation/edit flows.
- **Categories Architecture:** 
  - Construct a formal page for creating, editing, and deleting categories (at route `/expense-categories`).
  - **Protection:** Block deletion of a category dynamically if it is in-use by an expense or transaction logic. 
  - **Flexibility:** Retain the capability to safely adjust the name/value of a category even while in-use.

---

## 2. Codebase Refinements (from `docs/notes.md`)

### High Priority
1. **Middleware Security Check:** Server-side verification of valid session token must happen inside `proxy.ts`/`middleware.ts`, checking the DB validation beyond cookie existence.

3. **Database Performance:** Remove `autoClosePreviousMonthIfNeeded` from being queried on every dashboard load. Instead, implement a cron job that auto-closes at 00:00 on the 6th of each month (closing to the last date of the previous month and writing to database snapshots). Also implement manual month closure functionality.
4. **Data Integrity for Withrawals:** Deprecate and delete redundant `withdraw.ts`. Use exactly one standardized action (`withdrawals.ts`) avoiding any hardcoded defaults like `'salary'`.
5. **Type Safety Security:** Migrate all raw SQL usage entirely out of `users.ts` actions to leverage Drizzle type-save implementations. 

### Medium Priority
6. **Account Math Correctness:** Document and decouple `pmg_share` (calculated from Revenue bounds) against logic processing the standard Profit Pool array items inside `ACCOUNT_RATES`. (This is correct, pmg takes share from gross income)
7. **Modal Isolation:** Refactor the `WithdrawModal` interface to safely pass dynamic `account` keys.
8. **UI Labels:** Formally tag values processed via `effectiveRate` internally on the statement page as "Allocated" over misleading labels like "Deposited".
9. **Query Scalability:** Insert base pagination (Cursor or offset parameters coupled with `LIMIT`) on large queries spanning: `getAllIncome()`, `getAllExpenses()`, and `getAllWithdrawals()`.
10. **Dark Mode Accents:** Adjust standard light styling (`bg-blue-100` / `bg-green-100`) located within the `leads-table.tsx` to adopt the theme's core CSS `chart-X` color scales explicitly.
11. **Sidebar Mobile UX:** On mobile, the sidebar must auto-close when a navigation link is selected.
12. **Sidebar Logo Link:** The "PMG Control Center" title/logo in the sidebar must be clickable and link to the dashboard (`/dashboard`).

### Low Priority / Cleanup
13. **Component Pruning:** Aggressively remove unused logic structures representing features no longer supported such as `revenue-sparkline.tsx` and `allocation-bar.tsx`.
14. **Route Repair:** Complete the logic loop for magic link user assignments by providing the valid resolution target component via standard routing mapping (`/invite`).
