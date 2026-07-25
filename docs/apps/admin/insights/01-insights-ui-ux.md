# Insights UI/UX Research: Snapshots and Reports

Date: 2026-06-13  
Scope: PMG Hub admin insights pages, primarily `/insights/snapshots` and `/insights/reports`.

## Executive Summary

PMG Hub already has the right conceptual split: **Snapshots** are closed-period financial records, while **Reports** are analytical views over those records and related financial data. The main opportunity is to make that split more intentional in the interface.

Recommended direction:

1. Treat snapshots as an **audit cockpit**: a left period rail, a top-line status summary, locked-period metadata, allocation bars, and transaction-level drill-down.
2. Treat reports as an **analysis workspace**: global filters, executive KPI strip, 2-3 priority charts above the fold, drill-down sheets, commentary, and export-ready report views.
3. Add a guided **Close Month** flow before snapshots are created, so users understand what will be locked and what checks passed or failed.
4. Add report layouts that answer business questions directly: "What changed?", "Why did it change?", "Which division/category caused it?", and "What should we do next?"
5. Use financial-app patterns from Xero, QuickBooks, Fathom, Float, Sage Intacct, Tableau, and Power BI: high-level KPIs first, details on demand, clear chart semantics, predictable filters, and share/export workflows.

## Local Codebase Scan

Relevant current files:

| Area | File | Current behavior |
| --- | --- | --- |
| Snapshots page | `apps/admin/src/app/(admin)/insights/snapshots/page.tsx` | Server page loads `getAllSnapshots()` and renders `SnapshotsCockpit`. Header explains snapshots are monthly locked periods created from the dashboard close-month action. |
| Snapshot cockpit | `apps/admin/src/components/insights/snapshots-cockpit.tsx` | Client component with an all-time/default view, period card rail, KPI cards, Level 1 revenue split bar, and all-time monthly performance area chart. |
| Reports page | `apps/admin/src/app/(admin)/insights/reports/page.tsx` | Server page resolves a fiscal year, loads chart data, renders a 2x2 grid of charts, year filter, and CSV export. |
| Report charts | `apps/admin/src/components/reports/*.tsx` | Recharts components for month-over-month comparison, revenue by division, expenses by category, and profit pool split. |
| Snapshot schema | `packages/db/src/schema/snapshots.ts` | `snapshots` table stores one unique period with revenue, expenses, PMG share, profit pool, salary, reinvest, reserve, flex, and `createdAt`. |
| Snapshot queries | `packages/db/src/queries/snapshots.ts` | Reads all snapshots, reads a snapshot by period, inserts a closed-period snapshot. |

Current strengths:

- The snapshots page already uses a stronger layout than a simple table: period navigation, selected-period detail, KPI summary, and trend view.
- Reports have a clear first version: year filter, CSV export, and four financial charts.
- Snapshot data is separated into a dedicated table with a unique `period`, which is a good foundation for closed-period semantics.

Current gaps:

- Snapshot creation is not surfaced as a rich close workflow on the insights page; users must know to use the dashboard close-month action.
- Snapshot cards show locked results, but there is no visible status model such as `locked`, `reopened`, `adjusted`, `exported`, or `needs review`.
- Reports are chart-first but not question-first. They show data, but do not yet guide interpretation.
- Charts do not yet drill into source rows. Premium finance tools usually let a user click a metric, chart segment, or row and inspect the underlying records.
- Export is CSV-only in the reports page; there is no board-ready or management-report view.
- Reports and snapshots are separate pages but do not cross-link enough: reports should let users jump to the source snapshot, and snapshots should show related report views.

## Research Sources

Product and design sources reviewed:

- Xero Analytics: https://www.xero.com/us/accounting-software/analytics/
- Fathom home/features: https://www.fathomhq.com/
- Fathom financial analysis: https://www.fathomhq.com/features/financial-analysis
- Fathom management reporting: https://www.fathomhq.com/features/management-reporting
- Float cash flow forecasting: https://floatapp.com/
- QuickBooks official site and financial feature links: https://quickbooks.intuit.com/
- Sage Intacct: https://www.sage.com/en-us/sage-business-cloud/intacct/
- Tableau visual best practices: https://help.tableau.com/current/blueprint/en-us/bp_visual_best_practices.htm
- Microsoft Power BI dashboard design tips: https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips

