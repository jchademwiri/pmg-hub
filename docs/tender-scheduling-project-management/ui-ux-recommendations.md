# UI/UX Recommendations — Tender Scheduling

## Design Principles

1. **Minimal by default** — the feature should feel like a lightweight addition, not a new dashboard.
2. **Answer-first** — the most important information (what's happening now, what's at risk) should be visible without scrolling or clicking.
3. **Status-driven layout** — the UI adapts to show the right information at each stage of the tender lifecycle.
4. **Consistent with existing PMG Hub patterns** — use the same shadcn/ui components, layout grid, spacing, and typography.

## Navigation & Route Structure

```
/(admin)
  /scheduling              → Overview page (current workload + queue)
  /scheduling/list         → Full table of all tender schedule entries
  /scheduling/timeline     → Timeline / Gantt-style view (stretch goal)
```

**Navigation entry** — added to `nav-data.ts`:

```typescript
// In the OVERVIEW array (between Dashboard and existing groups)
{ title: 'Scheduling', url: '/scheduling', icon: CalendarClock },

// Or as a standalone group:
{
  key: 'scheduling',
  label: 'Scheduling',
  icon: CalendarClock,
  items: [
    { title: 'Overview', url: '/scheduling', icon: LayoutGrid },
    { title: 'Schedule', url: '/scheduling/list', icon: ListTodo },
    { title: 'Timeline', url: '/scheduling/timeline', icon: CalendarRange },
  ],
}
```

**Recommendation:** Add `Scheduling` as a top-level navigation item in `OVERVIEW` initially (simplest), or as its own group if the features grow. The first approach keeps it visible and accessible without creating too many sidebar groups.

**Icon:** Use `CalendarClock` from `lucide-react` (or `ListTodo` / `CalendarRange`).

## Page Layouts

### 1. Scheduling Overview Page (`/scheduling`)

This is the primary page — the one Jacob looks at daily.

