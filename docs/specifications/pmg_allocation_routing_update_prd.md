# Product Requirements Document (PRD)

## PMG Financial System: Allocation Routing Update
**Version:** 3.0 (Consolidated)
**Status:** Approved
**Product:** PMG Control Center
**Feature:** Corporate Ledger & Bucket-Based Capital Allocation
**Target Audience:** Admin / Agency Owner

---

## 1. Executive Summary

The PMG Financial Control System currently treats every outbound payment as an "Expense," which shrinks the Profit Pool regardless of whether the money comes from pre-profit operations or post-profit savings. This means spending saved Reinvest capital on an ad campaign accidentally reduces your Salary allocation - you end up personally subsidising business growth.

This update draws a hard line between two fundamentally different kinds of spending, replaces the `withdrawals` table with a structured `ledger` table, and expands the dashboard to show real-time balances across all four allocation buckets.

---

## 2. Problem Statement

### Current Financial Engine

```
Gross Revenue − PMG Share (25%) − Expenses = Profit Pool
```

The Profit Pool is then split:

| Bucket   | Rate |
|----------|------|
| Salary   | 35%  |
| Reinvest | 30%  |
| Reserve  | 30%  |
| Flex     |  5%  |

### Core Flaw

Every payment - whether it is a server bill required to deliver a client's job, or a Facebook ad campaign paid for out of saved Reinvest capital - is currently logged as an Expense. This shrinks the Profit Pool, which in turn shrinks every allocation including Salary.

**The result:** The owner unintentionally funds business growth from personal income.

### Secondary Flaw (identified during codebase review)

The existing `/accounts` page and `recordAccountWithdrawal` server action both call `insertWithdrawal()` directly. This action is not governed by Profit Pool logic at all - it only checks the YTD earned vs withdrawn balance per account. After this update, all post-profit spending must go through the Ledger system. The `insertWithdrawal` path must be retired and replaced.

---

## 3. Goals & Objectives

### Primary Goals

- Separate operational costs (Pre-Profit) from strategic spending (Post-Profit)
- Protect Salary allocation from growth-related or bucket-based spending
- Enable independent capital management across all four buckets
- Replace the Withdrawals model with a structured, auditable Corporate Ledger
- Retire `insertWithdrawal()` and unify all post-profit spending through the Ledger

### Success Metrics

- 100% of post-profit spending logged via Ledger entries
- Zero impact of Ledger entries on the Profit Pool calculation
- All four bucket balances visible in real-time on the dashboard
- Salary dashboard card queries only `allocationType = 'salary'` entries

---

## 4. Financial Model (Source of Truth)

### Definitions

| Term | Formula |
|---|---|
| Net Revenue | Gross Revenue − PMG Share (25%) |
| Profit Pool | Net Revenue − Expenses |
| Expected Bucket Allocation | Cumulative All-Time Profit Pool × Bucket % |
| Available Bucket Balance | Expected Allocation − Sum of Ledger entries for that bucket |

### Allocation Percentages

Must always sum to **100%**.

| Bucket   | Rate |
|----------|------|
| Salary   | 35%  |
| Reinvest | 30%  |
| Reserve  | 30%  |
| Flex     |  5%  |

### Important Note on "All-Time Profit Pool"

The balance formula uses the cumulative all-time Profit Pool (i.e. summed directly from the `income` and `expenses` tables, not from snapshots). Snapshots are point-in-time records for reporting only. Do not use snapshot data for balance calculations, as this would cause double-counting.

---

## 5. Core Concept: Spending Classification

### Decision Rule

| Situation | Action | Where it goes |
|---|---|---|
| Cost required to **deliver an existing obligation** | "Add Expense" | `expenses` table - reduces Profit Pool |
| Cost funded by **saved profits** (growth, salary draw, investment) | "Add Ledger Entry" | `ledger` table - deducts from selected bucket only |

### Examples

**Pre-Profit Expenses:**
- AWS client domain hosting
- TES stationery and printing
- Server/infrastructure costs

**Post-Profit Ledger Entries:**
- PMG Facebook/Google Ads campaigns (paid from Reinvest)
- Personal salary withdrawals (paid from Salary)
- New business equipment (paid from Reinvest or Reserve)
- Emergency business fund transfers (bucket-to-bucket via Reserve)

---

## 6. Scope of Work

### 6.1 Data Model

