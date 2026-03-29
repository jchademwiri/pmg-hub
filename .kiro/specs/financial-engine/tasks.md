# Implementation Plan: Financial Engine

## Overview

Implement the PMG Financial Engine as a server-side TypeScript module in `apps/admin/src/lib/financial.ts`. The plan follows the dependency order: export DB queries first, configure the test environment, implement the module, then write and verify the test suite.

## Tasks

- [x] 1. Export query helpers from @pmg/db public API
  - Add `export * from './queries'` to `packages/db/src/index.ts`
  - This unblocks the named imports (`getTotalRevenue`, `getTotalExpenses`, `getRevenueByDivision`, `getLeadsByStatus`) used in `financial.ts`
  - _Requirements: 1.1 (prerequisite)_

- [x] 2. Configure test environment and add dependencies
  - [x] 2.1 Update `apps/admin/package.json`
    - Add to `dependencies`: `"server-only": "^0.0.1"`, `"@pmg/db": "*"`
    - Add to `devDependencies`: `"vitest": "^1.4.0"`, `"fast-check": "^4.6.0"`
    - Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`
    - _Requirements: 6.4_
  - [x] 2.2 Create `apps/admin/vitest.config.ts`
    - Configure `environment: 'node'`, `globals: false`
    - Add `@` alias pointing to `./src` via `resolve.alias`
    - _Requirements: 7.1, 7.2_

- [x] 3. Implement `apps/admin/src/lib/financial.ts`
  - [x] 3.1 Add `import 'server-only'` as the first import
    - _Requirements: 6.4_
  - [x] 3.2 Import the four DB helpers from `@pmg/db`
    - `getTotalRevenue`, `getTotalExpenses`, `getRevenueByDivision`, `getLeadsByStatus`
    - _Requirements: 1.1_
  - [x] 3.3 Export TypeScript types: `FinancialSummary`, `DivisionRevenue`, `LeadStatusCount`
    - _Requirements: 6.3_
  - [x] 3.4 Implement `getFinancialSummary()`
    - Fetch revenue and expenses concurrently with `Promise.all`
    - Calculate `pmgShare = revenue × 0.20`
    - Calculate `profitPool = revenue − expenses − pmgShare`
    - Calculate `salary = profitPool × 0.35`, `reinvest = profitPool × 0.30`, `reserve = profitPool × 0.30`, `flex = profitPool × 0.05`
    - Return all eight fields; do not clamp negative values
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.2, 2.3, 2.4_
  - [x] 3.5 Implement `getDivisionRevenue()` — delegate directly to `getRevenueByDivision()`, no transformation
    - _Requirements: 3.1, 3.2_
  - [x] 3.6 Implement `getLeadCounts()` — delegate directly to `getLeadsByStatus()`, no transformation
    - _Requirements: 4.1, 4.2_
  - [x] 3.7 Implement `formatZAR(amount: number): string`
    - Use `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2, maximumFractionDigits: 2 })`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Create `apps/admin/src/__tests__/financial.test.ts`
  - [x] 4.1 Add mock setup for `@pmg/db`
    - `vi.mock('@pmg/db', () => ({ getTotalRevenue: vi.fn(), getTotalExpenses: vi.fn(), getRevenueByDivision: vi.fn(), getLeadsByStatus: vi.fn() }))`
  - [x] 4.2 Write unit tests for `getFinancialSummary`
    - Standard case: `revenue=100000, expenses=40000` → assert all eight exact field values
    - Zero case: `revenue=0, expenses=0` → all eight fields equal `0`, no error thrown
    - Loss case: `revenue=10000, expenses=15000` → assert `salary=-2450`, `reinvest=-2100`, `reserve=-2100`, `flex=-350` (exact values)
    - Determinism: same mocked inputs called twice → structurally identical results
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.3, 2.4, 7.1_
  - [x] 4.3 Write property test for Property 1: Financial formulas correctness
    - `// Feature: financial-engine, Property 1: Financial formulas correctness`
    - Use `fc.float` / `fc.double` for revenue and expenses; assert each formula field
    - **Property 1: Financial formulas correctness**
    - **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**
  - [x] 4.4 Write property test for Property 2: Allocation sum invariant
    - `// Feature: financial-engine, Property 2: Allocation sum invariant`
    - Assert `Math.abs((salary + reinvest + reserve + flex) - profitPool) < 0.01` for all inputs
    - **Property 2: Allocation sum invariant**
    - **Validates: Requirements 2.1**
  - [x] 4.5 Write property test for Property 3: Concurrent fetch and single invocation
    - `// Feature: financial-engine, Property 3: Concurrent fetch and single invocation`
    - Assert each of `getTotalRevenue` and `getTotalExpenses` called exactly once per `getFinancialSummary()` call
    - **Property 3: Concurrent fetch and single invocation**
    - **Validates: Requirements 1.1, 1.9**
  - [x] 4.6 Write property test for Property 5: Negative profitPool propagates correctly
    - `// Feature: financial-engine, Property 5: Negative profitPool propagates correctly`
    - Generate inputs where `expenses > revenue - (revenue × 0.20)`; assert all allocation fields are negative and match formulas
    - **Property 5: Negative profitPool propagates correctly**
    - **Validates: Requirements 2.4**
  - [x] 4.7 Write property test for Property 6: getDivisionRevenue passthrough
    - `// Feature: financial-engine, Property 6: getDivisionRevenue passthrough`
    - Generate arbitrary `DivisionRevenue[]` arrays; assert `getDivisionRevenue()` returns the exact same reference/value
    - **Property 6: getDivisionRevenue passthrough**
    - **Validates: Requirements 3.1**
  - [x] 4.8 Write property test for Property 7: getLeadCounts passthrough
    - `// Feature: financial-engine, Property 7: getLeadCounts passthrough`
    - Generate arbitrary `LeadStatusCount[]` arrays; assert `getLeadCounts()` returns the exact same reference/value
    - **Property 7: getLeadCounts passthrough**
    - **Validates: Requirements 4.1**
  - [x] 4.9 Write unit tests for `formatZAR`
    - Positive amount (`1234.5`): result contains `R` and matches `/\.\d{2}$|,\d{2}$/`
    - Zero (`0`): result contains `R` and two decimal places
    - Negative (`-500`): result contains `R` and two decimal places
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 4.10 Write property test for Property 8: formatZAR output correctness
    - `// Feature: financial-engine, Property 8: formatZAR output correctness`
    - Use `fc.float({ noNaN: true, noDefaultInfinity: true })` for finite numbers; assert non-empty string, contains `R`, matches two-decimal pattern
    - **Property 8: formatZAR output correctness**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  - [x] 4.11 Write property test for Property 9: formatZAR determinism
    - `// Feature: financial-engine, Property 9: formatZAR determinism`
    - Call `formatZAR` twice with the same finite input; assert both results are strictly equal
    - **Property 9: formatZAR determinism**
    - **Validates: Requirements 5.4**
  - [x] 4.12 Write property test for Property 10: getFinancialSummary determinism
    - `// Feature: financial-engine, Property 10: getFinancialSummary determinism`
    - Mock same revenue/expenses; call `getFinancialSummary()` twice; assert deep equality of both results
    - **Property 10: getFinancialSummary determinism**
    - **Validates: Requirements 7.1**

- [x] 5. Checkpoint — run tests and verify
  - Run `bun test` (or `bun run test`) inside `apps/admin` to execute the Vitest suite
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: all_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Task 1 is a hard prerequisite — `financial.ts` cannot be implemented without it
- `formatZAR` assertions must be locale-safe: check for `R` symbol and `/\.\d{2}$|,\d{2}$/`, never assert exact separator characters
- Property tests require a minimum of 100 iterations (fast-check default — do not reduce)
- `financial.ts` must never contain a `'use client'` directive
