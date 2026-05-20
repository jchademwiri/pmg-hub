# Requirements Document

## Introduction

Phase 8 of the PMG Control Center admin app. This feature adds a dedicated `/reports`
page with three interactive charts that visualise financial trends over time. Charts are
built with the shadcn `chart` component (Recharts wrapper) and rendered as Client
Components inside a React Server Component page that fetches all data server-side.

The three charts are:

1. **Revenue by Division over Time** - stacked area chart, last 6 calendar months, one
   area per division.
2. **Revenue vs Expenses** - dual-line chart, current calendar year by month.
3. **Month-over-Month KPI Comparison** - grouped bar chart comparing current month vs
   previous month for Revenue, Expenses, and Profit Pool.

All time-series data requires new DB queries in `@pmg/db`. The existing
`getRevenueByDivision`, `getTotalRevenue`, and `getTotalExpenses` queries are aggregate
only and cannot be reused for monthly breakdowns.

---

## Glossary

- **Reports_Page**: The async Server Component at `app/(admin)/reports/page.tsx` that
  fetches all chart data and passes it as props to chart components.
- **RevenueByDivisionChart**: The Client Component at
  `components/reports/revenue-by-division-chart.tsx` that renders the stacked area chart.
- **RevenueVsExpensesChart**: The Client Component at
  `components/reports/revenue-vs-expenses-chart.tsx` that renders the dual-line chart.
- **MoMComparisonChart**: The Client Component at
  `components/reports/mom-comparison-chart.tsx` that renders the grouped bar chart.
- **Chart_Component**: The shadcn `chart` primitive installed via
  `npx shadcn@latest add chart --cwd apps/admin`, built on Recharts. Provides
  `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`,
  `ChartLegendContent`, and the `ChartConfig` type.
- **MonthlyRevenuByDivision**: The TypeScript type
  `{ month: string; [divisionName: string]: number | string }[]` where `month` is
  `"YYYY-MM"` format, used as the data shape for the stacked area chart.
- **MonthlyFinancials**: The TypeScript type
  `{ month: string; revenue: number; expenses: number }[]` where `month` is `"YYYY-MM"`
  format, used as the data shape for the dual-line chart.
- **MoMSnapshot**: The TypeScript type
  `{ metric: string; current: number; previous: number }[]` used as the data shape for
  the grouped bar chart.
- **Chart_Token**: One of the five CSS custom properties `var(--chart-1)` through
  `var(--chart-5)` defined in `globals.css` using OKLCH values. These are the only colour
  tokens permitted for chart series.
- **getMonthlyRevenueByDivision**: New DB query in `packages/db/src/queries.ts` that
  returns revenue grouped by division and calendar month for the last N months.
- **getMonthlyFinancials**: New DB query in `packages/db/src/queries.ts` that returns
  total revenue and expenses grouped by calendar month for the current calendar year.
- **getMoMSnapshot**: New DB query in `packages/db/src/queries.ts` that returns aggregate
  revenue and expenses for the current month and the previous month.
- **financial.ts**: The server-only module at `apps/admin/src/lib/financial.ts` that
  wraps DB queries and computes derived values. New chart-data functions are added here.
- **formatZAR**: The existing `formatZAR(amount: number): string` utility from
  `lib/financial.ts`.

---

## Requirements

### Requirement 1: shadcn Chart Component Installation

**User Story:** As a developer, I want to install the shadcn chart component before
building any chart UI, so that all Recharts dependencies and the ChartContainer primitive
are available.

#### Acceptance Criteria

1. THE developer SHALL run `npx shadcn@latest add chart --cwd apps/admin` before writing
   any Phase 8 component code.
2. WHEN the install completes, THE Chart_Component primitives (`ChartContainer`,
   `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`) SHALL be
   available at `@/components/ui/chart`.
3. THE `chart` component install SHALL NOT reinstall any already-installed shadcn
   primitives (`card`, `sidebar`, `badge`, etc.).

