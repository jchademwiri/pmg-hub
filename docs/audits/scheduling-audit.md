# Scheduling Module — Full Audit

**Date:** 24 Jun 2026  
**Scope:** All scheduling-related files across `apps/admin`, `packages/db`  
**Files audited:** 22 files (2 schema/queries, 3 server actions, 7 pages/comps, 7 scheduling comps, 1 dashboard comp, 2 test files)

---

## 1. Architecture Overview

```
DB Layer                    Server Actions                    Pages                       Components
─────────                   ─────────────                    ────                        ──────────
tender-schedule.ts (schema)  tender-schedule.ts               scheduling/page.tsx           scheduling-overview-shell.tsx
tender-schedule.ts (queries)  tender-schedule-bulk.ts          scheduling/list/page.tsx      schedule-list-client.tsx
                              tender-schedule-reorder.ts       scheduling/timeline/page.tsx  timeline-client.tsx
                                                                                             tender-form-dialog.tsx
                                                                                             tender-edit-dialog.tsx
                                                                                             draggable-up-next.tsx
                                                                                             tender-status-badge.tsx
                                                                                             tender-risk-badge.tsx
                                                                                             tender-summary-card.tsx (dashboard)
```

Three sub-pages: **Overview** (main), **Schedule List** (full table with filters), **Timeline** (visual Gantt-style).

---

## 2. Data Model

Table `tender_schedule_entries`:

| Column               | Type      | Constraints                                                                      |
| -------------------- | --------- | -------------------------------------------------------------------------------- |
| id                   | uuid      | PK, defaultRandom()                                                              |
| clientId             | uuid      | NOT NULL, FK → clients.id (restrict)                                             |
| divisionId           | uuid      | FK → divisions.id (restrict), nullable                                           |
| tenderReference      | text      | NOT NULL                                                                         |
| closingDate          | date      | NOT NULL                                                                         |
| effortDays           | integer   | NOT NULL                                                                         |
| actualEffortDays     | integer   | nullable                                                                         |
| bufferDays           | integer   | NOT NULL, default 2                                                              |
| startDate            | date      | NOT NULL                                                                         |
| targetCompletionDate | date      | NOT NULL                                                                         |
| actualCompletionDate | date      | nullable                                                                         |
| submissionDate       | date      | nullable                                                                         |
| status               | enum      | planned \| in_progress \| completed \| submitted \| cancelled, default 'planned' |
| priority             | enum      | low \| normal \| high \| urgent, default 'normal'                                |
| outcome              | enum      | won \| lost \| pending, nullable                                                 |
| notes                | text      | nullable                                                                         |
| blockers             | text      | nullable                                                                         |
| sortOrder            | integer   | nullable                                                                         |
| createdBy            | text      | NOT NULL                                                                         |
| createdAt            | timestamp | defaultNow()                                                                     |
| updatedAt            | timestamp | nullable                                                                         |

Indexes: status, closingDate, clientId, divisionId.

**Findings:** Schema is well-structured. No missing indexes. Relations to `clients` and `divisions` are properly defined with `onDelete: "restrict"`.

---

## 3. DB Queries — Key Observations

| Query                            | Description                                                   | Notes                                              |
| -------------------------------- | ------------------------------------------------------------- | -------------------------------------------------- |
| `getAllTenderScheduleEntries`    | Filterable list (status, priority, client, division)          | Uses `ANY(ARRAY[...])` for array filters — correct |
| `getActiveTenderScheduleEntries` | planned + in_progress + completed                             | Returns 3 statuses                                 |
| `getCurrentWorkload`             | inProgress + planned separate                                 | Good for split UI                                  |
| `getTendersAtRisk`               | Complex risk logic (start overdue, past target, tight buffer) | ✅ Well-done                                       |
| `getOverlappingTenders`          | Date range overlap check                                      | Accepts arbitrary start/end                        |
| `detectOverlaps`                 | O(n²) pairwise check on active tenders                        | ✅ Acceptable for small sets                       |
| `getTenderScheduleSummary`       | Dashboard card metrics                                        | ✅                                                 |

**🔴 Issue:** `getAllTenderScheduleEntries` with `status` filter uses `ANY(ARRAY[...])` with string interpolation (`filters.status.map((s) => sql\`${s}\`)`). If `filters.status` contains user-controlled values, this could be an injection vector. Currently it's only called from server components with hardcoded values, so it's safe — but it's a latent risk.

**Suggestion:** Add query-level type validation for filter parameters.

---

## 4. Server Actions — Audit

### `createTenderScheduleEntry`

