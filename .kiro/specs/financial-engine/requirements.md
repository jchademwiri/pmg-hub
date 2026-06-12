# Requirements Document

## Introduction

### Module Purpose

The Financial Engine is the core calculation layer for the PMG Control Center - the internal
admin system for Playhouse Media Group (PTY) Ltd. It is implemented as a single server-side
module at `apps/admin/src/lib/financial.ts` and is responsible for applying the PMG financial
model to live database data, producing all monetary figures consumed by the admin UI.

The module has no UI concerns. It is a pure computation and data-access layer: it reads from
the database, applies deterministic arithmetic, and returns typed results.

### Downstream Consumers

The Financial Engine feeds the following downstream surfaces:

- **Dashboard** (`app/(admin)/dashboard/page.tsx`) - primary consumer; renders KPI cards,
  salary highlight, allocation breakdown, division revenue bars, and lead status counts.
- **Reports** (Phase 8) - will use `FinancialSummary` to generate period-over-period comparisons.
- **Snapshots** (Phase 7) - will persist `FinancialSummary` values to the database for
  historical tracking.

### Data Flow

```
Neon PostgreSQL (packages/db schema)
        │
        ▼
@pmg/db query helpers
  getTotalRevenue()        → SUM(income.amount)
  getTotalExpenses()       → SUM(expenses.amount)
  getRevenueByDivision()   → per-division totals
  getLeadsByStatus()       → per-status counts
        │
        ▼
apps/admin/src/lib/financial.ts   [Financial_Engine]
  getFinancialSummary()    → FinancialSummary
  getDivisionRevenue()     → DivisionRevenue[]
  getLeadCounts()          → LeadStatusCount[]
  formatZAR()              → string
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
Next.js Server Components          Next.js Server Actions
(dashboard/page.tsx - reads)       (actions/income.ts - mutates,
        │                           then calls revalidatePath()
        ▼                           which triggers re-read)
Presentational components
(components/dashboard/*)
```

The Financial Engine is read-only. Server Actions do not call it directly during mutations - they mutate the database and call `revalidatePath()`, which causes the Server Component to re-fetch through the Financial Engine on the next render.

No REST API layer exists between the database and the UI. All data access happens
server-side via Drizzle ORM. The Financial Engine must never be imported from a
Client Component.

### Prerequisite: @pmg/db Public API

Before `financial.ts` can be implemented, the DB_Package must export its query helpers
as part of its public API. `packages/db/src/index.ts` must include:

```ts
export * from './queries'
```

Without this, `import { getTotalRevenue } from '@pmg/db'` will throw a runtime error.
The four required exports are: `getTotalRevenue`, `getTotalExpenses`,
`getRevenueByDivision`, and `getLeadsByStatus`.

---

## Glossary

| Term | Definition |
|---|---|
| **Financial_Engine** | The module at `apps/admin/src/lib/financial.ts` responsible for all financial calculations and data-access wrappers. |
| **DB_Package** | The `@pmg/db` workspace package (`packages/db`) that exposes Drizzle ORM query helpers against the Neon PostgreSQL database. |
| **FinancialSummary** | A TypeScript type with eight numeric fields: `revenue`, `expenses`, `pmgShare`, `profitPool`, `salary`, `reinvest`, `reserve`, `flex`. |
| **DivisionRevenue** | A TypeScript type with fields `divisionName: string` and `total: number`, representing income attributed to a single business division. |
| **LeadStatusCount** | A TypeScript type with fields `status: string` and `count: number`, representing the number of leads in a given pipeline status. |
| **Profit_Pool** | The distributable profit after deducting both expenses and PMG Share from gross revenue: `revenue − expenses − pmgShare`. |
| **PMG_Share** | 25% of gross revenue retained for shared infrastructure and admin overhead. Calculated from revenue only, before expenses. |
| **Formatter** | The `formatZAR(amount: number): string` function that converts a numeric amount to a South African Rand currency string. |

---

## Requirements

### Requirement 1: Financial Summary Calculation