**Drop** the existing `withdrawals` table. **Create** the new `ledger` table.

#### File: `packages/db/src/schema/ledger.ts` (renamed from `withdrawals.ts`)

```typescript
import { pgEnum, pgTable, uuid, date, numeric, text, timestamp, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const allocationEnum = pgEnum('allocation_type', [
  'salary',
  'reinvest',
  'reserve',
  'flex',
]);

export const entryTypeEnum = pgEnum('entry_type', [
  'spend',
  'transfer',
  'adjustment',
]);

export const ledger = pgTable(
  'ledger',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    date: date('date').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    allocationType: allocationEnum('allocation_type').notNull().default('salary'),
    entryType: entryTypeEnum('entry_type').notNull().default('spend'),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    createdBy: text('created_by'),
  },
  (t) => [
    check('ledger_amount_positive', sql`${t.amount} > 0`),
    index('ledger_date_idx').on(t.date),
    index('ledger_allocation_type_idx').on(t.allocationType),
  ],
);

export type LedgerEntry = typeof ledger.$inferSelect;
export type NewLedgerEntry = typeof ledger.$inferInsert;
```

**Strict enum values:** `'salary' | 'reinvest' | 'reserve' | 'flex'` and `'spend' | 'transfer' | 'adjustment'`. These must match exactly across DB schema, Zod validators, and React form schemas.

#### `packages/db/src/schema/index.ts`

Remove `export * from './withdrawals'`. Add `export * from './ledger'`.

---

### 6.2 Backend: Server Actions

#### File: `apps/admin/src/app/actions/ledger.ts` (renamed from `withdrawals.ts`)

```typescript
const ledgerSchema = z.object({
  date: z.string().min(1),
  amount: z.coerce.number().positive(),
  allocationType: z.enum(['salary', 'reinvest', 'reserve', 'flex']).default('salary'),
  entryType: z.enum(['spend', 'transfer', 'adjustment']).default('spend'),
  description: z.string().optional(),
});
```

- `createLedgerEntry` - validates, checks available bucket balance, inserts into `ledger`
- `updateLedgerEntry` - validates, rechecks balance excluding current row, updates
- `deleteLedgerEntry` - deletes by id
- All three must call `revalidatePath('/ledger')`, `revalidatePath('/accounts')`, `revalidatePath('/dashboard')`

#### File: `apps/admin/src/app/actions/account-withdrawal.ts`

This file currently calls `insertWithdrawal()`. **It must be updated** to call `createLedgerEntry` with `allocationType` set to the account key, and `entryType: 'spend'`. The balance guard logic (earned vs spent per account) remains the same but now queries the `ledger` table filtered by `allocationType`.

---

### 6.3 Backend: Financial Logic

#### File: `apps/admin/src/lib/financial.ts`

**Remove** or deprecate: `getWithdrawals()`, `getWithdrawalsPrevMonth()`, `getWithdrawalsYTD()`, `WithdrawalSummary` type.

**Add** `getLedgerBalances()` - calculates available balance for all four buckets:

```typescript
export type BucketBalances = {
  salary: { expected: number; spent: number; available: number };
  reinvest: { expected: number; spent: number; available: number };
  reserve: { expected: number; spent: number; available: number };
  flex: { expected: number; spent: number; available: number };
};

export async function getLedgerBalances(): Promise<BucketBalances> {
  // 1. Get all-time Profit Pool from income + expenses tables directly (not snapshots)
  // 2. For each bucket: expected = profitPool × rate
  // 3. For each bucket: spent = SUM(ledger.amount) WHERE allocationType = bucket
  // 4. available = expected - spent (can be negative if overspent)
}
```

**Add** `getLedgerEntriesForPeriod(start, end, allocationType?)` - for dashboard period cards and the ledger page.

**Update** `SalaryCard` data source - the salary card must now receive `BucketBalances.salary` instead of `WithdrawalSummary`. The carryOver concept remains valid and should be calculated as `available` from prior periods.

---

### 6.4 Backend: Database Queries

#### File: `packages/db/src/queries.ts`

**Remove:** All `withdrawal`-related query functions (`getAllWithdrawals`, `getWithdrawalById`, `getWithdrawalsByAccount`, `getWithdrawalsByAccountYTD`, `getWithdrawalsByAccountYTDSpecific`, `getWithdrawalsCurrentMonth`, `getWithdrawalsPreviousMonth`, `getWithdrawalsYTDFull`, `getTotalWithdrawalsYTD`, `insertWithdrawal`).

