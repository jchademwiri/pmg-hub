# Financial Lock & Grace Period - PRD + Technical Specification v2

---

# 1. Product Requirements Document (PRD)

## 1.1 Overview

This feature introduces **financial period locking and controlled backdating** to ensure:

- Accurate financial reporting
- Immutable historical data
- Alignment with accounting best practices

The system enforces a **grace period (1st–5th)** and **hard locks** on closed months via snapshots and date rules.

---

## 1.2 Problem Statement

Current issues in the system:

- Users can backdate financial records indefinitely
- Closed months can still be modified or deleted
- Records in locked months can be created, edited, or deleted
- Reports are unreliable due to mutable historical data
- The "Close Month" button targets the wrong period (current instead of previous)

---

## 1.3 Objectives

- Enforce **strict financial period boundaries**
- Prevent **retroactive data manipulation**
- Introduce **centralized validation logic**
- Ensure **snapshot integrity as source of truth**

---

## 1.4 Business Rules

### Date Rules

Users may only create or edit records in:

- **Current month** - always
- **Previous month only** - between the 1st and 5th of the current month, AND only if that previous month has no snapshot

Users may NOT:

- Create future-dated records
- Backdate beyond the previous month under any circumstance
- Edit or delete any record in a closed period

> **Important:** Any month older than the previous calendar month is unconditionally closed,
> regardless of grace period status or whether a snapshot exists.

---

### Grace Period Boundary - Exact Definition

| Day of Month | Previous Month Allowed? | Notes |
|---|---|---|
| 1st – 5th | ✅ Yes (if no snapshot) | Grace period active |
| 6th onwards | ❌ No | Grace period over |

> Day 5 is the last day of the grace period. From day 6, only the current month is permitted.
>
> Auto-close fires on day **5 or later**. On day 5, if auto-close has not yet run and no
> snapshot exists, the previous month is still open. Once the snapshot is created (by
> auto-close or manual close), the period is immediately locked regardless of the day.

---

### Period Closure - Precise Definition

A period `YYYY-MM` is considered **closed** when ANY of the following is true:

1. A snapshot exists for that period in the database
2. Today is the **6th or later** AND the period is earlier than the current month
3. The period is **older than the previous calendar month** (unconditionally closed)

---

### Immutable History

For closed periods:

- ❌ No create
- ❌ No update
- ❌ No delete

This applies to: income, expenses, and ledger entries.

---

### Snapshot Rules

- Snapshots are **finalized records** - one per period
- Cannot be modified or deleted (no UI exists for this, by design)
- Represent the **authoritative financial state** for that period
- Creating a snapshot **immediately and irrevocably closes** that period

---

## 1.5 User Stories

### Finance User

- As a user, I want to capture transactions for the current month
- As a user, I want a short grace period (1st–5th) to finalize last month's records
- As a user, I should not be able to accidentally modify finalized financial data
- As a user, I want clear UI feedback when an action is blocked due to period lock

### Admin / System

- As a system, I must enforce financial integrity at the server action layer
- As a system, I must prevent invalid date entries via both UI and server validation
- As a system, I must lock data once a snapshot exists or the grace period has passed

---

## 1.6 Acceptance Criteria

| Scenario | Expected Outcome |
|----------|----------------|
| Create record in current month | ✅ Allowed |
| Create record in previous month, day 1–5, no snapshot | ✅ Allowed |
| Create record in previous month, day 1–5, snapshot exists | ❌ Blocked |
| Create record in previous month, day 6+ | ❌ Blocked |
| Create record in any month older than previous | ❌ Blocked |
| Edit record in open period | ✅ Allowed |
| Edit record in closed period | ❌ Blocked |
| Delete record in open period | ✅ Allowed |
| Delete record in closed period | ❌ Blocked |
| Create future-dated record | ❌ Blocked |
| Close Month button targets correct period (previous month) | ✅ Required |
| Create snapshot for a period that already has one | ❌ Blocked (already implemented) |
| Modify or delete snapshot via UI | ❌ No UI exists (by design) |

---

## 1.7 Success Metrics

- 0% mutation of closed-period records
- 100% server-side enforcement of date validation
- Elimination of reporting inconsistencies caused by retroactive edits

---

# 2. Technical Specification

## 2.1 Architecture Overview

Core principle: **Centralized Date Rules Engine** used across all mutation points.

Layers:

- **Core Logic** → `lib/date-rules.ts` (server-only)
- **Server Enforcement** → Server Actions (primary gate)
- **UI Enforcement** → Disabled actions, hidden buttons, restricted date inputs (secondary)
- **Data Integrity** → Snapshot locking (no delete/update UI)

Server actions are the **single source of enforcement**. UI restrictions are a UX convenience only - they do not replace server-side validation.

---

## 2.2 Date Rules Engine

**File:** `apps/admin/src/lib/date-rules.ts`

**Must include** `import 'server-only'` - this module calls the database and must never run client-side.

---

### Full API