Key research takeaways:

- Xero emphasizes near-real-time headline data, dashboards, revenue/expense graphs, business health indicators, benchmarking, scenario planning, cash projections, and export/share workflows.
- Fathom separates financial analysis, management reporting, forecasting, consolidation, KPIs, divisional analysis, goal-seeking, and commentary. This is a useful model for PMG Hub: analysis is not the same as formal reporting.
- Float focuses on cash visibility, scenario planning, and switching between daily/weekly/monthly levels of detail.
- QuickBooks emphasizes cash-flow visibility, project profitability, financial health, forecasting, charts, and broad integrations.
- Sage Intacct emphasizes real-time visibility, shared dashboards, multi-dimensional reports, interactive reporting, planning, and predictive insights.
- Tableau and Power BI both recommend a clear visual hierarchy: most important numbers first, logical reading order, uncluttered dashboards, appropriate chart choice, obvious filters/interactions, tooltips, context, accessibility, and performance.

## Competitor Pattern Analysis

### Xero

Xero's Analytics positioning is useful because it speaks directly to small-business financial confidence. It promotes headline data like revenue, expenses, and gross margins; patterns in revenue and expenses; instant score indicators; benchmarking; forecasts; and shareable visuals.

Applicable PMG Hub patterns:

- Add "business health" indicators above the chart grid: margin health, expense ratio, profit pool trend, reserve coverage.
- Add a forecast/scenario route later, but do not overload the current reports page.
- Support export/share from the context where users discover the insight, not only as a generic CSV button.

### Fathom

Fathom is closest to the desired direction. It separates financial analysis from management reporting and exposes KPIs, profitability analysis, cash-flow analysis, divisional analysis, dashboard views, and commentary. Its management reporting product combines text, charts, tables, and financial statements into shareable reports.

Applicable PMG Hub patterns:

- Reports should become a composed financial narrative, not just four chart cards.
- Add commentary blocks: "Revenue increased because Apex rose R X while Tender fell R Y."
- Use divisional analysis as a first-class report section, since PMG Hub already has revenue by division.
- Add a generated "management pack" view: summary, charts, tables, notes, and export.

### Float

Float's strongest pattern is what-if thinking. It focuses on answering finance questions at speed: can we afford this hire, when will cash run out, what happens if a customer is lost, and how do results look at daily/weekly/monthly granularity.

Applicable PMG Hub patterns:

- Use period granularity controls where useful: month, quarter, fiscal year, all time.
- Add scenario controls later for reserve/reinvest planning.
- Design reports so users can move from macro to granular without changing pages.

### QuickBooks

QuickBooks emphasizes broad business workflows: books, payments, sales, expenses, payroll, projects, tax, cash flow, and financial health. The relevant UX lesson is that financial insights live beside operational actions.

Applicable PMG Hub patterns:

- Connect insights to actions: unpaid invoices, large expense categories, division revenue drops, missing close requirements.
- Add quick links from report drill-downs to invoices, expenses, clients, divisions, or ledger entries.
- Use simple labels and explanations, because reports are used by non-accountants too.

### Sage Intacct

Sage Intacct is more enterprise-oriented: real-time visibility, shared dashboards, hundreds of multi-dimensional reports, interactive reporting tools, planning, analytics, and AI-supported variance analysis.

Applicable PMG Hub patterns:

- Build toward multi-dimensional filtering: year, division, category, allocation, client, status.
- Make report cards interactive and shareable.
- Consider variance explanations as a future AI/manual commentary layer.

## Best Layout Direction

The best overall layout for PMG Hub is a **two-mode insights area**:

1. **Snapshots = closed-period record**
2. **Reports = analysis and communication**

Do not merge them into one giant dashboard. Keep the pages separate, but make them feel related through shared filters, cross-links, and consistent visual language.

### Snapshot Page Recommended Layout