---

### Requirement 2: New DB Queries - Monthly Revenue by Division

**User Story:** As a developer, I want a DB query that returns revenue grouped by division
and calendar month, so that the stacked area chart has the time-series data it needs.

#### Acceptance Criteria

1. THE `getMonthlyRevenueByDivision` function SHALL be added to
   `packages/db/src/queries.ts` and exported from `packages/db/src/index.ts`.
2. THE function SHALL accept a `months: number` parameter (default `6`) specifying how
   many past calendar months to include, counting back from the current month inclusive.
3. THE function SHALL return `{ month: string; divisionName: string; total: number }[]`
   where `month` is formatted as `"YYYY-MM"` using PostgreSQL `TO_CHAR(date, 'YYYY-MM')`.
4. THE function SHALL query the `income` table joined to the `divisions` table, grouping
   by `TO_CHAR(date, 'YYYY-MM')` and `divisions.name`.
5. THE function SHALL filter rows where `date >= DATE_TRUNC('month', NOW()) - INTERVAL
   '{months-1} months'` to include only the last `months` calendar months.
6. THE function SHALL order results by `month ASC`, then `divisionName ASC`.
7. IF no income rows exist for a given division in a given month, THEN THE function SHALL
   omit that division-month combination from the result (sparse result set is acceptable;
   the chart layer fills gaps).

---

### Requirement 3: New DB Queries - Monthly Financials

**User Story:** As a developer, I want a DB query that returns total revenue and expenses
per calendar month for the current year, so that the dual-line chart has its data.

#### Acceptance Criteria

1. THE `getMonthlyFinancials` function SHALL be added to `packages/db/src/queries.ts`
   and exported from `packages/db/src/index.ts`.
2. THE function SHALL return `{ month: string; revenue: number; expenses: number }[]`
   where `month` is `"YYYY-MM"`.
3. THE function SHALL derive revenue from the `income` table and expenses from the
   `expenses` table, each grouped by `TO_CHAR(date, 'YYYY-MM')`.
4. THE function SHALL filter both tables to rows where
   `EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW())`.
5. THE function SHALL perform a full outer join on `month` so that months with revenue
   but no expenses (and vice versa) still appear in the result with `0` for the missing
   side.
6. THE function SHALL order results by `month ASC`.
7. THE function SHALL return `revenue` and `expenses` as `number` (not string), using
   `COALESCE` to default missing sides to `0`.

---

### Requirement 4: New DB Queries - Month-over-Month Snapshot

**User Story:** As a developer, I want a DB query that returns aggregate revenue and
expenses for the current and previous calendar months, so that the MoM comparison chart
has its data.

#### Acceptance Criteria

1. THE `getMoMSnapshot` function SHALL be added to `packages/db/src/queries.ts` and
   exported from `packages/db/src/index.ts`.
2. THE function SHALL return
   `{ currentRevenue: number; previousRevenue: number; currentExpenses: number; previousExpenses: number }`.
3. THE function SHALL compute `currentRevenue` as the sum of `income.amount` where
   `date >= DATE_TRUNC('month', NOW())` and `date < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'`.
4. THE function SHALL compute `previousRevenue` as the sum of `income.amount` where
   `date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'` and
   `date < DATE_TRUNC('month', NOW())`.
5. THE function SHALL compute `currentExpenses` and `previousExpenses` using the same
   date window logic applied to the `expenses` table.
6. THE function SHALL use `COALESCE(SUM(...), '0')` for all four aggregates so that
   months with no data return `0` rather than `null`.
7. THE function SHALL return all four values as `number`.

---

### Requirement 5: financial.ts Chart Data Functions

**User Story:** As a developer, I want chart-data helper functions in `lib/financial.ts`
that transform raw DB results into the exact shapes the chart components expect, so that
chart components receive clean, typed props.

#### Acceptance Criteria

