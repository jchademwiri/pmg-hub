# Requirements Document

## Introduction

Phase 8 adds a Reporting & Insights page to the PMG Control Center. Three chart
components already exist in `components/reports/` but are not wired to any route.
This phase wires those charts to `/reports/page.tsx`, adds a year filter so users
can scope all charts to a specific calendar year, adds an expense breakdown by
category (bar chart), and provides a CSV export of the full financial dataset via
a Server Action that streams `text/csv`.

The goal is to turn the accumulated income and expense data into actionable trends
and decision tools without introducing any new database tables.

---

## Glossary

- **Reports_Page**: The `/reports` Server Component page in the admin app
  (`apps/admin/src/app/(admin)/reports/page.tsx`).
- **Reports_System**: The combined set of data-fetching helpers, Server Actions,
  and UI components that implement the reporting feature.
- **Year_Filter**: A `<Select>` control on the Reports_Page that scopes all chart
  data to a single calendar year. Defaults to the current calendar year.
- **MoMComparisonChart**: The existing grouped bar chart component at
  `components/reports/mom-comparison-chart.tsx` that renders current vs previous
  month Revenue, Expenses, and Profit Pool.
- **RevenueByDivisionChart**: The existing stacked area chart component at
  `components/reports/revenue-by-division-chart.tsx` that renders monthly revenue
  per division.
- **RevenueVsExpensesChart**: The existing line chart component at
  `components/reports/revenue-vs-expenses-chart.tsx` that renders monthly revenue
  vs expenses for the current year.
- **ExpenseByCategoryChart**: A new bar chart component at
  `components/reports/expense-by-category-chart.tsx` that renders total expenses
  grouped by category for the selected year.
- **CSV_Export_Action**: The `exportFinancialsCsv(year: number)` Server Action in
  `apps/admin/src/app/actions/reports.ts` that returns a CSV string of monthly
  revenue and expenses for the given year.
- **Financial_Model**: The formula set defined in Phase 1:
  `pmgShare = revenue × 0.20`, `profitPool = revenue − expenses − pmgShare`,
  `salary = profitPool × 0.35`, `reinvest = profitPool × 0.30`,
  `reserve = profitPool × 0.30`, `flex = profitPool × 0.05`.

---

## Requirements

### Requirement 1: Wire Existing Charts to the Reports Page

**User Story:** As an admin user, I want to see all three existing report charts
on the `/reports` page, so that I can view financial trends without navigating
away from the dashboard.

#### Acceptance Criteria

1. THE Reports_Page SHALL render `MoMComparisonChart`, `RevenueByDivisionChart`,
   and `RevenueVsExpensesChart` in a single-column layout.
2. THE Reports_Page SHALL fetch all chart data in a single `Promise.all` call —
   no sequential round-trips.
3. THE Reports_Page SHALL pass `getMoMChartData()` results to `MoMComparisonChart`
   as the `data` prop.
4. THE Reports_Page SHALL pass `getRevenueByDivisionSeries()` results to
   `RevenueByDivisionChart` as the `series` and `divisions` props.
5. THE Reports_Page SHALL pass `getMonthlyFinancialsSeries()` results to
   `RevenueVsExpensesChart` as the `series` prop.
6. WHEN any chart's data array is empty, THE Reports_Page SHALL render the chart
   component regardless — each chart already handles its own empty state.

---

### Requirement 2: Year Filter

**User Story:** As an admin user, I want to filter all report charts by calendar
year, so that I can compare performance across different years as the dataset grows.

#### Acceptance Criteria

1. THE Reports_Page SHALL render a Year_Filter `<Select>` control in the page
   header, populated with all distinct years that have at least one income or
   expense entry.
2. WHEN the user selects a year, THE Reports_System SHALL reload the page with
   the selected year as a `year` query parameter (e.g. `/reports?year=2025`).
3. WHEN no `year` query parameter is present, THE Reports_Page SHALL default to
   the current calendar year.
4. THE Reports_Page SHALL pass the selected year to all data-fetching functions
   that accept a year argument so that all charts reflect the same year scope.
5. THE Reports_System SHALL add a `getDistinctReportYears()` helper in
   `apps/admin/src/lib/financial.ts` that returns a sorted array of distinct
   calendar years (as numbers) derived from the union of income and expense entry
   dates, ordered descending.
6. IF the `year` query parameter is present but is not a valid four-digit integer,
   THEN THE Reports_Page SHALL silently fall back to the current calendar year.

---

### Requirement 3: Expense Breakdown by Category Chart

**User Story:** As an admin user, I want to see a breakdown of expenses by
category for the selected year, so that I can identify which cost categories are
consuming the most budget.

#### Acceptance Criteria

1. THE Reports_System SHALL provide a new `ExpenseByCategoryChart` client
   component at `apps/admin/src/components/reports/expense-by-category-chart.tsx`
   that renders a horizontal bar chart of total expenses per category.
2. THE Reports_System SHALL add a `getExpensesByCategory(year: number)` helper in
   `apps/admin/src/lib/financial.ts` that queries the `expenses` table and returns
   `{ category: string; total: number }[]` ordered by `total` descending, filtered
   to entries whose `date` falls within the given calendar year.
3. THE Reports_Page SHALL render `ExpenseByCategoryChart` below the three existing
   charts, passing the result of `getExpensesByCategory(year)` as the `data` prop.
4. WHEN no expense entries exist for the selected year, THE ExpenseByCategoryChart
   SHALL render an empty-state message: "No expense data for this year."
5. THE ExpenseByCategoryChart SHALL format all monetary values using `formatZAR`.
6. THE ExpenseByCategoryChart SHALL use `var(--chart-3)` as the bar fill colour,
   consistent with the expense colour token used elsewhere in the codebase.

---