Desktop:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Closed Months                       [Create / Close Month] [Export Snapshot] │
│ Locked financial periods with audit-ready allocation summaries.              │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ Period Rail   │ Snapshot Header                                             │
│ All-time      │ Apr 2026 · Locked Jun 1, 2026 · Created by Jacob             │
│ Apr 2026      │ Revenue R... | Expenses R... | PMG Share R... | Profit R... │
│ Mar 2026      ├──────────────────────────────────────────────────────────────┤
│ Feb 2026      │ Level 1 Gross Revenue Split                                 │
│ ...           │ PMG Share | Operating Expenses | Profit Pool                 │
│               ├──────────────────────────────────────────────────────────────┤
│               │ Level 2 Profit Pool Allocation                              │
│               │ Salary | Reinvest | Reserve | Flex                          │
│               ├──────────────────────────────────────────────────────────────┤
│               │ Trend / Comparison                                          │
│               │ Selected month vs previous month vs 3-month average         │
│               ├──────────────────────────────────────────────────────────────┤
│               │ Source Details                                              │
│               │ Revenue rows | Expense rows | Ledger/allocation rows        │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

Mobile:

- Replace the left rail with a period select or horizontal month tabs.
- Keep the KPI strip as 2-column cards.
- Stack split bars before charts.
- Put source details behind accordions.

### Reports Page Recommended Layout

Desktop:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Reports & Insights      [FY 2026] [Month/Quarter/YTD] [Division] [Export]    │
│ Financial performance, allocation trends, and source-level explanations.     │
├──────────────────────────────────────────────────────────────────────────────┤
│ KPI Strip: Revenue | Expenses | Net Profit | Margin | Reserve | Variance     │
├────────────────────────────────────────┬─────────────────────────────────────┤
│ Financial Performance Trend            │ Profit Pool Allocation Trend        │
│ Revenue, expenses, PMG share, profit    │ Salary, reinvest, reserve, flex     │
├────────────────────────────────────────┼─────────────────────────────────────┤
│ Revenue by Division                    │ Expenses by Category                │
│ Stacked trend / ranked bars             │ Ranked horizontal bars              │
├────────────────────────────────────────┴─────────────────────────────────────┤
│ Commentary + Exceptions                                                      │
│ Top changes, unusual expenses, best/worst division, close status             │
└──────────────────────────────────────────────────────────────────────────────┘
```

Mobile:

- Use a sticky compact filter row.
- Collapse KPI strip into a horizontally scrollable metric row or 2-column grid.
- Put the most important chart first: performance trend.
- Use drill-down sheets for detail rather than expanding large tables inline.

## How to Put Snapshots

The product model should define snapshots as **immutable monthly financial records generated after close checks pass**.

Current snapshot fields support a good first version:

- `period`
- `revenue`
- `expenses`
- `pmgShare`
- `profitPool`
- `salary`
- `reinvest`
- `reserve`
- `flex`
- `createdAt`

Recommended additions over time:

| Field | Purpose |
| --- | --- |
| `createdBy` | Show who locked the period. |
| `status` | `locked`, `adjusted`, `voided`, `review_required`. |
| `closedAt` | Separate close timestamp from DB insertion timestamp if needed. |
| `sourceHash` | Optional integrity hash of source totals used to detect retroactive changes. |
| `notes` | Manual close note or exception summary. |
| `revenueCount` / `expenseCount` | Snapshot metadata for audit confidence. |
| `reconciliationVariance` | Show whether cash/ledger reconciliation matched at close. |
| `previousSnapshotId` | Useful for comparison and audit trails. |

### Close Month Flow

Use a wizard or full dialog from the dashboard and snapshots page:

1. **Select period**
   - Default to the previous month.
   - Show whether the period is already closed.

2. **Review summary**
   - Revenue, expenses, PMG share, profit pool.
   - Salary, reinvest, reserve, flex.
   - Compare to previous month.

3. **Integrity checks**
   - Missing categories.
   - Draft/unissued invoices.
   - Unpaid invoices included/excluded.
   - Negative or unusual values.
   - Reconciliation variance if bank/ledger data is available.

4. **Confirm lock**
   - Clear statement that the snapshot will be used for reports.
   - Checkbox for confirmation.
   - Optional close note.

5. **Result**
   - Success page or toast with direct link to the new snapshot.
   - If checks fail, show a review list with links to fix source items.

### Snapshot Display Details

Snapshot cards should include:

- Period label.
- Lock status badge.
- Revenue and profit pool.
- Margin percentage.
- Month-over-month delta.
- Created/locked date.

Selected snapshot panel should include:

- KPI strip.
- Level 1 gross split.
- Level 2 profit pool split.
- Prior month comparison.
- Source data drill-down.
- Export actions.

All-time view should include:

- Cumulative totals.
- Trend line or area chart.
- Best/worst month callouts.
- Average month metrics.
- Period count and first/last closed period.

## Snapshot UI Recommendations

### 1. Rename "Closed Months" Carefully

"Closed Months" is accurate, but "Snapshots" is the navigation label. Use both:

- Page title: `Financial Snapshots`
- Subtitle: `Closed monthly records used for reporting and allocation history.`
- Section label: `Closed periods`

This reduces the user's chance of thinking snapshots are just screenshots or visual summaries.

### 2. Add A Strong Snapshot Header

For selected period:

```text
Apr 2026
Locked period · Created Jun 1, 2026 · 38 source records