1. THE `getRevenueByDivisionSeries` function SHALL be added to
   `apps/admin/src/lib/financial.ts` and SHALL call `getMonthlyRevenueByDivision` from
   `@pmg/db`.
2. THE `getRevenueByDivisionSeries` function SHALL return
   `{ series: MonthlyRevenueByDivision[]; divisions: string[] }` where:
   - `series` is an array of objects keyed by `month` plus one numeric key per division
     name, with `0` filled in for any division-month combination absent from the DB result.
   - `divisions` is the sorted, deduplicated list of division names present in the data.
3. THE `getMonthlyFinancialsSeries` function SHALL be added to `financial.ts`, SHALL call
   `getMonthlyFinancials` from `@pmg/db`, and SHALL return `MonthlyFinancials[]` directly
   (no transformation needed beyond type mapping).
4. THE `getMoMChartData` function SHALL be added to `financial.ts`, SHALL call
   `getMoMSnapshot` from `@pmg/db`, and SHALL return `MoMSnapshot[]` with three entries:
   `{ metric: 'Revenue', current: currentRevenue, previous: previousRevenue }`,
   `{ metric: 'Expenses', current: currentExpenses, previous: previousExpenses }`,
   `{ metric: 'Profit Pool', current: currentRevenue - currentExpenses, previous: previousRevenue - previousExpenses }`.
5. ALL three functions SHALL be `async` and SHALL be callable from a Server Component.
6. THE `financial.ts` file SHALL retain the `'server-only'` import at the top.

---

### Requirement 6: Reports Page

**User Story:** As an admin, I want a dedicated `/reports` page that shows all three
charts, so that I can analyse financial trends without cluttering the main dashboard.

#### Acceptance Criteria

1. THE Reports_Page SHALL be created at `apps/admin/src/app/(admin)/reports/page.tsx`.
2. THE Reports_Page SHALL be an `async` Server Component with no `'use client'` directive.
3. THE Reports_Page SHALL call `getRevenueByDivisionSeries`, `getMonthlyFinancialsSeries`,
   and `getMoMChartData` using `Promise.all` in a single `await`.
4. THE Reports_Page SHALL export `export const metadata: Metadata = { title: 'Reports' }`.
5. THE Reports_Page SHALL render the three chart components in a vertical stack with
   `className="space-y-6"` as the root container.
6. THE Reports_Page SHALL pass fetched data as props directly to chart components without
   storing it in any client-side state.
7. IF any data-fetch function throws, THEN THE Reports_Page SHALL propagate the error to
   the Next.js error boundary (no try/catch in the page component).

---

### Requirement 7: Sidebar Navigation Link for Reports

**User Story:** As an admin, I want a "Reports" link in the sidebar so that I can navigate
to the reports page from anywhere in the app.

#### Acceptance Criteria

1. THE `AppSidebar` component SHALL include a nav item for `/reports` with the label
   "Reports" and the `BarChart3` icon from `lucide-react`.
2. THE `/reports` nav item SHALL be added after the existing `/divisions` item in the nav
   items array.
3. THE `NavLink` active state logic SHALL apply to `/reports` using the same
   `pathname === href || pathname.startsWith(href + '/')` rule as all other nav items.

---

### Requirement 8: Revenue by Division Chart (Stacked Area)

**User Story:** As an admin, I want to see how each division's revenue has trended over
the last 6 months, so that I can identify growth or decline per division.

#### Acceptance Criteria

1. THE RevenueByDivisionChart SHALL be a Client Component (`'use client'`) at
   `apps/admin/src/components/reports/revenue-by-division-chart.tsx`.
2. THE RevenueByDivisionChart SHALL accept props:
   `{ series: MonthlyRevenueByDivision[]; divisions: string[] }`.
3. THE RevenueByDivisionChart SHALL render a `ChartContainer` wrapping a Recharts
   `AreaChart` with stacked areas - one `Area` per division in the `divisions` array.
