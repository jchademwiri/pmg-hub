# Financial Lock & Grace Period - Implementation Plan v2

---

## 1. Summary of Changes from v1

Before implementing, read this diff between v1 and v2:

| # | Gap in v1 | Fix in v2 |
|---|-----------|-----------|
| 1 | `getMinAllowedDate()` listed as sync | Corrected to `async` - requires DB call |
| 2 | No rule for months older than previous | Explicit: any month older than previous is unconditionally closed |
| 3 | Grace period defined as "1st–5th inclusive" but code fires auto-close on day 5 | Clarified: grace is days 1–5, lock starts day **6** (`day > 5`) |
| 4 | `account-withdrawal.ts` listed as needing changes | Removed - it delegates to `createLedgerEntry`, covered transitively |
| 5 | `closedPeriods` UI prop mentioned with no utility to produce it | Added `getClosedPeriodsFromDates()` to the date rules engine |
| 6 | Delete safety described in plan but which query helpers to use was unclear | Explicit: use `getIncomeById`, `getExpenseById`, `getLedgerById` - all exist in `queries.ts` |
| 7 | No `server-only` import mentioned for `date-rules.ts` | Required - file queries DB and must not run client-side |
| 8 | Snapshot delete/update protection unclear | Clarified: no UI exists for this, that's the protection. No code changes needed |
| 9 | Phase count was 4, UI enforcement in one phase | Split into P4 (page-level data) and P5 (component-level rendering) for clarity |

---

## 2. Current State Analysis

### Snapshot Module

| Item | Status |
|------|--------|
| Auto-close targets previous month | ✅ Correct |
| Auto-close fires on day >= 5 | ✅ Correct |
| Manual close button targets previous month | ❌ Bug - currently uses `currentPeriod = now.toISOString().slice(0, 7)` which is the current month |
| Duplicate snapshot prevention | ✅ Already implemented |
| Snapshot delete/update protection | ✅ No UI exists - by design |

### Income / Expenses / Ledger

| Item | Status |
|------|--------|
| Future date prevention | ✅ Implemented |
| Unlimited backdating | ❌ Not restricted |
| Closed period create guard | ❌ Missing |
| Closed period update guard | ❌ Missing |
| Closed period delete guard | ❌ Missing - delete doesn't fetch existing record first |

---

## 3. Execution Plan

### Phase 1 - Date Rules Engine

**File to create:** `apps/admin/src/lib/date-rules.ts`

```ts
import 'server-only'
import { getSnapshotByPeriod } from '@pmg/db'

/**
 * Returns the earliest YYYY-MM-DD date allowed for new or updated records.
 * MUST be async - checks the DB for an existing snapshot.
 */
export async function getMinAllowedDate(): Promise<string> {
  const now = new Date()
  const day = now.getDate()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  const currentMonthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`

  // Grace period is over - current month only
  if (day > 5) return currentMonthStart

  // Check if previous month has already been closed via snapshot
  const prevDate = new Date(year, month - 1, 1)
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const snapshot = await getSnapshotByPeriod(prevPeriod)

  if (snapshot) return currentMonthStart

  // Grace period active and previous month is open
  return `${prevPeriod}-01`
}

/**
 * Returns true if the period containing `date` is closed.
 * A period is closed if:
 *   - A snapshot exists for it, OR
 *   - It is older than the previous calendar month (always closed), OR
 *   - It is the previous month and today is day 6 or later
 */
export async function isPeriodClosed(date: string): Promise<boolean> {
  const period = date.slice(0, 7) // "YYYY-MM"
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Current month is always open
  if (period === currentPeriod) return false

  // Compute previous month period
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  // Any month older than previous is unconditionally closed
  if (period < prevPeriod) return true

  // period === prevPeriod - apply grace + snapshot logic
  const snapshot = await getSnapshotByPeriod(period)
  if (snapshot) return true

  const day = now.getDate()
  if (day > 5) return true // grace period over

  return false // grace period active, no snapshot
}

/**
 * Returns a human-readable error message for a rejected date.
 */
export function getMinDateErrorMessage(minDate: string): string {
  const [y, m] = minDate.split('-')
  const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-ZA', {
    month: 'long',
    year: 'numeric',
  })
  return `Date must be ${label} or later - this financial period is closed.`
}

/**
 * Given a list of date strings (YYYY-MM-DD), returns the subset of
 * periods (YYYY-MM) that are currently closed.
 *
 * Used by page components to pass a closedPeriods prop to table components.
 * Deduplicates periods before checking to minimise DB calls.
 */
