# Implementation Plan: Reporting & Insights (Phase 8)

## Overview

Wire the three pre-built chart components to `/reports`, add a year filter, introduce an expense-by-category bar chart, and provide a CSV export via a Server Action. The dependency chain is strictly ordered: DB query helpers → financial.ts wrappers → Server Action → new client components → reports page → tests.

## Tasks

- [x] 1. DB query helpers - add four new helpers to queries.ts
  - Add `getExpensesByCategoryForYear(year: number)` - queries `expenses` table, groups by `category`, filters by `EXTRACT(YEAR FROM date) = year`, returns `{ category: string; total: number }[]` ordered by `total` DESC
  - Add `getDistinctYears()` - returns the union of distinct years from `income.date` and `expenses.date` as `number[]` sorted DESC
  - Add `getMonthlyFinancialsForYear(year: number)` - returns `{ month: string; revenue: number; expenses: number }[]` for the given calendar year, ordered by month ASC (month = `'YYYY-MM'`)
  - Add `getMonthlyRevenueByDivisionForYear(year: number)` - returns `{ month: string; divisionName: string; total: number }[]` filtered to the given calendar year
  - Export all four from `packages/db/src/index.ts` via the existing `export * from './queries'`
  - _Requirements: 6.3, 6.4, 6.5, 7.1, 7.5_

- [x] 2. financial.ts wrappers - add four new helpers
  - Add `getExpensesByCategory(year: number)` - thin wrapper over `getExpensesByCategoryForYear(year)`; returns `{ category: string; total: number }[]`
  - Add `getDistinctReportYears()` - thin wrapper over `getDistinctYears()`; returns `number[]`
  - Add `getMonthlyFinancialsSeriesForYear(year: number)` - calls `getMonthlyFinancialsForYear(year)` and returns `MonthlyFinancials[]`
  - Add `getRevenueByDivisionSeriesForYear(year: number)` - calls `getMonthlyRevenueByDivisionForYear(year)` and passes rows through the existing `buildDivisionSeries` helper; returns `DivisionSeriesChart`
  - _Requirements: 3.2, 6.1, 6.2, 7.2, 7.4_

- [x] 3. Checkpoint - ensure DB layer and financial.ts compile and types resolve
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Server Action - implement exportFinancialsCsv
  - Create `apps/admin/src/app/actions/reports.ts` with `'use server'` directive
  - Validate `year` is an integer in range 1000–9999; return `{ error: 'Invalid year' }` on failure
  - Call `getMonthlyFinancialsForYear(year)` once to get all revenue/expense rows
  - Build a 12-row result (one per calendar month January–December), filling missing months with zeros
  - Compute all Financial_Model fields inline: `pmgShare = revenue × 0.20`, `profitPool = revenue − expenses − pmgShare`, `salary = profitPool × 0.35`, `reinvest = profitPool × 0.30`, `reserve = profitPool × 0.30`, `flex = profitPool × 0.05`
  - Return CSV string with header `Month,Revenue,Expenses,PMG Share,Profit Pool,Salary,Reinvest,Reserve,Flex` followed by 12 data rows
  - Wrap entire body in try/catch - on DB error return `{ error: err.message }`, never throw
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 4.1 Write property test for CSV export correctness (Property 3)
    - **Property 3: CSV export correctness - structure and financial model**
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [x] 4.2 Write property test for CSV export error safety (Property 4)
    - **Property 4: CSV export error safety - invalid year and never throws**
    - **Validates: Requirements 4.5, 4.6**

- [x] 5. YearFilter client component
  - Create `apps/admin/src/components/reports/year-filter.tsx` with `'use client'` directive
  - Props: `{ years: number[]; currentYear: number }`
  - Render a shadcn `<Select>` populated with the provided years array; pre-select `currentYear`
  - On change: call `router.push('/reports?year=' + value)` via `useRouter` from `next/navigation`
  - When `years` is empty, render only the `currentYear` as the sole option
  - _Requirements: 2.1, 2.2, 5.1, 5.2_