### Requirement 4: CSV Export

**User Story:** As an admin user, I want to export the monthly financial summary
for the selected year as a CSV file, so that I can analyse the data in a
spreadsheet.

#### Acceptance Criteria

1. THE Reports_System SHALL provide a `exportFinancialsCsv(year: number)` Server
   Action in `apps/admin/src/app/actions/reports.ts` that returns a CSV string.
2. WHEN called with a valid four-digit year, THE CSV_Export_Action SHALL return a
   CSV string with a header row: `Month,Revenue,Expenses,PMG Share,Profit Pool,
   Salary,Reinvest,Reserve,Flex`.
3. THE CSV_Export_Action SHALL include one data row per calendar month (January
   through December) for the given year, with revenue and expense totals summed
   from the `income` and `expenses` tables respectively, and all Financial_Model
   derived fields computed inline.
4. WHEN a month has no income or expense entries, THE CSV_Export_Action SHALL
   include that month's row with zero values for all fields.
5. IF the `year` argument is not a valid four-digit integer (1000–9999), THEN THE
   CSV_Export_Action SHALL return `{ error: 'Invalid year' }`.
6. THE CSV_Export_Action SHALL never throw — all errors MUST be returned as
   `{ error: string }`.
7. THE Reports_Page SHALL render an "Export CSV" button that, when clicked, calls
   `exportFinancialsCsv(year)`, creates a `Blob` from the returned CSV string,
   and triggers a browser download with the filename `pmg-financials-{year}.csv`.
8. THE "Export CSV" button SHALL be implemented as a `'use client'` component
   named `ExportCsvButton` in
   `apps/admin/src/components/reports/export-csv-button.tsx`.
9. WHEN the export is in flight, THE ExportCsvButton SHALL enter a
   pending/loading state (disabled button, loading label) using `useTransition`.
10. IF `exportFinancialsCsv` returns `{ error }`, THEN THE ExportCsvButton SHALL
    display the error via `toast.error(error)` from sonner.

---

### Requirement 5: Navigation

**User Story:** As an admin user, I want a "Reports" navigation item in the
sidebar, so that I can reach the reports page from anywhere in the app.

#### Acceptance Criteria

1. THE Reports_System SHALL ensure the "Reports" navigation item already present
   in `app-sidebar.tsx` links to `/reports` and uses the `BarChart3` icon from
   `lucide-react`.
2. WHEN the user is on the `/reports` route, THE nav item SHALL be highlighted as
   active, consistent with the `NavLink` active-route behaviour already in the
   codebase.
3. THE Reports_Page SHALL have a page title of "Reports & Insights" rendered in
   the page header, consistent with the heading style used on other pages.

---

### Requirement 6: Data Fetching Helpers

**User Story:** As a developer, I want all report data-fetching logic centralised
in `apps/admin/src/lib/financial.ts`, so that the reports page stays thin and
data concerns remain in one place.

#### Acceptance Criteria

1. THE Reports_System SHALL add `getExpensesByCategory(year: number)` to
   `apps/admin/src/lib/financial.ts`, returning
   `{ category: string; total: number }[]` ordered by `total` descending.
2. THE Reports_System SHALL add `getDistinctReportYears()` to
   `apps/admin/src/lib/financial.ts`, returning `number[]` sorted descending,
   derived from the union of distinct years in `income.date` and `expenses.date`.
3. THE Reports_System SHALL add the corresponding DB query helpers
   `getExpensesByCategoryForYear(year: number)` and `getDistinctYears()` to
   `packages/db/src/queries.ts` and export them from `packages/db/src/index.ts`.
4. THE `getExpensesByCategoryForYear` helper SHALL query the `expenses` table,
   group by `category`, filter by `EXTRACT(YEAR FROM date) = year`, and return
   `{ category: string; total: number }[]` ordered by `total` descending.
5. THE `getDistinctYears` helper SHALL return the union of distinct years from
   `income.date` and `expenses.date` as `number[]` sorted descending.
6. FOR ALL valid years with at least one expense entry, `getExpensesByCategory`
   SHALL return an array where every `total` is a positive number and every
   `category` is a non-empty string.

---

### Requirement 7: Year-Scoped Chart Data

**User Story:** As a developer, I want the existing chart data functions to
accept an optional year parameter, so that the Reports_Page can scope all charts
to the user-selected year.

#### Acceptance Criteria

1. THE Reports_System SHALL add a `getMonthlyFinancialsForYear(year: number)`
   helper to `packages/db/src/queries.ts` that returns
   `{ month: string; revenue: number; expenses: number }[]` for the given
   calendar year, with one entry per month that has data, ordered by month
   ascending.
2. THE Reports_System SHALL add a `getMonthlyFinancialsSeriesForYear(year: number)`
   wrapper in `apps/admin/src/lib/financial.ts` that calls
   `getMonthlyFinancialsForYear(year)` and returns `MonthlyFinancials[]`.
3. THE Reports_Page SHALL call `getMonthlyFinancialsSeriesForYear(year)` instead
   of `getMonthlyFinancialsSeries()` so that the `RevenueVsExpensesChart` reflects
   the selected year.
4. THE Reports_System SHALL add a `getRevenueByDivisionSeriesForYear(year: number)`
   wrapper in `apps/admin/src/lib/financial.ts` that fetches division revenue
   data scoped to the given year and returns `DivisionSeriesChart`.
5. THE Reports_System SHALL add a `getMonthlyRevenueByDivisionForYear(year: number)`
   helper to `packages/db/src/queries.ts` that returns division revenue rows
   filtered to the given calendar year.
6. THE Reports_Page SHALL call `getRevenueByDivisionSeriesForYear(year)` instead
   of `getRevenueByDivisionSeries()` so that the `RevenueByDivisionChart` reflects
   the selected year.
