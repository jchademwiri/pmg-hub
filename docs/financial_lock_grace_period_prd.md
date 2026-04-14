# Financial Lock & Grace Period — PRD + Technical Specification

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
- Snapshots can be altered or removed
- Reports are unreliable due to mutable historical data

---

## 1.3 Objectives

- Enforce **strict financial period boundaries**
- Prevent **retroactive data manipulation**
- Introduce **centralized validation logic**
- Ensure **snapshot integrity as source of truth**

---

## 1.4 Business Rules

### Date Rules

- Users may only create records in:
  - Current month
  - Previous month (only between 1st–5th)

- Users may NOT:
  - Create future-dated records
  - Backdate beyond the allowed window

---

### Period Closure

A period is considered **closed** if:

- Today is the **6th or later**, OR
- A **snapshot exists** for that period

---

### Immutable History

For closed periods:

- ❌ No create
- ❌ No update
- ❌ No delete

---

### Snapshot Rules

- Snapshots are **finalized records**
- Cannot be:
  - Modified
  - Deleted
- Represent **authoritative financial state**

---

## 1.5 User Stories

### Finance User

- As a user, I want to capture transactions for the current month
- As a user, I want a short grace period to finalize last month
- As a user, I should not accidentally modify finalized financial data

### Admin / System

- As a system, I must enforce financial integrity
- As a system, I must prevent invalid date entries
- As a system, I must lock data once a snapshot is created

---

## 1.6 Acceptance Criteria

| Scenario | Expected Outcome |
|----------|----------------|
| Create record in current month | Allowed |
| Create record in previous month (before 5th) | Allowed |
| Create record in previous month (after 5th) | Blocked |
| Create record in closed month | Blocked |
| Edit record in closed month | Blocked |
| Delete record in closed month | Blocked |
| Create future-dated record | Blocked |
| Create snapshot | Allowed once per period |
| Modify snapshot | Blocked |
| Delete snapshot | Blocked |

---

## 1.7 Success Metrics

- 0% mutation of closed-period records
- 100% compliance with date validation rules
- Elimination of reporting inconsistencies

---

# 2. Technical Specification

## 2.1 Architecture Overview

Core principle: **Centralized Date Rules Engine** used across all mutation points.

Layers:

- **Core Logic** → `date-rules.ts`
- **Server Enforcement** → Server Actions
- **UI Enforcement** → Disabled actions & date inputs
- **Data Integrity** → Snapshot locking

---

## 2.2 Date Rules Engine

**File:** `apps/admin/src/lib/date-rules.ts`

### Responsibilities

- Determine minimum allowed date
- Detect closed periods
- Enforce grace period logic

---

### API Design

```ts
export function getMinAllowedDate(): string
export async function isPeriodClosed(date: string): Promise<boolean>
```

---

### Logic Definition

#### getMinAllowedDate()

- If today ≤ 5th:
  - Allow previous month start date
- Else:
  - Allow current month start date only

---

#### isPeriodClosed(date)

1. Extract period (YYYY-MM)
2. Check:
   - Snapshot exists → CLOSED
   - OR today > 5th AND period < current month → CLOSED

---

## 2.3 Snapshot Module Hardening

**File:** `actions/snapshots.ts`

### Rules

- Only one snapshot per period
- No updates allowed
- No deletions allowed

### Example

```ts
if (snapshotExists(period)) {
  throw new Error("Snapshot already exists.");
}
```

---

### Dashboard Fix

- "Close Month" must:
  - Target **previous month**
  - Not current month

---

## 2.4 Server Action Enforcement

**Files:**

- `actions/income.ts`
- `actions/expenses.ts`
- `actions/account-withdrawal.ts`
- `actions/ledger.ts`

---

### Create / Update Pattern

```ts
if (await isPeriodClosed(data.date)) {
  throw new Error("This financial period is closed.");
}
```

---

### Delete Pattern (Critical)

```ts
const existing = await getById(id);

if (!existing) throw new Error("Record not found");

if (await isPeriodClosed(existing.date)) {
  throw new Error("Cannot delete from closed period");
}
```

---

## 2.5 UI Enforcement

### Table Components

**Files:**

- `income-table.tsx`
- `expense-table.tsx`
- `ledger-table.tsx`

---

### Props

```ts
closedPeriods: string[]
```

---

### Behavior

If record belongs to closed period:

- Hide Edit button
- Disable/Delete button

---

### Date Inputs

```tsx
<input type="date" min={minAllowedDate} />
```

---

## 2.6 Data Flow

1. User submits mutation
2. Server action receives payload
3. Date Rules Engine validates date
4. If valid → proceed
5. If invalid → throw error

---

## 2.7 Edge Cases

- Snapshot created early (e.g., 2nd of month)
  - Immediately locks period

- Timezone differences
  - Must use **server time only**

- Manual DB edits
  - Not handled (requires DB-level constraints if needed)

---

## 2.8 Security & Integrity

- Never trust client-side dates
- Always validate using DB-fetched records
- Server actions are **single source of enforcement**

---

## 2.9 Implementation Phases

| Phase | Description | Commit |
|------|------------|--------|
| P1 | Date Rules Engine | feat(core): add date rules engine |
| P2 | Snapshot Fixes | fix(snapshots): enforce immutability |
| P3 | Server Locks | feat(actions): block closed period mutations |
| P4 | UI Enforcement | feat(ui): restrict interactions |

---

## 2.10 Future Enhancements

- Database-level constraints (triggers)
- Audit logs for attempted violations
- Admin override system (controlled unlock)

---

# Final Notes

This implementation guarantees:

- Deterministic financial state
- Immutable historical records
- Strong alignment with accounting controls

---

**End of PRD + Technical Specification**

