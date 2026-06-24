# Implementation Plan — Tender Scheduling Feature

## Overview

This plan follows the established PMG Hub development patterns and splits the work into 3 phases. Phase 1 delivers the MVP. Phases 2 and 3 are post-MVP enhancements.

## Phase 1 — MVP (Core Scheduling)

**Goal:** Functional tender schedule with CRUD, status tracking, basic warnings, and a clean UI.

### Step 1: Database — Schema & Migration

**Files to create/modify:**
- `packages/db/src/schema/tender-schedule.ts` (NEW)
- `packages/db/src/schema/index.ts` (MODIFY — add export)

**Actions:**
1. Create schema file with `tenderScheduleEntries` table, enum definitions, relations, and TypeScript types (as defined in `data-model.md`).
2. Add export to `packages/db/src/schema/index.ts`.
3. Run `bun run db:generate` (or the project's migration generation command) to create the migration.
4. Run `bun run db:migrate` to apply the migration.

### Step 2: Database — Query Helpers

**Files to create/modify:**
- `packages/db/src/queries/tender-schedule.ts` (NEW)
- `packages/db/src/queries/index.ts` (MODIFY — add export)

**Query functions needed:**

```typescript
// Basic CRUD
export async function getAllTenderScheduleEntries(filters?: TenderFilterOptions): Promise<TenderScheduleEntry[]>
export async function getTenderScheduleEntryById(id: string): Promise<TenderScheduleEntry | null>
export async function createTenderScheduleEntry(data: NewTenderScheduleEntry): Promise<TenderScheduleEntry>
export async function updateTenderScheduleEntry(id: string, data: Partial<NewTenderScheduleEntry>): Promise<TenderScheduleEntry>
export async function cancelTenderScheduleEntry(id: string): Promise<void>

// Workload queries
export async function getCurrentWorkload(): Promise<{ inProgress: TenderScheduleEntry | null; planned: TenderScheduleEntry[] }>
export async function getOverlappingTenders(startDate: string, endDate: string): Promise<TenderScheduleEntry[]>
export async function getTendersAtRisk(): Promise<TenderScheduleEntry[]>

// Dashboard summary
export async function getTenderScheduleSummary(): Promise<{
  inProgress: number
  planned: number
  upcomingDeadlines: number
  atRisk: number
  overdue: number
}>
```

### Step 3: Server Actions

**Files to create:**
- `apps/admin/src/app/actions/tender-schedule.ts` (NEW)

**Actions needed:**
- `createTenderScheduleEntry(formData: FormData)` — validates, inserts, revalidates `/scheduling`
- `updateTenderScheduleEntry(id: string, formData: FormData)` — validates, updates, revalidates
- `cancelTenderScheduleEntry(id: string)` — sets status to `cancelled`, revalidates
- `transitionTenderStatus(id: string, newStatus: string)` — validates transition, updates, revalidates

**Pattern** — follow the existing `apps/admin/src/app/actions/clients.ts` pattern:
- `'use server'` directive
- Zod validation schema
- Try/catch with error response
- `revalidatePath()` after success

### Step 4: UI — Navigation Entry

**Files to modify:**
- `apps/admin/src/components/navigation/nav-data.ts`

**Action:**
- Add `Scheduling` as a top-level nav item in OVERVIEW (simplest approach)
  - Icon: `CalendarClock` from `lucide-react`
  - URL: `/scheduling`
- Or add a full group with Overview, Schedule List, and Timeline sub-items

### Step 5: UI — Scheduling Overview Page

**Files to create/modify:**
- `apps/admin/src/app/(admin)/scheduling/page.tsx` (NEW)
- `apps/admin/src/app/(admin)/scheduling/loading.tsx` (NEW)
- `apps/admin/src/app/(admin)/scheduling/error.tsx` (NEW)
- `apps/admin/src/components/scheduling/` directory (NEW) with component files

**Components needed:**

1. **`scheduling-overview-shell.tsx`** — Main page layout (server component, async, fetches data)
   - Fetches: current workload, queue, warnings, schedule entries
   - Passes data to client components

2. **`current-workload-card.tsx`** (client component)
   - Shows the in-progress tender prominently
   - "Mark Complete" button
   - Risk indicator
   - Empty state when nothing in progress

3. **`up-next-card.tsx`** (client component)
   - Shows next 2–3 planned tenders
   - "Start Now" button for each
   - Warning indicators

4. **`warnings-panel.tsx`** (client component)
   - Renders conditionally when warnings exist
   - Alert-style warning items

5. **`schedule-table.tsx`** (client component)
   - Full data table of active tenders
   - Sortable columns
   - Click row → edit dialog

6. **`tender-form-dialog.tsx`** (client component)
   - Create/edit dialog
   - Auto-calculates dates
   - Validates input

7. **`tender-status-badge.tsx`** (client component)
   - Renders status with appropriate badge variant

8. **`tender-risk-badge.tsx`** (client component)
   - Renders risk level with appropriate badge variant

**Page pattern** — follow existing patterns (e.g., `billing/page.tsx`, `relationships/page.tsx`):
```typescript
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Scheduling' }

export default async function SchedulingPage() {
  // Fetch data
  // Return page with SetPageTotal and component tree
}
```

### Step 6: Client-Side Logic

**Key calculations (in utility functions):**

```
calculateDates(closingDate, effortDays, bufferDays = 2):
  recommendedStart = closingDate - effortDays - bufferDays
  targetCompletion = recommendedStart + effortDays
  return { recommendedStart, targetCompletion }

calculateRisk(tender):
  if today > tender.closingDate AND status != 'submitted':
    return 'overdue'
  if today > tender.targetCompletionDate:
    return 'at_risk'
  if tender.targetCompletionDate - tender.closingDate < 2:
    return 'tight_buffer'
  if today > tender.startDate AND status == 'planned':
    return 'start_overdue'
  return 'on_track'

detectOverlaps(tenders):
  // Find pairs of tenders where date ranges overlap
  // Filter to active statuses (planned, in_progress)
  // Return array of overlap warnings
```

### Step 7: Testing

**Test files:**
- `packages/db/src/__tests__/tender-schedule.test.ts` — query helpers
- `apps/admin/src/__tests__/tender-schedule-actions.test.ts` — server actions
- `apps/admin/src/__tests__/tender-schedule-helpers.test.ts` — date calculations, risk detection, overlap detection

**Test cases:**
1. Date calculations return correct recommended start and target completion
2. Risk detection returns correct levels for various scenarios
3. Overlap detection finds overlapping date ranges
4. Server actions validate input correctly
5. Status transitions follow valid paths

## Phase 2 — Post-MVP Enhancements

| Item | Description | Priority |
|---|---|---|
| **Timeline/Gantt view** | Simple horizontal bar chart | Medium |
| **Client linking** | Improve client auto-suggest and linking | Medium |
| **Actual effort tracking** | Record actual days spent for future estimation accuracy | Medium |
| **Sort/filter enhancements** | More filter options on schedule table | Low |
| **Bulk archive** | Archive old/completed tenders out of the active view | Low |

## Phase 3 — Future (If Needed)

| Item | Description | Why Wait |
|---|---|---|
| **Email notifications** | Reminders via Resend when deadlines approach or tenders are overdue | Requires Resend integration already built — but adds complexity |
| **Re-ordering (drag-and-drop)** | Drag to reorder the queue | Adds UI complexity for minimal solo-user benefit |
| **Progress percentage** | Visual progress slider on in-progress tenders | Could be useful but adds to MVP scope |
| **Reporting** | Win/loss tracking, average effort analysis | Requires historical data accumulation first |

## Route Structure Summary

```
/ (apps/admin)
  /scheduling              → Overview page (MVP — primary page)
  /scheduling/list         → Full schedule table (Phase 2)
  /scheduling/timeline     → Timeline view (Phase 2)
```

## File Creation Summary

### Database Layer (`packages/db/src/`)
| File | Action |
|---|---|
| `schema/tender-schedule.ts` | CREATE |
| `schema/index.ts` | MODIFY — add export |
| `queries/tender-schedule.ts` | CREATE |
| `queries/index.ts` | MODIFY — add export |

### Server Actions (`apps/admin/src/app/actions/`)
| File | Action |
|---|---|
| `tender-schedule.ts` | CREATE |

### UI Layer (`apps/admin/src/`)
| File | Action |
|---|---|
| `components/navigation/nav-data.ts` | MODIFY — add Scheduling nav item |
| `app/(admin)/scheduling/page.tsx` | CREATE |
| `app/(admin)/scheduling/loading.tsx` | CREATE |
| `app/(admin)/scheduling/error.tsx` | CREATE |
| `components/scheduling/scheduling-overview-shell.tsx` | CREATE |
| `components/scheduling/current-workload-card.tsx` | CREATE |
| `components/scheduling/up-next-card.tsx` | CREATE |
| `components/scheduling/warnings-panel.tsx` | CREATE |
| `components/scheduling/schedule-table.tsx` | CREATE |
| `components/scheduling/tender-form-dialog.tsx` | CREATE |
| `components/scheduling/tender-status-badge.tsx` | CREATE |
| `components/scheduling/tender-risk-badge.tsx` | CREATE |

### Tests
| File | Action |
|---|---|
| `packages/db/src/__tests__/tender-schedule.test.ts` | CREATE |
| `apps/admin/src/__tests__/tender-schedule-actions.test.ts` | CREATE |
| `apps/admin/src/__tests__/tender-schedule-helpers.test.ts` | CREATE |

## Dependencies

No new external npm packages required. All components use existing dependencies:
- `lucide-react` (for icons — `CalendarClock`, `ListTodo`, `CalendarRange`, etc.)
- `zod` (for validation — already in project)
- `drizzle-orm` (for database — already in project)
- `recharts` (only needed for timeline view — already in project)

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Feature creep into full project management | Strict adherence to the scope defined in `objective.md` |
| Over-engineered UI for a solo user | Keep interactions simple; favour buttons over drag-and-drop |
| Date/timezone bugs (SAST vs UTC) | Use existing `getSASTParts()` utility; store dates as `date` type (no time component) |
| Performance issues with many tenders | Low risk — a solo user will have at most ~50 entries/year. No pagination needed for MVP |
