# Consolidated Insights Implementation Plan

> `pmg-hub / docs / insights / 04-consolidated-implementation-plan.md` · June 2026 · v1.0
>
> **Scope:** Merged analysis of proposals 01, 02, and 03 — concrete page updates for Snapshots and Reports.

---

## Proposal Comparison Summary

| Area | Proposal 01 (Research) | Proposal 02 (Deep Research) | Proposal 03 (Spec) | Consensus |
|------|----------------------|---------------------------|-------------------|-----------|
| **Snapshot layout** | Master-detail with audit cockpit | Master-detail with comparison | Master-detail with lock wizard | ✅ Master-detail (keep current) |
| **Comparison view** | Period rail + trend | 3-tab comparison panel | Not covered | ✅ Already built (03-comparison) |
| **Close Month** | Wizard with integrity checks | Keep button, add status | Wizard with pre-lock checklist | ✅ Replace button with wizard |
| **KPI deltas** | Ratios + MoM deltas | DeltaBadge on KPIs | Not covered | ✅ Add delta badges |
| **Reports KPI strip** | 6-metric strip | 4-card strip with sparklines | Not covered | ✅ Add KPI strip (4 cards) |
| **Report tabs** | Question-based sections | Overview/Revenue/Expenses/Profit | Not covered | ✅ Add tabbed sections |
| **Drill-down** | Side sheets for all metrics | Click chart → raw data | Side-sheet drill-downs | ✅ Side-sheet pattern |
| **Export** | CSV + PDF + management pack | CSV + PDF + print | CSV + PDF | ✅ CSV + PDF |
| **Color system** | Consistent semantic colors | HSL chart tokens | Custom HSL tokens | ✅ Standardize chart tokens |
| **Schema additions** | `createdBy`, `status`, `notes` | Not covered | `isPeriodLocked` helper | ✅ Add metadata fields |

---

## What Each Proposal Adds Uniquely

### Proposal 01 (Research-focused)
- **Question-based chart titles** ("Which divisions drove revenue?")
- **Commentary generation** from existing data (deterministic, not AI)
- **Management pack** export layout (summary + charts + commentary + tables)
- **Ratio metrics** (expense ratio, profit margin, reserve coverage)
- **Best/worst month callouts** in all-time view

### Proposal 02 (Implementation-focused)
- **Snapshot comparison panel** (3 tabs) — ✅ Already built
- **SnapshotDeltaBadge** component — ✅ Already built
- **Report tabs** (Overview, Revenue, Expenses, Profit Pool)
- **Waterfall chart** for cash flow
- **Sankey diagram** for allocation flow
- **Cross-chart filtering** (click month → highlight everywhere)
- **Loading skeletons** for all data states

### Proposal 03 (Security-focused)
- **`isPeriodLocked` database helper** for guardrails
- **Pre-close checklist** (reconciliation variance, draft invoices, uncategorized expenses)
- **HSL chart color tokens** for consistent theming
- **PDF export** with letterhead and watermark
- **PMG Share discrepancy** note (20% in docs vs 25% in code)

---

## Consolidated Page Updates

### PAGE 1: Snapshots (`/insights/snapshots`)

#### Already Implemented ✅
- [x] Compare mode with multi-select sidebar
- [x] SnapshotComparisonPanel with 3 tabs (Overview, Allocations, Trend)
- [x] SnapshotDeltaBadge component
- [x] A/B badges on selected comparison cards
- [x] Hide single-period view during comparison

#### Phase 1: Quick UI Wins (1-2 days)

| # | Update | File(s) | Effort |
|---|--------|---------|--------|
| S1 | **Add lock icon (🔒) to snapshot cards** | `snapshots-cockpit.tsx` | Low |
| S2 | **Add delta indicators to single-period KPI cards** (reuse `SnapshotDeltaBadge`) | `snapshots-cockpit.tsx` | Low |
| S3 | **Add ratio metrics** to detail panel: expense ratio, profit margin, PMG share ratio | `snapshots-cockpit.tsx` | Low |
| S4 | **Add all-time metadata**: first period, last period, snapshot count, avg monthly revenue | `snapshots-cockpit.tsx` | Low |
| S5 | **Add mini sparklines** to sidebar snapshot cards (revenue trend) | `snapshots-cockpit.tsx` | Medium |

#### Phase 2: Enhanced Detail (1 week)

| # | Update | File(s) | Effort |
|---|--------|---------|--------|
| S6 | **Add Level 2 profit pool allocation bar** (Salary/Reinvest/Reserve/Flex) below the Level 1 gross split | `snapshots-cockpit.tsx` | Medium |
| S7 | **Add drill-down side sheet** for snapshot metrics (click Revenue → income rows, click Expenses → expense rows) | New: `financial-drilldown-sheet.tsx` | Medium |
| S8 | **Add "closed by" and "notes" fields** to snapshot metadata display | `snapshots-cockpit.tsx`, schema | Medium |
| S9 | **Add export/print** for individual snapshots (PDF or print-friendly view) | New: snapshot export | Medium |
| S10 | **Add hover tooltips** with additional context on all elements | `snapshots-cockpit.tsx` | Low |