4. THE RevenueByDivisionChart SHALL assign Chart_Tokens to divisions in order:
   division[0] → `var(--chart-1)`, division[1] → `var(--chart-2)`,
   division[2] → `var(--chart-3)`, division[3] → `var(--chart-4)`,
   division[4] → `var(--chart-5)`. If there are more than 5 divisions, THE chart SHALL
   cycle back to `var(--chart-1)`.
5. THE RevenueByDivisionChart SHALL use `type="monotone"` and `stackId="a"` on all
   `Area` components to produce a stacked area effect.
6. THE RevenueByDivisionChart SHALL render a `ChartTooltip` using `ChartTooltipContent`
   with `formatter` that formats values using `formatZAR`.
7. THE RevenueByDivisionChart SHALL render a `ChartLegend` using `ChartLegendContent`.
8. THE RevenueByDivisionChart SHALL render a `CartesianGrid` with `strokeDasharray="3 3"`
   and `stroke="var(--border)"`.
9. THE RevenueByDivisionChart SHALL render an `XAxis` with `dataKey="month"` and a `YAxis`
   with a `tickFormatter` that formats values using `formatZAR`.
10. WHEN the `series` array is empty, THE RevenueByDivisionChart SHALL render a
    `text-muted-foreground/50 text-xs` message "No data for the last 6 months." inside
    the card body instead of the chart.
11. THE RevenueByDivisionChart SHALL be wrapped in a shadcn `Card` with
    `CardHeader` (title "Revenue by Division - Last 6 Months") and `CardContent`.

---

### Requirement 9: Revenue vs Expenses Chart (Dual Line)

**User Story:** As an admin, I want to see revenue and expenses plotted as two lines
across the current year, so that I can spot months where expenses approach or exceed
revenue.

#### Acceptance Criteria

1. THE RevenueVsExpensesChart SHALL be a Client Component (`'use client'`) at
   `apps/admin/src/components/reports/revenue-vs-expenses-chart.tsx`.
2. THE RevenueVsExpensesChart SHALL accept props: `{ series: MonthlyFinancials[] }`.
3. THE RevenueVsExpensesChart SHALL render a `ChartContainer` wrapping a Recharts
   `LineChart` with two `Line` components: one for `revenue` and one for `expenses`.
4. THE `revenue` line SHALL use `var(--chart-1)` and the `expenses` line SHALL use
   `var(--chart-3)`.
5. THE RevenueVsExpensesChart SHALL use `type="monotone"` and `dot={false}` on both
   `Line` components.
6. THE RevenueVsExpensesChart SHALL render `ChartTooltip`, `ChartLegend`,
   `CartesianGrid`, `XAxis`, and `YAxis` with the same conventions as
   RevenueByDivisionChart (ZAR formatter on YAxis, border stroke on grid).
7. WHEN the `series` array is empty, THE RevenueVsExpensesChart SHALL render
   "No data for the current year." in `text-muted-foreground/50 text-xs`.
8. THE RevenueVsExpensesChart SHALL be wrapped in a shadcn `Card` with `CardHeader`
   (title "Revenue vs Expenses - Current Year") and `CardContent`.

---

### Requirement 10: Month-over-Month KPI Comparison Chart (Grouped Bar)

**User Story:** As an admin, I want to compare this month's Revenue, Expenses, and Profit
Pool against last month's figures in a grouped bar chart, so that I can immediately see
whether the business is trending up or down.

#### Acceptance Criteria

1. THE MoMComparisonChart SHALL be a Client Component (`'use client'`) at
   `apps/admin/src/components/reports/mom-comparison-chart.tsx`.
2. THE MoMComparisonChart SHALL accept props: `{ data: MoMSnapshot[] }`.
3. THE MoMComparisonChart SHALL render a `ChartContainer` wrapping a Recharts `BarChart`
   with two `Bar` components: one for `current` and one for `previous`.
4. THE `current` bar SHALL use `var(--chart-1)` and the `previous` bar SHALL use
   `var(--chart-4)`.
