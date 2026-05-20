# Design Document - dashboard-charts

## Overview

Phase 8 adds a `/reports` page to the PMG Control Center admin app with three interactive
financial charts. All data is fetched server-side in a React Server Component and passed
as plain serialisable props to three Client Component chart wrappers built on the shadcn
`chart` primitive (Recharts).

The feature touches four layers:

1. **`@pmg/db`** - three new time-series queries
2. **`financial.ts`** - three new data-shaping functions
3. **Chart components** - three new Client Components under `components/reports/`
4. **App shell** - new `/reports` page and sidebar nav item

No existing queries or components are modified; all additions are purely additive.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  app/(admin)/reports/page.tsx  (Server Component)        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Promise.all([                                    │   │
│  │    getRevenueByDivisionSeries(),                  │   │
│  │    getMonthlyFinancialsSeries(),                  │   │
│  │    getMoMChartData(),                             │   │
│  │  ])                                               │   │
│  └──────────────────────────────────────────────────┘   │
│         │ series+divisions   │ series    │ data           │
│         ▼                    ▼           ▼                │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ RevenueByDiv   │  │ RevenueVsExp │  │ MoMCompar.  │  │
│  │ Chart          │  │ Chart        │  │ Chart       │  │
│  │ (Client)       │  │ (Client)     │  │ (Client)    │  │
│  └────────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                    │                │
         ▼                    ▼                ▼
  lib/financial.ts  ←──────────────────────────────
         │
         ▼
  @pmg/db (queries.ts)
         │
         ▼
  Neon PostgreSQL (income, expenses, divisions tables)
```

Data flows strictly downward. Chart components receive only plain arrays of objects
(strings and numbers) - no functions, no class instances, no React nodes - satisfying
the Next.js serialisable-props constraint for the Server→Client boundary.

---

## Components and Interfaces

### New DB Queries (`packages/db/src/queries.ts`)

```typescript
// Returns revenue grouped by division and calendar month for the last N months.
export async function getMonthlyRevenueByDivision(
  months = 6
): Promise<{ month: string; divisionName: string; total: number }[]>

// Returns total revenue and expenses per calendar month for the current year.
export async function getMonthlyFinancials(): Promise<
  { month: string; revenue: number; expenses: number }[]
>

// Returns aggregate revenue and expenses for current and previous calendar months.
export async function getMoMSnapshot(): Promise<{
  currentRevenue: number
  previousRevenue: number
  currentExpenses: number
  previousExpenses: number
}>
```

### New financial.ts Functions (`apps/admin/src/lib/financial.ts`)

```typescript
// Exported types
export type MonthlyRevenueByDivision = { month: string; [divisionName: string]: number | string }
export type MonthlyFinancials = { month: string; revenue: number; expenses: number }
export type MoMSnapshot = { metric: string; current: number; previous: number }

export async function getRevenueByDivisionSeries(): Promise<{
  series: MonthlyRevenueByDivision[]
  divisions: string[]
}>

export async function getMonthlyFinancialsSeries(): Promise<MonthlyFinancials[]>

export async function getMoMChartData(): Promise<MoMSnapshot[]>
```

### Chart Components

| Component | File | Props |
|---|---|---|
| `RevenueByDivisionChart` | `components/reports/revenue-by-division-chart.tsx` | `{ series: MonthlyRevenueByDivision[]; divisions: string[] }` |
| `RevenueVsExpensesChart` | `components/reports/revenue-vs-expenses-chart.tsx` | `{ series: MonthlyFinancials[] }` |
| `MoMComparisonChart` | `components/reports/mom-comparison-chart.tsx` | `{ data: MoMSnapshot[] }` |

### Reports Page

`apps/admin/src/app/(admin)/reports/page.tsx` - async Server Component, no `'use client'`.

### Sidebar

`AppSidebar` gains a `BarChart3` nav item for `/reports` inserted after `/divisions`.

---

## Data Models

### `MonthlyRevenueByDivision`

```typescript
// Each entry represents one calendar month.
// Division names are dynamic keys; missing division-months are filled with 0.
type MonthlyRevenueByDivision = {
  month: string                    // "YYYY-MM"
  [divisionName: string]: number | string  // number for division totals
}

// Example:
// [
//   { month: "2025-01", "Alpha": 120000, "Beta": 85000, "Gamma": 0 },
//   { month: "2025-02", "Alpha": 135000, "Beta": 92000, "Gamma": 45000 },
// ]
```

### `MonthlyFinancials`

```typescript
type MonthlyFinancials = {
  month: string     // "YYYY-MM"
  revenue: number   // >= 0
  expenses: number  // >= 0
}
```

### `MoMSnapshot`

```typescript
type MoMSnapshot = {
  metric: string    // "Revenue" | "Expenses" | "Profit Pool"
  current: number
  previous: number
}
// Always exactly 3 entries in the order: Revenue, Expenses, Profit Pool
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid
executions of a system - essentially, a formal statement about what the system should do.
Properties serve as the bridge between human-readable specifications and
machine-verifiable correctness guarantees.*