**Add:**
- `getAllLedgerEntries(filters?, pageObj?)` - paginated, filterable by `allocationType` and `entryType`
- `getLedgerById(id)`
- `insertLedgerEntry(data)`
- `getLedgerTotalByAllocation(allocationType)` - sum of all entries for a given bucket
- `getLedgerEntriesCurrentMonth(allocationType?)` - for dashboard period cards
- `getLedgerEntriesPreviousMonth(allocationType?)`
- `getLedgerEntriesYTD(allocationType?)`
- `getLedgerByAccountYTD()` - returns `Record<AllocationKey, number>` for balance checks

#### `packages/db/src/index.ts`

Remove all `withdrawals`-related exports. Export all new `ledger` query functions and the `LedgerEntry` type.

---

### 6.5 User Interface

#### Ledger Form: `apps/admin/src/components/ledger/ledger-add-form.tsx`

(Rename folder from `withdrawals/` to `ledger/`)

- Shadcn `<Select>` dropdown for `allocationType` (Salary, Reinvest, Reserve, Flex)
- Shadcn `<Select>` dropdown for `entryType` (Spend, Transfer, Adjustment)
- Display real-time available balance for the currently selected bucket (fetch on mount and on bucket change)
- Validate: amount must not exceed available bucket balance
- Validate on submit via Zod schema

#### Ledger Page: `apps/admin/src/app/(admin)/ledger/page.tsx`

(Replace `apps/admin/src/app/(admin)/withdrawals/page.tsx`)

- Unified transaction table showing all ledger entries
- Columns: Date | Bucket | Entry Type | Amount | Description | Actions
- Filter by `allocationType` (show all, or filter to one bucket)
- Filter by `entryType` (future enhancement - wire up now, activate later)
- Page total shows all-time ledger spend

#### Dashboard: `apps/admin/src/components/dashboard/`

**`salary-card.tsx`** - update to receive `BucketBalances.salary` data. Salary metrics must **only** query `allocationType = 'salary'`. No unfiltered ledger queries may feed this card.

**New `bucket-balances-card.tsx`** (or expand existing KPI grid) - display available balances for all four buckets: Salary, Reinvest, Reserve, Flex. This replaces the single salary carry-over display and gives the owner a full capital overview at a glance.

#### Accounts Page: `apps/admin/src/app/(admin)/accounts/`

The "Record Withdrawal" button on each `AccountCard` currently opens an inline form that calls `recordAccountWithdrawal`. After this update:
- The form must open the Ledger Form with the corresponding `allocationType` pre-selected
- The action must route through `createLedgerEntry` (not `insertWithdrawal`)
- Balance checks must query the `ledger` table

---

### 6.6 Navigation & Labels

#### `apps/admin/src/components/layout/app-sidebar.tsx`

```typescript
// Before:
{ href: '/withdrawals', label: 'Withdrawals', icon: Wallet },

// After:
{ href: '/ledger', label: 'Ledger', icon: Wallet },
```

#### `apps/admin/src/components/layout/top-nav.tsx`

```typescript
// ROUTE_LABELS: remove '/withdrawals' entry, add:
'/ledger': 'Corporate Ledger',
```

---

## 7. Functional Requirements

### 7.1 Expense System (Pre-Profit) - Unchanged

- Logged via "Add Expense"
- Stored in `expenses` table
- Reduces Net Revenue before Profit Pool calculation
- Has no interaction with the Ledger or bucket balances

### 7.2 Ledger System (Post-Profit)

- Logged via "Add Ledger Entry" or via the Accounts page withdrawal buttons
- Stored in `ledger` table
- Deducts only from the selected allocation bucket
- Does NOT affect Profit Pool
- Maintains a permanent auditable transaction history
- All entries include timestamp and optional description
- `createdBy` field populated from session user id

---

## 8. Bucket Logic

### Balance Calculation

```
Expected Allocation  = All-Time Profit Pool × Bucket %
Used Amount          = SUM(ledger.amount) WHERE allocationType = bucket
Available Balance    = Expected Allocation − Used Amount
```

The "All-Time Profit Pool" is computed live from `income` and `expenses` tables, not from snapshots.

### Bucket Jumping