```ts
// Returns YYYY-MM-DD string: the earliest date allowed for new records
export async function getMinAllowedDate(): Promise<string>

// Returns true if the period containing `date` is closed
export async function isPeriodClosed(date: string): Promise<boolean>

// Returns a human-readable error message for a rejected date
export function getMinDateErrorMessage(minDate: string): string

// Returns sorted array of closed period strings (YYYY-MM) from a list of dates
// Used by UI table components to determine which rows are locked
export async function getClosedPeriodsFromDates(dates: string[]): Promise<string[]>
```

> **⚠️ `getMinAllowedDate` must be `async`.**
> It needs to query the database to check whether the previous month has a snapshot.
> The original spec incorrectly listed it as synchronous.

---

### Logic Definition

#### `getMinAllowedDate(): Promise<string>`

```
today = server date (never client date)
day = today.getDate()

if day > 5:
  return first day of current month  // grace period over

prevMonthPeriod = YYYY-MM of previous calendar month
snapshot = await getSnapshotByPeriod(prevMonthPeriod)

if snapshot exists:
  return first day of current month  // previous month already closed

return first day of previous month  // grace period active, previous month open
```

---

#### `isPeriodClosed(date: string): Promise<boolean>`

```
period = date.slice(0, 7)  // "YYYY-MM"
today = server date
currentPeriod = current YYYY-MM
prevPeriod = previous calendar YYYY-MM

// Rule 1: Future periods are never "closed" but are blocked by the future-date guard
// Rule 2: Current month is always open
if period === currentPeriod:
  return false

// Rule 3: Any month older than previous is unconditionally closed
if period < prevPeriod:
  return true

// period === prevPeriod - apply grace + snapshot logic
snapshot = await getSnapshotByPeriod(period)
if snapshot exists:
  return true

day = today.getDate()
if day > 5:
  return true  // grace period over

return false  // grace period active, no snapshot
```

---

#### `getClosedPeriodsFromDates(dates: string[]): Promise<string[]>`

```
Extract unique periods (YYYY-MM) from dates
For each unique period, call isPeriodClosed(period + '-01')
Return array of periods where isPeriodClosed === true
```

This is used by server-side page components to pass a `closedPeriods: string[]` prop
down to table components for UI enforcement.

---

### Example

```ts
// On June 3rd, no May snapshot
await getMinAllowedDate()     // → "2026-05-01"
await isPeriodClosed("2026-05-15")  // → false
await isPeriodClosed("2026-04-10")  // → true  (older than previous)

// On June 6th, regardless of snapshot
await getMinAllowedDate()     // → "2026-06-01"
await isPeriodClosed("2026-05-15")  // → true  (grace period over)

// On June 3rd, May snapshot exists
await getMinAllowedDate()     // → "2026-06-01"
await isPeriodClosed("2026-05-15")  // → true  (snapshot exists)
```

---

## 2.3 Snapshot Module Fixes

### Dashboard Close Month Button - Critical Bug Fix

**File:** `apps/admin/src/app/(admin)/dashboard/page.tsx`

The `currentPeriod` passed to `CloseMonthButton` must be the **previous month**, not the current month.

```ts
// CURRENT (WRONG) - closes current month
const currentPeriod = now.toISOString().slice(0, 7)

// FIXED - closes previous month
const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const periodToClose = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
```

Pass `periodToClose` to `CloseMonthButton` and `hasSnapshot` should check `periodToClose`, not `currentPeriod`.

---

### Snapshot Immutability

No delete or update actions exist in the UI for snapshots. This is correct and intentional - maintain this absence. Do not add delete or update routes for snapshots.

The existing guard in `closeMonth()` already prevents duplicate snapshots:

```ts
const existing = await getSnapshotByPeriod(period);
if (existing !== null) {
  return { error: 'Month already closed' };
}
```

No additional code changes needed for snapshot immutability beyond the dashboard fix above.

---

## 2.4 Server Action Enforcement

### Scope

Apply `isPeriodClosed` checks to these files:

| File | Create | Update | Delete |
|------|--------|--------|--------|
| `actions/income.ts` | ✅ | ✅ | ✅ |
| `actions/expenses.ts` | ✅ | ✅ | ✅ |
| `actions/ledger.ts` | ✅ | ✅ | ✅ |

> **`actions/account-withdrawal.ts` does NOT need changes.**
> It is a thin wrapper that calls `createLedgerEntry`, which will be protected
> by the ledger action's own validation. Adding checks here would be redundant.

---

### Create / Update Pattern

```ts
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules'

// In createX / updateX:
const today = new Date().toISOString().split('T')[0]!
if (parsed.date > today) {
  return { error: 'Date cannot be in the future.' }
}

if (await isPeriodClosed(parsed.date)) {
  const minDate = await getMinAllowedDate()
  return { error: getMinDateErrorMessage(minDate) }
}
```

---

### Delete Pattern - Critical Safety Rule

**Never trust a client-provided date for delete operations.**
Always fetch the record from the database first, then validate using the stored date.