**User Story:** As an admin, I want the system to calculate the full PMG financial breakdown
from live data, so that every dashboard number reflects the current state of the business.

#### Acceptance Criteria

1. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL fetch total revenue and total expenses concurrently from the DB_Package using `Promise.all([getTotalRevenue(), getTotalExpenses()])`.
2. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `pmgShare` as `revenue × 0.20`.
3. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `profitPool` as `revenue − expenses − pmgShare`.
4. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `salary` as `profitPool × 0.35`.
5. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `reinvest` as `profitPool × 0.30`.
6. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `reserve` as `profitPool × 0.30`.
7. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `flex` as `profitPool × 0.05`.
8. THE Financial_Engine SHALL return a `FinancialSummary` object containing all eight fields: `revenue`, `expenses`, `pmgShare`, `profitPool`, `salary`, `reinvest`, `reserve`, and `flex`.
9. THE Financial_Engine SHALL call `getTotalRevenue()` and `getTotalExpenses()` exactly once per invocation of `getFinancialSummary()`.

---

### Requirement 2: Allocation Integrity

**User Story:** As an admin, I want the profit pool allocations to always sum correctly and
behave predictably in edge cases, so that the financial model is trustworthy under all
real-world conditions.

#### Acceptance Criteria

1. FOR ALL valid numeric inputs, THE Financial_Engine SHALL produce allocations where `salary + reinvest + reserve + flex` equals `profitPool` within a floating-point tolerance of `0.01`.
2. THE Financial_Engine SHALL calculate `pmgShare` exclusively from `revenue`, never from `profitPool` or `expenses`.
3. WHEN `revenue` equals `0` and `expenses` equals `0`, THE Financial_Engine SHALL return `0` for all eight fields of `FinancialSummary` without producing a runtime error.
4. WHEN `profitPool` is negative (i.e. expenses exceed `revenue − pmgShare`), THE Financial_Engine SHALL return the mathematically correct negative values for `salary`, `reinvest`, `reserve`, and `flex` without clamping values to zero or throwing an exception.

---

### Requirement 3: Division Revenue Wrapper

**User Story:** As an admin, I want per-division revenue data available through the financial
module, so that dashboard components have a single, consistent import source for all
financial data.

#### Acceptance Criteria

1. WHEN `getDivisionRevenue()` is called, THE Financial_Engine SHALL delegate to `getRevenueByDivision()` from the DB_Package and return its result without modification.
2. THE Financial_Engine SHALL export `getDivisionRevenue()` with the return type `Promise<DivisionRevenue[]>`.

---

### Requirement 4: Lead Status Count Wrapper

**User Story:** As an admin, I want lead status counts available through the financial module,
so that dashboard components have a single, consistent import source for all operational data.

#### Acceptance Criteria

1. WHEN `getLeadCounts()` is called, THE Financial_Engine SHALL delegate to `getLeadsByStatus()` from the DB_Package and return its result without modification.
2. THE Financial_Engine SHALL export `getLeadCounts()` with the return type `Promise<LeadStatusCount[]>`.

---

### Requirement 5: ZAR Currency Formatter

**User Story:** As an admin, I want all monetary values displayed in South African Rand format,
so that amounts are immediately readable in the correct locale and currency.

#### Acceptance Criteria

1. WHEN `formatZAR(amount)` is called with a numeric value, THE Formatter SHALL return a string produced by `Intl.NumberFormat` configured with locale `en-ZA` and currency `ZAR`.
2. THE Formatter SHALL always include exactly two decimal places in the output (`minimumFractionDigits: 2`, `maximumFractionDigits: 2`).
3. WHEN `formatZAR(amount)` is called with any finite number, THE Formatter SHALL return a non-empty string containing the `R` currency symbol.
4. FOR ALL identical finite numeric inputs, THE Formatter SHALL produce identical string outputs - the same input always yields the same string.

---

### Requirement 6: Server-Only Module Constraint

**User Story:** As a developer, I want the financial engine to be server-only, so that
database credentials and query logic are never exposed to the browser bundle.

#### Acceptance Criteria