export async function getClosedPeriodsFromDates(dates: string[]): Promise<string[]> {
  const uniquePeriods = [...new Set(dates.map((d) => d.slice(0, 7)))]

  const results = await Promise.all(
    uniquePeriods.map(async (period) => ({
      period,
      closed: await isPeriodClosed(period + '-01'),
    }))
  )

  return results.filter((r) => r.closed).map((r) => r.period)
}
```

**Commit:** `feat(core): add async date rules engine for financial period locking`

---

### Phase 2 - Fix Snapshot Close Month Period

**File:** `apps/admin/src/app/(admin)/dashboard/page.tsx`

Find:
```ts
const currentPeriod = now.toISOString().slice(0, 7)
const dayOfMonth = now.getDate()
const showCloseMonthButton = dayOfMonth >= 1 && dayOfMonth <= 5
// ...
const currentPeriodSnapshot = await getSnapshotByPeriod(currentPeriod)
```

Replace with:
```ts
const dayOfMonth = now.getDate()
const showCloseMonthButton = dayOfMonth >= 1 && dayOfMonth <= 5

// The period to close is ALWAYS the previous month, not the current one
const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const periodToClose = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

// Check if previous month is already closed
const currentPeriodSnapshot = await getSnapshotByPeriod(periodToClose)
```

Then pass `periodToClose` (not `currentPeriod`) to `DashboardShell`:
```ts
<DashboardShell
  // ...
  currentPeriod={periodToClose}   // was: currentPeriod
  hasSnapshot={hasSnapshot}
  showCloseMonthButton={showCloseMonthButton}
/>
```

**Commit:** `fix(snapshots): close month targets previous period not current`

---

### Phase 3 - Server Action Locks

#### 3a. `actions/income.ts`

Apply to `createIncome`, `updateIncome`, and `deleteIncome`.

**Create / Update** - add after existing future-date check:
```ts
import { isPeriodClosed, getMinAllowedDate, getMinDateErrorMessage } from '@/lib/date-rules'

// After future date check:
if (await isPeriodClosed(parsed.date)) {
  const minDate = await getMinAllowedDate()
  return { error: getMinDateErrorMessage(minDate) }
}
```

**Delete** - replace existing with fetch-first pattern:
```ts
import { getIncomeById } from '@pmg/db'  // already exists in queries.ts

export async function deleteIncome(id: string): Promise<{ error?: string }> {
  try {
    const existing = await getIncomeById(id)
    if (!existing) return { error: 'Record not found.' }

    if (await isPeriodClosed(existing.date)) {
      return { error: 'Cannot delete records from a closed financial period.' }
    }

    await db.delete(income).where(eq(income.id, id))
    revalidatePath('/income')
    revalidatePath('/dashboard')
    return {}
  } catch {
    return { error: 'Failed to delete. Please try again.' }
  }
}
```

---

#### 3b. `actions/expenses.ts`

Same pattern as income. Use `getExpenseById` (already in `queries.ts`) for the delete guard.

---

#### 3c. `actions/ledger.ts`

Same pattern. Use `getLedgerById` (already in `queries.ts`) for the delete guard.

Note: `updateLedgerEntry` in the actions file receives a date from the form. Apply
`isPeriodClosed` to both the submitted date AND the existing record's date:

```ts
// In updateLedgerEntry:
const existing = await getLedgerById(id)
if (!existing) return { error: 'Record not found.' }

// Block if existing record is in a closed period
if (await isPeriodClosed(existing.date)) {
  return { error: 'Cannot edit records from a closed financial period.' }
}

// Also block if trying to move a record into a closed period
if (await isPeriodClosed(parsed.date)) {
  const minDate = await getMinAllowedDate()
  return { error: getMinDateErrorMessage(minDate) }
}
```

**Commit:** `feat(actions): block create/update/delete mutations on closed financial periods`

---

### Phase 4 - Page-Level Data Computation

**Files:** `income/page.tsx`, `expenses/page.tsx`, `ledger/page.tsx`

For each page, add `getMinAllowedDate` and `getClosedPeriodsFromDates` to the `Promise.all`:

```ts
import { getMinAllowedDate, getClosedPeriodsFromDates } from '@/lib/date-rules'

// In Promise.all:
const [result, divisions, clients, months, minDate] = await Promise.all([
  getAllIncome(filters, pageObj),
  getAllDivisions(),
  getAllClients(),
  getDistinctIncomeMonths(),
  getMinAllowedDate(),
])

