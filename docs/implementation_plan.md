# Complete System Overhaul Implementation Plan

This implementation plan thoroughly integrates your requirements for withdrawal constraints and expense management with the 14 critical issues identified in `docs/notes.md`.

## User Review Required

> [!IMPORTANT]
> This is a significant refactoring plan addressing auth security, raw SQL vulnerabilities, database schema changes, and UI optimizations. Please review the organized phases to confirm you agree with the prioritization.

## Proposed Changes

### Phase 1: Security, Auth & Tests
- **Create/Update Tests:** Set up Vitest/Playwright tests securing withdrawal validation, category constraints, and authentication.
- ✅ **Auth Middleware Check (Issue #1):** Upgraded `proxy.ts` to validate sessions server-side via internal fetch to `/api/auth/get-session`. Also rejects inactive users.
- ✅ **Raw SQL Removal (Issue #5):** Refactored `users.ts` — `revokeUser`, `updateUserName`, `updateUserRole` now use Drizzle `db.update(user)` / `db.delete(session)` instead of raw SQL.
- ✅ **Missing `/invite` Route (Issue #14):** Built `(auth)/invite/page.tsx` with token validation, expiry checks, and magic link sign-in flow.

### Phase 2: Database & Core Domain
- **Expense Client Linking (New Req):** Update `expenses` schema with an optional `client_id`.
- **Run Migrations:** `bun run db:generate` and `bun run db:migrate`.

### Phase 3: Withdrawals & Accounts Logic
- **Consolidate Withdrawals (Issue #4 & 7):** Delete the redundant `withdraw.ts`. Standardize on `withdrawals.ts`. Ensure the account parameter is passed explicitly and the hardcoded `'salary'` fallback is removed.
- **Withdrawal Rules (New Req):** Enforce the R20 minimum balance checks and maximum available balance constraints within this consolidated Server Action.
- **Account Rates Bug (Issue #6):** Fix the math/documentation for `ACCOUNT_RATES` in `accounts.ts` so `pmg_share` (revenue based) and the profit pool allocations sum up consistently.
- **Statement Labeling (Issue #8):** Update the UI and localization in `accounts/[account]/page.tsx` to explicitly label the `effectiveRate` calculations as "Allocated" rather than "Deposited" to reflect synthetic flows.

### Phase 4: UI Cleanup & Performance
- **Dashboard Refactor (New Req & Issue #3, 12, 13):** 
  - Completely remove the withdrawal functional UI forms/buttons from the dashboard.
  - Fix `autoClosePreviousMonthIfNeeded` so it doesn't query the DB on every request. Implement a cron job that auto-closes at 00:00 on the 6th of each month. It must write to database snapshots when it auto-closes, locking up to the last date of the previous month. Ensure users can also manually close the month.
  - Clean up dead code by removing `revenue-sparkline.tsx` and `allocation-bar.tsx`.
- **Pagination (Issue #9):** Add cursor or offset-based pagination to `getAllIncome()`, `getAllExpenses()`, and `getAllWithdrawals()` queries, and implement a data table capability.
- **Expenses Form (New Req):** Add our `shadcn` select/combobox for optionally linking specific clients.
- **Categories Page (New Req & Issue #11):** Build the `/expense-categories` route and sidebar link. Protect in-use categories from deletion, but permit renaming.
- **Styling Fixes (Issue #10):** Update the `leads-table.tsx` badge classes (`bg-blue-100`) to strictly use CSS variable-based patterns designed for the forced dark mode UI.
- **Sidebar Mobile UX (Issue #11):** Auto-close the sidebar on mobile when a navigation link is selected.
- **Sidebar Logo Link (Issue #12):** Make the "PMG Control Center" title/logo clickable, linking to `/dashboard`.

### Phase 5: Build & Final Polish
- Ensure the Turborepo `bun run build` completely passes.
- Fix any TypeScript definitions adjusted across schemas.

## Verification Plan
- Unit tests run confirming withdrawal logic, missing routes, and database models.
- Manual execution of the app to confirm proper auth intercepts and visual data formatting (Pagination, Dark Mode).
