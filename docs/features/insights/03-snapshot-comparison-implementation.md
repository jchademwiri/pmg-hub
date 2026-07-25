# Snapshot Comparison View — Implementation Report

> `pmg-hub / docs / insights / 03-snapshot-comparison-implementation.md` · June 2026 · v1.0
>
> **Scope:** New snapshot comparison feature with 3-tab view (Overview, Allocations, Trend).

---

## What Was Built

A comparison mode for the Snapshots page that lets users select 2 closed periods and view them side-by-side across three analytical views.

### New Files

| File | Purpose |
|------|---------|
| `components/insights/snapshot-delta-badge.tsx` | Reusable delta indicator showing % change between two values |
| `components/insights/snapshot-comparison-panel.tsx` | Main comparison panel with 3 tabs |

### Modified Files

| File | Changes |
|------|---------|
| `components/insights/snapshots-cockpit.tsx` | Added compare mode toggle, multi-select sidebar, hides single-period view when comparing |

---

## Architecture

### Comparison Mode Flow

```
1. User clicks "Compare" button in sidebar header
   → All-Time card hides, sidebar shows "Select 2 periods to compare"
   → Single-period detail view (KPIs, split bar, chart) hides

2. User clicks 2 snapshot cards in sidebar
   → Cards get blue highlight + "A"/"B" badges
   → Selection counter shows (2/2)

3. SnapshotComparisonPanel renders below the header area
   → 3 tabs: Overview | Allocations | Trend
```

### Component Hierarchy

```
SnapshotsCockpit
├── Sidebar (with Compare button)
├── Single-period detail view (hidden in compare mode)
├── Comparison empty state (shown while selecting)
└── SnapshotComparisonPanel (shown when 2 selected)
    ├── Tab: Overview
    │   ├── KPI comparison rows with delta badges
    │   └── Side-by-side revenue split bars
    ├── Tab: Allocations
    │   ├── Allocation comparison bars with pp deltas
    │   └── Side-by-side stacked bar charts
    └── Tab: Trend
        └── Combined area chart (solid = period A, dashed = period B)
```

---

## Tab Details

### Tab 1: Overview

- **KPI Comparison Rows:** Revenue, Expenses, PMG Share, Profit Pool — each showing left value → right value with a `SnapshotDeltaBadge` showing % change
- **Revenue Split Comparison:** Two visual split bars side-by-side (PMG/Expenses/Profit Pool percentages) for quick visual comparison
- Deltas are color-coded: green for positive (revenue up = good), red for negative (expenses up = bad)

### Tab 2: Allocations

- **Allocation Comparison Bars:** Salary, Reinvest, Reserve, Flex — each showing both the percentage split and the absolute change in percentage points (pp)
- **Side-by-Side Stacked Bar Charts:** Individual stacked bar charts for each period showing the allocation breakdown visually

### Tab 3: Trend

- **Combined Area Chart:** Shows Revenue, Expenses, and Profit Pool for both periods overlaid
  - Period A uses solid lines
  - Period B uses dashed lines
- **Surrounding months context:** Shows the 1-2 months before/after each period to provide context
- Custom legend explains the solid vs dashed line convention

---

## Key Design Decisions

1. **Auto-chronological ordering:** The panel automatically orders `left` as the earlier period and `right` as the later, regardless of selection order
2. **Progressive disclosure:** When in compare mode, the single-period detail view hides to avoid confusion — the entire right panel becomes the comparison view
3. **Max 2 selections:** Clicking a 3rd snapshot replaces the oldest selection (FIFO), keeping the UX simple
4. **Reuses existing chart patterns:** Uses the same `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` from shadcn/ui chart system
5. **Uses `SnapshotDeltaBadge`:** Reusable component that can be applied elsewhere (e.g., adding deltas to the existing single-period KPI cards)

---

## Components

### `SnapshotDeltaBadge`

```tsx
<SnapshotDeltaBadge current={rightVal} previous={leftVal} invertDelta={false} />
```

- Shows percentage change with TrendingUp/TrendingDown icon
- `invertDelta` prop for metrics where up is bad (e.g., expenses)
- Returns null when both values are 0
- Returns "new" badge when previous is 0

### `SnapshotComparisonPanel`

```tsx
<SnapshotComparisonPanel left={snapshotA} right={snapshotB} allSnapshots={allSnapshots} />
```

- Accepts two `SnapshotRow` objects and the full snapshots array (for trend context)
- Manages its own tab state internally
- Handles all calculations (percentages, allocations, trend data)

---

## Dependencies

- `recharts` — Already used throughout the codebase
- `@/components/ui/*` — shadcn components (Card, Badge, Button, Tabs)
- `@/lib/format` — `formatZAR`, `fmtMonthYear`, `fmtDate`
- `@/lib/utils` — `cn` helper

No new packages were added.
