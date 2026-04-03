# Implementation Plan: Expense Management

## Overview

Implement full CRUD for business expenses, mirroring the Income Management pattern. DB query helpers first, then Server Actions, then Client Components, then Server Component pages, then tests.

## Tasks

- [x] 0. Pre-flight checks
  - Verify `getAllDivisions()` is already exported from `@pmg/db`. If not, add it to `packages/db/src/queries.ts` before proceeding with any other task.
  - Verify `formatZAR` exists in the shared utils module (e.g. `@/lib/utils` or `@/lib/format`). If it does not already exist from Income Management, create it as:
    ```ts
    export const formatZAR = (amount: number) =>
      new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount)
    ```
  - _Required by tasks 4.3 and 5.1_

- [x] 1. Add `ExpenseRow` type and DB query helpers to `packages/db/src/queries.ts`
  - [x] 1.1 Export `ExpenseRow` type with all required fields (`id`, `date`, `divisionId`, `divisionName`, `category`, `description`, `amount`, `createdAt`, `updatedAt`)
    - _Requirements: 11.5_
  - [x] 1.2 Implement `getAllExpenses(filters?)` with INNER JOIN on `divisions`, optional WHERE clauses for `divisionId`, `category`, and `month` (using `TO_CHAR(date, 'YYYY-MM')`), ordered by `date DESC`
    - _Requirements: 11.1, 11.6, 11.7_
  - [x] 1.3 Implement `getExpenseById(id)` returning `ExpenseRow | null`
    - _Requirements: 11.2_
  - [x] 1.4 Implement `getDistinctExpenseMonths()` returning `string[]` sorted ASC
    - _Requirements: 11.3_
  - [x] 1.5 Implement `getDistinctExpenseCategories()` returning `string[]` sorted ASC
    - _Requirements: 11.4_

