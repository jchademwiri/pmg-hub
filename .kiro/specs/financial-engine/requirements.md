# Requirements Document

## Introduction

The Financial Engine is the core calculation layer for the PMG Control Center admin app.
It is a pure server-side module (`apps/admin/src/lib/financial.ts`) that reads live data
from the Neon PostgreSQL database via the `@pmg/db` package and applies the PMG financial
model to produce all numbers shown on the dashboard. No REST API is involved — data flows
directly from Drizzle query helpers into typed TypeScript functions consumed by Next.js
Server Components.

## Glossary

- **Financial_Engine**: The module at `apps/admin/src/lib/financial.ts` responsible for all financial calculations.
- **DB_Package**: The `@pmg/db` workspace package exposing Drizzle query helpers.
- **FinancialSummary**: A TypeScript type holding all calculated financial fields for a given period.
- **DivisionRevenue**: A TypeScript type representing total income attributed to a single division.
- **LeadStatusCount**: A TypeScript type representing the count of leads in a given status.
- **Profit_Pool**: The distributable profit after deducting expenses and PMG Share from revenue.
- **PMG_Share**: The 20% of revenue retained for shared infrastructure and admin overhead.
- **Formatter**: The `formatZAR` function that converts a numeric amount to a ZAR currency string.

## Requirements

### Requirement 1: Financial Summary Calculation

**User Story:** As an admin, I want the system to calculate the full PMG financial breakdown from live data, so that every dashboard number reflects the current state of the business.

#### Acceptance Criteria

1. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL fetch total revenue and total expenses concurrently from the DB_Package using `Promise.all`.
2. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `pmgShare` as `revenue × 0.20`.
3. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `profitPool` as `revenue − expenses − pmgShare`.
4. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `salary` as `profitPool × 0.35`.
5. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `reinvest` as `profitPool × 0.30`.
6. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `reserve` as `profitPool × 0.30`.
7. WHEN `getFinancialSummary()` is called, THE Financial_Engine SHALL calculate `flex` as `profitPool × 0.05`.
8. THE Financial_Engine SHALL return a `FinancialSummary` object containing all eight fields: `revenue`, `expenses`, `pmgShare`, `profitPool`, `salary`, `reinvest`, `reserve`, and `flex`.

### Requirement 2: Allocation Integrity

**User Story:** As an admin, I want the profit pool allocations to always sum to 100%, so that no money is unaccounted for.

#### Acceptance Criteria

1. FOR ALL valid inputs, THE Financial_Engine SHALL produce allocations where `salary + reinvest + reserve + flex` equals `profitPool` within a floating-point tolerance of 0.01.
2. THE Financial_Engine SHALL calculate `pmgShare` exclusively from `revenue`, never from `profitPool` or `expenses`.
3. WHILE `revenue` equals zero, THE Financial_Engine SHALL return zero for all calculated fields without producing a runtime error.
4. WHILE `profitPool` is negative (expenses exceed revenue minus PMG Share), THE Financial_Engine SHALL return the mathematically correct negative allocations without clamping or throwing.

### Requirement 3: Division Revenue Wrapper

**User Story:** As an admin, I want per-division revenue data available through the financial module, so that dashboard components have a single import source.

#### Acceptance Criteria

1. WHEN `getDivisionRevenue()` is called, THE Financial_Engine SHALL delegate to `getRevenueByDivision()` from the DB_Package and return its result without modification.
2. THE Financial_Engine SHALL export `getDivisionRevenue()` with return type `Promise<DivisionRevenue[]>`.

### Requirement 4: Lead Status Count Wrapper

**User Story:** As an admin, I want lead status counts available through the financial module, so that dashboard components have a single import source.

#### Acceptance Criteria

1. WHEN `getLeadCounts()` is called, THE Financial_Engine SHALL delegate to `getLeadsByStatus()` from the DB_Package and return its result without modification.
2. THE Financial_Engine SHALL export `getLeadCounts()` with return type `Promise<LeadStatusCount[]>`.

### Requirement 5: ZAR Currency Formatter

**User Story:** As an admin, I want all monetary values displayed in South African Rand format, so that amounts are immediately readable in the correct locale.

#### Acceptance Criteria

1. WHEN `formatZAR(amount)` is called with a numeric value, THE Formatter SHALL return a string formatted using `Intl.NumberFormat` with locale `en-ZA` and currency `ZAR`.
2. THE Formatter SHALL always include exactly two decimal places in the output.
3. WHEN `formatZAR(amount)` is called with any finite number, THE Formatter SHALL return a non-empty string containing the `R` currency symbol.
4. FOR ALL finite numeric inputs, THE Formatter SHALL produce a deterministic output — the same input always yields the same string.

### Requirement 6: Server-Only Module Constraint

**User Story:** As a developer, I want the financial engine to be server-only, so that database credentials and query logic are never exposed to the browser.

#### Acceptance Criteria

1. THE Financial_Engine SHALL NOT include a `'use client'` directive.
2. THE Financial_Engine SHALL be importable only from Next.js Server Components and Server Actions.
3. THE Financial_Engine SHALL export the TypeScript types `FinancialSummary`, `DivisionRevenue`, and `LeadStatusCount` for use by consuming components.

### Requirement 7: Determinism and Consistency

**User Story:** As a developer, I want the financial calculations to be deterministic, so that the same database state always produces the same output and the engine is reliably testable.

#### Acceptance Criteria

1. FOR ALL identical pairs of `revenue` and `expenses` inputs, THE Financial_Engine SHALL produce identical `FinancialSummary` outputs.
2. THE Financial_Engine SHALL perform all intermediate calculations using standard IEEE 754 floating-point arithmetic with no randomness or external state.
