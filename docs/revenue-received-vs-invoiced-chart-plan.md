# Revenue Received vs Invoiced Chart Implementation Plan

## Goal

Replace the current `Revenue by Division` stacked area chart in Reports & Insights with a monthly grouped bar chart.

Each month should display two bars:

- `Received`: money actually received in that month, sourced from `income.amount` grouped by `income.date`.
- `Invoiced`: money invoiced in that month, sourced from `invoices.total` grouped by `invoices.invoiceDate`.

## Current Implementation

The current chart is implemented as a division-based stacked area chart:

- UI component: `apps/admin/src/components/reports/revenue-by-division-chart.tsx`
- Page data loader: `apps/admin/src/app/(admin)/insights/reports/page.tsx`
- Server financial adapter: `apps/admin/src/lib/financial.ts`
- DB query source: `packages/db/src/queries/general.ts`

Current data shape:

```ts
type MonthlyRevenueByDivision = {
  month: string;
  [divisionName: string]: number | string;
};

type DivisionSeriesChart = {
  series: MonthlyRevenueByDivision[];
  divisions: string[];
};
```

That shape is no longer needed for this chart because the new chart compares two fixed measures instead of dynamic division names.

## Business Rule To Confirm

For `Invoiced`, default implementation should exclude `void` invoices.

Open decision: should draft invoices be included?

Recommended default:

- Include: `issued`, `partially_paid`, `paid`, `overdue`
- Exclude: `draft`, `void`

Reason: the chart should represent invoices actually sent or active with clients, not unsent working drafts.

## Proposed Data Shape

Add a new type in `apps/admin/src/lib/financial.ts`:

```ts
export type MonthlyRevenueVsInvoiced = {
  month: string;
  received: number;
  invoiced: number;
};
```

This gives Recharts a stable two-series contract:

- `month`
- `received`
- `invoiced`

## Database Query Plan

Add a query in `packages/db/src/queries/general.ts`, for example:

```ts
export async function getMonthlyRevenueVsInvoicedForYear(
  year: number,
): Promise<{ month: string; received: number; invoiced: number }[]>
```

The query should:

1. Treat `year` as the existing financial year convention already used in reports:
   - Start: `${year}-03-01`
   - End: `${year + 1}-03-01`
2. Aggregate received totals from `income`:
   - `TO_CHAR(income.date, 'YYYY-MM')`
   - `SUM(income.amount)`
3. Aggregate invoiced totals from `invoices`:
   - `TO_CHAR(invoices.invoice_date, 'YYYY-MM')`
   - `SUM(invoices.total)`
   - Filter out non-client-facing statuses based on the confirmed rule.
4. Full outer join both monthly aggregates so months with only received or only invoiced values still render.
5. Return sorted rows by `month ASC`.

Implementation style should follow the existing raw SQL helpers in `getMonthlyFinancialsForYear` and `getMonthlyRevenueByDivisionForYear`.

## Server Adapter Plan

In `apps/admin/src/lib/financial.ts`:

1. Import `getMonthlyRevenueVsInvoicedForYear` from `@pmg/db`.
2. Export the `MonthlyRevenueVsInvoiced` type.
3. Add an adapter:

```ts
export async function getRevenueVsInvoicedSeriesForYear(
  year: number,
): Promise<MonthlyRevenueVsInvoiced[]> {
  return getMonthlyRevenueVsInvoicedForYear(year);
}
```

4. Keep the old division helpers only if still used elsewhere. If they become unused, remove them in a separate cleanup pass after verifying no imports remain.

## Page Wiring Plan

In `apps/admin/src/app/(admin)/insights/reports/page.tsx`:

1. Replace `getRevenueByDivisionSeriesForYear(year)` with `getRevenueVsInvoicedSeriesForYear(year)`.
2. Rename local data from `divisionSeries` to something like `revenueVsInvoicedSeries`.
3. Update the `hasData` check to use `revenueVsInvoicedSeries.length > 0`.
4. Pass the new data into `ReportsTabs`.