### Property 1: Month format invariant

*For any* row returned by `getMonthlyRevenueByDivision` or `getMonthlyFinancials`, the
`month` field must match the regex `^\d{4}-\d{2}$` (YYYY-MM format).

**Validates: Requirements 2.3, 3.2, 13.5**

---

### Property 2: Results ordered by month ASC

*For any* result array returned by `getMonthlyRevenueByDivision` or
`getMonthlyFinancials`, for every consecutive pair of entries `[i]` and `[i+1]`, the
month string at `[i]` must be lexicographically less than or equal to the month string
at `[i+1]`.

**Validates: Requirements 2.6, 3.6**

---

### Property 3: MonthlyFinancials non-negative values

*For any* entry in the array returned by `getMonthlyFinancialsSeries`, both `revenue`
and `expenses` must be `>= 0` (COALESCE in the DB query guarantees no nulls; the
`income_amount_positive` and `expenses_amount_positive` DB constraints guarantee
positive amounts).

**Validates: Requirements 3.7, 13.4**

---

### Property 4: getRevenueByDivisionSeries zero-fill completeness

*For any* raw DB result passed to the series-building transform in
`getRevenueByDivisionSeries`, every entry in the returned `series` array must contain a
numeric value (not `undefined`, not `null`) for every division name present in the
returned `divisions` array. Missing division-month combinations must be filled with `0`.

**Validates: Requirements 5.2, 13.2**

---

### Property 5: getMoMChartData always returns exactly 3 ordered entries

*For any* valid `getMoMSnapshot` result, `getMoMChartData` must return an array of
exactly 3 entries where `result[0].metric === "Revenue"`,
`result[1].metric === "Expenses"`, and `result[2].metric === "Profit Pool"`, and
`result[2].current === result[0].current - result[1].current`.

**Validates: Requirements 5.4, 13.3**

---

### Property 6: Chart color token cycling

*For any* array of N division names passed to `RevenueByDivisionChart`, the color
assigned to `divisions[i]` must be `var(--chart-${(i % 5) + 1})`. This ensures correct
cycling when there are more than 5 divisions.

**Validates: Requirements 8.4**

---

## Error Handling

- **DB query failures**: All three `financial.ts` functions are `async` and do not
  catch errors. Errors propagate to the `Reports_Page`, which also does not catch them,
  allowing Next.js to route to the nearest error boundary. This is consistent with the
  existing dashboard page pattern.
- **Empty data sets**: Each chart component handles the empty-array case by rendering a
  `text-muted-foreground/50 text-xs` message instead of the chart. This prevents
  Recharts from rendering an empty SVG with broken axes.
- **Sparse DB results** (missing division-month combinations): Handled in
  `getRevenueByDivisionSeries` by the zero-fill transform - Recharts requires all data
  keys to be present in every entry for stacked areas to render correctly.
- **More than 5 divisions**: Color token cycling (`i % 5`) prevents an out-of-bounds
  access on the 5-token array.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
unit tests catch concrete bugs at specific inputs; property tests verify general
correctness across the full input space.

**Property-based testing library**: `fast-check` (already in the monorepo).
**Test runner**: `vitest`.
**Minimum iterations per property test**: 100 (fast-check default is 100 runs).

### Unit Tests

Focus on:
- `getMoMChartData` with a known snapshot input → verify exact 3-entry output
- `getRevenueByDivisionSeries` with a known sparse DB result → verify zero-fill
- Empty-state rendering for each chart component (snapshot or DOM assertion)
- `RevenueByDivisionChart` renders "No data for the last 6 months." when `series=[]`
- `RevenueVsExpensesChart` renders "No data for the current year." when `series=[]`
- `MoMComparisonChart` renders "No comparison data available." when `data=[]`

### Property-Based Tests

Each property test must be tagged with a comment in the format:
`// Feature: dashboard-charts, Property N: <property_text>`

**Property 1 test** - Generate arrays of `{ month, divisionName, total }` objects via
fast-check, pass through the month-format validator, assert all months match
`/^\d{4}-\d{2}$/`.

**Property 2 test** - Generate sorted and unsorted arrays of monthly result rows,
assert that the DB query result (mocked with sorted data) has non-decreasing month
values across all consecutive pairs.

**Property 3 test** - Generate arbitrary `getMoMSnapshot`-shaped inputs with
non-negative numbers, pass through `getMonthlyFinancialsSeries` transform, assert
`revenue >= 0` and `expenses >= 0` for every entry.

**Property 4 test** - Generate arbitrary sparse arrays of
`{ month, divisionName, total }` rows with random division names and months, pass
through the `getRevenueByDivisionSeries` transform, assert that every entry in `series`
has a defined numeric value for every name in `divisions`.