If a bucket has insufficient funds:
- User manually selects an alternative bucket in the form dropdown
- System allows this and logs the entry against the selected bucket
- No automatic inter-bucket transfers in this version (see Future Enhancements)
- UI should surface current balances for all buckets to inform the decision

---

## 9. Constraints & Validation Rules

| Rule | Enforcement |
|---|---|
| Ledger amount must be > 0 | DB check constraint + Zod |
| Ledger amount must not exceed available bucket balance | Server action guard |
| `allocationType` must match enum exactly | DB enum + Zod |
| `entryType` must match enum exactly | DB enum + Zod |
| Expenses must be positive | Existing - unchanged |
| Allocation percentages must equal 100% | Compile-time constant - unchanged |
| Date cannot be in the future | Server action guard |

---

## 10. Edge Case Handling

### Negative Profit Pool

If Expenses exceed Net Revenue:
- Profit Pool = 0
- Expected allocations for all buckets = 0
- No Ledger entries should be permitted
- UI should surface a warning (existing `salary-card.tsx` warning pattern applies to all buckets)

### Empty or Overspent Buckets

- If `available < requestedAmount`: server action returns `{ error: '...' }`
- UI displays current available balance so the user can decide to switch buckets
- "Bucket Jumping" (manual selection of alternative bucket) is permitted and logged clearly

### Orphaned Imports After Rename

Every file that currently imports from `packages/db/src/schema/withdrawals.ts` or `apps/admin/src/app/actions/withdrawals.ts` must be updated. A build will fail with orphaned imports - treat this as a hard gate before deployment.

---

## 11. User Stories & Acceptance Criteria

### Story 1: Log an Operational Expense
As an agency owner, I want to log costs required to deliver client work so that profit is calculated correctly.

**AC:**
- Expense reduces Net Revenue before Profit Pool split
- Bucket balances are unaffected
- Expense appears on the Expenses page

### Story 2: Record a Salary Withdrawal
As an agency owner, I want to draw my salary from the Salary bucket without affecting other buckets.

**AC:**
- User selects "Salary" as `allocationType` (or uses the Accounts page button which pre-selects it)
- Salary bucket balance decreases by the withdrawal amount
- Profit Pool is unchanged
- Reinvest, Reserve, and Flex balances are unchanged

### Story 3: Spend from Reinvest on Advertising
As an agency owner, I want to run a Facebook ad campaign paid from saved Reinvest capital without reducing my Salary.

**AC:**
- User selects "Reinvest" as `allocationType`, "Spend" as `entryType`
- Reinvest balance decreases correctly
- Salary balance is unchanged
- Profit Pool is unchanged

### Story 4: Emergency Bucket Jump (Reserve to cover Reinvest shortfall)
As an agency owner, when my Reinvest bucket runs low, I want to draw from Reserve instead.

**AC:**
- User selects "Reserve" in the dropdown (overriding the default)
- Reserve balance decreases
- Reinvest balance is unchanged
- Entry is logged with correct `allocationType = 'reserve'`

### Story 5: View All Bucket Balances
As an agency owner, I want a real-time view of all four bucket balances on the dashboard.

**AC:**
- Dashboard shows Salary, Reinvest, Reserve, Flex available balances
- Values update after any new income, expense, or ledger entry
- Negative balances shown in red

### Story 6: View Ledger History
As an agency owner, I want a full audit trail of all post-profit spending.

**AC:**
- `/ledger` page shows all entries with date, bucket, entry type, amount, description
- Entries can be filtered by bucket
- Page total shows all-time ledger spend

---

## 12. Data Integrity & Auditability

- All ledger entries include `createdAt` timestamp (DB default)
- `createdBy` field populated from session user id on insert
- Description field is optional but encouraged via UI placeholder text
- Entries are never deleted in production - soft-delete or adjustment entries only (future enhancement)
- The `entryType` field distinguishes spending (`spend`), cross-bucket transfers (`transfer`), and manual corrections (`adjustment`)

---

## 13. Migration Strategy

Since there is no historical data to preserve:

1. Drop `withdrawals` table
2. Create `ledger` table with both enums
3. Run `bunx drizzle-kit generate` from `packages/db`
4. Run `bunx drizzle-kit migrate` from `packages/db`
5. Update all imports referencing the old schema/actions
6. Verify build passes with zero orphaned imports before proceeding

**Authorisation:** The owner has confirmed no historical withdrawal data needs to be preserved. A fresh ledger table is safe.

