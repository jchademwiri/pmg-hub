# Implementation Plan: Financial Snapshots (Phase 7)

## Overview

Implement point-in-time locking of monthly financial figures. The dependency chain is strictly ordered: schema → queries → server action → dashboard integration → snapshots page → seed update → tests.

## Tasks

- [x] 1. DB schema - create snapshots table
  - Create `packages/db/src/schema/snapshots.ts` with the Drizzle `pgTable` definition matching the design: `id` (uuid PK), `period` (text, unique), eight `numeric(12,2)` columns, `createdAt` (timestamptz)
  - Add `index("snapshots_period_idx").on(t.period)` as the table's index
  - Add `export * from "./snapshots"` as the last line of `packages/db/src/schema/index.ts`
  - Add `snapshots` to the `DROP TABLE IF EXISTS` statement in `packages/db/src/reset.ts`, listed before `leads`
  - _Requirements: 1.1, 1.2, 1.3, 8.1, 8.2_

- [x] 2. Query helpers - add snapshot queries to queries.ts
  - [x] 2.1 Add `SnapshotRow` type and three query helpers to `packages/db/src/queries.ts`
    - Define `SnapshotRow` type with all columns (numeric fields as `string`, `createdAt` as `Date`)
    - Implement `getAllSnapshots()` - returns all rows ordered by `period DESC`
    - Implement `getSnapshotByPeriod(period: string)` - returns matching row or `null` (no throw)
    - Implement `insertSnapshot(period: string, summary: PeriodSummary)` - inserts and returns the new row
    - Export `getAllSnapshots`, `getSnapshotByPeriod`, `insertSnapshot`, and `SnapshotRow` from `packages/db/src/index.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.2 Write property test for getAllSnapshots ordering invariant (Property 1)
    - **Property 1: getAllSnapshots ordering invariant**
    - **Validates: Requirements 2.1, 5.3**

  - [x] 2.3 Write property test for getSnapshotByPeriod null return (Property 2)
    - **Property 2: getSnapshotByPeriod returns null for non-existent period**
    - **Validates: Requirements 2.2, 2.4**

  - [x] 2.4 Write property test for numeric round-trip (Property 3)
    - **Property 3: Numeric round-trip - insert then retrieve preserves values**
    - **Validates: Requirements 2.2, 2.3, 6.2, 6.3**

- [x] 3. Checkpoint - ensure DB layer compiles and types resolve
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Server Action - implement closeMonth
  - Create `apps/admin/src/app/actions/snapshots.ts` with `'use server'` directive
  - Validate `period` against `/^\d{4}-\d{2}$/` using Zod `safeParse`; return `{ error: 'Period must be YYYY-MM' }` on failure
  - Call `getSnapshotByPeriod(period)`; if non-null return `{ error: 'Month already closed' }`
  - Call `getFinancialSummaryForPeriod` then `insertSnapshot(period, summary)` inside a try/catch
  - On success call `revalidatePath('/dashboard')` and `revalidatePath('/snapshots')` and return `{}`
  - On DB error return `{ error: err.message }` - never throw
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.1 Write property test for duplicate period guard (Property 4)
    - **Property 4: Duplicate period insert returns 'Month already closed'**
    - **Validates: Requirements 1.2, 1.4, 3.4**

  - [x] 4.2 Write property test for invalid period format (Property 5)
    - **Property 5: Invalid period format returns validation error**
    - **Validates: Requirements 3.5, 3.6**

  - [x] 4.3 Write property test for closeMonth success round-trip (Property 6)
    - **Property 6: closeMonth success - valid period returns {} and snapshot is retrievable**
    - **Validates: Requirements 3.2, 3.3**

- [x] 5. Dashboard integration - CloseMonthButton + DashboardShell + page.tsx
  - [x] 5.1 Create `apps/admin/src/components/dashboard/close-month-button.tsx`
    - `'use client'` component accepting `{ period: string }`
    - Use `useTransition` for pending state; disable button and show "Closing…" label while in flight
    - On success (`result` is `{}`): call `router.refresh()` via `useRouter` from `next/navigation`
    - On error (`result.error`): call `toast.error(result.error)` from sonner
    - _Requirements: 4.7, 4.8, 4.9, 4.10_

  - [x] 5.2 Modify `apps/admin/src/app/(admin)/dashboard/page.tsx`
    - Derive `currentPeriod` as `new Date().toISOString().slice(0, 7)`
    - Add `getSnapshotByPeriod(currentPeriod)` as the 11th entry in the existing `Promise.all` call
    - Pass `currentPeriodSnapshot` and `currentPeriod` as new props to `DashboardShell`
    - _Requirements: 4.6, 4.11, 4.12_

  - [x] 5.3 Modify `apps/admin/src/components/dashboard/dashboard-shell.tsx`
    - Add `currentPeriodSnapshot: SnapshotRow | null` and `currentPeriod: string` to props
    - When `currentPeriodSnapshot === null`: render `<CloseMonthButton period={currentPeriod} />` immediately above the period tab switcher
    - When `currentPeriodSnapshot !== null`: render a read-only "Month closed" badge in its place
    - _Requirements: 4.1, 4.2, 4.13_

- [x] 6. Checkpoint - ensure dashboard compiles and Close Month button renders
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Snapshots page - new route + sidebar nav item
  - [x] 7.1 Create `apps/admin/src/app/(admin)/snapshots/page.tsx`
    - Server Component; call `getAllSnapshots()` at the top
    - When snapshots exist: render a table with columns Period, Revenue, Expenses, PMG Share, Profit Pool, Salary, Reinvest, Reserve, Flex - all numeric columns formatted with `formatZAR`
    - Format `period` column using `new Date(period + '-01').toLocaleString('en-ZA', { month: 'long', year: 'numeric' })`
    - When no snapshots exist: render the empty-state message "No months have been closed yet. Use the Close Month button on the dashboard to lock a month's figures."
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.9, 5.10_

  - [x] 7.2 Modify `apps/admin/src/components/layout/app-sidebar.tsx`
    - Import `Camera` from `lucide-react`
    - Insert `{ href: '/snapshots', label: 'Snapshots', icon: Camera }` into `navItems` at index 4 (between "Divisions" and "Reports")
    - _Requirements: 5.5, 5.6, 5.7, 5.8_

  - [x] 7.3 Write property test for period formatting (Property 7)
    - **Property 7: Period formatting produces correct month name and year**
    - **Validates: Requirements 5.9**

- [x] 8. Seed update - add snapshot rows for past months
  - Modify `packages/db/src/seed.ts` to import `snapshots` from the schema
  - Programmatically generate the list of past months from `2025-04` up to (but not including) the current calendar month using JS date arithmetic
  - Fetch each month's summary in parallel via `Promise.all` using `getFinancialSummaryForPeriod` with `DATE_TRUNC` expressions - do not hardcode values or reimplement the formula
  - Insert all snapshot rows in a single `db.insert(snapshots).values([...])` call
  - Log: `"  ✓ snapshots (N months: 2025-04 → YYYY-MM)"`
  - Do NOT insert a snapshot for the current calendar month
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [x] 9. Checkpoint - run `bun db:seed` and verify clean reset + reseed
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Tests - write full test suite
  - [x] 10.1 Create `apps/admin/src/__tests__/snapshots.test.ts`
    - Write all eight property-based tests (P1–P8) using fast-check with minimum 100 iterations each, tagged with their property reference comments
    - Write unit tests: `CloseMonthButton` renders "Close Month" label; button is disabled and shows "Closing…" during transition; snapshots page renders empty-state when `snapshots = []`; snapshots page renders one row per snapshot; period `'2026-03'` formats to `'March 2026'`; `closeMonth` with valid period returns `{}` (mocked DB); duplicate insert throws unique constraint error
    - _Requirements: 1.2, 1.4, 2.1, 2.2, 2.3, 2.4, 3.2, 3.3, 3.4, 3.5, 3.6, 4.7, 4.8, 5.2, 5.4, 5.9, 6.2, 6.3, 6.4_

  - [x] 10.2 Write property test for financial model formula invariants (Property 8)
    - **Property 8: Financial model formula invariants**
    - **Validates: Requirements 6.4**

- [x] 11. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
- The `snapshots` table has no update or delete helpers - immutability is enforced by omission and the DB unique constraint on `period`