**Property 5 test** - Generate arbitrary `{ currentRevenue, previousRevenue,
currentExpenses, previousExpenses }` objects (all non-negative numbers), pass through
`getMoMChartData`, assert length === 3, correct metric names in order, and
`result[2].current === result[0].current - result[1].current`.

**Property 6 test** - Generate arrays of 1–20 arbitrary division name strings, compute
the color assignment for each index, assert `color === \`var(--chart-${(i % 5) + 1})\``.

### Implementation Details

#### `getMonthlyRevenueByDivision` (Drizzle ORM)

```typescript
export async function getMonthlyRevenueByDivision(
  months = 6
): Promise<{ month: string; divisionName: string; total: number }[]> {
  const result: { month: string; divisionName: string; total: string }[] = await db
    .select({
      month: sql<string>`TO_CHAR(${income.date}, 'YYYY-MM')`,
      divisionName: divisions.name,
      total: sql<string>`COALESCE(SUM(${income.amount}), '0')`,
    })
    .from(income)
    .innerJoin(divisions, eq(income.divisionId, divisions.id))
    .where(
      sql`${income.date} >= DATE_TRUNC('month', NOW()) - INTERVAL '${sql.raw(String(months - 1))} months'`
    )
    .groupBy(sql`TO_CHAR(${income.date}, 'YYYY-MM')`, divisions.name)
    .orderBy(
      sql`TO_CHAR(${income.date}, 'YYYY-MM') ASC`,
      asc(divisions.name)
    )
  return result.map(r => ({ month: r.month, divisionName: r.divisionName, total: Number(r.total) }))
}
```

#### `getMonthlyFinancials` (Drizzle ORM)

```typescript
export async function getMonthlyFinancials(): Promise<
  { month: string; revenue: number; expenses: number }[]
> {
  // Two CTEs: one for income by month, one for expenses by month, full outer joined
  const result = await db.execute(sql`
    WITH rev AS (
      SELECT TO_CHAR(date, 'YYYY-MM') AS month,
             COALESCE(SUM(amount), 0) AS revenue
      FROM income
      WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW())
      GROUP BY TO_CHAR(date, 'YYYY-MM')
    ),
    exp AS (
      SELECT TO_CHAR(date, 'YYYY-MM') AS month,
             COALESCE(SUM(amount), 0) AS expenses
      FROM expenses
      WHERE EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM NOW())
      GROUP BY TO_CHAR(date, 'YYYY-MM')
    )
    SELECT COALESCE(rev.month, exp.month) AS month,
           COALESCE(rev.revenue, 0)       AS revenue,
           COALESCE(exp.expenses, 0)      AS expenses
    FROM rev
    FULL OUTER JOIN exp ON rev.month = exp.month
    ORDER BY month ASC
  `)
  return (result.rows as { month: string; revenue: string; expenses: string }[]).map(r => ({
    month: r.month,
    revenue: Number(r.revenue),
    expenses: Number(r.expenses),
  }))
}
```

#### `getMoMSnapshot` (Drizzle ORM)

```typescript
export async function getMoMSnapshot(): Promise<{
  currentRevenue: number
  previousRevenue: number
  currentExpenses: number
  previousExpenses: number
}> {
  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', NOW())
                         AND date <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
                        THEN amount END), 0) AS current_revenue,
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                         AND date <  DATE_TRUNC('month', NOW())
                        THEN amount END), 0) AS previous_revenue
    FROM income
  `)
  const expResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', NOW())
                         AND date <  DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
                        THEN amount END), 0) AS current_expenses,
      COALESCE(SUM(CASE WHEN date >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                         AND date <  DATE_TRUNC('month', NOW())
                        THEN amount END), 0) AS previous_expenses
    FROM expenses
  `)
  const inc = result.rows[0] as { current_revenue: string; previous_revenue: string }
  const exp = expResult.rows[0] as { current_expenses: string; previous_expenses: string }
  return {
    currentRevenue:   Number(inc.current_revenue),
    previousRevenue:  Number(inc.previous_revenue),
    currentExpenses:  Number(exp.current_expenses),
    previousExpenses: Number(exp.previous_expenses),
  }
}
```

#### `getRevenueByDivisionSeries` (financial.ts)

```typescript
export async function getRevenueByDivisionSeries(): Promise<{
  series: MonthlyRevenueByDivision[]
  divisions: string[]
}> {
  const rows = await getMonthlyRevenueByDivision(6)
  const divisionSet = new Set(rows.map(r => r.divisionName))
  const divisions = [...divisionSet].sort()
  const monthMap = new Map<string, MonthlyRevenueByDivision>()
  for (const row of rows) {
    if (!monthMap.has(row.month)) {
      const entry: MonthlyRevenueByDivision = { month: row.month }
      for (const d of divisions) entry[d] = 0
      monthMap.set(row.month, entry)
    }
    monthMap.get(row.month)![row.divisionName] = row.total
  }
  const series = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month))
  return { series, divisions }
}
```