Revenue R 150,000   Expenses R 45,000   PMG Share R 37,500   Profit Pool R 67,500
```

For all-time:

```text
All closed periods
12 snapshots · Mar 2025-Feb 2026 · Last close Jun 1, 2026
```

### 3. Show Ratios, Not Only Amounts

Amounts are necessary, but ratios reveal health:

- Expense ratio: `expenses / revenue`
- PMG share ratio: `pmgShare / revenue`
- Profit margin: `profitPool / revenue`
- Reserve allocation ratio: `reserve / profitPool`

### 4. Use Nested Allocation Bars

The current Level 1 split bar is a good foundation. Add Level 2 directly below it:

```text
Gross revenue
PMG Share | Expenses | Profit Pool

Profit pool
Salary | Reinvest | Reserve | Flex
```

Use consistent color meaning:

- Revenue/inflow: green.
- Expenses/outflow: amber or red depending severity.
- Profit/net result: blue.
- Allocation buckets: distinct but muted categorical colors.

### 5. Add Drill-Down Sheets

Clicking a snapshot metric should open a right-side sheet:

- Revenue metric -> revenue records for that period.
- Expenses metric -> expense records grouped by category.
- PMG share -> calculation explanation.
- Profit pool -> calculation explanation and allocation rows.
- Salary/reinvest/reserve/flex -> ledger entries or expected allocation detail.

The sheet should include:

- Header with period and metric.
- Total and count.
- Table of source rows.
- Export selected detail.
- Link to source module.

## Reports UI Recommendations

### 1. Add A KPI Summary Before Charts

The reports page currently starts with chart cards. Add a top metric row:

- Total revenue.
- Total expenses.
- PMG share.
- Profit pool.
- Profit margin.
- Best/worst month or largest variance.

Each KPI should show:

- Current selected period value.
- Change vs prior comparable period.
- Small trend indicator.
- Click target for drill-down.

### 2. Rework Chart Hierarchy

Recommended order:

1. Financial performance trend: revenue, expenses, PMG share, profit pool.
2. Profit pool allocation trend.
3. Revenue by division.
4. Expenses by category.
5. Commentary/exceptions.

The current `MoMComparisonChart` is useful, but it should not be the main chart on a yearly report. Month-over-month comparison works better as a compact variance card or side panel.

### 3. Make Filters Global

Current year filtering is a good start. Add a shared filter bar over time:

- Fiscal year.
- Period range: year, quarter, month, all time.
- Division.
- Expense category.
- Comparison: previous period, previous year, budget/target.

Filters should update all charts together. Chart-specific controls should be secondary.

### 4. Use Question-Based Chart Titles

Instead of:

- `Revenue by Division`
- `Expenses by Category`

Use titles/subtitles that frame decisions:

- `Which divisions drove revenue?`
- `Where did operating spend go?`
- `How did profit pool allocations move over time?`
- `What changed from the prior period?`

Keep chart titles concise, with explanatory subtitles where needed.

### 5. Add Commentary

Fathom's reporting product shows the value of combining charts, tables, and text. PMG Hub can start with deterministic commentary before any AI:

```text
Revenue increased R 24,500 vs March, mainly from Apex (+R 18,000).
Expenses rose R 6,200, led by Software and Professional Services.
Profit pool margin improved from 31% to 36%.
```

This can be generated from existing chart data.

### 6. Add Report Export Modes

Keep CSV export, but add:

- Print-friendly report.
- PDF later if needed.
- Snapshot pack for selected fiscal year.
- Management pack with commentary.

Export should reflect active filters and include the selected date range.

## Chart and Visual Design Guidance

Follow Tableau and Power BI guidance:

- Highest-level information belongs at the top-left/top row.
- Keep dashboards uncluttered.
- Use cards for the most important numbers.
- Use line/area charts for trends over time.
- Use bar charts for category comparisons.
- Avoid decorative chart variety.
- Make filters obvious and predictable.
- Use tooltips for details on demand.
- Use color consistently and sparingly.
- Design responsive layouts intentionally.

Chart choices for PMG Hub:

| Question | Best chart |
| --- | --- |
| How did revenue/expenses/profit change over time? | Multi-line or area chart. |
| Which divisions contributed revenue? | Stacked area for trend, ranked bar for selected period. |
| Where did expenses go? | Horizontal ranked bar chart. |
| How was profit pool distributed? | Stacked bar chart plus allocation summary. |
| How does this period compare to previous? | Variance cards or grouped bars. |
| What explains a number? | Drill-down table in sheet. |

## Proposed Information Architecture

```text
Insights
├─ Snapshots
│  ├─ All-time overview
│  ├─ Period detail
│  ├─ Source drill-down
│  └─ Close month flow
└─ Reports
   ├─ Performance overview
   ├─ Revenue analysis
   ├─ Expense analysis
   ├─ Allocation analysis
   ├─ Commentary
   └─ Export / management pack