```
┌──────────────────────────────────────────────────────────┐
│ [Page Header] Scheduling            [New Tender] [Filter] │
├──────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────────────┐ │
│ │ NOW WORKING         │  │ UP NEXT (3)                │ │
│ │ ───────────────     │  │ ───────────────             │ │
│ │ ABC Tender Corp     │  │ 1. DEF Corp                │ │
│ │ Tender #123/2026    │  │    Closes: 28 Jun          │ │
│ │ Due: 22 Jun [⚠️]    │  │    Start: 24 Jun [⚠️ overdue]│ │
│ │ Started: 15 Jun     │  │    Effort: 4d              │ │
│ │ Progress: 60%       │  │ 2. GHI Ltd                 │ │
│ │                     │  │    Closes: 5 Jul           │ │
│ │ [Mark Complete]     │  │    Start: 26 Jun           │ │
│ └─────────────────────┘  └─────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ WARNINGS                                             │ │
│ │ ⚠️ Overlap: DEF Corp & JKL Tenders overlap by 3d    │ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ SCHEDULE TABLE (all active)                         │ │
│ │ Client │ Ref │ Status │ Start │ End │ Closing │ Risk│ │
│ │ ───────┴─────┴────────┴───────┴─────┴─────────┴─────│ │
│ │ ... rows ...                                         │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### Current Workload Card ("Now Working")

- Shows the single tender currently `in_progress` (or "Nothing in progress" empty state).
- Key data: client name, tender reference, closing date, priority, progress status, days remaining.
- Quick action button: "Mark Complete" (changes status to `completed`).
- Small risk badge if closing date is tight.

#### Up Next Card ("Queue")

- Shows the next 2–3 `planned` tenders ordered by start date (or closing date).
- Each item shows: client name, closing date, recommended start date, effort.
- Warning indicators if the recommended start date has passed.
- "Start Now" button on each item to immediately transition it to `in_progress`.

#### Warnings / Alerts Section

- Conditionally rendered when warnings exist.
- Each warning is a small alert with icon and description.
- Types: start overdue, tight buffer, overdue, workload overlap.

#### Schedule Table

- Full data table of all non-cancelled tenders.
- Follows the existing data table pattern used in clients, invoices, etc.
- Columns: Client, Reference, Status, Start Date, Target End, Closing Date, Priority, Risk.
- Sortable by any column.
- Click a row to open the edit dialog or navigate to detail view.
- Status column uses Badge components with color coding:
  - `planned` → `secondary` (grey)
  - `in_progress` → `default` (blue/primary)
  - `completed` → `outline` with green text
  - `submitted` → `outline` with green check
  - `cancelled` → `destructive` (red, muted)
- Risk column uses Badge:
  - Green: "On track"
  - Amber: "At risk"
  - Red: "Overdue"

### 2. Schedule List Page (`/scheduling/list`)

- Full-page data table (same as schedule table on overview, but with more rows and pagination).
- Filters: status, priority, date range.
- Search by client name or tender reference.
- Bulk actions (future: archive old tenders, export).

### 3. Timeline View (`/scheduling/timeline`) — Stretch Goal

- Simple horizontal bar chart showing each tender as a bar from start date to target completion date.
- Color-coded by status.
- Closing dates marked as vertical lines or markers.
- Overlapping bars highlighted.

## Create/Edit Tender Form

Follows the existing server action + form pattern (see `clients.ts` for reference).

### Form Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Client Name | Text input | Yes | Auto-suggest from existing clients, with free-text fallback |
| Tender Reference | Text input | Yes | Tender number or description |
| Closing Date | Date picker | Yes | Must be in the future |
| Estimated Effort | Number input (days) | Yes | Integer, > 0 |
| Buffer Days | Number input (days) | No | Default 2 |
| Start Date | Date picker (auto-calc) | Yes | Auto-calculated, editable |
| Target Completion Date | Date (auto-calc, read-only) | — | Display-only: start + effort |
| Priority | Select | No | Low / Normal / High / Urgent |
| Division | Select | No | Defaults to Tender Edge Solutions |
| Notes | Textarea | No | Free text |

**Form behavior:**
- When Closing Date, Effort, or Buffer changes → recalculate Start Date and Target Completion.
- When Start Date changes manually → recalculate Target Completion only (buffer becomes implied).
- If the calculated start date is in the past, show an inline warning "Recommended start date is in the past. Consider reducing buffer or effort."
- Validation: closing date must be > start date; effort must be > 0.

**Form layout:** Use the existing `Dialog` component for the create/edit form (modal pattern), with the `Form` components (shadcn/ui form).

## Design System Integration

All components should use the existing shadcn/ui set:

| Need | Component |
|---|---|
| Data table | `@/components/ui/table` with sortable headers |
| Cards | `@/components/ui/card` (size="sm" for compact cards) |
| Buttons | `@/components/ui/button` (variants: default, outline, ghost, destructive) |
| Badges | `@/components/ui/badge` (for status and risk indicators) |
| Forms | `@/components/ui/form` with shadcn form patterns |
| Dialogs | `@/components/ui/dialog` for create/edit |
| Select | `@/components/ui/select` |
| Date picker | `@/components/ui/date-picker` (or `input type="date"`) |
| Sonner toast | for success/error notifications |
| Confirm dialog | `@/components/ui/confirm-dialog` for destructive actions |

## Color Coding & Status Indicators

Following the existing PMG Hub conventions:

| Status | Badge Variant | Icon |
|---|---|---|
| Planned | `secondary` | `Calendar` |
| In Progress | `default` | `Play` |
| Completed | `outline` (green text) | `Check` |
| Submitted | `outline` (green with check) | `CheckCheck` |
| Cancelled | `destructive` (muted) | `X` |

| Risk Level | Variant | Visual |
|---|---|---|
| On Track | — | Green dot or text |
| At Risk | Warning/Amber | Amber badge |
| Overdue | Destructive/Red | Red badge |

## Empty States

### No tenders at all
```
┌─────────────────────────────────────────────┐
│  📋 No tenders scheduled yet                 │
│  Start by adding your first tender to track. │
│  [Add New Tender]                            │
└─────────────────────────────────────────────┘
```

### Nothing in progress
```
┌─────────────────────────────────────────────┐
│  💤 Nothing in progress                      │
│  Start a planned tender from the queue below │
│  or add a new tender.                        │
└─────────────────────────────────────────────┘
```

### No planned tenders (queue empty)
```
No upcoming tenders. Add a new tender to build your queue.
```

## Warning / Overdue States

### Start Overdue Warning
```tsx
<Badge variant="warning">Start overdue by 2 days</Badge>
```

### Tight Buffer Warning
```tsx
<Badge variant="warning">Buffer: 1 day — tight</Badge>
```

### Overdue Warning
```tsx
<Badge variant="destructive">Overdue by 3 days</Badge>
```

### WIP Overlap Warning
```tsx
<Alert variant="warning">
  ⚠️ "DEF Corp" and "JKL Tenders" have overlapping schedules.
  Consider delaying one or reducing scope.
</Alert>
```

## Mobile-Responsive Layout

- The overview page stacks vertically on mobile (cards full-width).
- The schedule table uses horizontal scroll on narrow screens (standard pattern in existing tables).
- "New Tender" button collapses to an icon button on mobile.
- Date calculations and risk indicators remain readable at all sizes.
- Touch targets: minimum 44px for all interactive elements.
- Sidebar auto-collapses with the existing sidebar pattern.

## Future UI Enhancements (Post-MVP)

- Kanban-style board view (drag-and-drop between status columns)
- Calendar view showing tenders on a month/week calendar
- Deadline notifications (in-app toast + eventually email)
- Historical stats (average effort vs actual, win/loss rate)
- Progress percentage slider on in-progress tenders
- Colour-coded timeline/Gantt bars
