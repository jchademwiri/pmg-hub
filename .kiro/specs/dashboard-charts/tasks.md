# Implementation Plan: dashboard-charts

## Overview

Implement the `/reports` page with three interactive financial charts. Work proceeds
bottom-up: DB queries → financial.ts helpers → chart components → page + sidebar.
All additions are purely additive; no existing code is modified except the sidebar nav.

## Tasks

- [x] 1. Install shadcn chart component
  - Run `npx shadcn@latest add chart --cwd apps/admin` to install the Recharts-based
    chart primitive.
  - Verify `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`,
    `ChartLegendContent`, and `ChartConfig` are available at `@/components/ui/chart`.
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Add new DB queries to `@pmg/db`
  - [x] 2.1 Implement `getMonthlyRevenueByDivision` in `packages/db/src/queries.ts`
    - Accept `months = 6` parameter; join `income` to `divisions`; group by
      `TO_CHAR(date, 'YYYY-MM')` and `divisions.name`; filter to last N months;
      order by `month ASC`, `divisionName ASC`; return `number` totals.
    - Export from `packages/db/src/index.ts`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 2.2 Write property test for `getMonthlyRevenueByDivision` month format (Property 1)
    - **Property 1: Month format invariant**
    - **Validates: Requirements 2.3, 13.5**
    - Generate arrays of `{ month, divisionName, total }` via fast-check; assert every
      `month` matches `/^\d{4}-\d{2}$/`.
    - Tag: `// Feature: dashboard-charts, Property 1: Month format invariant`

  - [ ]* 2.3 Write property test for result ordering (Property 2)
    - **Property 2: Results ordered by month ASC**
    - **Validates: Requirements 2.6, 3.6**
    - Generate sorted arrays of monthly rows; assert consecutive `month` values are
      non-decreasing (lexicographic).
    - Tag: `// Feature: dashboard-charts, Property 2: Results ordered by month ASC`

  - [x] 2.4 Implement `getMonthlyFinancials` in `packages/db/src/queries.ts`
    - Use a raw SQL CTE with `FULL OUTER JOIN` on month; filter to current year;
      `COALESCE` missing sides to `0`; order by `month ASC`; return `number` values.
    - Export from `packages/db/src/index.ts`.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 2.5 Write property test for `MonthlyFinancials` non-negative values (Property 3)
    - **Property 3: MonthlyFinancials non-negative values**
    - **Validates: Requirements 3.7, 13.4**
    - Generate arbitrary non-negative `{ month, revenue, expenses }` arrays; assert
      `revenue >= 0` and `expenses >= 0` for every entry.
    - Tag: `// Feature: dashboard-charts, Property 3: MonthlyFinancials non-negative values`

  - [x] 2.6 Implement `getMoMSnapshot` in `packages/db/src/queries.ts`
    - Use two raw SQL queries (income + expenses) with `CASE WHEN` date windows for
      current and previous month; `COALESCE(SUM(...), 0)`; return four `number` fields.
    - Export from `packages/db/src/index.ts`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Add chart-data functions to `financial.ts`
  - [x] 4.1 Add exported types and `getRevenueByDivisionSeries` to `financial.ts`
    - Export `MonthlyRevenueByDivision`, `MonthlyFinancials`, `MoMSnapshot` types.
    - Implement `getRevenueByDivisionSeries`: call `getMonthlyRevenueByDivision(6)`,
      build sorted `divisions` array, zero-fill missing division-month combinations,
      return `{ series, divisions }`.
    - Keep `'server-only'` import at top of file.
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 13.1, 13.2_

  - [ ]* 4.2 Write property test for zero-fill completeness (Property 4)
    - **Property 4: getRevenueByDivisionSeries zero-fill completeness**
    - **Validates: Requirements 5.2, 13.2**
    - Generate arbitrary sparse `{ month, divisionName, total }` arrays via fast-check;
      pass through the transform; assert every `series` entry has a defined numeric
      value for every name in `divisions`.
    - Tag: `// Feature: dashboard-charts, Property 4: getRevenueByDivisionSeries zero-fill completeness`

  - [x] 4.3 Add `getMonthlyFinancialsSeries` to `financial.ts`
    - Call `getMonthlyFinancials` from `@pmg/db`; return `MonthlyFinancials[]` directly.
    - _Requirements: 5.3, 5.5_

  - [x] 4.4 Add `getMoMChartData` to `financial.ts`
    - Call `getMoMSnapshot` from `@pmg/db`; return exactly 3 `MoMSnapshot` entries in
      order: Revenue, Expenses, Profit Pool (with derived profit values).
    - _Requirements: 5.4, 5.5, 13.3_

  - [ ]* 4.5 Write property test for `getMoMChartData` output shape (Property 5)
    - **Property 5: getMoMChartData always returns exactly 3 ordered entries**
    - **Validates: Requirements 5.4, 13.3**
    - Generate arbitrary `{ currentRevenue, previousRevenue, currentExpenses,
      previousExpenses }` objects (non-negative); assert length === 3, correct metric
      names in order, and `result[2].current === result[0].current - result[1].current`.
    - Tag: `// Feature: dashboard-charts, Property 5: getMoMChartData always returns exactly 3 ordered entries`

  - [ ]* 4.6 Write unit tests for `financial.ts` transforms
    - Test `getMoMChartData` with a known snapshot → verify exact 3-entry output.
    - Test `getRevenueByDivisionSeries` with a known sparse DB result → verify zero-fill.
    - _Requirements: 5.2, 5.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement chart components
  - [x] 6.1 Create `RevenueByDivisionChart` at
    `apps/admin/src/components/reports/revenue-by-division-chart.tsx`
    - `'use client'` directive; accept `{ series, divisions }` props; build `ChartConfig`
      with `CHART_TOKENS[i % 5]` cycling; render `ChartContainer` → `AreaChart` with
      stacked `Area` per division (`type="monotone"`, `stackId="a"`); include
      `CartesianGrid`, `XAxis`, `YAxis` (ZAR formatter), `ChartTooltip`,
      `ChartLegend`; wrap in `Card` with correct title; render empty-state message when
      `series.length === 0`.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11,
      11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 12.1_

  - [ ]* 6.2 Write property test for chart color token cycling (Property 6)
    - **Property 6: Chart color token cycling**
    - **Validates: Requirements 8.4**
    - Generate arrays of 1–20 arbitrary division name strings; compute color assignment
      for each index; assert `color === \`var(--chart-${(i % 5) + 1})\``.
    - Tag: `// Feature: dashboard-charts, Property 6: Chart color token cycling`

  - [ ]* 6.3 Write unit tests for `RevenueByDivisionChart` empty state
    - Assert "No data for the last 6 months." renders when `series=[]`.
    - _Requirements: 8.10_

  - [x] 6.4 Create `RevenueVsExpensesChart` at
    `apps/admin/src/components/reports/revenue-vs-expenses-chart.tsx`
    - `'use client'` directive; accept `{ series }` props; static `ChartConfig` with
      `chart-1` / `chart-3`; render `ChartContainer` → `LineChart` with two `Line`
      components (`type="monotone"`, `dot={false}`); include `CartesianGrid`, `XAxis`,
      `YAxis` (ZAR formatter), `ChartTooltip`, `ChartLegend`; wrap in `Card` with
      correct title; render empty-state message when `series.length === 0`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 11.1–11.6, 12.1_

  - [ ]* 6.5 Write unit tests for `RevenueVsExpensesChart` empty state
    - Assert "No data for the current year." renders when `series=[]`.
    - _Requirements: 9.7_

  - [x] 6.6 Create `MoMComparisonChart` at
    `apps/admin/src/components/reports/mom-comparison-chart.tsx`
    - `'use client'` directive; accept `{ data }` props; static `ChartConfig` with
      `chart-1` / `chart-4`; render `ChartContainer` → `BarChart` with two side-by-side
      `Bar` components (no `stackId`); `XAxis dataKey="metric"`; include `CartesianGrid`,
      `YAxis` (ZAR formatter), `ChartTooltip`, `ChartLegend`; wrap in `Card` with
      correct title; render empty-state message when `data.length === 0`.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9,
      11.1–11.6, 12.1_

  - [ ]* 6.7 Write unit tests for `MoMComparisonChart` empty state
    - Assert "No comparison data available." renders when `data=[]`.
    - _Requirements: 10.8_

- [ ] 7. Create the Reports page and update sidebar
  - [x] 7.1 Create `apps/admin/src/app/(admin)/reports/page.tsx`
    - Async Server Component (no `'use client'`); export `metadata` with
      `title: 'Reports'`; call all three financial functions via `Promise.all`; render
      chart components in a `<div className="space-y-6">`; pass only plain serialisable
      props; no try/catch (let errors propagate to Next.js error boundary).
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 12.2, 12.3, 12.4_

  - [x] 7.2 Add `/reports` nav item to `AppSidebar`
    - Import `BarChart3` from `lucide-react`; add
      `{ href: '/reports', label: 'Reports', icon: BarChart3 }` after the `/divisions`
      entry in the nav items array.
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (already in monorepo) with `vitest`
- Each property test must be tagged with `// Feature: dashboard-charts, Property N: ...`
- Minimum 100 iterations per property test (fast-check default)
- All chart series colours must use `var(--chart-1)` through `var(--chart-5)` only
