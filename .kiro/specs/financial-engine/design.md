# Design Document — Financial Engine

## Overview

The Financial Engine is a single server-side TypeScript module at
`apps/admin/src/lib/financial.ts`. It is the sole calculation and data-access
layer for all monetary figures in the PMG Control Center admin UI.

The module has no UI concerns. It reads from the database via `@pmg/db` query
helpers, applies the PMG financial model using deterministic arithmetic, and
returns typed results to Next.js Server Components. It is never imported from
Client Components — the `server-only` package enforces this at build time.

### Scope

Phase 1 covers:
- Calculating the full `FinancialSummary` from live DB data
- Wrapping `getRevenueByDivision()` and `getLeadsByStatus()` as typed exports
- Formatting monetary values as South African Rand strings

Everything else (snapshots, date-range filtering, caching, tax logic) is
explicitly out of scope for Phase 1.

---

## Architecture

```
Neon PostgreSQL (packages/db schema)
        │
        ▼
@pmg/db query helpers  (packages/db/src/queries.ts)
  getTotalRevenue()        → SUM(income.amount)
  getTotalExpenses()       → SUM(expenses.amount)
  getRevenueByDivision()   → per-division totals
  getLeadsByStatus()       → per-status counts
        │
        ▼
apps/admin/src/lib/financial.ts   ← Financial Engine (this module)
  getFinancialSummary()    → FinancialSummary
  getDivisionRevenue()     → DivisionRevenue[]
  getLeadCounts()          → LeadStatusCount[]
  formatZAR()              → string
        │
        ├──────────────────────────────────────┐
        ▼                                      ▼
Next.js Server Components          Next.js Server Actions
(dashboard/page.tsx — reads)       (actions/*.ts — mutate DB,
                                    then revalidatePath())
```

The Financial Engine is read-only. Mutation actions do not call it directly —
they mutate the database and call `revalidatePath()`, which causes the Server
Component to re-fetch through the Financial Engine on the next render.

### Prerequisite

`packages/db/src/index.ts` must export `* from './queries'` before
`financial.ts` can be implemented. Without this, the named imports
(`getTotalRevenue`, etc.) will throw a runtime error.

---

## Components and Interfaces

### Public API

```ts
import 'server-only' // must be first import

// Types
export type FinancialSummary = {
  revenue: number
  expenses: number
  pmgShare: number
  profitPool: number
  salary: number
  reinvest: number
  reserve: number
  flex: number
}
export type DivisionRevenue = { divisionName: string; total: number }
export type LeadStatusCount = { status: string; count: number }

// Functions
export async function getFinancialSummary(): Promise<FinancialSummary>
export async function getDivisionRevenue(): Promise<DivisionRevenue[]>
export async function getLeadCounts(): Promise<LeadStatusCount[]>
export function formatZAR(amount: number): string
```

### `getFinancialSummary()`

Fetches revenue and expenses concurrently, applies the PMG financial model,
and returns a fully-populated `FinancialSummary`.

Design decisions:
- `Promise.all([getTotalRevenue(), getTotalExpenses()])` — concurrent fetches
  reduce latency vs sequential awaits. Both queries are independent.
- No `'use server'` directive — this is a module, not a Server Action.
- No clamping of negative values — negative `profitPool` is a valid business
  state (loss period) and must propagate correctly to all allocations.

### `getDivisionRevenue()` and `getLeadCounts()`

Thin wrappers that delegate directly to the DB helpers. No transformation.
They exist so dashboard components have a single import source for all
financial and operational data.

### `formatZAR(amount: number): string`

Synchronous formatter using the Web-standard `Intl.NumberFormat` API.

```ts
new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(amount)
```

Design decision: `Intl.NumberFormat` is used rather than a manual string
template because it handles locale-specific separators, sign rendering for
negatives, and future i18n concerns correctly. The exact separator characters
(space, comma, period) are locale-implementation-dependent and must not be
hard-asserted in tests.

---

## Data Models

### FinancialSummary

All fields are raw IEEE 754 `number` values. No rounding to the nearest cent
before returning — that is explicitly out of scope for Phase 1.

