# Requirements Document

## Introduction

Phase 7 adds Financial Snapshots to the PMG Control Center. Without snapshots,
editing any past income or expense entry retroactively changes every historical
dashboard number. This feature locks a closed month's figures by persisting a
point-in-time copy of the computed financial summary. Once a month is closed,
its numbers are read from the snapshot table rather than recalculated from live
data, making historical reporting stable and trustworthy.

The feature has three parts:
1. A new `snapshots` database table that mirrors the `PeriodSummary` shape.
2. A "Close Month" button on the dashboard that creates a snapshot from live data.
3. A `/snapshots` page that lists all closed months in a table.

---

## Glossary

- **Snapshot**: A persisted, immutable record of a closed month's computed
  financial figures. Identified by a `period` string in `YYYY-MM` format.
- **Snapshot_System**: The combined set of DB schema, query helpers, Server
  Action, and UI components that implement the financial snapshot feature.
- **Close_Month_Action**: The Server Action `closeMonth(period)` that computes
  the financial summary for the given period from live data and inserts it into
  the `snapshots` table.
- **Period**: A calendar month expressed as a `YYYY-MM` string (e.g. `2026-03`).
- **PeriodSummary**: The eight-field financial summary type already defined in
  `@pmg/db`: `{ revenue, expenses, pmgShare, profitPool, salary, reinvest,
  reserve, flex }`.
- **Dashboard**: The `/dashboard` Server Component page in the admin app.
- **Snapshots_Page**: The `/snapshots` Server Component page listing all closed
  months.
- **Financial_Model**: The formula set used to derive all eight fields from
  `revenue` and `expenses`:
  - `pmgShare = revenue × 0.20`
  - `profitPool = revenue − expenses − pmgShare`
  - `salary = profitPool × 0.35`
  - `reinvest = profitPool × 0.30`
  - `reserve = profitPool × 0.30`
  - `flex = profitPool × 0.05`

---

## Requirements

### Requirement 1: Snapshot Database Schema

**User Story:** As a developer, I want a `snapshots` table in the database, so
that closed-month financial figures can be stored and retrieved independently of
live income and expense data.

#### Acceptance Criteria

1. THE Snapshot_System SHALL define a `snapshots` table with columns: `id`
   (UUID primary key, auto-generated), `period` (text, not null, unique),
   `revenue`, `expenses`, `pmg_share`, `profit_pool`, `salary`, `reinvest`,
   `reserve`, `flex` (all `numeric(12,2)`, not null), and `created_at`
   (timestamptz, not null, default now).
2. THE Snapshot_System SHALL enforce a unique constraint on the `period` column
   so that at most one snapshot can exist per calendar month.
3. THE Snapshot_System SHALL export the `snapshots` table from
   `packages/db/src/schema/snapshots.ts` and re-export it via
   `packages/db/src/schema/index.ts`.
4. IF a second insert is attempted for an already-closed period, THEN THE
   Snapshot_System SHALL reject the insert with a unique-constraint violation
   error.

---

### Requirement 2: Snapshot Query Helpers

**User Story:** As a developer, I want query helpers for snapshots in
`packages/db/src/queries.ts`, so that the rest of the application can read and
write snapshot data through a consistent, typed interface.

#### Acceptance Criteria

1. THE Snapshot_System SHALL provide a `getAllSnapshots()` query helper that
   returns all rows from the `snapshots` table as `SnapshotRow[]`, ordered by
   `period` descending.
2. THE Snapshot_System SHALL provide a `getSnapshotByPeriod(period: string)`
   query helper that returns the matching `SnapshotRow` when a snapshot exists
   for that period, or `null` when no snapshot exists.
3. THE Snapshot_System SHALL provide an `insertSnapshot(period, summary)` query
   helper that inserts a new row into the `snapshots` table and returns the
   inserted `SnapshotRow`.
4. WHEN `getSnapshotByPeriod` is called with a period that has no matching row,
   THE Snapshot_System SHALL return `null` without throwing an error.
5. THE Snapshot_System SHALL export `getAllSnapshots`, `getSnapshotByPeriod`,
   `insertSnapshot`, and the `SnapshotRow` type from `packages/db/src/index.ts`.

---

### Requirement 3: Close Month Server Action

**User Story:** As an admin user, I want to close the current month with a
single button click, so that the month's financial figures are locked and
protected from future edits to income or expense data.

#### Acceptance Criteria

1. THE Snapshot_System SHALL provide a `closeMonth(period: string)` Server
   Action in `apps/admin/src/app/actions/snapshots.ts`.
2. WHEN `closeMonth` is called with a valid `YYYY-MM` period string, THE
   Close_Month_Action SHALL compute the financial summary for that period using
   `getFinancialSummaryForPeriod` and insert it via `insertSnapshot`.