#### Phase 3: Close Month Wizard (1-2 weeks)

| # | Update | File(s) | Effort |
|---|--------|---------|--------|
| S11 | **Replace Close Month button with wizard dialog** (multi-step: summary → checks → confirm) | `close-month-button.tsx` → new wizard | High |
| S12 | **Add pre-close integrity checks**: uncategorized expenses, draft invoices, reconciliation variance | New server queries + wizard | High |
| S13 | **Add `isPeriodLocked` helper** to enforce lock-date guardrails in server actions | `packages/db/src/queries.ts`, actions | Medium |
| S14 | **Add `createdBy`, `status`, `notes` fields** to snapshots schema | `packages/db/src/schema/snapshots.ts` | Medium |
| S15 | **Show status badges** on snapshot cards (locked, adjusted, needs review) | `snapshots-cockpit.tsx` | Low |

---

### PAGE 2: Reports (`/insights/reports`)

#### Phase 1: Quick UI Wins (1-2 days)

| # | Update | File(s) | Effort |
|---|--------|---------|--------|
| R1 | **Add summary KPI strip** at top (Revenue, Expenses, PMG Share, Profit Pool with sparklines) | `reports/page.tsx` + new `ReportKpiStrip` | Low |
| R2 | **Standardize chart colors** using HSL tokens (`--chart-1` through `--chart-5`) | `index.css` + chart components | Low |
| R3 | **Add loading skeletons** for all chart cards | `reports/page.tsx` | Low |
| R4 | **Improve chart titles** to question-based format ("Which divisions drove revenue?") | Chart component headers | Low |

#### Phase 2: Enhanced Reports (1-2 weeks)

| # | Update | File(s) | Effort |
|---|--------|---------|--------|
| R5 | **Add report tabs** (Overview, Revenue, Expenses, Profit Pool) | `reports/page.tsx` + new tab components | Medium |
| R6 | **Add period selector** (fiscal year + month range, not just year) | `year-filter.tsx` → `period-selector.tsx` | Medium |
| R7 | **Add MoM/YoY comparison toggles** | New: `comparison-toggle.tsx` | Medium |
| R8 | **Add drill-down side sheets** for chart data (click bar → see transactions) | New: `financial-drilldown-sheet.tsx` | Medium |
| R9 | **Add PDF export** and print-friendly view | New: `export-pdf-button.tsx` | Medium |
| R10 | **Reorder charts**: Performance trend first, then allocations, then division/category breakdowns | `reports/page.tsx` | Low |

#### Phase 3: Advanced Features (2-3 weeks)

| # | Update | File(s) | Effort |
|---|--------|---------|--------|
| R11 | **Add waterfall chart** for cash flow visualization | New: `waterfall-chart.tsx` | Medium |
| R12 | **Add Sankey diagram** for allocation flow visualization | New: `sankey-diagram.tsx` | High |
| R13 | **Add cross-chart filtering** (click month in one chart → highlight everywhere) | Reports page state | Medium |
| R14 | **Add deterministic commentary** ("Revenue increased R24k vs March, mainly from Apex") | New: `report-commentary.tsx` | Medium |
| R15 | **Add heatmap** for monthly division performance | New: `division-heatmap.tsx` | High |

---

### CROSS-CUTTING Updates

| # | Update | Scope | Effort |
|---|--------|-------|--------|
| X1 | **Add sticky date range** in page header (global filter) | Both pages | Low |
| X2 | **Ensure all charts responsive** on mobile | All chart components | Medium |
| X3 | **Add dark mode chart color tuning** (muted pastels) | `index.css` | Low |
| X4 | **Add empty states with actionable CTAs** for all sections | Both pages | Low |
| X5 | **Add keyboard shortcuts** (Cmd+K search, arrow navigation) | App-wide | Medium |
| X6 | **Add accessibility** (aria-labels, focus rings, alt text) | All components | Medium |
| X7 | **Fix PMG Share discrepancy** (align 20% docs with 25% code) | Docs + code | Low |

---

## Recommended Implementation Order

### Sprint 1 (This Week): Quick Wins
1. **R1** — Add KPI strip to Reports page
2. **S1-S3** — Lock icons, delta badges, ratio metrics on Snapshots
3. **R4** — Question-based chart titles
4. **X7** — Fix PMG Share discrepancy

### Sprint 2 (Next Week): Core Enhancements
5. **S6** — Level 2 allocation bar on Snapshots
6. **R5-R7** — Report tabs, period selector, comparison toggles
7. **R10** — Reorder report charts
8. **X1** — Sticky date range header