---

## 14. Non-Functional Requirements

- Strong type safety: DB enum → Zod schema → React form schema must be identical
- Consistent financial calculations: all balance logic centralised in `getLedgerBalances()` in `financial.ts`
- No unfiltered ledger queries may feed Salary-labelled UI metrics
- Dashboard load time unaffected (balances computed in parallel with existing queries)
- Scalable for multi-tenant architecture (future: add `organisationId` FK to ledger)

---

## 15. Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Misclassification (expense logged as ledger or vice versa) | Clear decision rule surfaced in both form UIs with examples |
| Incorrect balance calculations | Centralise all logic in `getLedgerBalances()` - no inline calculations in components |
| Data pollution in Salary dashboard card | Strict `WHERE allocationType = 'salary'` filter on every query feeding that card |
| Orphaned imports breaking the build | Search codebase for all references to `withdrawals` before final deployment |
| `account-withdrawal.ts` bypassing the new system | Explicitly redirect this action through `createLedgerEntry` in Phase 2 |

---

## 16. Implementation Phases

### Phase 1: Database Schema
- Create `packages/db/src/schema/ledger.ts` with both enums and the new table
- Update `packages/db/src/schema/index.ts`
- Run Drizzle migrations
- **Gate:** Confirm migration succeeds and DB reflects new schema before Phase 2

### Phase 2: Server Actions & Backend Logic
- Create `apps/admin/src/app/actions/ledger.ts`
- Update `apps/admin/src/app/actions/account-withdrawal.ts` to use the Ledger
- Add `getLedgerBalances()` and all new query functions to `financial.ts` and `queries.ts`
- Remove all `withdrawals`-related exports
- **Gate:** All TypeScript compiles with no errors. No orphaned imports.

### Phase 3: UI - Forms & Ledger Page
- Create `apps/admin/src/components/ledger/` folder with add and edit forms
- Create `apps/admin/src/app/(admin)/ledger/page.tsx`
- Add bucket dropdown and real-time balance display to forms

### Phase 4: Navigation, Dashboard & Accounts
- Update sidebar href and label
- Update `top-nav.tsx` route labels
- Update `salary-card.tsx` to consume `BucketBalances.salary`
- Add bucket balances overview to dashboard
- Update `account-card.tsx` to route through Ledger

---

## 17. Out of Scope (This Version)

- Automated inter-bucket transfers
- Multi-currency support
- Legacy withdrawal data preservation
- Ledger entry approval workflows
- Reporting exports filtered by ledger bucket
- Negative balance carry-forward logic

---

## 18. Future Enhancements

- Automated bucket transfer rules (e.g. auto-move Flex surplus to Reserve monthly)
- Loss carry-forward system for negative Profit Pool periods
- Financial reporting exports per bucket
- Multi-user approval flows for large ledger entries
- Soft-delete for ledger entries with audit log

---

## 19. AI Implementation Instructions

If you are reading this document to implement the Allocation Routing Update, adhere to the following rules to ensure codebase stability:

**One Phase at a Time:** Complete Phase 1, ask the user to run Drizzle migrations, and wait for confirmation before proceeding to Phase 2.

**Handle the Rename Rigorously:** Search for every reference to `withdrawals` across the entire monorepo - schema, queries, actions, components, pages, sidebar, top-nav, and `index.ts` exports. Leaving a single orphaned import will break the build.

**Type Safety is Non-Negotiable:** The `allocationEnum` values in Drizzle (`'salary' | 'reinvest' | 'reserve' | 'flex'`) must match the Zod schemas in server actions and the React hook form schemas exactly.

**Data Purge is Authorised:** The owner has confirmed no historical withdrawal data needs preserving. Drop the `withdrawals` table and generate a fresh `ledger` table via Drizzle.

**Salary Filter is Mandatory:** Every query, function, or component that displays a metric labelled "Salary" must filter `WHERE allocationType = 'salary'`. Unfiltered queries will pollute salary metrics with corporate spending.

**account-withdrawal.ts Must Be Redirected:** This is the highest-risk file. It currently bypasses everything and writes directly to `withdrawals`. In Phase 2, before touching any UI, update this file to route through `createLedgerEntry`.

---

## 20. User Rule (Summary)

> **Survival (delivering client work) → Log an Expense.**
> **Growth (investing saved profits) → Log a Ledger Entry.**