3. WHEN `closeMonth` succeeds, THE Close_Month_Action SHALL call
   `revalidatePath('/dashboard')` and `revalidatePath('/snapshots')` and return
   `{}`.
4. IF a snapshot already exists for the given period, THEN THE
   Close_Month_Action SHALL return `{ error: 'Month already closed' }` without
   inserting a duplicate row.
5. IF the `period` argument does not match the pattern `YYYY-MM`, THEN THE
   Close_Month_Action SHALL return `{ error: string }` describing the validation
   failure.
6. THE Close_Month_Action SHALL never throw — all errors MUST be returned as
   `{ error: string }`.

---

### Requirement 4: Dashboard "Close Month" Button

**User Story:** As an admin user, I want a "Close Month" button on the
dashboard, so that I can lock the current month's figures once all income and
expenses have been entered.

#### Acceptance Criteria

1. WHEN the current calendar month has no existing snapshot, THE Dashboard SHALL
   render a "Close Month" button visible to the user.
2. WHEN the current calendar month already has a snapshot, THE Dashboard SHALL
   NOT render the "Close Month" button.
3. WHEN the user clicks "Close Month", THE Dashboard SHALL invoke the
   `closeMonth` Server Action with the current month's `YYYY-MM` period string.
4. WHEN `closeMonth` returns `{}` (success), THE Dashboard SHALL refresh the
   page data so the button disappears and the closed state is reflected.
5. IF `closeMonth` returns `{ error }`, THEN THE Dashboard SHALL display the
   error message to the user via a sonner toast.
6. THE Dashboard SHALL fetch the snapshot status for the current period as part
   of its existing `Promise.all` data fetch, adding no additional sequential
   round-trips.
7. THE Dashboard SHALL implement the "Close Month" button as a `'use client'`
   component named `CloseMonthButton` in
   `apps/admin/src/components/dashboard/close-month-button.tsx`.
   It SHALL accept a single prop `period: string` and call `closeMonth(period)`
   on click.
8. WHEN the user clicks "Close Month", THE CloseMonthButton SHALL enter a
   pending/loading state (disabled button, loading label) using `useTransition`
   while the Server Action is in flight.
9. WHEN `closeMonth` returns `{ error }`, THE CloseMonthButton SHALL display
   the error via `toast.error(error)` from sonner — exactly as other client
   components in the codebase use it (e.g. `expense-table.tsx`).
10. WHEN `closeMonth` returns `{}` (success), THE CloseMonthButton SHALL call
    `router.refresh()` using `useRouter` from `next/navigation`.
11. THE Dashboard `page.tsx` SHALL derive the current period string as
    `new Date().toISOString().slice(0, 7)` (a `YYYY-MM` string) and pass it
    to both `getSnapshotByPeriod` and `CloseMonthButton`.
12. THE Dashboard `page.tsx` SHALL add `getSnapshotByPeriod(currentPeriod)` to
    its existing `Promise.all` call as the eleventh parallel fetch — no
    additional sequential round-trips. The result SHALL be passed to
    `DashboardShell` as a new prop `currentPeriodSnapshot: SnapshotRow | null`.
13. THE `DashboardShell` component SHALL accept `currentPeriodSnapshot` and
    `currentPeriod` as new props and render `<CloseMonthButton period={currentPeriod} />`
    immediately above the period tab switcher when `currentPeriodSnapshot` is null.
    WHEN `currentPeriodSnapshot` is not null, it SHALL render a read-only
    "Month closed" badge in place of the button.

---

### Requirement 5: Snapshots Page

**User Story:** As an admin user, I want a dedicated snapshots page, so that I
can review all closed months and their locked financial figures in one place.

#### Acceptance Criteria

1. THE Snapshot_System SHALL provide a Server Component page at
   `apps/admin/src/app/(admin)/snapshots/page.tsx` that renders all closed
   months.
2. WHEN at least one snapshot exists, THE Snapshots_Page SHALL render a table
   with one row per snapshot, showing: Period (formatted as "Month YYYY"),
   Revenue, Expenses, PMG Share, Profit Pool, Salary, Reinvest, Reserve, and
   Flex — all formatted as ZAR currency.
3. THE Snapshots_Page SHALL display snapshots ordered by period descending
   (most recent closed month first).
4. WHEN no snapshots exist, THE Snapshots_Page SHALL render an empty-state
   message indicating that no months have been closed yet.
5. THE Snapshot_System SHALL add a "Snapshots" navigation item to the app
   sidebar (`app-sidebar.tsx`) linking to `/snapshots`.
6. THE Snapshot_System SHALL add the "Snapshots" nav item to `app-sidebar.tsx`
   in the `navItems` array between the "Divisions" entry and the "Reports" entry
   (i.e. at index 4, zero-based).