In `apps/admin/src/components/reports/reports-tabs.tsx`:

1. Replace the prop type from `DivisionSeriesChart` to `MonthlyRevenueVsInvoiced[]`.
2. Rename the prop from `divisionSeries` to `revenueVsInvoicedSeries`.
3. Pass `data={revenueVsInvoicedSeries}` to the chart component.

## Chart Component Plan

Refactor `apps/admin/src/components/reports/revenue-by-division-chart.tsx`.

Recommended approach:

1. Keep the filename for a smaller routing/import change, or rename it to `revenue-vs-invoiced-chart.tsx` if we want the code name to match the new behavior.
2. Replace `AreaChart`, `Area`, and dynamic division config with:
   - `BarChart`
   - `Bar`
   - fixed chart config for `received` and `invoiced`
3. Keep the existing card structure and time range selector.
4. Update copy:
   - Title: `Revenue`
   - Description: `Monthly received vs invoiced`
5. Use two bar series:
   - `received` with `var(--chart-1)`
   - `invoiced` with `var(--chart-2)`
6. Keep `fmtMonthYear` for x-axis labels.
7. Keep `formatZAR` in tooltip values.
8. Empty state should say something like:
   - `No received or invoiced revenue for this period.`

Potential Recharts structure:

```tsx
<BarChart data={filteredSeries}>
  <CartesianGrid vertical={false} />
  <XAxis dataKey="month" tickFormatter={(v) => fmtMonthYear(v, { short: true })} />
  <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatZAR(Number(v))} />} />
  <Bar dataKey="received" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
  <Bar dataKey="invoiced" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
  <ChartLegend content={<ChartLegendContent />} />
</BarChart>
```

## Tests To Update

Existing report tests mock the old division data:

- `apps/admin/src/__tests__/reports.test.tsx`

Update mocks and expectations:

1. Replace `getRevenueByDivisionSeriesForYear` mocks with `getRevenueVsInvoicedSeriesForYear`.
2. Mock the chart component with the new prop name if the test still mocks it.
3. Add or update a test proving the Reports page passes monthly received/invoiced rows through to the revenue tab.

Add DB query coverage if the current test setup supports query-level tests for `packages/db`:

1. Month with both received and invoiced values.
2. Month with only received.
3. Month with only invoiced.
4. Void invoices excluded.
5. Draft invoice behavior based on the confirmed business rule.

## Validation Plan

Run targeted validation first:

```bash
bun --filter admin test -- reports
```

Then run a focused lint check on touched files:

```bash
cd apps/admin
./node_modules/.bin/eslint.exe \
  "src/app/(admin)/insights/reports/page.tsx" \
  "src/components/reports/reports-tabs.tsx" \
  "src/components/reports/revenue-by-division-chart.tsx" \
  "src/lib/financial.ts"
```

If database package files are changed, also run the relevant TypeScript/build check available in this repo.

Note: the full admin lint currently has existing unrelated failures, so targeted lint and tests are the useful acceptance checks for this change.

## Implementation Order

1. Confirm the invoice status rule for `Invoiced`.
2. Add the DB query for monthly received vs invoiced totals.
3. Add the server adapter/type in `apps/admin/src/lib/financial.ts`.
4. Rewire Reports page and `ReportsTabs` props.
5. Convert the chart from stacked area by division to grouped monthly bars.
6. Update report tests/mocks.
7. Run targeted validation.

## Acceptance Criteria

- Revenue tab no longer shows division-based stacked area data.
- Each displayed month has exactly two bar categories: `Received` and `Invoiced`.
- Received totals match income recorded in that month.
- Invoiced totals match invoices dated in that month using the confirmed status filter.
- Months with only one side of data still appear with the other bar at zero.
- Existing year filter still controls the financial year shown in the chart.
- Tooltip and legend use human-readable labels and ZAR formatting.