| Field | Formula | Notes |
|---|---|---|
| `revenue` | `getTotalRevenue()` | SUM of all income entries |
| `expenses` | `getTotalExpenses()` | SUM of all expense entries |
| `pmgShare` | `revenue × 0.20` | Calculated from revenue only |
| `profitPool` | `revenue − expenses − pmgShare` | May be negative |
| `salary` | `profitPool × 0.35` | May be negative |
| `reinvest` | `profitPool × 0.30` | May be negative |
| `reserve` | `profitPool × 0.30` | May be negative |
| `flex` | `profitPool × 0.05` | May be negative |

### DivisionRevenue

Passthrough from `getRevenueByDivision()`. Shape: `{ divisionName: string; total: number }`.

### LeadStatusCount

Passthrough from `getLeadsByStatus()`. Shape: `{ status: string; count: number }`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Financial formulas correctness

*For any* revenue value and expenses value, `getFinancialSummary()` must return:
- `pmgShare` equal to `revenue × 0.20`
- `profitPool` equal to `revenue − expenses − pmgShare`
- `salary` equal to `profitPool × 0.35`
- `reinvest` equal to `profitPool × 0.30`
- `reserve` equal to `profitPool × 0.30`
- `flex` equal to `profitPool × 0.05`

**Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

### Property 2: Allocation sum invariant

*For any* revenue value and expenses value, `salary + reinvest + reserve + flex`
must equal `profitPool` within a floating-point tolerance of `0.01`.

**Validates: Requirements 2.1**

### Property 3: Concurrent fetch and single invocation

*For any* call to `getFinancialSummary()`, `getTotalRevenue()` and
`getTotalExpenses()` must each be called exactly once per invocation.

> **Testability note:** With `vi.mock`, tests can verify that each helper is
> called exactly once (call count assertion). True `Promise.all` concurrency —
> i.e. that both calls are initiated before either resolves — cannot be
> verified with synchronous mocks. The `Promise.all` usage is verified by
> code review and is enforced structurally by the implementation; it is not
> asserted in the test suite.

**Validates: Requirements 1.1 (structurally), 1.9 (via call count assertion)**

### Property 4: Zero-input edge case

*For the specific input* `revenue = 0, expenses = 0`, all eight fields of
`FinancialSummary` must equal `0` and no exception must be thrown.

**Validates: Requirements 2.3**

### Property 5: Negative profitPool propagates correctly

*For any* input where `expenses > revenue − (revenue × 0.20)` (i.e. a loss
period), `getFinancialSummary()` must return mathematically correct negative
values for `salary`, `reinvest`, `reserve`, and `flex` without clamping to
zero or throwing an exception.

**Validates: Requirements 2.4**

### Property 6: getDivisionRevenue passthrough

*For any* array returned by `getRevenueByDivision()`, `getDivisionRevenue()`
must return the exact same value without modification.

**Validates: Requirements 3.1**

### Property 7: getLeadCounts passthrough

*For any* array returned by `getLeadsByStatus()`, `getLeadCounts()` must
return the exact same value without modification.

**Validates: Requirements 4.1**

### Property 8: formatZAR output correctness

*For any* finite number, `formatZAR(amount)` must return a non-empty string
that contains the `R` currency symbol and has exactly two decimal places in
the output.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 9: formatZAR determinism

*For any* finite number called twice with the same input, `formatZAR` must
return identical strings on both calls.

**Validates: Requirements 5.4**

### Property 10: getFinancialSummary determinism

*For any* identical pair of `revenue` and `expenses` values (same mocked DB
responses), two sequential calls to `getFinancialSummary()` must return
structurally identical `FinancialSummary` objects.

**Validates: Requirements 7.1**

---

## Error Handling

The Financial Engine has minimal error handling by design — it is a thin
calculation layer, not a resilience boundary.

| Scenario | Behaviour |
|---|---|
| DB query throws | Exception propagates to the calling Server Component, which triggers Next.js error boundaries |
| `revenue = 0, expenses = 0` | Returns all-zero `FinancialSummary` — no special case needed, arithmetic handles it |
| `profitPool < 0` | Returns negative allocation values — no clamping, no exception |
| `formatZAR(NaN)` or `formatZAR(Infinity)` | `Intl.NumberFormat` handles these gracefully (returns `NaN` or `∞` representations) — out of scope for Phase 1 |