- ✅ Zod validation with descriptive error messages
- ✅ Client existence check
- ✅ Auto date calculation with manual override support
- ✅ `__none__` divisionId → null conversion
- ✅ `revalidatePath('/scheduling')`
- ⚠️ **Generic catch-all error:** "Failed to save. Please try again." — no logging of the actual error. Makes debugging hard.

### `updateTenderScheduleEntry`

- Same pattern as create
- Uses `updateEntry(id, {...})` which sets `updatedAt`
- ⚠️ Same generic catch-all

### `updateTenderScheduleEntryJson`

- Partial update for tracking fields (outcome, actualEffortDays, etc.)
- ✅ Clean — only updates provided fields
- ⚠️ `as any` cast when calling `updateEntry` — loses type safety

### `cancelTenderScheduleEntry`

- ✅ Simple status update to 'cancelled'
- ✅ `returning()` confirms the row exists

### `transitionTenderStatusAction`

- ✅ Status transition validation (who can go where)
- ✅ Auto-sets timestamps (startDate, actualCompletionDate, submissionDate)
- 🔴 **Bug in transitions table:** `completed → submitted` IS allowed, but the `ScheduleListClient` component shows "Cancel" only for non-submitted AND non-cancelled. Editing is possible via the overview's edit button for any status. **Missing:** transition from `completed → in_progress` (undo complete) — this is a common workflow need.
- ⚠️ **Missing transition:** There's no path from `submitted` back to anything. Once submitted, a tender is locked. Users may need to reopen if results are delayed.

### `bulkArchiveTenders`

- ✅ Sets status to 'cancelled' for all selected
- ✅ Revalidates both `/scheduling` and `/scheduling/list`

### `bulkDeleteTenders`

- ✅ Server-side safety: only deletes if status is 'cancelled'
- ✅ Uses `and(inArray, eq(status, 'cancelled'))`

### `reorderTenderQueue`

- ✅ Clean — delegates to DB query
- ✅ Single responsibility

---

## 5. Component Audit

### 5.1 State Management Patterns

**✅ Fixed (this session):** `tender-form-dialog.tsx` and `tender-edit-dialog.tsx` — client/division selection now uses React state instead of `document.getElementById().value` DOM mutation. This prevents value loss on re-render.

**🔴 Still present (pattern match):** Same DOM mutation pattern exists in other components:

- `scheduling-overview-shell.tsx` — no direct DOM mutation
- `schedule-list-client.tsx` — uses React state (`useState`) for all filters ✅
- `draggable-up-next.tsx` — uses React state for drag state ✅

### 5.2 Re-render Safety

All components use `React.useMemo` and `React.useCallback` where appropriate. No unnecessary re-renders observed.

**Exception:** `DraggableUpNext` calls `setItems(tenders)` in a `useEffect` that runs on every render if the prop changes. This is correct — the items list is the source of truth.

### 5.3 Key Component Details

**TenderFormDialog:**

- ✅ Auto-calculates start date from closing date + effort + buffer
- ✅ Date inputs are controlled via React state
- ✅ Unit conversion is correct
- ⚠️ **Start Date input is uncontrolled** (`defaultValue={calculatedStartDate || ''}`) but the handleSubmit overrides it with `fd.set('startDate', calculatedStartDate)` — this works but is fragile. The uncontrolled input shows a stale value if auto-calc runs after initial render.

**TenderEditDialog:**

- ✅ Section tabs split details vs tracking/outcome
- ✅ Client/division state uses `useState` (our fix)
- ✅ Uses two server actions for main + tracking updates
- 🔴 **Minor:** Switching to the tracking tab hides the edit button and submit button at the bottom. Users scrolling down see no action buttons until they scroll up.

**ScheduleTable (in `scheduling-overview-shell.tsx`):**

- ✅ Sort + filter + search all client-side via `useMemo`
- ✅ Toggle sorting by clicking column headers (with arrow indicators)
- ⚠️ Arrow indicator uses `▼` character rotated via CSS `transform: rotate(180deg)` — functional but the logic in `sortDirIcon` returns CSS classes, not the rotation state. The `▼` is always "facing down" in HTML, and CSS rotation makes it point up. This works but is unconventional.

**ScheduleListClient:**

- ✅ Full-text search (client name + tender reference)
- ✅ Status, priority, date range filters
- ✅ Bulk select with archive/delete actions
- ✅ Confirmation dialogs for destructive actions
- ⚠️ **Delete button is always shown** but disabled when selected items aren't cancelled. The disabled state text is `text-destructive` which shows red text on a disabled (greyed) button — slightly confusing UX.