1. THE Financial_Engine SHALL NOT contain a `'use client'` directive at any point in the file.
2. THE Financial_Engine SHALL be importable only from Next.js Server Components and Server Actions, not from Client Components.

   > Note: Server Actions (`'use server'` files under `actions/`) are valid importers of `financial.ts` only if they need to read financial data directly - for example, a snapshot action that reads `getFinancialSummary()` before persisting it (Phase 7). Mutation actions (`createIncome`, `deleteExpense`, etc.) do not import `financial.ts` directly - they mutate the database and call `revalidatePath('/admin/dashboard')`, which causes the Server Component to re-fetch through the Financial Engine on the next render.
3. THE Financial_Engine SHALL export the TypeScript types `FinancialSummary`, `DivisionRevenue`, and `LeadStatusCount` so that consuming Server Components can type their props without re-declaring these shapes.
4. THE Financial_Engine SHALL import the `server-only` package as its first import, causing the Next.js bundler to throw a build error if the module is ever imported from a Client Component.

---

### Requirement 7: Determinism and Consistency

**User Story:** As a developer, I want the financial calculations to be deterministic, so that
the same database state always produces the same output and the engine is reliably unit-testable
without a live database connection.

#### Acceptance Criteria

1. FOR ALL identical pairs of `revenue` and `expenses` inputs, THE Financial_Engine SHALL produce identical `FinancialSummary` outputs.
2. THE Financial_Engine SHALL perform all intermediate calculations using standard IEEE 754 floating-point arithmetic with no randomness, no `Date.now()` calls, and no external mutable state.

---

## Non-Requirements

The following items are explicitly outside the scope of Phase 1. They must not be implemented
in `financial.ts` and must not be assumed by any Phase 1 test.

| # | Excluded Item |
|---|---|
| 1 | Persisting `FinancialSummary` to the database (belongs to Phase 7 - Snapshots) |
| 2 | Date range filtering or period-scoped queries (all figures are all-time totals in Phase 1) |
| 3 | Per-division expense breakdown (only revenue is broken down by division in Phase 1) |
| 4 | Currency conversion or multi-currency support (ZAR only) |
| 5 | Rounding to the nearest cent before returning values (raw IEEE 754 results are returned) |
| 6 | Authentication or authorisation checks inside `financial.ts` (handled by `src/proxy.ts`) |
| 7 | Caching or memoisation of query results (Next.js fetch caching is out of scope for this module) |
| 8 | Input validation or sanitisation of amounts (enforced by database `CHECK` constraints and Zod in Server Actions) |
| 9 | Tax calculations, VAT, or SARS compliance logic |
| 10 | Budget targets, forecasting, or variance analysis |
| 11 | Per-division expense breakdown via `getExpensesByDivision()` - available in `@pmg/db` but not wrapped by the Financial Engine in Phase 1 (consumed directly in Phase 6) |
| 12 | Triggering `revalidatePath` or any Next.js cache invalidation - that responsibility belongs to Server Actions in `apps/admin/actions/`, not to the Financial Engine |

---

## Test Scenarios

All test scenarios are designed to run in Vitest at
`apps/admin/src/__tests__/financial.test.ts` with the DB_Package query helpers
mocked - no real database connection is required.

| Scenario | Inputs | Expected Outputs |
|---|---|---|
| **Standard case** | `revenue = 100 000`, `expenses = 40 000` | `pmgShare = 20 000`, `profitPool = 40 000`, `salary = 14 000`, `reinvest = 12 000`, `reserve = 12 000`, `flex = 2 000` |
| **Zero case** | `revenue = 0`, `expenses = 0` | All eight fields equal `0`; no error thrown |
| **Loss case** | `revenue = 10 000`, `expenses = 15 000` | `pmgShare = 2 000`, `profitPool = −7 000`, `salary = −2 450` (exact), `reinvest = −2 100` (exact), `reserve = −2 100` (exact), `flex = −350` (exact) |
| **Determinism case** | Same `revenue` and `expenses` called twice | Both calls return structurally identical `FinancialSummary` objects |
| **formatZAR - positive** | `amount = 1234.5` | Returns a non-empty string containing the `R` symbol and two decimal places. Exact separators (space, comma, period) are locale-implementation dependent and are not asserted. |
| **formatZAR - zero** | `amount = 0` | Returns a non-empty string containing the `R` symbol and two decimal places. Exact separator is locale-dependent and not asserted. |
| **formatZAR - negative** | `amount = −500` | Returns a non-empty string containing the `R` symbol and two decimal places. Sign rendering and exact separator are locale-dependent and not asserted. |
| **Allocation sum** | Any `revenue`, any `expenses` | `salary + reinvest + reserve + flex` equals `profitPool` within tolerance `0.01` |