7. THE nav item SHALL use the `Camera` icon from `lucide-react` (matching the
   icon-per-route pattern already in `app-sidebar.tsx`).
8. THE nav item object SHALL be:
   `{ href: '/snapshots', label: 'Snapshots', icon: Camera }`.
9. THE Snapshots_Page SHALL format the `period` column value (a `YYYY-MM` string)
   as a full month name and year using:
   `new Date(period + '-01').toLocaleString('en-ZA', { month: 'long', year: 'numeric' })`
   — consistent with how months are formatted elsewhere in the codebase
   (e.g. `expense-filter-bar.tsx`).
10. WHEN no snapshots exist, THE Snapshots_Page SHALL render the empty-state
    message: "No months have been closed yet. Use the Close Month button on the
    dashboard to lock a month's figures."

---

### Requirement 6: Snapshot Data Integrity

**User Story:** As an admin user, I want snapshot data to be immutable once
created, so that historical figures cannot be accidentally altered.

#### Acceptance Criteria

1. THE Snapshot_System SHALL NOT expose any `updateSnapshot` or `deleteSnapshot`
   Server Action.
2. THE Snapshot_System SHALL store all numeric snapshot fields as
   `numeric(12,2)` in the database, preserving two decimal places of precision.
3. FOR ALL valid `PeriodSummary` values, inserting a snapshot and then
   retrieving it via `getSnapshotByPeriod` SHALL return numeric values equal to
   the original summary values when parsed with `Number()` (round-trip
   property).
4. THE Snapshot_System SHALL compute snapshot values using the Financial_Model
   formulas: `pmgShare = revenue × 0.20`, `profitPool = revenue − expenses −
   pmgShare`, `salary = profitPool × 0.35`, `reinvest = profitPool × 0.30`,
   `reserve = profitPool × 0.30`, `flex = profitPool × 0.05`.

---

### Requirement 7: Database Seed Update

**User Story:** As a developer, I want the seed file to include snapshot rows
for past closed months, so that the development database has realistic snapshot
data from the start.

#### Acceptance Criteria

1. THE Snapshot_System SHALL update `packages/db/src/seed.ts` to import the
   `snapshots` table and insert snapshot rows for all fully elapsed months in
   the existing seed data range (April 2025 through the month prior to the
   current month).
2. WHEN the seed script runs, THE Snapshot_System SHALL insert each past
   month's snapshot with values computed from the Financial_Model applied to
   that month's seeded income and expense totals.
3. THE Snapshot_System SHALL NOT insert a snapshot for the current calendar
   month, as it is not yet closed.
4. THE seed script SHALL compute each past month's snapshot values by reusing
   the `getFinancialSummaryForPeriod(startExpr, endExpr)` query helper from
   `packages/db/src/queries.ts` — not by hardcoding values or reimplementing
   the formula inline.
5. FOR each fully elapsed month M in the range Apr 2025 through the month prior
   to the current calendar month, THE seed script SHALL call:
   `getFinancialSummaryForPeriod("DATE_TRUNC('month', TIMESTAMP '" + M + "-01')", "DATE_TRUNC('month', TIMESTAMP '" + M + "-01') + INTERVAL '1 month'")`
   where M is a `YYYY-MM` string, and insert the result as a snapshot row.
6. THE seed script SHALL generate the list of past months programmatically
   using JavaScript date arithmetic — not a hardcoded array. The start month
   is always `2025-04`. The end month (exclusive) is always the current
   calendar month computed at seed-run time as
   `new Date().toISOString().slice(0, 7)`.
7. THE seed script SHALL insert all snapshot rows in a single
   `db.insert(snapshots).values([...])` call after awaiting all
   `getFinancialSummaryForPeriod` results in parallel via `Promise.all`.
8. THE seed script SHALL log each snapshot period as it is inserted, e.g.:
   `"  ✓ snapshots (11 months: 2025-04 → 2026-02)"`.

---

### Requirement 8: Infrastructure Updates

**User Story:** As a developer, I want the existing infrastructure files updated
to include the snapshots table, so that the dev database can be fully reset and
reseeded cleanly and the schema barrel export is complete.

#### Acceptance Criteria

1. THE Snapshot_System SHALL update `packages/db/src/reset.ts` to include
   `snapshots` in the `DROP TABLE IF EXISTS` statement, listed before `leads`
   (to avoid FK constraint issues if any are added in future).
2. THE Snapshot_System SHALL update `packages/db/src/schema/index.ts` to add
   `export * from "./snapshots"` as the last export in the file.
3. AFTER these changes, running `bun db:seed` from scratch (reset → migrate →
   seed) SHALL complete without errors and the `snapshots` table SHALL contain
   one row per fully elapsed month in the seed data range.
4. THE Snapshot_System SHALL NOT modify any other existing schema file.