No input validation or sanitisation is performed inside `financial.ts`. That
responsibility belongs to database `CHECK` constraints and Zod schemas in
Server Actions.

---

## Testing Strategy

All tests run in Vitest at `apps/admin/src/__tests__/financial.test.ts`.
No real database connection is required — all `@pmg/db` query helpers are
mocked using `vi.mock`.

### Dual Testing Approach

**Unit tests** cover specific examples, edge cases, and error conditions:
- Standard case: `revenue = 100_000, expenses = 40_000` → exact field values
- Zero case: `revenue = 0, expenses = 0` → all fields equal `0`
- Loss case: `revenue = 10_000, expenses = 15_000` → exact negative values
  (`salary = -2450`, `reinvest = -2100`, `reserve = -2100`, `flex = -350`)
- `formatZAR` examples: positive, zero, negative amounts

> Property 4 (zero-input edge case) is covered by the "zero case" unit test
> rather than a property-based test. It targets a single specific input
> (`revenue = 0, expenses = 0`) rather than a universal range — unit test
> coverage is appropriate and sufficient for this case.

**Property-based tests** verify universal properties across many generated inputs.
The property-based testing library for this project is **fast-check** (TypeScript-native,
works with Vitest, no additional setup beyond `bun add -D fast-check`).

Each property test must run a minimum of 100 iterations.

### Mock Setup

```ts
vi.mock('@pmg/db', () => ({
  getTotalRevenue: vi.fn(),
  getTotalExpenses: vi.fn(),
  getRevenueByDivision: vi.fn(),
  getLeadsByStatus: vi.fn(),
}))
```

### Property Test Configuration

Each property-based test must be tagged with a comment referencing the design
property it validates:

```
// Feature: financial-engine, Property 1: Financial formulas correctness
```

Each correctness property must be implemented by a single property-based test.
Minimum 100 iterations per test (fast-check default is 100; do not reduce it).

### Test File Structure

```
describe('getFinancialSummary', () => {
  describe('unit tests', () => {
    it('standard case')
    it('zero case')
    it('loss case — exact negative values')
    it('determinism — same inputs produce same output')
  })
  describe('property tests', () => {
    it('Property 1: financial formulas correctness')
    it('Property 2: allocation sum invariant')
    it('Property 3: concurrent fetch and single invocation')
    it('Property 5: negative profitPool propagates correctly')
    it('Property 10: determinism')
  })
})

describe('getDivisionRevenue', () => {
  it('Property 6: passthrough — returns getRevenueByDivision result unchanged')
})

describe('getLeadCounts', () => {
  it('Property 7: passthrough — returns getLeadsByStatus result unchanged')
})

describe('formatZAR', () => {
  describe('unit tests', () => {
    it('positive amount contains R and two decimal places')
    it('zero amount contains R and two decimal places')
    it('negative amount contains R and two decimal places')
  })
  describe('property tests', () => {
    it('Property 8: output correctness for all finite numbers')
    it('Property 9: determinism — same input always same output')
  })
})
```

### Locale-Safe formatZAR Assertions

`Intl.NumberFormat` output varies by runtime locale. Tests must not assert
exact separator characters. Instead:

```ts
// correct
expect(result).toMatch(/R/)
expect(result).toMatch(/\.\d{2}$|,\d{2}$/)

// incorrect — brittle
expect(result).toBe('R 1 234,50')
```

### Files Affected

| File | Change |
|---|---|
| `packages/db/src/index.ts` | Add `export * from './queries'` (prerequisite) |
| `apps/admin/package.json` | Add to `dependencies`: `"server-only": "^0.0.1"`, `"@pmg/db": "*"`. Add to `devDependencies`: `"vitest": "^1.4.0"`, `"fast-check": "^4.6.0"`. Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"` |
| `apps/admin/vitest.config.ts` | Create — configures Vitest with `node` environment and the `@/*` path alias pointing to `./src`, so test imports resolve correctly |
| `apps/admin/src/lib/financial.ts` | Create the financial engine module |
| `apps/admin/src/__tests__/financial.test.ts` | Create Vitest test suite |

### `apps/admin/vitest.config.ts` — content

```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```