**TimelineClient:**

- ✅ Custom Gantt-style timeline
- ✅ Week markers + today line
- ✅ Color-coded status bars + buffer extension
- ✅ Hover date labels
- ⚠️ **Grid lines rendered as `position: relative; height: 0` div** — the timeline header and rows overlay on top of each other. This is a creative CSS approach but might render differently across browsers.

**Dashboard TenderSummaryCard:**

- ✅ Animated metric bubbles with conditional highlighting
- ✅ At-risk and overdue badges
- ✅ Quick link to scheduling page
- ✅ Gradient card with hover effect

---

## 6. Error & Loading States

| File                            | Type                | Quality                                                    |
| ------------------------------- | ------------------- | ---------------------------------------------------------- |
| `error.tsx`                     | Error boundary      | ✅ Clean — shows error + try again / dashboard link        |
| `loading.tsx`                   | Loading skeleton    | ✅ Matches page layout closely                             |
| `schedule-list-client.tsx`      | Empty state         | ✅ Shows "No tenders match your filters" with clear button |
| `scheduling-overview-shell.tsx` | Empty state (table) | ✅ "No tenders scheduled yet"                              |
| `draggable-up-next.tsx`         | Empty state         | ✅ "No upcoming tenders"                                   |
| `timeline-client.tsx`           | Empty state         | ✅ "No active tenders to display" with link to overview    |

All empty and error states are well-handled. ✅

---

## 7. Test Coverage

| File                                  | Tests | Status      |
| ------------------------------------- | ----- | ----------- |
| `tender-schedule-actions.test.ts`     | 7     | ✅ All pass |
| `tender-schedule-components.test.tsx` | 13    | ✅ All pass |

**What's tested:**

- Server action: validation (4 tests), success + date calc (3 tests)
- TenderFormDialog: error display, error clearing, toast on success, state persistence (client + division), default division value
- TenderEditDialog: pre-filled client, state persistence (client + division via tab switch), error display, error clearing, toast on success

**Missing coverage:**

- Bulk archive/delete actions
- Reorder queue action
- Status transition action (no unit tests for the business logic)
- Timeline component
- Schedule list component (filtering, bulk select)
- DraggableUpNext (drag-and-drop)
- Risk badge calculation logic
- Dashboard summary card

---

## 8. Issues Found

### 🔴 High Severity

None. The feature is well-implemented.

### 🟡 Medium Severity

1. **Generic catch-all errors in all server actions** — When something fails, the user sees "Failed to save. Please try again." with no way to diagnose. Should log the actual error server-side before returning the generic message.

2. **No `submitted → planned` transition** — Once a tender is marked as submitted, it cannot be reopened. If results are delayed or the submission needs revision, there's no way to undo.

3. **`completed → in_progress` transition missing** — Common workflow: marking a tender complete by accident or needing to resume work.

4. **Start Date input is uncontrolled** with `defaultValue` in `TenderFormDialog`. The `handleSubmit` manually overrides it via `fd.set('startDate', calculatedStartDate)`, but the visible field shows a stale value if the auto-calc updates after initial mount. Should either be controlled (like closing date) or show the calculated value more reliably.

### 🟢 Low Severity

5. **Injection risk in `getAllTenderScheduleEntries`** — Uses `ANY(ARRAY[...])` with string interpolation for filter values. Currently only called from trusted server code, but query-level validation would be safer.

6. **`as any` cast in `updateTenderScheduleEntryJson`** — Loses type safety when passing the update object to the DB.

7. **Bulk delete button shows red text when disabled** — Confusing UX. Should use muted styling for disabled state.

8. **Edit dialog submit button scroll position** — Switching to the tracking tab hides action buttons below the fold.

---

## 9. Recommendations

### Immediate (this session)

- ✅ Done: Fixed client/division state persistence in form dialogs (the original bug report)
- ✅ Done: Added 20 unit tests (7 server action + 13 component)

### Next week

1. Add server-side error logging (e.g., `console.error`) before the generic catch-all returns
2. Add `submitted → planned` transition to allow reopening
3. Add `completed → in_progress` transition for undo
4. Add tests for status transitions, risk badge, bulk actions, draggable reorder

### Future

5. Consider making the Start Date input controlled to avoid the uncontrolled vs overridden disconnect
6. Audit the `ANY(ARRAY[...])` pattern in queries for injection safety
7. Add property-based tests (fast-check) for date calculations
8. Review the timeline grid lines CSS for cross-browser compatibility
