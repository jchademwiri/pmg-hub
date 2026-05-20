# Implementation Plan: Dashboard Enhancements

## Overview

Implement five targeted dashboard enhancements: a withdrawals database table with a modal UI for recording salary draws, a YTD salary sub-label on SalaryCard, a muted-red expense color on the revenue sparkline, and a "Previous Month" range option on the division area chart.

## Tasks

- [x] 1. Create withdrawals Drizzle schema and migrate database
  - Create `packages/db/src/schema/withdrawals.ts` defining the `withdrawals` table with columns: `id` (UUID PK, default `gen_random_uuid()`), `date` (date, not null), `amount` (numeric 12,2, not null), `description` (text, nullable), `created_at` (timestamptz, default now)
  - Add a check constraint enforcing `amount > 0` and an index on the `date` column
  - Export the new schema from `packages/db/src/schema/index.ts`
  - Export Drizzle insert/select types (`NewWithdrawal`, `Withdrawal`) from `packages/db/src/index.ts`
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 2. Update getWithdrawalsCurrentMonth query and add withdrawal insert
  - [x] 2.1 Rewrite `getWithdrawalsCurrentMonth` in `packages/db/src/queries.ts` to SELECT from the `withdrawals` table (date >= start of current month AND date < start of next month) instead of filtering the expenses table by category
    - _Requirements: 2.4_
  - [x] 2.2 Add `insertWithdrawal(amount: number, date: string)` query function in `packages/db/src/queries.ts` that inserts a row into the `withdrawals` table and returns the inserted record
    - _Requirements: 1.4_
  - [ ]* 2.3 Write unit tests for `getWithdrawalsCurrentMonth` and `insertWithdrawal`
    - Test that `getWithdrawalsCurrentMonth` only returns rows within the current month
    - Test that `insertWithdrawal` rejects non-positive amounts at the DB constraint level
    - _Requirements: 2.4, 1.4_

- [x] 3. Checkpoint - ensure DB layer compiles cleanly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Add expense sparkline color CSS variable
  - In `apps/admin/src/app/globals.css`, add `--chart-expense: oklch(0.65 0.15 25)` to both the `:root` and `.dark` selectors
  - _Requirements: 4.2_

- [x] 5. Update RevenueSparkline to use --chart-expense
  - In `apps/admin/src/components/dashboard/revenue-sparkline.tsx`:
    - Replace all occurrences of `var(--chart-3)` with `var(--chart-expense)` (gradient stop, Area stroke, activeDot fill)
    - Replace `bg-chart-3` Tailwind class on the legend dot with an inline `style={{ background: 'var(--chart-expense)' }}`
    - Update the tooltip indicator color for the expenses row to use `var(--chart-expense)`
  - _Requirements: 4.1, 4.3, 4.4, 4.5_

- [x] 6. Add getDivisionRevenuePreviousMonth query
  - Add `getDivisionRevenuePreviousMonth()` to `packages/db/src/queries.ts` returning `{ month, divisionName, total }[]` for rows where `date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'` AND `date < DATE_TRUNC('month', NOW())`
  - _Requirements: 5.5_

- [x] 7. Wire previous-month division series through the data layer
  - [x] 7.1 Import `getDivisionRevenuePreviousMonth` in `apps/admin/src/lib/financial.ts` and add a `prev` key to `getAllDivisionSeriesData()` by calling `buildDivisionSeries` on its result
    - _Requirements: 5.4_
  - [x] 7.2 Update `DashboardShell` Props type in `apps/admin/src/components/dashboard/dashboard-shell.tsx` to include `prev: DivisionSeriesChart` in the `divisionSeriesData` object, and pass it through to `DivisionAreaChart`
    - _Requirements: 5.6_
  - [x] 7.3 In `apps/admin/src/app/(admin)/dashboard/page.tsx`, the `getAllDivisionSeriesData()` call already returns all series - no change needed; verify `divisionSeriesData` passed to `DashboardShell` includes `prev`
    - _Requirements: 5.6_

- [x] 8. Update DivisionAreaChart to support 'prev' range
  - In `apps/admin/src/components/dashboard/division-area-chart.tsx`:
    - Add `'prev'` to the `RangeKey` type union
    - Add `{ key: 'prev', label: 'Prev Month' }` to `RANGE_OPTIONS` between `'current'` and `'last3'`
    - Add `prev: DivisionSeriesChart` to the `Props.seriesData` type
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 9. Checkpoint - ensure chart and data layer changes compile and render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Add SalaryCard ytdSalary prop and YTD sub-label
  - In `apps/admin/src/components/dashboard/salary-card.tsx`:
    - Add `ytdSalary: number` to `SalaryCardProps`
    - Below the primary salary `<p>` (inside the positive profit-pool branch), render a sub-label `<p>` showing `YTD: {formatZAR(ytdSalary)}` in a smaller muted style - only when `withdrawals !== null` (i.e. current-month tab is active)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 11. Pass ytdSalary from DashboardShell to SalaryCard
  - In `apps/admin/src/components/dashboard/dashboard-shell.tsx`, pass `ytdSalary={ytdSummary.salary}` to `<SalaryCard>`
  - In `apps/admin/src/app/(admin)/dashboard/page.tsx`, `ytdSummary` is already fetched - no additional data fetch needed
  - _Requirements: 3.4_

- [x] 12. Create WithdrawModal component
  - Create `apps/admin/src/components/dashboard/withdraw-modal.tsx` as a `'use client'` component
  - Use a shadcn `Dialog` with a controlled `open` prop
  - Render a numeric `<Input>` for the amount (uncontrolled, validated on submit), a Submit `<Button>`, and a Cancel `<Button>` that calls `onClose`
  - On submit: validate that the parsed amount is a positive number; if not, show an inline error message and do not call the server action
  - Call a `withdrawAction(amount: number)` prop (the Server Action) on valid submit; on success call `onSuccess()`, on error display the returned error string
  - Props: `open: boolean`, `onClose: () => void`, `onSuccess: () => void`, `withdrawAction: (amount: number) => Promise<{ error?: string }>`
  - _Requirements: 1.2, 1.3, 1.5, 1.7, 1.8_

- [x] 13. Create withdraw Server Action
  - Create `apps/admin/src/app/actions/withdraw.ts` as a `'use server'` file
  - Export `recordWithdrawal(amount: number): Promise<{ error?: string }>` which calls `insertWithdrawal` from `@pmg/db` with today's ISO date and the given amount, wraps in try/catch, and returns `{}` on success or `{ error: message }` on failure
  - _Requirements: 1.4_

- [x] 14. Add Withdraw button and wire WithdrawModal into SalaryCard
  - In `apps/admin/src/components/dashboard/salary-card.tsx`:
    - Convert to a `'use client'` component (add `'use client'` directive)
    - Add local `useState` for `modalOpen: boolean`
    - Render a "Withdraw" `<Button>` (variant outline, small) in the card header area when `withdrawals !== null` (current-month tab) and `profitPool >= 0`
    - Render `<WithdrawModal>` wired to `modalOpen`, `setModalOpen(false)`, and `recordWithdrawal` server action
    - On `onSuccess`: call `router.refresh()` to update the withdrawal total without a full page reload
  - _Requirements: 1.1, 1.6_

- [x] 15. Final checkpoint - ensure all features work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The `withdrawals` table must be created (via Drizzle migration or direct DDL) before the app can run with the new query
- `router.refresh()` (Next.js App Router) re-fetches server component data without a full navigation, satisfying the "no full page reload" requirement
