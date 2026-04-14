# Financial Lock & Grace Period Implementation Plan

This document outlines the strategy for restricting financial record backdating, prohibiting modifications to closed periods, and aligning the **Month Close** functionality with Playhouse Media Group's business rules.

---

## 1. Detailed Analysis of Current Implementation

### Snapshot Module (`snapshots.ts` & Dashboard)

- **Manual Close Logic**  
  The "Close Month" button currently identifies the period to close as the **current month**. This is incorrect — it should target the **previous calendar month**.

- **Auto-Close Logic**  
  `autoClosePreviousMonthIfNeeded` correctly calculates the previous month and triggers when `day >= 5`.

- **Storage**  
  Snapshots are stored as period strings (e.g., `"2026-05"`).

- **Integrity Gap**  
  There are currently no application-level restrictions preventing a user from:
  - Deleting a snapshot
  - Modifying an existing snapshot

---

### Financial Transaction Modules (Income, Expenses, Withdrawals, Ledger)

- **Validation**  
  Currently only prevents **future-dated entries**.

- **Integrity Gaps**  
  - Users can **backdate entries indefinitely**.
  - Users can **edit or delete records in closed months**.
  - This results in **mutable financial history**, compromising reporting accuracy.

---

## 2. Proposed Business Rules & Constraints

### Date Entry & Backdating

- **Standard Rule**  
  Records can only be added for the **current calendar month**.

- **Grace Period (1st–5th)**  
  Users may:
  - Add records
  - Edit records
  for the **previous month only**.

- **The Lock (From the 6th or Snapshot Creation)**  
  A month becomes **closed** when:
  - The system date is the **6th or later**, OR
  - A **snapshot exists** for that month

- **Future Guard**  
  No records may be created with a **future date**.

---

### Immutable Financial History

- **No Retroactive Changes**  
  Once a month is closed:
  - ❌ No creation
  - ❌ No updates
  - ❌ No deletions
  for any records within that month

- **Snapshot Immutability**  
  - Snapshots are **final**
  - ❌ Cannot be edited
  - ❌ Cannot be deleted
  - Serve as the **source of truth**

---

## 3. Implementation Strategy

### Phase 1: Date Rules Engine

Create a centralized utility:

**File:** `lib/date-rules.ts`

Responsibilities:
- Determine `minAllowedDate`
- Check if a date falls in a **closed period**

This module must be used by **all server actions**.

---

### Phase 2: Snapshot Integrity & Alignment

- Fix Dashboard "Close Month" button:
  - Must target **previous month**, not current

- Enforce snapshot immutability:
  - Block deletion
  - Block updates

---

### Phase 3: Server Action Hardening (The Core Lock)

Apply strict validation across all mutation endpoints:

- `actions/income.ts`
- `actions/expenses.ts`
- `actions/account-withdrawal.ts`
- `actions/ledger.ts`

Rules:
- Block all operations on **closed periods**

---

### Phase 4: UI Enforcement

- Disable or hide:
  - Edit buttons
  - Delete buttons

- Restrict date inputs:
  - Set `min` attribute to `minAllowedDate`

---

## 4. Detailed Developer Guide (Execution Instructions)

### Step 1: Create Date Rules Utility

**File:** `apps/admin/src/lib/date-rules.ts`

Implement:

- `getMinAllowedDate()`
  - Returns a `YYYY-MM-DD` string

- `isPeriodClosed(date: string)`
  - Extracts `YYYY-MM`
  - Returns `true` if:
    - A snapshot exists for that period, OR
    - Date falls outside grace period

---

### Step 2: Harden Server Actions

**Files:**
- `actions/income.ts`
- `actions/expenses.ts`
- `actions/ledger.ts`
- `actions/snapshots.ts`

#### Create / Update

```ts
if (await isPeriodClosed(data.date)) {
  throw new Error("This financial period is closed.");
}
```

#### Delete (Critical Safety Pattern)

1. Fetch record from DB
2. Validate using stored date

```ts
const existing = await getRecordById(id);

if (await isPeriodClosed(existing.date)) {
  throw new Error("Cannot delete records from a closed period.");
}
```

---

### Step 3: Snapshot Protection

- Prevent:
  - Overwriting snapshots
  - Deleting snapshots

```ts
if (snapshotExists(period)) {
  throw new Error("Snapshot already exists and is immutable.");
}
```

---

### Step 4: UI Prop Drilling & Conditional Rendering

**Files:**
- `income-table.tsx`
- `expense-table.tsx`
- `ledger-table.tsx`

#### Pass Down:

```ts
closedPeriods: string[]
```

#### UI Logic:

- If `record.date` belongs to a closed period:
  - Hide Edit button
  - Hide/Delete button

---

## 5. Implementation Phases & Git Commit Strategy

| Phase | Description | Commit Message |
|------|-------------|----------------|
| P1 | Create date rules engine | `feat(core): add date rules engine for financial locking` |
| P2 | Fix snapshot logic & immutability | `fix(snapshots): align close period and prevent snapshot modification` |
| P3 | Enforce backend mutation locks | `feat(actions): block mutations on closed financial periods` |
| P4 | UI enforcement & restrictions | `feat(ui): hide edit/delete actions for closed month records` |

---

## 6. Safety Checks (Critical)

### Deletion Safety

- Always fetch record from database before deletion
- Never trust client-provided date

---

### Snapshot Priority Rule

- A snapshot **immediately locks a period**, regardless of date

> Even on the 2nd of the month, if a snapshot exists, the period is considered closed.

---

## Summary

This implementation ensures:

- Strict financial period control
- Immutable historical records
- Alignment between system behavior and accounting best practices
- Elimination of reporting inconsistencies caused by retroactive edits

---

**End of Document**