### Standard Case - Full Worked Example

```
revenue   = 100 000.00
expenses  =  40 000.00

pmgShare  = 100 000 × 0.20          =  20 000.00
profitPool= 100 000 − 40 000 − 20 000 =  40 000.00

salary    =  40 000 × 0.35          =  14 000.00
reinvest  =  40 000 × 0.30          =  12 000.00
reserve   =  40 000 × 0.30          =  12 000.00
flex      =  40 000 × 0.05          =   2 000.00

sum check: 14 000 + 12 000 + 12 000 + 2 000 = 40 000 ✓
```

### Loss Case - Full Worked Example

```
revenue   =  10 000.00
expenses  =  15 000.00

pmgShare  =  10 000 × 0.20          =   2 000.00
profitPool=  10 000 − 15 000 − 2 000 =  −7 000.00

salary    =  −7 000 × 0.35          =  −2 450.00
reinvest  =  −7 000 × 0.30          =  −2 100.00
reserve   =  −7 000 × 0.30          =  −2 100.00
flex      =  −7 000 × 0.05          =    −350.00

sum check: −2 450 + −2 100 + −2 100 + −350 = −7 000 ✓
```

---

## Acceptance Criteria Summary

Phase 1 is complete when all of the following pass:

- [ ] `getFinancialSummary()` fetches revenue and expenses concurrently via `Promise.all`
- [ ] `pmgShare` is calculated as `revenue × 0.20`
- [ ] `profitPool` is calculated as `revenue − expenses − pmgShare`
- [ ] `salary` is `profitPool × 0.35`
- [ ] `reinvest` is `profitPool × 0.30`
- [ ] `reserve` is `profitPool × 0.30`
- [ ] `flex` is `profitPool × 0.05`
- [ ] `salary + reinvest + reserve + flex === profitPool` within tolerance `0.01` for all inputs
- [ ] Zero revenue + zero expenses returns all-zero `FinancialSummary` without error
- [ ] Negative `profitPool` returns correct negative allocations without clamping or throwing
- [ ] Loss case: `salary = −2 450`, `reinvest = −2 100`, `reserve = −2 100`, `flex = −350` (exact values asserted, not just `< 0`)
- [ ] `getDivisionRevenue()` delegates to `getRevenueByDivision()` without modification
- [ ] `getLeadCounts()` delegates to `getLeadsByStatus()` without modification
- [ ] `formatZAR` uses `Intl.NumberFormat`, locale `en-ZA`, currency `ZAR`, 2 decimal places
- [ ] `formatZAR` returns a string containing `R` for any finite input
- [ ] `formatZAR` is deterministic - same input always produces same output
- [ ] `financial.ts` contains no `'use client'` directive
- [ ] `financial.ts` imports `server-only` as its first import
- [ ] `server-only` is listed as a dependency in `apps/admin/package.json`
- [ ] `packages/db/src/index.ts` exports `* from './queries'` (prerequisite verified)
- [ ] `FinancialSummary`, `DivisionRevenue`, and `LeadStatusCount` are exported as TypeScript types
- [ ] All calculations are deterministic with no randomness or external mutable state
- [ ] `getTotalRevenue()` and `getTotalExpenses()` are each called exactly once per `getFinancialSummary()` invocation
- [ ] All Vitest unit tests in `apps/admin/src/__tests__/financial.test.ts` pass with mocked DB helpers
