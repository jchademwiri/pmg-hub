# Scheduling Module — UX Audit & Improvement Plan

**Date:** 2026-06-28  
**Scope:** `/scheduling`, `/scheduling/list`, `/scheduling/timeline`  
**Goal:** Simple, modern UI without losing any existing functionality

---

## 1. What Exists Today

### Pages

| Route                  | Purpose                                                                           |
| ---------------------- | --------------------------------------------------------------------------------- |
| `/scheduling`          | Overview — summary cards, current workload, waterfall queue, warnings, full table |
| `/scheduling/list`     | Full list with multi-filter, bulk archive/delete                                  |
| `/scheduling/timeline` | Gantt-style visual timeline                                                       |

### Data model (key fields)

`tender_schedule_entries`: client, division, tenderReference, closingDate, effortDays, bufferDays, startDate, targetCompletionDate, status (planned→in_progress→completed→submitted/cancelled), priority (low/normal/high/urgent), notes, blockers, outcome (won/lost/pending), sortOrder, actual effort/completion dates.

### What works well

- Waterfall auto-recalculation is solid business logic — chains tenders sequentially so each planned item starts where the previous ends
- FSM status transitions are consistent and enforced on both client and server
- Risk calculation (`TenderRiskBadge`) covers all the real failure modes: overdue start, tight buffer, past target, impossible deadline
- Server actions all call `recalculateTenderWaterfall()` after every mutation — data is always coherent
- Bulk archive/delete with server-side safety guard is well implemented

---

## 2. UX Problems Found

### 2.1 Navigation is confusing (high severity)

**Current state:** Three pages that share the same data but have no clear relationship to each other. The overview page has no link to the timeline. The list page has a "Back to Overview" button with a `Plus` icon on it (copy-paste artifact — the icon is wrong). There's no tab bar or sub-nav within the scheduling section.

**Impact:** Users don't know the timeline exists unless they find it via the sidebar. The three views feel like three separate apps.

---

### 2.2 The overview page does too much (high severity)

**Current state:** `/scheduling` contains summary cards + current workload + waterfall queue + warnings + a full sortable/filterable table with edit dialogs. The page is extremely long. The table at the bottom largely duplicates what `/scheduling/list` does.

