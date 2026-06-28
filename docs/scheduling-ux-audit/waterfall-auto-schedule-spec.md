# Scheduling — Auto-Allocation Waterfall Spec

**Date:** 2026-06-28  
**Status:** Approved for implementation  
**Scope:** `packages/db/src/queries/tender-schedule.ts` · `apps/admin/src/app/actions/tender-schedule.ts` · `apps/admin/src/components/scheduling/tender-form-dialog.tsx`

---

## 1. The Rule in Plain English

> You add a closing date and effort days. The system works out everything else.  
> Each tender starts the day after the previous tender's target completion date.  
> Target completion = start date + effort days.  
> Buffer only affects whether a warning is shown — it does not move the start date.

**Your example:**

| Tender | Closing | Effort | Start                          | Target Completion |
| ------ | ------- | ------ | ------------------------------ | ----------------- |
| A      | 7 July  | 3 days | 1 July                         | 4 July            |
| B      | 15 July | 5 days | 5 July (day after A completes) | 10 July           |

B gets 5 days left before its closing (10 July → 15 July). That's the buffer visibility. You didn't set it — it emerged automatically from the chain.

---

## 2. What the Current Code Does (and What's Wrong)

### Current `calculateTenderWaterfallUpdates`

```typescript
// Current behaviour — WRONG for your rule
let cursor: string | null = null;

return ordered.map((entry, index) => {
  const startDate =
    entry.status === "in_progress"
      ? entry.startDate
      : cursor ?? recommendedStartDate(entry);  // ← BUG: first entry floats
  const targetCompletionDate = addDays(startDate, entry.effortDays);
  cursor = targetCompletionDate;
  ...
});
```

**Problem 1 — The first tender floats to `recommendedStartDate`.**  
`recommendedStartDate(entry)` = `closingDate − effortDays − bufferDays`. So if the queue has only one tender, the system backdates its start to `closing − effort − buffer`. This means tender A in your example would start on 29 June (7 July − 3 − 5), not on "today" or "as soon as possible".

**Problem 2 — Buffer days pushes the start date backwards.**  
The current chain does `cursor = targetCompletionDate` (correct), but the _first_ anchor uses `closing − effort − buffer` — the buffer is baked into the start. Your rule is: buffer is irrelevant to scheduling; it is only a warning threshold.

**Problem 3 — `effortDays` and `bufferDays` and `startDate` are all form fields.**  
The user currently fills in effort, buffer, closing date, and the form pre-calculates a start date preview. Under the new rule, the user fills in **only closing date and effort days**. Start date is entirely system-assigned. Buffer days remains as a warning threshold setting but no longer influences dates.

**Problem 4 — The form passes a `startDate` to the server action.**  
`createTenderScheduleEntry` currently accepts a `startDate` from the form (line: `const finalStartDate = startDate || dates.startDate`). Under the new rule, the server action must ignore any client-supplied `startDate` — start is always assigned by `recalculateTenderWaterfall`.

---

## 3. The Correct Waterfall Algorithm

### 3.1 Ordering rule (unchanged)

Sort the queue:

1. `urgent` priority first
2. Then by `closingDate` ascending (earliest closing = highest urgency)
3. Tiebreak by `createdAt` ascending
4. Tiebreak by `id` ascending

### 3.2 Anchor rule (new)

The **first entry** in the queue anchors to **today** if nothing is in progress.  
If there is an `in_progress` entry, it anchors to its **actual `startDate`** (already set when it was started — no change to this).

```
anchor = today   (if first planned entry and nothing is in_progress)
anchor = in_progress.startDate   (if the current entry is in_progress)
```

### 3.3 Chain rule (the core change)

Each subsequent `planned` entry starts **the day after** the previous entry's `targetCompletionDate`:

```
entry[0].startDate = anchor
entry[0].targetCompletionDate = entry[0].startDate + entry[0].effortDays

entry[1].startDate = entry[0].targetCompletionDate + 1 day
entry[1].targetCompletionDate = entry[1].startDate + entry[1].effortDays

entry[n].startDate = entry[n-1].targetCompletionDate + 1 day
entry[n].targetCompletionDate = entry[n].startDate + entry[n].effortDays
```

**No buffer in the chain.** Buffer days is kept in the schema as a per-tender warning threshold only.

### 3.4 Completing a tender advances the chain

When tender A is marked `completed` (status → `completed`):