- [x] 2. Implement Server Actions in `apps/admin/src/app/actions/expenses.ts`
  - [x] 2.1 Create the file with `'use server'` directive and `ExpenseSchema` Zod object (`date`, `divisionId`, `category`, `description`, `amount`)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  - [x] 2.2 Implement `createExpense(formData)` — validate, insert, `revalidatePath` on success only, never throw
    - Store amount as `String(parsed.amount)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 2.3 Implement `updateExpense(id, formData)` — validate, update row + set `updatedAt`, `revalidatePath` on success only, never throw
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [x] 2.4 Implement `deleteExpense(id)` — delete row, `revalidatePath` on success only, never throw
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 3. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Client Components under `apps/admin/src/components/expenses/`
  - [x] 4.1 Create `expense-filter-bar.tsx` — three shadcn `<Select>` controls (division, category, month), each with `"all"` default option, `router.push` on change, month labels via `toLocaleString('en-ZA', { month: 'long', year: 'numeric' })`
    - **"all" → undefined conversion**: when a `<Select>` value is `"all"`, omit that key from `URLSearchParams` entirely — do not pass `?divisionId=all`. Only set the param when a real value is selected.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  - [x] 4.2 Create `expense-add-form.tsx` — `useTransition` + `useRef`, category `<input list="category-suggestions">` + `<datalist>`, reset on success, inline error on failure, disable controls while pending
    - `createExpense` and `updateExpense` are called directly inside their respective form components; the mock in 7.1 covers these. `deleteAction` is passed as a prop to `ExpenseTable` and does not need to be mocked at the module level for table tests.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  - [x] 4.3 Create `expense-table.tsx` — shadcn Table with columns (Date, Division, Category, Description, Amount via `formatZAR`, Actions), edit link to `/expenses/[id]`, inline delete confirm/cancel with `pendingDeleteId` state, `startTransition` wraps delete call, in-flight row gets `opacity-50 pointer-events-none`, errors via `toast.error`
    - Import `formatZAR` from the shared utils module verified/created in task 0.
    - _Requirements: 1.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  - [x] 4.4 Create `expense-edit-form.tsx` — same fields as add form pre-populated from `entry` prop, category datalist, `router.push('/expenses')` on success, inline error on failure, disable controls while pending
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [x] 5. Implement Server Component pages
  - [x] 5.1 Replace stub at `apps/admin/src/app/(admin)/expenses/page.tsx` — `export const dynamic = 'force-dynamic'`, await `searchParams`, `Promise.all` of 4 queries, compute `runningTotal` and `categoryBreakdown` inline, render header + total + category breakdown pills + `ExpenseFilterBar` + `ExpenseAddForm` + `ExpenseTable` or empty-state message
    - **searchParams handling**: treat a missing param or empty string as `undefined` when passing filters to `getAllExpenses` — never pass `"all"` as a filter value.
    - Import `formatZAR` from the shared utils module verified/created in task 0.
    - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1_
  - [x] 5.2 Replace stub at `apps/admin/src/app/(admin)/expenses/[id]/page.tsx` — `export const dynamic = 'force-dynamic'`, await `params`, `getExpenseById` → `notFound()` if null, `Promise.all([getAllDivisions(), getDistinctExpenseCategories()])`, render back link + `ExpenseEditForm` with `updateExpense.bind(null, id)`
    - _Requirements: 6.1, 6.2_
  - [x] 5.3 Wire the `/expenses` route into the admin sidebar navigation component, consistent with how `/income` is linked.

- [x] 6. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 7. Write tests in `apps/admin/src/__tests__/expenses.test.ts`
  - [x] 7.1 Set up file: mock `@pmg/db`, `next/navigation`, `next/link`, `sonner`, and `@/app/actions/expenses`; define `expenseArb` arbitrary mirroring `incomeArb` pattern
    - Note: `@/app/actions/expenses` mock covers `createExpense` and `updateExpense` (used directly in form components). `deleteAction` is prop-injected into `ExpenseTable` and should be passed as a `vi.fn()` in those specific tests — no module-level mock needed for it.
    - _Requirements: 11.5_
  - [x] 7.2 Write property test P1: `getAllExpenses` shape and sort order (date DESC)
    - **Property 1: getAllExpenses shape + sort order**
    - **Validates: Requirements 1.1, 1.2, 11.1, 11.7**
  - [x] 7.3 Write property test P2: division filter excludes other divisions
    - **Property 2: Division filter excludes other divisions**
    - **Validates: Requirements 2.2, 11.1**
  - [x] 7.4 Write property test P3: category filter excludes other categories
    - **Property 3: Category filter excludes other categories**
    - **Validates: Requirements 2.3, 11.1**
  - [x] 7.5 Write property test P4: month filter excludes entries outside the calendar month
    - **Property 4: Month filter excludes entries outside the calendar month**
    - **Validates: Requirements 2.4, 11.6**
  - [x] 7.6 Write property test P5: running total equals sum of amounts
    - **Property 5: Running total equals sum of amounts**
    - **Validates: Requirements 3.1, 3.4**
  - [x] 7.7 Write property test P6: category breakdown sums equal running total
    - **Property 6: Category breakdown sums equal running total**
    - **Validates: Requirements 3.2, 3.5**
  - [x] 7.8 Write property test P7: `createExpense` round-trip
    - **Property 7: createExpense round-trip**
    - **Validates: Requirements 5.3, 5.4**
  - [x] 7.9 Write property test P8: `updateExpense` round-trip
    - **Property 8: updateExpense round-trip**
    - **Validates: Requirements 7.3, 7.4**
  - [x] 7.10 Write property test P9: `deleteExpense` round-trip
    - **Property 9: deleteExpense round-trip**
    - **Validates: Requirements 9.1, 9.2**
  - [x] 7.11 Write property test P10: `getExpenseById` returns correct entry or null
    - **Property 10: getExpenseById returns correct entry or null**
    - **Validates: Requirements 11.2, 6.1, 6.2**
  - [x] 7.12 Write property test P11: `getDistinctExpenseMonths` returns distinct YYYY-MM sorted ASC
    - **Property 11: getDistinctExpenseMonths returns distinct YYYY-MM strings sorted ASC**
    - **Validates: Requirements 11.3, 2.7**
  - [x] 7.13 Write property test P12: `getDistinctExpenseCategories` returns distinct strings sorted ASC
    - **Property 12: getDistinctExpenseCategories returns distinct strings sorted ASC**
    - **Validates: Requirements 11.4, 2.6**
  - [x] 7.14 Write property test P13: invalid input to `createExpense`/`updateExpense` always returns `{ error }`
    - **Property 13: Invalid input always returns `{ error }`**
    - **Validates: Requirements 5.2, 5.6, 7.2, 7.6, 10.1–10.6**
  - [x] 7.15 Write property test P14: amount precision preserved on String/Number round-trip
    - **Property 14: Amount precision preserved on String/Number round-trip**
    - **Validates: Requirements 5.3, 7.3**
  - [x] 7.16 Write unit tests for `ExpenseFilterBar`, `ExpenseTable`, `ExpenseSchema`, `deleteExpense`, empty-state, and category datalist
    - `ExpenseFilterBar` renders "All divisions", "All categories", "All months" defaults
    - `ExpenseTable` renders edit links with correct `/expenses/<id>` hrefs; empty array renders no data rows
    - `ExpenseSchema` rejects empty date, empty category, amount = 0, amount = -1
    - `deleteExpense` returns `{ error }` on DB throw; returns `{}` and calls `revalidatePath` on success
    - Empty-state condition renders message instead of table when `entries.length === 0`
    - Category datalist rendered with correct `id` and populated options
    - _Requirements: 1.3, 2.1, 4.3, 8.1, 8.2, 9.3, 10.1, 10.3, 10.5_

- [x] 8. Final checkpoint — Ensure all tests pass, ask the user if questions arise.
  - Run with: `bun run test --cwd apps/admin`

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Mirror `income.test.ts` patterns exactly for all test structure and arbitraries
- No DB migration needed — the `expenses` table already exists in the schema