**Impact:** The page is overwhelming. The most important information (what am I working on right now, what's next) is buried before a dense table. Users scroll past the useful sections to reach the table, or ignore the table because `/list` does it better.

---

### 2.3 The waterfall queue card is named misleadingly (medium severity)

**Current state:** The component is called `DraggableUpNext` and was presumably drag-to-reorder at some point. Drag functionality has been removed; the queue is auto-ordered now. The card header says "Waterfall Queue" with an "Auto ordered" badge — but the name `DraggableUpNext` in the code suggests future intent that has not been re-evaluated.

**Impact:** Minor code confusion. The UI label itself ("Waterfall Queue") is also slightly jargon-heavy for an overview page.

---

### 2.4 Warnings panel is noisy (medium severity)

**Current state:** The warnings panel renders an individual `<Alert>` for every risk condition on every affected tender — each with a full title, description, and icon. With 3–4 tenders and multiple risk conditions, this panel can grow to 8–10 stacked alerts that dominate the page.

**Impact:** When everything is urgent, nothing is urgent. Users start to ignore the panel.

---

### 2.5 Status transition UX is inconsistent (medium severity)

**Current state:** On the timeline and list pages, the status badge is a clickable dropdown (badge + chevron). On the overview's waterfall queue card, planned tenders have a separate "Start" button. On the current workload card, there are explicit "Mark Complete" and "Cancel" buttons. Three different interaction patterns for the same action.

**Impact:** Inconsistency creates uncertainty — users aren't sure which element to click.

---

### 2.6 The timeline is cut off — no horizontal scroll (medium severity)

**Current state:** The timeline card uses `overflow-hidden` on its container. When the timeline is wider than the viewport (many tenders spanning a long period), bars and labels are simply clipped. There is no horizontal scroll and no indicator that content is cut off.

**Impact:** Timeline becomes unusable for longer planning horizons.

---

### 2.7 Status badge colours are too generic (low-medium severity)

**Current state:** `TenderStatusBadge` maps:

- `planned` → `secondary` (grey)
- `in_progress` → `default` (dark)
- `completed` → `outline` (white/border)
- `submitted` → `outline` (white/border)
- `cancelled` → `destructive` (red)

`completed` and `submitted` look identical. `cancelled` looks like an error (destructive red) even when it's just archive state. The `TenderRiskBadge` uses the same shadcn `secondary` variant for all non-destructive warnings, losing the amber/green distinction.

**Impact:** Users can't scan status at a glance. The table and timeline look flat.

---

### 2.8 The form dialog has two read-only calculated fields with no explanation (low severity)

**Current state:** In `TenderFormDialog`, "Scheduled Start" and "Target Completion" fields are read-only inputs that show auto-calculated dates. They look like regular form inputs (same border, same height) but can't be edited. One has a tiny `text-xs` note underneath, the other has none.

**Impact:** Users try to click them, get confused when nothing happens, then wonder if the calculation is wrong.

---

### 2.9 The list page "Back to Overview" button uses a Plus icon (low severity)

**Current state:** The button in `scheduling/list/page.tsx` reads "Back to Overview" but renders with `<Plus className="size-4" />` — likely a copy-paste from another page.

**Impact:** Minor but unprofessional.

---

### 2.10 The edit dialog tab system is hand-rolled (low severity)

**Current state:** `TenderEditDialog` implements its own tab bar with raw `<button>` elements, custom active/inactive classNames, and border manipulation to simulate a tab underline. It works, but it's not using the shadcn `Tabs` component that's already in the system.

**Impact:** Inconsistent with the rest of the app. Fragile to theme changes.

---

### 2.11 The "Now Working" card shows a client name gap (low severity)

**Current state:** The `CurrentWorkloadCard` shows `tenderReference` and dates but not the client name. The waterfall queue also omits client name in the card view (it's only in the table).

**Impact:** With multiple clients, the user has to remember or look up which client owns the current tender.

---

## 3. Improvement Plan

### 3.1 Add a shared sub-navigation bar across all three pages

**Change:** Add a sticky tab/segment nav at the top of the scheduling layout that links to all three views. Can be implemented as a layout component wrapping the scheduling route group.

```
[ Overview ]  [ All Tenders ]  [ Timeline ]
```

Replace the "Back to Overview" button with the nav. Remove the Plus icon from that button immediately as a quick fix.

**Implementation:** Create `apps/admin/src/app/(admin)/scheduling/layout.tsx` with a `SchedulingNav` component using shadcn `Tabs` in navigation mode (or simple `Link` buttons styled as tabs using the existing pattern in the app). Use `usePathname` to derive the active tab.

---

### 3.2 Split the overview page into two clear zones

**Change:** The overview page should do one thing well — show _right now_ context. The "All Tenders" table should be removed from the overview page entirely (it exists as `/scheduling/list`). Replace it with a smaller "Recent activity" or "Upcoming closings" panel (last 5 entries sorted by closingDate).

**Revised overview layout:**

```
[ Sub-nav: Overview | All Tenders | Timeline ]

[ Summary cards row ]

[ Now Working (1/3 width) | Waterfall Queue (2/3 width) ]

[ Warnings (only if issues exist — collapsible if > 3 items) ]

[ Upcoming deadlines — next 5 by closingDate (read-only, no table) ]
```

**Result:** The page becomes a concise operational dashboard. Users who want to manage the full list go to `/scheduling/list`. Users who want the timeline go to `/scheduling/timeline`.

---

### 3.3 Condense the warnings panel

**Change:** Instead of one `<Alert>` per tender per condition, render a single compact warning card that groups issues.

```
⚠ 3 issues need attention
  • "T12/2026" — start overdue (was 2026-06-20)
  • "T08/2026" — tight buffer (1 day remaining)
  • "T15/2026" — impossible deadline
  [ View all in list → ]
```

Use a single card with a compact list. If there are 0 issues, show nothing. If there are more than 5, show the first 5 with a "and N more" link to `/scheduling/list?filter=at-risk`.

---

### 3.4 Standardise status transition to a single pattern

**Change:** Use the clickable status dropdown (badge + chevron) consistently everywhere — overview workload card, waterfall queue, list, and timeline. Remove the separate "Start", "Mark Complete", and "Cancel" buttons from the workload card. They can remain as secondary actions (ghost buttons) alongside the dropdown for the current workload card only, as it's the most prominent action surface.

This means:

- Waterfall queue items: badge dropdown only (remove the `Start` button — the dropdown has "Start Work")
- Current workload card: keep "Mark Complete" as primary button (it's the hero action), add the dropdown as a secondary option for other transitions
- List page: no change (already uses dropdown)
- Timeline: no change (already uses dropdown)

---

### 3.5 Fix the timeline overflow

**Change:** Change the timeline card's inner container from `overflow-hidden` to `overflow-x-auto`. Add a minimum width to the scrollable area so bars never collapse below a readable size.

```tsx
// timeline-client.tsx
<div className="w-full overflow-x-auto">
  <div style={{ minWidth: `${Math.max(totalDays * 8, 600)}px` }}>
    {/* week headers, grid lines, rows */}
  </div>
</div>
```

Also add a subtle fade gradient on the right edge to signal that content continues.

---

### 3.6 Improve status and risk badge colours

**Change:** Replace the generic shadcn badge variants with semantic colour classes using Tailwind directly. This is a small but high-impact visual change.

**Status colours:**

| Status        | Background          | Text                                     | Border                  |
| ------------- | ------------------- | ---------------------------------------- | ----------------------- |
| `planned`     | `bg-sky-500/15`     | `text-sky-700 dark:text-sky-400`         | `border-sky-500/30`     |
| `in_progress` | `bg-blue-500/15`    | `text-blue-700 dark:text-blue-400`       | `border-blue-500/30`    |
| `completed`   | `bg-emerald-500/15` | `text-emerald-700 dark:text-emerald-400` | `border-emerald-500/30` |
| `submitted`   | `bg-purple-500/15`  | `text-purple-700 dark:text-purple-400`   | `border-purple-500/30`  |
| `cancelled`   | `bg-muted`          | `text-muted-foreground`                  | `border-border`         |

**Risk colours:**

| Risk         | Background          | Text                    |
| ------------ | ------------------- | ----------------------- |
| `On Track`   | `bg-emerald-500/15` | `text-emerald-700`      |
| `Tight`      | `bg-amber-500/15`   | `text-amber-700`        |
| `Start Due`  | `bg-amber-500/15`   | `text-amber-700`        |
| `At Risk`    | `bg-orange-500/15`  | `text-orange-700`       |
| `Impossible` | `bg-red-500/15`     | `text-red-700`          |
| `Overdue`    | `bg-red-500/15`     | `text-red-700`          |
| `Done`       | `bg-muted`          | `text-muted-foreground` |

Both badge components (`TenderStatusBadge` and `TenderRiskBadge`) are self-contained and easy to update — the change is isolated to those two files.

---

### 3.7 Improve the calculated date fields in the form

**Change:** Replace the two read-only date inputs in `TenderFormDialog` with a styled callout/preview box — not form inputs. This makes it visually clear they are output, not input.

```tsx
{
  calculatedStartDate && (
    <div className="col-span-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Calculated schedule preview</p>
      <div className="flex items-center gap-6">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Start</p>
          <p className="text-sm font-medium">{formatDate(calculatedStartDate)}</p>
        </div>
        <span className="text-muted-foreground/40">→</span>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Target completion
          </p>
          <p className="text-sm font-medium">{formatDate(calculatedTargetDate)}</p>
        </div>
        <span className="text-muted-foreground/40">→</span>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Closing</p>
          <p className="text-sm font-medium text-muted-foreground">{formatDate(closingDate)}</p>
        </div>
      </div>
    </div>
  );
}
```

Remove the hidden `startDate` input approach — pass the calculated value directly in the action call instead.

---

### 3.8 Replace hand-rolled tabs in TenderEditDialog

**Change:** Replace the custom tab buttons in `TenderEditDialog` with shadcn `<Tabs>` / `<TabsList>` / `<TabsTrigger>` / `<TabsContent>`. This is a drop-in replacement.

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

<Tabs defaultValue="details">
  <TabsList className="mb-4">
    <TabsTrigger value="details">Details</TabsTrigger>
    <TabsTrigger value="tracking">Tracking & Outcome</TabsTrigger>
  </TabsList>
  <TabsContent value="details">{/* details grid */}</TabsContent>
  <TabsContent value="tracking">{/* tracking fields */}</TabsContent>
</Tabs>;
```

---

### 3.9 Add client name to the current workload and queue cards

**Change:** Pass a `clientMap` (Map of clientId → client name) into `CurrentWorkloadCard` and `DraggableUpNext`. Show the client name as a secondary line under the tender reference, styled as `text-xs text-muted-foreground`.

This is already done in the table and timeline — just needs to be threaded into the card components. The data is already loaded on the page (`clients` prop exists on `SchedulingOverviewClient`).

---

### 3.10 Fix the Plus icon on the list page button (quick fix)

**Change:** One line — replace `<Plus className="size-4" />` with `<ArrowLeft className="size-4" />` in `apps/admin/src/app/(admin)/scheduling/list/page.tsx`.

---

## 4. Priority Order

| #   | Change                                                   | Effort    | Impact                    |
| --- | -------------------------------------------------------- | --------- | ------------------------- |
| 1   | Fix Plus icon on list page                               | 1 min     | Low / polish              |
| 2   | Improve status + risk badge colours                      | 30 min    | High — visual scanning    |
| 3   | Fix timeline overflow                                    | 15 min    | High — timeline usability |
| 4   | Add client name to workload + queue cards                | 30 min    | Medium                    |
| 5   | Replace hand-rolled tabs with shadcn Tabs                | 20 min    | Low / polish              |
| 6   | Improve calculated date fields in form                   | 45 min    | Medium                    |
| 7   | Condense warnings panel                                  | 1 hour    | Medium                    |
| 8   | Add sub-navigation bar across scheduling pages           | 1.5 hours | High — orientation        |
| 9   | Standardise status transition to single pattern          | 1 hour    | Medium                    |
| 10  | Remove table from overview, add upcoming deadlines panel | 2 hours   | High — clarity            |

Total estimated effort: ~8 hours for all changes.

---

## 5. What NOT to Change

- The waterfall auto-recalculation logic — it is correct and well-implemented
- The FSM transition enforcement — client and server are consistent
- The risk calculation logic in `TenderRiskBadge` — accurate, just needs visual polish
- The bulk archive/delete safety guards — enforced correctly server-side
- The server action `FormData` pattern — consistent with the rest of the admin app
- The `router.refresh()` after mutations — correct approach for this app

---

_Audit based on full code review of: `scheduling/page.tsx`, `scheduling/list/page.tsx`, `scheduling/list/schedule-list-client.tsx`, `scheduling/timeline/page.tsx`, `scheduling/timeline/timeline-client.tsx`, `components/scheduling/scheduling-overview-shell.tsx`, `components/scheduling/tender-form-dialog.tsx`, `components/scheduling/tender-edit-dialog.tsx`, `components/scheduling/draggable-up-next.tsx`, `components/scheduling/tender-status-badge.tsx`, `components/scheduling/tender-risk-badge.tsx`, `packages/db/src/queries/tender-schedule.ts`, `packages/db/src/schema/tender-schedule.ts`, and all server actions._