- A leaves the `planned`/`in_progress` pool
- `recalculateTenderWaterfall()` runs
- Tender B (next in queue) is now first — it gets `startDate = today` (or the actual completion date if you want to be precise — see section 3.5)
- B's `targetCompletionDate = B.startDate + B.effortDays`
- All subsequent tenders chain from B

### 3.5 When "today" means today vs the actual completion date

Two options for what `anchor` means when a tender completes:

**Option A (simpler — recommended):** Always use today as the anchor for the first planned entry. When A is marked complete on 4 July and B is next, B's start = 4 July + 1 = 5 July. ✓

**Option B:** Use `A.actualCompletionDate + 1`. This is the same result if you complete A on time. If A completes early (say 3 July), B could start 4 July. This is more accurate to your example.

**Recommendation: Option B** — use `actualCompletionDate + 1` if an `in_progress` entry just transitioned to `completed` and has `actualCompletionDate` set. Fall back to today if `actualCompletionDate` is null (shouldn't happen after `transitionTenderStatus` sets it, but defensive).

In practice this is easy: `recalculateTenderWaterfall` fetches all `planned` and `in_progress` entries. The `in_progress` entry keeps its `startDate`. After it transitions to `completed` it's no longer in the pool — so the first `planned` entry anchors to `today`. Since `transitionTenderStatus` already sets `actualCompletionDate = today`, and `recalculateTenderWaterfall` runs immediately after, the anchor is effectively `today` anyway. Option A and Option B converge. **Use Option A for simplicity.**

---

## 4. Precise Code Changes Required

### 4.1 `packages/db/src/queries/tender-schedule.ts`

Replace `calculateTenderWaterfallUpdates`:

```typescript
import { today as getToday } from '../lib/date-utils';

export function calculateTenderWaterfallUpdates(
  entries: TenderScheduleEntry[],
): TenderWaterfallUpdate[] {
  // Separate in_progress (keeps its own startDate) from planned (chained)
  const inProgress = entries
    .filter((e) => e.status === 'in_progress')
    .sort(compareWaterfallEntries);
  const planned = entries.filter((e) => e.status === 'planned').sort(compareWaterfallEntries);
  const ordered = [...inProgress, ...planned];

  // cursor tracks where the previous entry's work ends
  // null = nothing scheduled yet; first planned entry starts today
  let cursor: string | null = null;

  return ordered.map((entry, index) => {
    let startDate: string;

    if (entry.status === 'in_progress') {
      // In-progress keeps its actual start date (it has already started)
      startDate = entry.startDate;
    } else if (cursor === null) {
      // First planned entry — start today (no gap, no backdate)
      startDate = getToday();
    } else {
      // Each subsequent entry starts the day after the previous ends
      startDate = addDays(cursor, 1);
    }

    const targetCompletionDate = addDays(startDate, entry.effortDays);

    // Advance the cursor to the end of this entry's work window
    cursor = targetCompletionDate;

    return {
      id: entry.id,
      sortOrder: index + 1,
      startDate,
      targetCompletionDate,
    };
  });
}
```

**Remove `recommendedStartDate` entirely** — it is no longer used. The function `addDays` is already imported. `getToday` is already exported from `date-utils.ts`.

### 4.2 `apps/admin/src/app/actions/tender-schedule.ts`

**`createTenderScheduleEntry` — remove start date from the form path:**

```typescript
// BEFORE (current)
const finalStartDate = startDate || dates.startDate;
const completionDate = new Date(finalStartDate);
completionDate.setDate(completionDate.getDate() + effortDays);

await createEntry({
  ...
  startDate: finalStartDate,
  targetCompletionDate: completionDate.toISOString().split('T')[0],
  ...
});

// AFTER (new)
// Insert with a provisional startDate = today.
// recalculateTenderWaterfall() immediately below will overwrite it with the
// correct chained date. The provisional value just satisfies the NOT NULL
// constraint on the column.
const provisionalStart = new Date().toISOString().split('T')[0];
const provisionalCompletion = new Date(provisionalStart);
provisionalCompletion.setDate(provisionalCompletion.getDate() + effortDays);

await createEntry({
  clientId,
  divisionId: divisionId ?? null,
  tenderReference,
  closingDate,
  effortDays,
  bufferDays,             // kept as warning threshold, not used in date calc
  startDate: provisionalStart,
  targetCompletionDate: provisionalCompletion.toISOString().split('T')[0],
  status: 'planned',
  priority,
  notes: notes ?? null,
  blockers: blockers ?? null,
  createdBy: session.user.id,
});

await recalculateTenderWaterfall(); // this sets the real startDate and targetCompletionDate
```

**Update the Zod schema** — remove `startDate` from the input schema entirely:

```typescript
const TenderScheduleSchema = z.object({
  clientId: z.string().min(1, 'A client is required.'),
  divisionId: z.string().optional(),
  tenderReference: z.string().min(1, 'Tender reference is required.'),
  closingDate: z.string().min(1, 'Closing date is required.'),
  effortDays: z.coerce.number().int().positive('Effort must be greater than 0.'),
  bufferDays: z.coerce.number().int().min(0).default(5),
  // startDate removed — system assigned
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  notes: z.string().optional(),
  blockers: z.string().optional(),
});
```

**Remove `calculateDates` helper** from the action file — it is no longer needed.

**`updateTenderScheduleEntry` — same treatment:**

```typescript
// AFTER
await updateEntry(id, {
  clientId,
  divisionId: divisionId ?? null,
  tenderReference,
  closingDate,
  effortDays,
  bufferDays,
  // No startDate — waterfall will recalculate
  priority,
  notes: notes ?? null,
  blockers: blockers ?? null,
});

await recalculateTenderWaterfall(); // recalculates start + target for entire chain
```

### 4.3 `apps/admin/src/components/scheduling/tender-form-dialog.tsx`

**Remove from the form:**

- `startDate` field (the read-only calculated input)
- `targetCompletionDate` field (the read-only disabled input)
- The `calculatedStartDate` / `calculatedTargetDate` state variables
- The `handleScheduleInputChange` function
- The `calcDates` helper function

**Keep:**

- `closingDate` field (date input — required)
- `effortDays` field (number input — required)
- `bufferDays` field (number input — keep as warning threshold, default 5)

**Replace the two removed fields with a schedule preview callout:**

```tsx
{
  closingDate && effortDays && (
    <div className="col-span-2 rounded-md border border-dashed border-border bg-muted/40 px-4 py-3">
      <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">
        Schedule preview (auto-assigned on save)
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="text-xs text-muted-foreground">Start: </span>
          <span className="font-medium">Auto-assigned</span>
        </span>
        <span className="text-muted-foreground/40">→</span>
        <span>
          <span className="text-xs text-muted-foreground">Target: </span>
          <span className="font-medium">Start + {effortDays} days</span>
        </span>
        <span className="text-muted-foreground/40">→</span>
        <span>
          <span className="text-xs text-muted-foreground">Buffer ends: </span>
          <span className="font-medium">
            {new Date(closingDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Start date is automatically calculated from the queue position when saved.
      </p>
    </div>
  );
}
```

**Remove the hidden `startDate` input** that was previously injected before form submission.

### 4.4 `apps/admin/src/components/scheduling/tender-edit-dialog.tsx`

In the Details tab:

- **Remove the `startDate` field** (it is now system-assigned and should not be user-editable)
- Keep all other fields as-is
- The `bufferDays` field stays (it's the warning threshold)

After save, `recalculateTenderWaterfall()` runs via the server action and resets the entire chain.

---

## 5. Edge Cases and Rules

### 5.1 Adding a tender with an earlier closing date than existing ones

**Example:** Queue has B (closes 15 July). You add A (closes 7 July).

After `recalculateTenderWaterfall()`:

- Sort order: A first (earlier closing), B second
- A: startDate = today, targetCompletion = today + A.effortDays
- B: startDate = A.targetCompletion + 1, targetCompletion = B.startDate + B.effortDays

The entire queue reshuffles automatically. This is correct — A's earlier deadline takes priority.

### 5.2 Urgent priority overrides closing date order

**Example:** Queue has A (closes 7 July, normal) and B (closes 15 July, urgent).

After waterfall:

- B comes first (urgent = priority 0)
- A comes second

This is the existing `compareWaterfallEntries` behaviour — unchanged.

### 5.3 What happens to `bufferDays` now

`bufferDays` is still stored per tender. It is used **only** for:

- Risk badge: `TenderRiskBadge` checks if `targetCompletionDate > closingDate - bufferDays` → shows "Tight" warning
- Warnings panel: same tight-buffer check

It no longer influences start date calculation at all.

### 5.4 What happens to the first entry when the queue is empty

New tender added to an empty queue:

- provisional `startDate` = today (set in action, then overwritten by waterfall)
- After waterfall: `startDate = today`, `targetCompletionDate = today + effortDays`

### 5.5 In-progress tender keeps its real start date

When tender A is `in_progress`, it already has `startDate` set to the day it was actually started (this happens in `transitionTenderStatus` — `startDate = now` on transition to `in_progress`). The waterfall preserves this: it only chains from `cursor = inProgress.targetCompletionDate`.

So if A started on 2 July and has 3 effort days, cursor = 5 July. B starts 6 July.

### 5.6 Multiple in-progress tenders (shouldn't happen, but handled)

The FSM currently allows only one `in_progress` tender at a time (the UI only shows one "Now Working" card). But if somehow two exist, they are both sorted first and chained sequentially before the planned entries. The algorithm handles it gracefully.

### 5.7 What the `sortOrder` column now means

`sortOrder` is set by `calculateTenderWaterfallUpdates` (index + 1). It is used in database queries for display ordering. It continues to work exactly as before — the waterfall sets it, queries order by it.

The `reorderTenderQueue` function and `tender-schedule-reorder.ts` action can be removed — manual reordering is superseded by the automatic chain. **Or** keep them dormant (they don't harm anything). Removing reduces confusion.

---

## 6. What the User Sees After This Change

### Creating a new tender (form dialog)

**Fields shown:**

- Client (required)
- Tender Reference (required)
- Closing Date (required)
- Effort (days) (required)
- Buffer (days) (optional, default 5, labelled "Warning threshold")
- Priority
- Division
- Notes
- Blockers

**Removed fields:**

- ~~Scheduled Start~~ (system assigned)
- ~~Target Completion~~ (system assigned = start + effort)

**New preview callout** (appears as soon as closing date + effort are filled):

```
Schedule preview (auto-assigned on save)
Start: Auto-assigned  →  Target: Start + N days  →  Closes: 15 Jul 2026
Start date is automatically calculated from your queue position when saved.
```

### Waterfall Queue card (overview page)

Queue shows tenders in order with their system-assigned dates. No "auto ordered" badge needed — it's just how the system works. Show each entry's:

- Position number
- Tender reference + client name
- Start → Target Completion dates (these are now meaningful, not estimates)
- Days until closing

### Timeline (visual)

Timeline now shows accurate bars — no more floating start dates. Every bar starts exactly where the previous one ends.

---

## 7. Summary of File Changes

| File                                                          | Change                                                                                                                                           |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/db/src/queries/tender-schedule.ts`                  | Rewrite `calculateTenderWaterfallUpdates` — remove `recommendedStartDate`, anchor first entry to today, chain subsequent entries with +1 day gap |
| `apps/admin/src/app/actions/tender-schedule.ts`               | Remove `startDate` from Zod schema; use provisional today date on insert; remove `calculateDates` helper; remove startDate from update path      |
| `apps/admin/src/components/scheduling/tender-form-dialog.tsx` | Remove startDate + targetCompletionDate fields and state; replace with schedule preview callout                                                  |
| `apps/admin/src/components/scheduling/tender-edit-dialog.tsx` | Remove startDate field from Details tab                                                                                                          |
| `apps/admin/src/app/actions/tender-schedule-reorder.ts`       | Optional: remove (manual reordering is superseded)                                                                                               |

No schema migration required. No new columns. `startDate`, `targetCompletionDate`, `bufferDays` all stay in the schema — they are still written by the waterfall and read by the risk/warning logic.

---

## 8. Verification Checklist

After implementation, verify these scenarios manually:

- [ ] Add first tender (empty queue) → `startDate` = today, `targetCompletion` = today + effortDays
- [ ] Add second tender with later closing → starts day after first's target completion
- [ ] Add second tender with earlier closing → reshuffles; new tender becomes first
- [ ] Add urgent tender → goes to front regardless of closing date
- [ ] Mark first tender complete → second tender's startDate moves to today (recalculated)
- [ ] Edit first tender's effort days → second tender's dates shift accordingly
- [ ] Cancel first tender → second tender moves to front, starts today
- [ ] Three tenders in sequence → each starts day after previous target completion
- [ ] Buffer days change on a tender → no dates change, only risk badge threshold changes

---

_This spec supersedes the waterfall notes in `scheduling-ux-audit.md` section 2 (What works well). The chain logic was directionally correct but anchored incorrectly. This spec defines the exact fix._