- [x] 6. ExpenseByCategoryChart client component
  - Create `apps/admin/src/components/reports/expense-by-category-chart.tsx` with `'use client'` directive
  - Props: `{ data: { category: string; total: number }[] }`
  - Render a horizontal recharts `BarChart` with one bar per category
  - When `data` is empty, render empty-state message: `"No expense data for this year."`
  - Format all monetary values using `formatZAR`
  - Use `var(--chart-3)` as the bar fill colour
  - _Requirements: 3.1, 3.4, 3.5, 3.6_

- [x] 7. ExportCsvButton client component
  - Create `apps/admin/src/components/reports/export-csv-button.tsx` with `'use client'` directive
  - Props: `{ year: number }`
  - Use `useTransition` for pending state; disable button and show `"Exporting…"` label while in flight
  - On click: call `exportFinancialsCsv(year)`, create a `Blob` from the returned CSV string, trigger browser download with filename `pmg-financials-{year}.csv`
  - When action returns `{ error }`: call `toast.error(error)` from sonner
  - _Requirements: 4.7, 4.8, 4.9, 4.10_

- [x] 8. Checkpoint - ensure all new components compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Reports page - replace stub with full implementation
  - Replace the stub at `apps/admin/src/app/(admin)/reports/page.tsx` with an async Server Component
  - Read `searchParams.year`; validate it matches `/^\d{4}$/` and parses to a value in 1000–9999; fall back to `new Date().getFullYear()` if absent or invalid
  - Fire all five fetches in a single `Promise.all`: `getDistinctReportYears()`, `getMoMChartData()`, `getMonthlyFinancialsSeriesForYear(year)`, `getRevenueByDivisionSeriesForYear(year)`, `getExpensesByCategory(year)`
  - Render page header with title `"Reports & Insights"` consistent with other page headings
  - Render `<YearFilter years={years} currentYear={year} />` and `<ExportCsvButton year={year} />` in the page header area
  - Render all four charts in a single-column layout: `MoMComparisonChart`, `RevenueByDivisionChart`, `RevenueVsExpensesChart`, `ExpenseByCategoryChart`
  - Pass correct props to each chart component; render each chart regardless of whether its data array is empty
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.6, 3.3, 4.7, 5.1, 5.2, 5.3_

  - [x] 9.1 Write property test for year filter fallback (Property 5)
    - **Property 5: Year filter falls back to current year for invalid query params**
    - **Validates: Requirements 2.3, 2.6**

- [x] 10. Tests - write full test suite
  - [x] 10.1 Create `apps/admin/src/__tests__/reports.test.ts`
    - Write all five property-based tests (P1–P5) using fast-check with minimum 100 iterations each, tagged with their property reference comments
    - Write unit tests: `YearFilter` renders one option per year in the `years` array; `YearFilter` calls `router.push('/reports?year=2024')` when 2024 is selected; `ExpenseByCategoryChart` renders `"No expense data for this year."` when `data = []`; `ExpenseByCategoryChart` renders a bar for each category; `ExportCsvButton` is disabled and shows `"Exporting…"` while `isPending` is true; `ExportCsvButton` calls `toast.error` when action returns `{ error }`; `ExportCsvButton` triggers download with filename `pmg-financials-2025.csv`; reports page renders heading `"Reports & Insights"`; `exportFinancialsCsv(2025)` with no DB data returns a string with 12 zero-value rows
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.6, 3.1, 3.4, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 5.3_

  - [x] 10.2 Write property test for getDistinctReportYears sorted distinct years (Property 1)
    - **Property 1: getDistinctReportYears returns sorted, distinct years**
    - **Validates: Requirements 2.5, 6.2, 6.5**

  - [x] 10.3 Write property test for getExpensesByCategory valid ordered data (Property 2)
    - **Property 2: getExpensesByCategory returns valid, ordered data**
    - **Validates: Requirements 3.2, 6.1, 6.4, 6.6**

- [x] 11. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
- The `resolveYear` helper used in Property 5 should be extracted as a pure function from the page component to make it directly testable
- `MoMComparisonChart` is not year-scoped (it always shows current vs previous month); only `RevenueByDivisionChart`, `RevenueVsExpensesChart`, and `ExpenseByCategoryChart` receive the year argument