#### `getMoMChartData` (financial.ts)

```typescript
export async function getMoMChartData(): Promise<MoMSnapshot[]> {
  const snap = await getMoMSnapshot()
  return [
    { metric: 'Revenue',     current: snap.currentRevenue,   previous: snap.previousRevenue },
    { metric: 'Expenses',    current: snap.currentExpenses,  previous: snap.previousExpenses },
    { metric: 'Profit Pool', current: snap.currentRevenue - snap.currentExpenses,
                             previous: snap.previousRevenue - snap.previousExpenses },
  ]
}
```

#### `RevenueByDivisionChart` (Client Component)

```tsx
'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import type { MonthlyRevenueByDivision } from '@/lib/financial'

const CHART_TOKENS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

type Props = { series: MonthlyRevenueByDivision[]; divisions: string[] }

export function RevenueByDivisionChart({ series, divisions }: Props) {
  const config: ChartConfig = Object.fromEntries(
    divisions.map((d, i) => [d, { label: d, color: CHART_TOKENS[i % 5] }])
  )

  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader><CardTitle>Revenue by Division - Last 6 Months</CardTitle></CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No data for the last 6 months.</p>
        ) : (
          <ChartContainer config={config}>
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={formatZAR} tick={{ fill: 'var(--muted-foreground)' }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              {divisions.map((d, i) => (
                <Area key={d} type="monotone" dataKey={d} stackId="a"
                  fill={CHART_TOKENS[i % 5]} stroke={CHART_TOKENS[i % 5]} />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
```

#### `RevenueVsExpensesChart` (Client Component)

```tsx
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import type { MonthlyFinancials } from '@/lib/financial'

const config: ChartConfig = {
  revenue:  { label: 'Revenue',  color: 'var(--chart-1)' },
  expenses: { label: 'Expenses', color: 'var(--chart-3)' },
}

type Props = { series: MonthlyFinancials[] }

export function RevenueVsExpensesChart({ series }: Props) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader><CardTitle>Revenue vs Expenses - Current Year</CardTitle></CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No data for the current year.</p>
        ) : (
          <ChartContainer config={config}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={formatZAR} tick={{ fill: 'var(--muted-foreground)' }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="revenue"  stroke="var(--chart-1)" dot={false} />
              <Line type="monotone" dataKey="expenses" stroke="var(--chart-3)" dot={false} />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
```

#### `MoMComparisonChart` (Client Component)

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatZAR } from '@/lib/format'
import type { MoMSnapshot } from '@/lib/financial'

const config: ChartConfig = {
  current:  { label: 'Current Month',  color: 'var(--chart-1)' },
  previous: { label: 'Previous Month', color: 'var(--chart-4)' },
}

type Props = { data: MoMSnapshot[] }

export function MoMComparisonChart({ data }: Props) {
  return (
    <Card className="rounded-xl border border-border bg-card shadow-none">
      <CardHeader><CardTitle>Month-over-Month Comparison</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-muted-foreground/50 text-xs">No comparison data available.</p>
        ) : (
          <ChartContainer config={config}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="metric" tick={{ fill: 'var(--muted-foreground)' }} />
              <YAxis tickFormatter={formatZAR} tick={{ fill: 'var(--muted-foreground)' }} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="current"  fill="var(--chart-1)" />
              <Bar dataKey="previous" fill="var(--chart-4)" />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
```

#### Reports Page

```tsx
import type { Metadata } from 'next'
import { getRevenueByDivisionSeries, getMonthlyFinancialsSeries, getMoMChartData } from '@/lib/financial'
import { RevenueByDivisionChart } from '@/components/reports/revenue-by-division-chart'
import { RevenueVsExpensesChart } from '@/components/reports/revenue-vs-expenses-chart'
import { MoMComparisonChart } from '@/components/reports/mom-comparison-chart'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Reports' }

export default async function ReportsPage() {
  const [{ series: divSeries, divisions }, financialsSeries, momData] = await Promise.all([
    getRevenueByDivisionSeries(),
    getMonthlyFinancialsSeries(),
    getMoMChartData(),
  ])

  return (
    <div className="space-y-6">
      <RevenueByDivisionChart series={divSeries} divisions={divisions} />
      <RevenueVsExpensesChart series={financialsSeries} />
      <MoMComparisonChart data={momData} />
    </div>
  )
}
```

#### Sidebar Update

```typescript
// Add to navItems array after { href: '/divisions', ... }:
{ href: '/reports', label: 'Reports', icon: BarChart3 },
// Add BarChart3 to the lucide-react import.
```