```

## Implementation Roadmap

### Phase 1: Fast UI Improvements

1. Rename snapshots header to `Financial Snapshots`.
2. Add all-time metadata: first period, last period, snapshot count.
3. Add profit margin, expense ratio, and PMG share ratio to snapshot details.
4. Add a Level 2 profit pool allocation bar to `SnapshotsCockpit`.
5. Add KPI strip to reports page above the chart grid.
6. Improve chart titles/subtitles to answer business questions.

### Phase 2: Drill-Down and Cross-Linking

1. Add click handlers to report charts.
2. Add a reusable `FinancialDrilldownSheet`.
3. Add server queries for source rows behind revenue, expense, division, category, and allocation totals.
4. Link snapshot metrics to the same drill-down sheet.
5. Add "View snapshot" links from report tooltips or drill-down rows.

### Phase 3: Close Workflow

1. Replace single close-month action with a review dialog.
2. Add close checks and warnings.
3. Add close note and lock confirmation.
4. Store close metadata.
5. Show status badges on snapshot cards.

### Phase 4: Report Pack

1. Add print-friendly report route or mode.
2. Add deterministic commentary from existing data.
3. Add export of active filtered view.
4. Add management pack layout: summary, charts, commentary, tables.

## Prioritized Backlog

High priority:

- Add KPI strip to reports page.
- Add Level 2 allocation bar to snapshots.
- Add ratio metrics and month-over-month deltas.
- Add drill-down sheet pattern.
- Improve empty states with direct actions.

Medium priority:

- Add close-month wizard.
- Add snapshot metadata fields.
- Add report commentary.
- Add print-friendly management report.
- Add comparison modes.

Lower priority:

- Forecasting/scenarios.
- Benchmarks/targets.
- AI commentary.
- Multi-entity consolidation.
- Advanced anomaly detection.

## UX Acceptance Criteria

Snapshots page:

- A user can tell which periods are closed within 5 seconds.
- A user can understand how gross revenue became PMG share, expenses, and profit pool.
- A user can see how profit pool was split into salary, reinvest, reserve, and flex.
- A user can inspect source rows for any displayed total.
- A user can export or print the selected snapshot.

Reports page:

- A user can answer "how are we performing this year?" without scrolling.
- A user can identify the largest revenue driver and expense category.
- A user can compare current period to previous period.
- A user can click a chart and see the records behind it.
- A user can create a shareable report from the active filters.

## Recommended Next Design Target

Start with the reports page because it currently has the biggest UX gap. The most valuable first change is:

1. Add a report KPI strip.
2. Promote the financial performance trend to the first large chart.
3. Move month-over-month comparison into compact variance cards.
4. Add a drill-down sheet for expenses by category.

Then improve snapshots with:

1. Level 2 allocation bar.
2. Snapshot health ratios.
3. Period status metadata.
4. Source drill-downs.

This keeps the work incremental while moving PMG Hub toward the patterns used by stronger financial applications: high-level answers first, trustworthy locked records underneath, and details available exactly when users ask for them.