5. THE MoMComparisonChart SHALL use `XAxis` with `dataKey="metric"` so that the x-axis
   labels are "Revenue", "Expenses", and "Profit Pool".
6. THE MoMComparisonChart SHALL render `ChartTooltip`, `ChartLegend`, `CartesianGrid`,
   and `YAxis` with ZAR formatter on YAxis ticks.
7. THE MoMComparisonChart SHALL render the two `Bar` components side-by-side (not
   stacked) by omitting `stackId`.
8. WHEN the `data` array is empty, THE MoMComparisonChart SHALL render
   "No comparison data available." in `text-muted-foreground/50 text-xs`.
9. THE MoMComparisonChart SHALL be wrapped in a shadcn `Card` with `CardHeader`
   (title "Month-over-Month Comparison") and `CardContent`.

---

### Requirement 11: Chart Styling Constraints

**User Story:** As a developer, I want all charts to use only the defined Chart_Tokens and
semantic CSS variables, so that the charts are visually consistent with the rest of the
admin UI and respect the dark theme.

#### Acceptance Criteria

1. ALL chart series colours SHALL use Chart_Tokens (`var(--chart-1)` through
   `var(--chart-5)`) exclusively. No raw Tailwind palette utilities or hex values are
   permitted for series colours.
2. ALL chart grid lines SHALL use `stroke="var(--border)"`.
3. ALL chart axis tick text SHALL use `fill="var(--muted-foreground)"` via the `tick`
   prop on `XAxis` and `YAxis`.
4. ALL chart card containers SHALL use
   `className="rounded-xl border border-border bg-card shadow-none"` on the `Card` root.
5. THE `ChartContainer` SHALL receive a `config` prop of type `ChartConfig` that maps
   each series key to its label and `color` (a Chart_Token CSS variable string).
6. ALL monetary values displayed in chart tooltips and axis ticks SHALL be formatted
   using `formatZAR`.

---

### Requirement 12: Client Component Boundary for Charts

**User Story:** As a developer, I want chart components to be Client Components while the
Reports page remains a Server Component, so that Recharts (which requires browser APIs)
works correctly without making the entire page client-side.

#### Acceptance Criteria

1. THE RevenueByDivisionChart, RevenueVsExpensesChart, and MoMComparisonChart SHALL each
   contain a `'use client'` directive as their first line.
2. THE Reports_Page SHALL contain no `'use client'` directive.
3. THE Reports_Page SHALL import chart components directly - Next.js handles the
   client boundary at the leaf component level automatically.
4. ALL props passed from Reports_Page to chart components SHALL be plain serialisable
   values (arrays of objects with string and number fields only) - no functions, no
   class instances, no React nodes.

---

### Requirement 13: Data Shape Correctness

**User Story:** As a developer, I want the data transformation in `financial.ts` to
produce correctly shaped objects for each chart, so that Recharts receives the exact
format it expects.

#### Acceptance Criteria

1. THE `MonthlyRevenueByDivision` series entries SHALL each have a `month` string key
   plus one numeric key per division. Division names with spaces or special characters
   SHALL be used as-is as object keys (Recharts `dataKey` accepts any string).
2. FOR ALL valid inputs to `getRevenueByDivisionSeries`, every entry in the returned
   `series` array SHALL contain a numeric value (not `undefined`) for every division in
   the `divisions` array - missing combinations SHALL be filled with `0`.
3. THE `MoMSnapshot` array returned by `getMoMChartData` SHALL always contain exactly
   three entries in the order: Revenue, Expenses, Profit Pool.
4. THE `MonthlyFinancials` entries returned by `getMonthlyFinancialsSeries` SHALL each
   have `revenue >= 0` and `expenses >= 0` (COALESCE in the DB query ensures this).
5. FOR ALL inputs, the `month` field in `MonthlyRevenueByDivision` and `MonthlyFinancials`
   entries SHALL match the regex `^\d{4}-\d{2}$` (YYYY-MM format).