### Sprint 3 (Week 3): Drill-Down & Export
9. **S7** — Drill-down side sheet for Snapshots
10. **R8** — Drill-down side sheets for Reports
11. **R9** — PDF export
12. **S9** — Snapshot export/print

### Sprint 4 (Week 4): Close Workflow
13. **S11-S12** — Close Month wizard with integrity checks
14. **S13-S14** — Database guardrails and schema additions
15. **S15** — Status badges on snapshot cards

### Sprint 5 (Week 5-6): Advanced Features
16. **R11-R13** — Waterfall chart, Sankey diagram, cross-chart filtering
17. **R14** — Deterministic commentary
18. **X5-X6** — Keyboard shortcuts, accessibility

---

## New Components to Create

| Component | Purpose | Phase |
|-----------|---------|-------|
| `ReportKpiStrip` | KPI cards with sparklines for Reports page | Sprint 1 |
| `FinancialDrilldownSheet` | Side-sheet for transaction drill-downs | Sprint 3 |
| `PeriodSelector` | Enhanced date range picker (FY + month range) | Sprint 2 |
| `ComparisonToggle` | MoM/YoY toggle buttons | Sprint 2 |
| `CloseMonthWizard` | Multi-step close dialog with integrity checks | Sprint 4 |
| `WaterfallChart` | Cash flow waterfall visualization | Sprint 5 |
| `SankeyDiagram` | Allocation flow visualization | Sprint 5 |
| `ReportCommentary` | Deterministic text summaries from data | Sprint 5 |
| `ExportPdfButton` | PDF export with letterhead | Sprint 3 |
| `DivisionHeatmap` | Monthly performance heatmap | Sprint 5 |

---

## Schema Changes Required

### Snapshots Table Additions

```sql
ALTER TABLE snapshots ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE snapshots ADD COLUMN status TEXT NOT NULL DEFAULT 'locked';
ALTER TABLE snapshots ADD COLUMN notes TEXT;
ALTER TABLE snapshots ADD COLUMN closed_at TIMESTAMPTZ NOT NULL DEFAULT now();
```

### New Helper: `isPeriodLocked`

```ts
// packages/db/src/queries.ts
export async function isPeriodLocked(dateString: string): Promise<boolean> {
  const [year, month] = dateString.split('-')
  const period = `${year}-${month}`
  const snapshot = await db
    .select({ id: snapshots.id })
    .from(snapshots)
    .where(eq(snapshots.period, period))
    .limit(1)
  return snapshot.length > 0
}
```

---

## Files to Modify (Complete List)

### Snapshots Page
- `apps/admin/src/components/insights/snapshots-cockpit.tsx` — Lock icons, deltas, ratios, Level 2 bar, metadata
- `apps/admin/src/components/insights/snapshot-comparison-panel.tsx` — Minor enhancements
- `apps/admin/src/app/(admin)/insights/snapshots/page.tsx` — Header updates
- `apps/admin/src/components/dashboard/close-month-button.tsx` → New wizard component

### Reports Page
- `apps/admin/src/app/(admin)/insights/reports/page.tsx` — KPI strip, tabs, reorder charts
- `apps/admin/src/components/reports/year-filter.tsx` → Enhanced period selector
- `apps/admin/src/components/reports/mom-comparison-chart.tsx` — Question-based title
- `apps/admin/src/components/reports/revenue-by-division-chart.tsx` — Question-based title
- `apps/admin/src/components/reports/expense-by-category-chart.tsx` — Question-based title
- `apps/admin/src/components/reports/profit-pool-chart.tsx` — Question-based title
- `apps/admin/src/components/reports/export-csv-button.tsx` — Add PDF export option

### New Files
- `apps/admin/src/components/insights/report-kpi-strip.tsx`
- `apps/admin/src/components/insights/financial-drilldown-sheet.tsx`
- `apps/admin/src/components/insights/period-selector.tsx`
- `apps/admin/src/components/insights/comparison-toggle.tsx`
- `apps/admin/src/components/insights/close-month-wizard.tsx`
- `apps/admin/src/components/reports/waterfall-chart.tsx`
- `apps/admin/src/components/reports/sankey-diagram.tsx`
- `apps/admin/src/components/reports/report-commentary.tsx`
- `apps/admin/src/components/reports/export-pdf-button.tsx`
- `apps/admin/src/components/reports/division-heatmap.tsx`

### Schema & DB
- `packages/db/src/schema/snapshots.ts` — Add `createdBy`, `status`, `notes`, `closedAt`
- `packages/db/src/queries/snapshots.ts` — Add `isPeriodLocked` helper
- `packages/db/src/queries/general.ts` — Add `getExpensesByCategoryDetails` for drill-down

### Shared
- `apps/admin/src/app/globals.css` — HSL chart color tokens
- `apps/admin/src/components/navigation/nav-data.ts` — No changes needed (routes already correct)
