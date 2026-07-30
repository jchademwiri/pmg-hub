# PMG Insights Pages — UI/UX Deep Research Report

> `pmg-hub / docs / insights / 02-insights-ui-ux.md` · June 2026 · v1.0
>
> **Scope:** Snapshots page, Reports page, and overall Insights section UI/UX analysis.
> **App:** `apps/admin` (Next.js 15 + shadcn/ui + Recharts + Tailwind CSS)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [How Financial Apps Handle Snapshots](#2-how-financial-apps-handle-snapshots)
3. [Snapshot UI Design Recommendations](#3-snapshot-ui-design-recommendations)
4. [Report UI Design Best Practices](#4-report-ui-design-best-practices)
5. [Competitive Analysis — Financial Application Layouts](#5-competitive-analysis--financial-application-layouts)
6. [Best Layout Patterns](#6-best-layout-patterns)
7. [UI/UX Improvement Recommendations](#7-uiux-improvement-recommendations)
8. [Implementation Priorities](#8-implementation-priorities)

---

## 1. Current State Analysis

### 1.1 Insights Section Structure

The Insights section lives under `apps/admin/src/app/(admin)/insights/` with two sub-pages:

| Page | Route | Component | Purpose |
|------|-------|-----------|---------|
| **Snapshots** | `/insights/snapshots` | `SnapshotsCockpit` | Displays closed monthly financial periods |
| **Reports** | `/insights/reports` | `ReportsPage` | Charts and data visualization for financial analysis |

**Navigation:** Both pages are grouped under "Insights" in the sidebar (`nav-data.ts`), using `Camera` (Snapshots) and `BarChart3` (Reports) icons.

### 1.2 Snapshots Page — Current Implementation

**File:** `apps/admin/src/components/insights/snapshots-cockpit.tsx`

**Layout:** 4-column grid (`lg:grid-cols-4`)
- **Left sidebar (1 col):** Scrollable list of closed months with an "All-Time Overview" card at top
- **Right panel (3 cols):** Detail cockpit showing KPIs, revenue split bar, and trend chart

**Key Features:**
- Selectable monthly cards (click to view detail)
- Level 1 KPI strip: Revenue, Expenses, Profit Pool (3 cards)
- Visual split bar showing PMG/Expenses/Profit Pool percentages
- All-time view: Area chart showing chronological financial performance trend
- Color coding: Green (profitable months), Red (loss months), Blue (active selection)

**Schema (snapshots table):**
```
id | period | revenue | expenses | pmgShare | profitPool | salary | reinvest | reserve | flex | createdAt
```

### 1.3 Reports Page — Current Implementation

**File:** `apps/admin/src/app/(admin)/insights/reports/page.tsx`

**Layout:** 2×2 grid of chart cards with header bar

**Key Features:**
- Year filter dropdown (top right)
- Export CSV button (top right)
- 4 chart cards in a 2×2 grid:
  1. **MoM Comparison** — Grouped bar chart (current vs previous month)
  2. **Profit Pool Split** — Stacked bar chart (salary, reinvest, reserve, flex)
  3. **Revenue by Division** — Stacked area chart with 3/6 month range selector
  4. **Expenses by Category** — Horizontal bar chart

**Data Sources:** All charts pull from `@/lib/financial` functions using snapshot data.

### 1.4 Dashboard Integration

The main Dashboard (`dashboard-shell.tsx`) already contains:
- KPI grid with sparklines (Revenue, Expenses, PMG Share, Profit Pool)
- Period tabs (Current Month, Previous Month, Year to Date)
- Division area chart, Division revenue breakdown, Leads summary
- Expense breakdown by division (ExpenseSnapshot component)
- Aging report grid
- Close Month button (conditional)

---

## 2. How Financial Apps Handle Snapshots

### 2.1 Industry Approaches to "Period Close"

| Application | Mechanism | How It Works |
|-------------|-----------|--------------|
| **QuickBooks Online** | Closing Date + Password | Users set a "Closing Date" in settings. Transactions on/before this date are password-protected. Prevents accidental edits to finalized books. |
| **Xero** | Lock Dates (two tiers) | "Period Lock Date" prevents standard users from editing. "End of Year Lock Date" prevents everyone (including advisers). |
| **NetSuite** | Period Close Checklist | Enterprise-grade: mandatory checklist (revaluation, journal entries, subledger locks) must be cleared to close a period. |
| **Sage 50** | Year-End Wizard | Guided wizard for closing fiscal year. Keeps multiple fiscal years open for transition. |
| **Wave** | Implicit / Manual | No formal hard lock. Relies on fiscal year-end settings and manual reconciliations. |
| **FreshBooks** | Report-Based | No formal period closing. Users generate reports for specific timeframes as their "snapshot." |

### 2.2 PMG's Current Approach

PMG uses a **simple snapshot model**:
- `closeMonth` action captures PeriodSummary and inserts into `snapshots` table
- Once closed, the period's income/expenses are effectively frozen (date-rules block edits)
- Snapshots store point-in-time financial model calculations
- The `createdAt` timestamp records when the period was closed

**Key Distinction:** Unlike QuickBooks/Xero, PMG stores actual computed snapshots (not just a lock date). This is closer to NetSuite's approach but simplified — a single action captures all figures at once.

### 2.3 Best Practices from Industry

1. **Prevent, Don't Punish:** Use active protection — warn users before saving transactions in locked periods, require secondary authorization to override.
2. **Guided Workflows:** For complex close processes, use wizards or checklists to break the process into smaller sub-tasks.
3. **Accessibility of History:** Even when closed, ensure reports can still be generated easily. "Closed" means "finalized for reporting," not "inaccessible."
4. **Transparency:** Show who locked the books and when. Provide clear feedback when users try to modify locked periods.
5. **Audit Trails:** Every change to a locked period must have an associated audit trail — visible in the UI.

---

## 3. Snapshot UI Design Recommendations

### 3.1 Current Snapshot Cockpit — Strengths & Weaknesses

**Strengths:**
- Clean sidebar + detail layout (master-detail pattern)
- Color-coded monthly cards (green/red for profit/loss)
- Visual split bar is intuitive for revenue allocation
- All-time trend chart provides historical context

**Weaknesses:**
- No drill-down from snapshot to underlying transactions
- No comparison between snapshots (month-over-month)
- No visual indicator of "locked" state vs "open" state
- No snapshot-level KPIs with delta indicators (like the dashboard has)
- Missing: who closed the period, notes/context for the close
- No print/export capability for individual snapshots
- The sidebar list could show more preview data (e.g., mini sparklines)

### 3.2 Recommended Snapshot UI Enhancements

#### A. Enhanced Snapshot Card Design

Each snapshot card in the sidebar should show:
```
┌─────────────────────────────┐
│ 🔒 June 2025               │  ← Lock icon + period
│ Rev: R 185,420              │  ← Revenue preview
│ ████████░░░ 82% margin      │  ← Mini progress bar
│ [Profit: +R 42,100]         │  ← Badge (green/red)
└─────────────────────────────┘
```

**Recommendations:**
- Add a padlock icon (🔒) to visually signal "locked" status
- Add mini sparkline or progress bar showing margin percentage
- Show PMG share percentage as a visual indicator
- Add hover tooltip with more detail (expenses, allocations)

#### B. Enhanced Detail Panel

When a snapshot is selected, show:
1. **Header Card:** Period name, lock date, who closed it (if available)
2. **KPI Strip (4 cards):** Revenue, Expenses, PMG Share, Profit Pool — each with:
   - The value
   - Delta vs previous month (e.g., "+12% vs May 2025")
   - Mini sparkline trend
3. **Revenue Allocation:** Keep the visual split bar, but add:
   - Percentage labels inside each segment
   - Hover tooltip showing exact amounts
   - Comparison overlay (dashed line showing previous month's split)
4. **Monthly Trend:** Keep the area chart, but add:
   - Hover-to-highlight individual months
   - Click-to-select a month from the chart (syncs with sidebar)
   - Annotations for notable events (e.g., "New client onboarded")

#### C. New: Snapshot Comparison View

Add a "Compare" mode that lets users select two snapshots and see:

```
┌─────────────────────────────────────────────────┐
│  June 2025          vs         May 2025         │
│  ──────────────────────────────────────────────  │
│  Revenue:   R 185,420    R 172,100   +7.7%     │
│  Expenses:  R  98,200    R  95,800   +2.5%     │
│  PMG Share: R  46,355    R  43,025   +7.7%     │
│  Profit:    R  40,865    R  33,275   +22.8%    │
└─────────────────────────────────────────────────┘
```

This is a standard pattern in QuickBooks/Xero — comparing closed periods.

#### D. New: Snapshot-to-Ledger Drill-Down

Allow clicking on any snapshot figure to see the underlying transactions:
- Click "Revenue" → see all income entries for that period
- Click "Expenses" → see all expense entries for that period
- Click "Profit Pool" → see the allocation breakdown

This follows the "Overview first, zoom and filter, then details-on-demand" mantra from financial UX best practices.

### 3.3 Snapshot Page Layout Recommendation

**Current:** Sidebar (1 col) + Detail (3 cols)
**Recommended:** Keep the layout but enhance with tabs

```
┌──────────────────────────────────────────────────────────────┐
│  Closed Months                              [Compare] [Export]│
├──────────┬───────────────────────────────────────────────────┤
│          │  📊 Financial Overview — June 2025                │
│ All-Time │  Locked on 2 Jul 2025                             │
│ ──────── │                                                   │
│ June '25 │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│ May '25  │  │ Rev  │ │ Exp  │ │ PMG  │ │Profit│            │
│ Apr '25  │  │R185k │ │R98k  │ │R46k  │ │R40k  │            │
│ ...      │  │+7.7% │ │+2.5% │ │+7.7% │ │+22.8%│            │
│          │  └──────┘ └──────┘ └──────┘ └──────┘            │
│          │                                                   │
│          │  [Overview] [Allocations] [Trend] [Transactions]  │
│          │  ────────────────────────────────────────────────  │
│          │  (Tab content: charts, tables, drill-downs)       │
└──────────┴───────────────────────────────────────────────────┘
```

---

## 4. Report UI Design Best Practices

### 4.1 Current Reports Page — Strengths & Weaknesses

**Strengths:**
- Clean 2×2 chart grid layout
- Year filter and CSV export in header
- Consistent card styling across all charts
- Good use of Recharts with shadcn ChartContainer

**Weaknesses:**
- No comparison views (MoM, YoY toggles)
- No drill-down from charts to raw data
- No summary KPIs at the top of the reports page
- No date range picker (only year filter)
- No "print this report" or "share this report" capability
- Charts are static — no interactivity between them
- Missing: Waterfall chart for cash flow, Sankey for allocation flow
- No report tabs or sections for different report types

### 4.2 Recommended Report Page Redesign

#### A. Enhanced Header Bar

```
┌──────────────────────────────────────────────────────────────┐
│  Reports & Insights                                          │
│  Analyze revenue streams, expense distributions, and profits │
│                                                              │
│  [FY 2025 ▼]  [Jan-Dec ▼]  [MoM] [YoY]  [Export ▼] [Print]│
└──────────────────────────────────────────────────────────────┘
```

**Additions:**
- **Period selector:** Expand from year-only to fiscal year + month range
- **Comparison toggles:** MoM, YoY, Custom Range buttons
- **Export dropdown:** CSV, PDF, Print-friendly view

#### B. Summary KPI Strip (New)

Add a KPI strip at the top of the reports page (similar to dashboard):

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Revenue  │ │ Expenses │ │ PMG Share│ │ Profit   │
│ R2.1M    │ │ R1.2M    │ │ R525k    │ │ R375k    │
│ +15% YoY │ │ +8% YoY  │ │ +15% YoY │ │ +28% YoY │
│ ▁▂▃▅▆▇█  │ │ ▁▂▃▄▅▆▇  │ │ ▁▂▃▅▆▇█  │ │ ▁▂▃▅▆▇█  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

This gives immediate context before diving into charts.

#### C. Report Tabs / Sections

Organize reports into logical sections using tabs:

| Tab | Content |
|-----|---------|
| **Overview** | KPI strip + MoM comparison + Revenue vs Expenses trend |
| **Revenue** | Revenue by Division (stacked area) + Division comparison |
| **Expenses** | Expenses by Category + Expense trends + Top expense items |
| **Profit Pool** | Allocation breakdown (stacked bar) + Allocation trends |
| **Cash Flow** | Waterfall chart (Revenue → Expenses → Profit → Allocations) |

#### D. New Chart Types to Add

1. **Waterfall Chart** — For cash flow visualization showing how revenue becomes net income through positive/negative changes
2. **Sankey Diagram** — For money flow visualization (Revenue → PMG Share / Expenses / Profit Pool → Salary / Reinvest / Reserve / Flex)
3. **Heatmap** — For monthly performance across divisions (rows = divisions, columns = months, color = revenue)
4. **Donut Chart** — For allocation breakdown at a glance (alternative to stacked bar)

#### E. Interactive Features

1. **Cross-chart filtering:** Click a month in one chart to highlight that month across all charts
2. **Drill-down:** Click any bar/segment to see the underlying data
3. **Hover tooltips:** Show exact values, percentages, and deltas on hover
4. **Zoom:** Allow zooming into specific time ranges on trend charts
5. **Annotations:** Allow adding notes to specific data points

### 4.3 Report Layout Pattern (Industry Best Practice)

The recommended layout follows the "Stratified Hierarchy" pattern used by Stripe, Linear, and Vercel:

```
┌──────────────────────────────────────────────────────────────┐
│  Level 1: KPI Ticker Cards (3-5 metrics, big numbers)       │
├──────────────────────────────────────────────────────────────┤
│  Level 2: Trend Charts (time-series, comparisons)            │
├──────────────────────────────────────────────────────────────┤
│  Level 3: Breakdown Tables (detailed data, sortable)         │
├──────────────────────────────────────────────────────────────┤
│  Level 4: Transaction Drill-down (raw ledger entries)        │
└──────────────────────────────────────────────────────────────┘
```

This progressive disclosure approach prevents cognitive overload while allowing deep analysis.

---

## 5. Competitive Analysis — Financial Application Layouts

### 5.1 QuickBooks Online

**Layout Philosophy:** Dashboard-to-Report hierarchy
- **Main Dashboard:** Widgets for bank balances, money in/out, overdue invoices
- **Reports Tab:** Organized by function (Financial, Sales, Tax)
- **Period Close:** Settings → Closing Date + Password protection
- **Key Pattern:** Simple, compliance-focused. Good for non-accountants.

**PMG Can Learn From:**
- Closing date password protection pattern
- Report categorization by function
- Simple, accessible language for financial concepts

### 5.2 Xero

**Layout Philosophy:** Performance-first with analytics focus
- **Dashboard:** Live data feeds, interactive charts
- **Analytics Tab:** Customizable widgets, trend lines
- **Period Close:** Two-tier lock dates (period lock + end-of-year lock)
- **Key Pattern:** Clean, modern, high whitespace. Good balance of simplicity and power.

**PMG Can Learn From:**
- Two-tier locking (period lock vs final lock)
- Customizable dashboard widgets
- Clean, modern aesthetic with high contrast

### 5.3 Stripe Dashboard

**Layout Philosophy:** Data density with minimalism
- **Gold standard** for financial-grade UI
- Minimalist, high-contrast aesthetic
- Data Tiers: Ticker cards → Summary Table → List View
- Every table row is a clickable "details" entity
- **Key Pattern:** Extreme data density without clutter. Professional, trustworthy feel.

**PMG Can Learn From:**
- Data tier pattern (KPI → Charts → Tables → Details)
- Click-through drill-down on every element
- Professional color palette and typography
- Sticky date range in header

### 5.4 Mercury / Brex / Ramp (Modern Neobanks)

**Layout Philosophy:** Real-time visibility over historical accounting
- Live data feeds, not static reports
- Interactive, clickable cards (drill-down to transactions)
- Heavy white space, high-contrast typography
- "Artful" data visualization
- **Key Pattern:** Aesthetic, card-based, interactive. Modern fintech feel.

**PMG Can Learn From:**
- Card-based interactive elements
- Clean, modern aesthetic
- Transaction-level transparency
- Live data feel (even if data isn't truly real-time)

### 5.5 Baremetrics / ProfitWell (SaaS Metrics)

**Layout Philosophy:** Growth tracking and KPI optimization
- Time-series trend lines for MRR, churn, LTV
- Cohort analysis, funnel charts
- Segmented views (by region, plan, user type)
- Custom widgets and segments
- **Key Pattern:** Highly customizable, performance-oriented.

**PMG Can Learn From:**
- Segmentation capabilities (by division, by category)
- Trend line patterns for growth metrics
- Custom widget/comparison patterns

### 5.6 Comparison Summary

| Feature | QuickBooks | Xero | Stripe | Mercury/Brex | PMG (Current) |
|---------|-----------|------|--------|-------------|----------------|
| **Primary Goal** | Tax/Legal Compliance | Analytics + Compliance | Data Density | Real-time Visibility | Financial Tracking |
| **View Style** | Static Reports | Interactive Charts | Tiered Data | Card-based | Card + Charts |
| **Period Close** | Date + Password | Two-tier Locks | N/A | Auto-sync | Simple Snapshot |
| **Drill-down** | Limited | Moderate | Deep | Deep | None |
| **Export** | PDF/XLS | PDF/XLS/CSV | CSV/API | CSV | CSV only |
| **Comparison** | MoM/YoY | MoM/YoY/Custom | Custom | Custom | MoM only |
| **Mobile** | Good | Good | Excellent | Excellent | Responsive |

---

## 6. Best Layout Patterns

### 6.1 Master-Detail Pattern (Recommended for Snapshots)

Used by: Xero, QuickBooks, NetSuite

```
┌──────────┬─────────────────────────────────┐
│  List    │  Detail View                    │
│  Panel   │                                 │
│          │  KPI Cards                      │
│  [Item1] │  ───────────────────────────    │
│  [Item2] │  Charts / Visualizations        │
│  [Item3] │  ───────────────────────────    │
│  ...     │  Tables / Drill-downs           │
└──────────┴─────────────────────────────────┘
```

**Best for:** Snapshots page (current layout already follows this)

### 6.2 Stratified Hierarchy Pattern (Recommended for Reports)

Used by: Stripe, Linear, Vercel

```
┌──────────────────────────────────────────┐
│  Level 1: KPI Ticker Cards (3-5 metrics)│
├──────────────────────────────────────────┤
│  Level 2: Trend Charts (time-series)     │
├──────────────────────────────────────────┤
│  Level 3: Breakdown Tables (sortable)    │
├──────────────────────────────────────────┤
│  Level 4: Transaction Detail (drill-down)│
└──────────────────────────────────────────┘
```

**Best for:** Reports page (progressive disclosure)

### 6.3 Tabbed Dashboard Pattern

Used by: Mercury, Brex, Stripe

```
┌──────────────────────────────────────────┐
│  [Overview] [Revenue] [Expenses] [Profit]│
├──────────────────────────────────────────┤
│  KPI Strip                               │
├──────────────────────────────────────────┤
│  Charts + Tables (context-specific)      │
└──────────────────────────────────────────┘
```

**Best for:** Reports page (organizing by topic)

### 6.4 Split-Panel with Filters

Used by: Baremetrics, ProfitWell

```
┌──────────────────────────────────────────┐
│  [Date Range] [Compare] [Segment] [Export]│
├──────────────────────────────────────────┤
│  Summary Cards                           │
├──────────────────────────────────────────┤
│  Primary Chart (large)                   │
├──────────────────────────────────────────┤
│  Secondary Charts (2-3 smaller)          │
└──────────────────────────────────────────┘
```

**Best for:** Reports page (filter-driven exploration)

---

## 7. UI/UX Improvement Recommendations

### 7.1 Snapshots Page Improvements

| Priority | Improvement | Impact | Effort |
|----------|------------|--------|--------|
| **P0** | Add delta indicators to snapshot KPI cards (vs previous month) | High | Low |
| **P0** | Add lock icon (🔒) to snapshot cards and detail header | Medium | Low |
| **P1** | Add snapshot comparison view (select 2 snapshots to compare) | High | Medium |
| **P1** | Add drill-down from snapshot figures to underlying transactions | High | Medium |
| **P1** | Add "closed by" and "notes" fields to snapshot metadata | Medium | Medium |
| **P2** | Add mini sparklines to sidebar snapshot cards | Medium | Low |
| **P2** | Add export/print capability for individual snapshots | Medium | Low |
| **P2** | Add hover tooltips with additional context on all elements | Low | Low |
| **P3** | Add snapshot-level annotations (e.g., "New client onboarded") | Low | Medium |

### 7.2 Reports Page Improvements

| Priority | Improvement | Impact | Effort |
|----------|------------|--------|--------|
| **P0** | Add summary KPI strip at top of reports page | High | Low |
| **P0** | Add period selector (fiscal year + month range) | High | Medium |
| **P0** | Add comparison toggles (MoM, YoY) | High | Medium |
| **P1** | Add report tabs (Overview, Revenue, Expenses, Profit) | High | Medium |
| **P1** | Add drill-down from charts to raw data | High | Medium |
| **P1** | Add PDF export and print-friendly view | Medium | Medium |
| **P2** | Add waterfall chart for cash flow visualization | Medium | Medium |
| **P2** | Add Sankey diagram for allocation flow | Medium | High |
| **P2** | Add cross-chart filtering (click month → highlight everywhere) | Medium | Medium |
| **P3** | Add heatmap for monthly division performance | Low | High |
| **P3** | Add annotations/marking on charts | Low | Medium |

### 7.3 Cross-Cutting Improvements

| Priority | Improvement | Impact | Effort |
|----------|------------|--------|--------|
| **P0** | Add sticky date range in page header (global filter) | High | Low |
| **P0** | Ensure all charts are responsive and work on mobile | High | Medium |
| **P1** | Add dark mode chart color tuning (muted pastels for data series) | Medium | Low |
| **P1** | Add loading skeletons for all data-fetching states | Medium | Low |
| **P1** | Add empty states with actionable CTAs for all sections | Medium | Low |
| **P2** | Add keyboard shortcuts for navigation (Cmd+K search) | Low | Medium |
| **P2** | Add role-based default views (Admin vs Viewer) | Low | Medium |
| **P3** | Add scheduled report generation (email weekly/monthly) | Low | High |

### 7.4 Color & Typography Recommendations

**Current State:** Uses shadcn semantic tokens well (`--chart-1` through `--chart-5`).

**Recommendations:**
1. **Standardize profit/loss colors:** Use `emerald` for positive, `red` for negative consistently across all pages
2. **Dark mode:** Use slightly muted, pastel-leaning neon colors for chart series on dark backgrounds to prevent eye strain
3. **Typography:** Use `tabular-nums` for all financial figures (already done in most places ✓)
4. **Spacing:** Use `gap-*` instead of `space-*` consistently (follow shadcn skill guidelines)
5. **Card styling:** Standardize on `rounded-xl border border-border bg-card shadow-none` (already consistent ✓)

### 7.5 Accessibility Improvements

1. **Screen reader support:** Add `aria-label` to all interactive chart elements
2. **Keyboard navigation:** Ensure all chart interactions work with keyboard (Tab, Enter, Arrow keys)
3. **Color contrast:** Ensure all text meets WCAG AA standards against backgrounds
4. **Focus indicators:** Add visible focus rings on all interactive elements
5. **Alt text:** Add descriptive alt text for all charts (summary of what the chart shows)

### 7.6 Mobile Responsiveness

**Current State:** Pages use responsive grid classes (`grid-cols-1 lg:grid-cols-2`, etc.).

**Recommendations:**
1. **Snapshots sidebar:** On mobile, convert sidebar to a horizontal scrollable strip or dropdown
2. **Report charts:** Stack charts vertically on mobile (single column)
3. **KPI cards:** Use 2-column grid on mobile (already done ✓)
4. **Filters:** Use bottom sheet or simplified selectors on mobile instead of dropdowns
5. **Touch targets:** Ensure all interactive elements are at least 44×44px for touch

---

## 8. Implementation Priorities

### Phase 1: Quick Wins (1-2 days)

1. Add delta indicators to snapshot KPI cards
2. Add lock icons to snapshot cards
3. Add summary KPI strip to reports page header
4. Standardize color usage across all charts
5. Add loading skeletons for data states

### Phase 2: Core Enhancements (1 week)

1. Enhance snapshot comparison view
2. Add period selector with month range to reports
3. Add MoM/YoY comparison toggles
4. Add drill-down from charts to raw data
5. Add PDF export and print view

### Phase 3: Advanced Features (2-3 weeks)

1. Add report tabs (Overview, Revenue, Expenses, Profit)
2. Add waterfall chart for cash flow
3. Add cross-chart filtering
4. Add snapshot annotations and notes
5. Add keyboard shortcuts and Cmd+K search

### Phase 4: Polish (1 week)

1. Dark mode chart color tuning
2. Mobile responsiveness refinements
3. Accessibility audit and fixes
4. Performance optimization for large datasets
5. Analytics tracking for feature usage

---

## Appendix A: Component Inventory

### Current Insight Components

| Component | File | Purpose |
|-----------|------|---------|
| `SnapshotsCockpit` | `components/insights/snapshots-cockpit.tsx` | Main snapshots page layout |
| `MoMComparisonChart` | `components/reports/mom-comparison-chart.tsx` | Month-over-month comparison |
| `RevenueByDivisionChart` | `components/reports/revenue-by-division-chart.tsx` | Stacked area chart |
| `ExpenseByCategoryChart` | `components/reports/expense-by-category-chart.tsx` | Horizontal bar chart |
| `ProfitPoolChart` | `components/reports/profit-pool-chart.tsx` | Stacked bar chart |
| `YearFilter` | `components/reports/year-filter.tsx` | Year selector dropdown |
| `ExportCsvButton` | `components/reports/export-csv-button.tsx` | CSV export trigger |
| `ExpenseSnapshot` | `components/dashboard/expense-snapshot.tsx` | Dashboard expense breakdown |

### Recommended New Components

| Component | Purpose |
|-----------|---------|
| `SnapshotComparisonPanel` | Side-by-side snapshot comparison |
| `SnapshotDeltaBadge` | Delta indicator for snapshot KPIs |
| `ReportKPIStrip` | Summary KPI cards for reports page |
| `PeriodSelector` | Enhanced date range picker |
| `ComparisonToggle` | MoM/YoY toggle buttons |
| `WaterfallChart` | Cash flow waterfall visualization |
| `SankeyDiagram` | Allocation flow visualization |
| `ReportTabs` | Tabbed report sections |
| `DrillDownTable` | Transaction-level detail table |
| `ChartAnnotation` | Annotation overlay for charts |

---

## Appendix B: Data Sources & References

### Internal Codebase Files

- `apps/admin/src/app/(admin)/insights/snapshots/page.tsx`
- `apps/admin/src/app/(admin)/insights/reports/page.tsx`
- `apps/admin/src/components/insights/snapshots-cockpit.tsx`
- `apps/admin/src/components/reports/*.tsx`
- `apps/admin/src/components/dashboard/dashboard-shell.tsx`
- `apps/admin/src/components/dashboard/kpi-grid.tsx`
- `apps/admin/src/lib/financial.ts`
- `packages/db/src/schema/snapshots.ts`
- `packages/db/src/queries/snapshots.ts`
- `packages/db/src/queries/general.ts`

### External Research Sources

- **QuickBooks:** Close your books — quickbooks.intuit.com
- **Xero:** Set up lock dates — central.xero.com
- **NetSuite:** Period Close Checklist — docs.oracle.com
- **Stripe:** Dashboard Basics — docs.stripe.com
- **Baremetrics:** SaaS Dashboard Guide — baremetrics.com
- **Eleken:** Financial Dashboard Examples — eleken.co
- **ThoughtSpot:** Dashboard Design Best Practices — thoughtspot.com
- **Sigma Computing:** Waterfall Charts — sigmacomputing.com
- **Dashboard Design Patterns:** dashboarddesignpatterns.github.io
