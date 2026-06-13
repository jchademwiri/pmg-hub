# PMG Financial Model

> **Internal reference · Playhouse Media Group**
> `pmg-hub / docs / pmg-financial-model.md` · March 2026 · v2.0
>
> This document covers the financial model and allocation rules that power
> the PMG Control Center. For implementation detail, see `pmg-admin-development-phases.md`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Core Financial Model](#2-core-financial-model)
3. [Allocation Rules](#3-allocation-rules)
4. [Allocation Meaning](#4-allocation-meaning)
5. [Database Structure](#5-database-structure)
6. [Calculation Engine](#6-calculation-engine)
7. [System Rules](#7-system-rules)
8. [Division Performance](#8-division-performance)
9. [Common Mistakes to Avoid](#9-common-mistakes-to-avoid)

---

## 1. Overview

The PMG Financial Control System (FCS) is the central financial management module
for Playhouse Media Group. It tracks all income and expenses per division, automates
profit allocation, and provides clear visibility into business performance and
owner compensation.

**Objectives:**

- Track all income and expenses per division
- Ensure each division is self-sustaining
- Automate financial allocation - salary is calculated, never guessed
- Provide accurate monthly figures with historical snapshots
- Enable data-driven decisions on reinvestment and growth

---

## 2. Core Financial Model

The model runs in two levels:

### Level 1 - Revenue Split

Every rand of gross revenue is split before profit is calculated:

```
Gross Revenue
  └── PMG Contribution: 25%   (taken first, off the top)
  └── Operating Expenses: remainder − profit pool
  └── Profit Pool: what remains after expenses and PMG share
```

### Level 2 - Profit Pool Distribution

The profit pool is distributed across four allocations:

```
Profit Pool
  ├── Salary:    35%
  ├── Reinvest:  30%
  ├── Reserve:   30%
  └── Flex:       5%
```

### Formula

```
revenue     = SUM(income.amount)
expenses    = SUM(expenses.amount)

pmgShare    = revenue × 0.20
profitPool  = revenue − expenses − pmgShare

salary      = profitPool × 0.35
reinvest    = profitPool × 0.30
reserve     = profitPool × 0.30
flex        = profitPool × 0.05
```

---

## 3. Allocation Rules

| Allocation | Base | Rate | Notes |
|---|---|---|---|
| PMG Share | Gross revenue | 25% | Deducted before expenses |
| Salary | Profit pool | 35% | Owner take-home - system-calculated |
| Reinvest | Profit pool | 30% | Growth spending |
| Reserve | Profit pool | 30% | Emergency / stability buffer |
| Flex | Profit pool | 5% | Discretionary - reward system |

**The allocations always sum to 100% of the profit pool.**
PMG Share is separate - it is taken from gross revenue, not from the profit pool.

---

## 4. Allocation Meaning

| Allocation | Role | Purpose |
|---|---|---|
| **PMG Share (25%)** | Business backbone | Shared infrastructure, admin tools, scalability costs, and the overhead of operating under the PMG umbrella. Every division pays this regardless of profitability. |
| **Salary (35%)** | Personal stability | The owner's consistent take-home. Because it is calculated from actual profit, it rises when the business performs well and contracts when it does not - giving honest feedback on business health. |
| **Reinvest (30%)** | Growth engine | Advertising, new tools, hiring support, product development (e.g. TenderTrack 360). This is the business investing in its own future. |
| **Reserve (30%)** | Risk protection | Emergency fund and low-income buffer. This allocation is never spent on day-to-day operations. It exists to cover months where revenue dips, unexpected costs hit, or new initiatives require runway. |
| **Flex (5%)** | Reward system | Controlled discretionary spending - business entertainment, team meals, personal rewards for hitting milestones. Small enough to be sustainable, intentional enough to feel meaningful. |

---

## 5. Database Structure

The financial model maps directly to three database tables.

### `divisions`

Every income and expense entry must belong to a division.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL UNIQUE | e.g. "Tender Edge Solutions" |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `income`

All incoming revenue.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `date` | date NOT NULL | Actual payment received date |
| `division_id` | uuid FK → divisions | Required - no orphan income |
| `client_id` | uuid FK → clients | Optional |
| `description` | text | |
| `amount` | numeric(12,2) NOT NULL | Must be > 0 (CHECK constraint) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `expenses`

All outgoing costs.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `date` | date NOT NULL | Actual payment date |
| `division_id` | uuid FK → divisions | Required - no orphan expenses |
| `category` | text NOT NULL | Freeform: "Hosting", "Printing", "Transport"… |
| `description` | text | |
| `amount` | numeric(12,2) NOT NULL | Must be > 0 (CHECK constraint) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `clients`

Optional - links income to a named client for per-client reporting.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text NOT NULL | Contact person |
| `business_name` | text | Trading name |
| `email` | text UNIQUE (nullable) | |
| `phone` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## 6. Calculation Engine

The financial engine lives in `apps/admin/src/lib/financial.ts`.
It is a server-only module - no `'use client'`.

```ts
// Simplified representation of the calculation logic
export async function getFinancialSummary() {
  const [revenue, expenses] = await Promise.all([
    getTotalRevenue(),
    getTotalExpenses(),
  ])

  const pmgShare   = revenue * 0.20
  const profitPool = revenue - expenses - pmgShare

  return {
    revenue,
    expenses,
    pmgShare,
    profitPool,
    salary:   profitPool * 0.35,
    reinvest: profitPool * 0.30,
    reserve:  profitPool * 0.30,
    flex:     profitPool * 0.05,
  }
}
```

The underlying database queries (`getTotalRevenue`, `getTotalExpenses`,
`getRevenueByDivision`, `getLeadsByStatus`) live in `packages/db/src/queries.ts`
and are re-exported from `@pmg/db`.

All calculations are **runtime** - they are computed fresh on every dashboard load.
Historical values are locked by the snapshot system (Phase 7 in `pmg-admin-development-phases.md`).

---

## 7. System Rules

These rules are enforced by the system and must not be bypassed:

1. **Every income entry must have a division.** The `division_id` column is NOT NULL.
   The database will reject any insert without one.

2. **Every expense entry must have a division.** Same enforcement.

3. **Salary is calculated, not manually entered.** There is no salary input field.
   The system derives it from real profit figures.

4. **PMG always takes 25% of gross revenue.** This happens before expenses are
   deducted. It is not negotiable and does not vary by division.

5. **Expenses are real costs only.** Salary, reinvestment, and reserve are
   allocations from profit - they are not expenses. Do not enter salary withdrawals
   as expenses. Doing so double-counts them and collapses the profit pool.

6. **The `amount` field must be positive.** A CHECK constraint enforces this at the
   database level. Use separate income and expense tables for debits vs credits.

7. **The `updated_at` field is application-managed.** Any direct SQL edits that
   bypass the admin will leave `updated_at` stale. The financial figures remain
   correct - only the audit trail is affected.

---

## 8. Division Performance

Each division's profitability can be calculated independently:

```
divisionRevenue  = SUM(income.amount) WHERE division_id = ?
divisionExpenses = SUM(expenses.amount) WHERE division_id = ?
divisionProfit   = divisionRevenue − divisionExpenses
divisionMargin   = divisionProfit / divisionRevenue × 100
```

A division is self-sustaining when `divisionProfit > 0`.
The PMG Share (25%) is taken from **total** gross revenue, not per-division -
so individual division P&L figures do not deduct PMG Share.

---

## 9. Common Mistakes to Avoid

| Mistake | Consequence | Prevention |
|---|---|---|
| Entering salary withdrawals as expenses | Profit pool collapses, salary calculation is wrong | Salary is an allocation, not an expense - never enter it in the expenses table |
| Forgetting to assign a division | Insert rejected by DB (NOT NULL) | Division select is required on all income/expense forms |
| Using `DATABASE_URL_DIRECT` | Migration fails - env var renamed | Use `DATABASE_URL_UNPOOLED` |
| Editing past income without snapshots | All historical dashboard numbers shift | Always close the month before editing past entries (Phase 7) |
| Confusing PMG Share with expenses | PMG Share is 25% of revenue, deducted before profit | PMG Share is calculated, never entered manually |

---

*Last updated: March 2026 · Playhouse Media Group (PTY) Ltd*
*Jacob Chademwiri · 285 Erasmus Ave, Raslouw AH, Centurion, 0157*