// After Promise.all - getClosedPeriodsFromDates deduplicates internally
const closedPeriods = await getClosedPeriodsFromDates(result.data.map((r) => r.date))

// Pass to client component:
<IncomePageClient
  // ...existing props
  minDate={minDate}
  closedPeriods={closedPeriods}
/>
```

Add `minDate: string` and `closedPeriods: string[]` to the client component's props interface.

**Commit:** `feat(ui): compute minDate and closedPeriods server-side for table pages`

---

### Phase 5 - Component-Level UI Enforcement

#### 5a. Add/Edit Forms - date input `min` attribute

**Files:** `income-add-form.tsx`, `expense-add-form.tsx`, `ledger-add-form.tsx`
and their edit equivalents.

Add `minDate: string` to each form's props interface, then apply:

```tsx
<Input
  type="date"
  name="date"
  min={minDate}   // ← add this
  max={today}
  // ...
/>
```

---

#### 5b. Table Components - hide actions for locked rows

**Files:** `income-table.tsx`, `expense-table.tsx`, `ledger-table.tsx`

Add `closedPeriods: string[]` to the table's props interface. Pass it through to each row component.

Inside each row:
```ts
const period = entry.date.slice(0, 7)
const isLocked = closedPeriods.includes(period)
```

Replace edit and delete buttons:
```tsx
{isLocked ? (
  <Button variant="ghost" size="icon" disabled title="Period is closed">
    <Lock className="h-4 w-4 text-muted-foreground/30" />
  </Button>
) : (
  <Button variant="ghost" size="icon" onClick={startEdit}>
    <Pencil className="h-4 w-4" />
  </Button>
)}
```

Apply same pattern for the delete button. Use `Lock` from `lucide-react`.

**Commit:** `feat(ui): hide edit and delete actions for closed period records`

---

## 4. Phase Summary & Commit Strategy

| Phase | Files Changed | What Changes | Commit |
|-------|--------------|--------------|--------|
| P1 | `lib/date-rules.ts` (new) | Creates async date rules engine | `feat(core): add async date rules engine` |
| P2 | `dashboard/page.tsx` | Fixes Close Month period target | `fix(snapshots): close previous month not current` |
| P3 | `actions/income.ts`, `actions/expenses.ts`, `actions/ledger.ts` | Adds create/update/delete locks | `feat(actions): block mutations on closed periods` |
| P4 | `income/page.tsx`, `expenses/page.tsx`, `ledger/page.tsx` | Computes minDate + closedPeriods | `feat(ui): compute lock data server-side` |
| P5 | All form and table components | Applies min attr + hides locked actions | `feat(ui): restrict UI for closed periods` |

---

## 5. Testing Checklist

Work through each scenario before marking a phase complete:

### Phase 3 Tests (Server Actions)

| Test | Setup | Expected |
|------|-------|----------|
| Create income in current month | Any day | ✅ Succeeds |
| Create income in prev month, day 2, no snapshot | Day 2 of month, no snapshot | ✅ Succeeds |
| Create income in prev month, day 2, snapshot exists | Day 2, snapshot present | ❌ Blocked |
| Create income in prev month, day 7 | Day 7 | ❌ Blocked |
| Create income 2 months ago | Any day | ❌ Blocked |
| Create future income | Any day | ❌ Blocked |
| Delete current month record | Any day | ✅ Succeeds |
| Delete closed period record | Snapshot exists or day 6+ | ❌ Blocked |
| Edit closed period record | Snapshot exists or day 6+ | ❌ Blocked |
| Move record into closed period via update | Date changed to closed period | ❌ Blocked |

### Phase 2 Test (Dashboard)

| Test | Expected |
|------|----------|
| "Close Month" on June 3rd closes May | ✅ `periodToClose = "2026-05"` |
| "Close Month" creates snapshot for `"2026-05"` not `"2026-06"` | ✅ |
| Clicking "Close Month" twice shows error | ✅ Already handled |

---

## 6. Files NOT Changed

| File | Reason |
|------|--------|
| `actions/account-withdrawal.ts` | Delegates to `createLedgerEntry` - covered transitively |
| `actions/snapshots.ts` | No delete/update actions exist - no change needed |
| `queries.ts` | All needed helpers (`getIncomeById`, `getExpenseById`, `getLedgerById`) already exist |
| `packages/db/src/schema/*` | DB schema unchanged |

---

**End of Implementation Plan v2**