```ts
// deleteIncome example
export async function deleteIncome(id: string): Promise<{ error?: string }> {
  try {
    // 1. Fetch from DB - do not use any client-provided date
    const existing = await getIncomeById(id)
    if (!existing) return { error: 'Record not found.' }

    // 2. Validate using stored date
    if (await isPeriodClosed(existing.date)) {
      return { error: 'Cannot delete records from a closed financial period.' }
    }

    // 3. Proceed
    await db.delete(income).where(eq(income.id, id))
    revalidatePath('/income')
    revalidatePath('/dashboard')
    return {}
  } catch {
    return { error: 'Failed to delete. Please try again.' }
  }
}
```

Apply the same pattern to `deleteExpense` (use `getExpenseById`) and `deleteLedgerEntry` (use `getLedgerById`). Both query helpers already exist in `packages/db/src/queries.ts`.

---

## 2.5 UI Enforcement

UI enforcement is **secondary** - it improves UX but does not replace server-side validation.

---

### Page Components - Compute `closedPeriods` Server-Side

**Files:** `income/page.tsx`, `expenses/page.tsx`, `ledger/page.tsx`

```ts
import { getClosedPeriodsFromDates, getMinAllowedDate } from '@/lib/date-rules'

// In the page:
const [result, ..., minDate] = await Promise.all([
  getAllIncome(filters, pageObj),
  // ...other queries
  getMinAllowedDate(),
])

const closedPeriods = await getClosedPeriodsFromDates(
  result.data.map((r) => r.date)
)

// Pass both minDate and closedPeriods to the client component
```

---

### Table Components - Conditional Rendering

**Files:** `income-table.tsx`, `expense-table.tsx`, `ledger-table.tsx`

Add prop:

```ts
closedPeriods: string[]
```

Usage inside each row:

```ts
const period = entry.date.slice(0, 7)  // "YYYY-MM"
const isLocked = closedPeriods.includes(period)
```

If `isLocked`:

- Hide the Edit button (or render as disabled with a `Lock` icon)
- Hide the Delete button (or render as disabled)
- Optionally show a small lock badge on the row

```tsx
{isLocked ? (
  <span title="Period is closed" className="text-muted-foreground/40">
    <Lock className="h-4 w-4" />
  </span>
) : (
  <Button variant="ghost" size="icon" onClick={startEdit}>
    <Pencil className="h-4 w-4" />
  </Button>
)}
```

---

### Date Inputs - Restrict `min` Attribute

Pass `minDate: string` down from the page through the client component to the add and edit forms.

```tsx
<Input
  type="date"
  name="date"
  min={minDate}
  max={today}
/>
```

---

## 2.6 Data Flow (Updated)

```
User submits mutation
       │
       ▼
Server Action receives payload
       │
       ├─── Future date check (date > today) ──→ reject
       │
       ├─── isPeriodClosed(date) ──────────────→ reject if true
       │         │
       │         ├── snapshot exists? → closed
       │         ├── period < prevMonth? → closed
       │         └── day > 5 AND period < currentMonth? → closed
       │
       └─── Proceed with DB mutation
```

---

## 2.7 Edge Cases

| Case | Behaviour |
|------|-----------|
| Snapshot created on day 2 | Immediately locks that period - grace period irrelevant |
| Empty month (no income/expenses) | Auto-close skips it; still locked by day ≥ 6 rule via `isPeriodClosed` |
| Month 2+ months ago | Always closed - no snapshot check needed, `period < prevPeriod` short-circuits |
| Timezone offset | Always use server time (`new Date()` in server actions). Never trust client dates |
| Manual DB edits bypassing the app | Not in scope - requires DB-level triggers if needed in future |

---

## 2.8 Security & Integrity

- Server actions are the **single source of truth** for enforcement
- UI is a convenience layer only - never the only guard
- Dates for delete operations must always come from the database, not the client
- `date-rules.ts` must be `server-only` - never runs in the browser

---

## 2.9 Implementation Phases

| Phase | File(s) | Description | Commit |
|-------|---------|-------------|--------|
| P1 | `lib/date-rules.ts` | Create async date rules engine | `feat(core): add date rules engine` |
| P2 | `dashboard/page.tsx` | Fix Close Month period target | `fix(snapshots): close previous month not current` |
| P3 | `actions/income.ts`, `actions/expenses.ts`, `actions/ledger.ts` | Add create/update/delete locks | `feat(actions): block mutations on closed periods` |
| P4 | `income/page.tsx`, `expenses/page.tsx`, `ledger/page.tsx` | Compute `minDate` + `closedPeriods` server-side | `feat(ui): pass lock data to client components` |
| P5 | `income-table.tsx`, `expense-table.tsx`, `ledger-table.tsx`, add/edit forms | Apply `closedPeriods` and `minDate` to UI | `feat(ui): hide edit/delete for locked periods` |

---

## 2.10 Future Enhancements

- Database-level constraints (triggers) for defence-in-depth
- Audit log for attempted violations
- Admin override system for controlled unlocks

---

# Final Notes

This implementation guarantees:

- Deterministic financial state
- Immutable historical records
- Strong alignment with accounting controls
- Clear separation: server actions enforce, UI informs

---

**End of PRD + Technical Specification v2**
