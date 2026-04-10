# Implementation Plan: Division Management

## Overview

Implement the division management feature following the established PMG admin pattern: DB query helpers → Server Actions → Client Components → Server Component page → Tests. Each step builds on the previous, with no orphaned code.

## Tasks

- [x] 1. DB query helper — `packages/db/src/queries.ts`
  - [x] 1.1 Add `DivisionRow` type and `getDivisionsWithStats` to `packages/db/src/queries.ts`
    - Export `DivisionRow` type with all six fields: `id` (string), `name` (string), `totalIncome` (number), `totalExpenses` (number), `netProfit` (number), `leadCount` (number)
    - Implement `getDivisionsWithStats()` using raw SQL with LEFT JOINs to `income`, `expenses`, and `leads` tables
    - Use `COALESCE(SUM(...), 0)` for zero defaults on all aggregated columns
    - Compute `netProfit` as `totalIncome - totalExpenses` in the query
    - GROUP BY `divisions.id`, `divisions.name`; ORDER BY `divisions.name ASC`
    - Do NOT modify or duplicate the existing `getAllDivisions()` function
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8_

  - [x] 1.2 Export `DivisionRow` type from `packages/db/src/index.ts`
    - Add `export type { DivisionRow } from './queries'` (functions are already covered by `export * from './queries'`)
    - _Requirements: 7.7_

- [x] 2. Server Actions — `apps/admin/src/app/actions/divisions.ts`
  - [x] 2.1 Create `divisions.ts` server actions file with `DivisionSchema`
    - Create `apps/admin/src/app/actions/divisions.ts` with `'use server'`
    - Define named `DivisionSchema` with `z.object({ name: z.string().min(1, { message: 'Division name is required.' }).max(100, { message: 'Division name must be 100 characters or fewer.' }) })`
    - _Requirements: 6.1, 6.2_

  - [x] 2.2 Implement `createDivision` server action
    - `createDivision(formData: FormData): Promise<{ error?: string }>`
    - `Object.fromEntries(formData)` → `DivisionSchema.safeParse` → Drizzle insert → `revalidatePath('/divisions')` + `revalidatePath('/dashboard')` inside try → return `{}`
    - On validation failure: return `{ error: issues[0]?.message }` without DB write
    - On DB error: return `{ error: err instanceof Error ? err.message : 'Unknown error' }`
    - Never throw; `revalidatePath` only on success inside try
    - _Requirements: 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 9.1_

  - [x] 2.3 Implement `updateDivision` server action
    - `updateDivision(id: string, formData: FormData): Promise<{ error?: string }>`
    - `Object.fromEntries(formData)` → `DivisionSchema.safeParse` → Drizzle update (`name` + `updatedAt`) → `revalidatePath('/divisions')` + `revalidatePath('/dashboard')` inside try → return `{}`
    - On validation failure: return `{ error: issues[0]?.message }` without DB write
    - On DB error: return `{ error: err instanceof Error ? err.message : 'Unknown error' }`
    - Never throw; `revalidatePath` only on success inside try
    - _Requirements: 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 9.1_

  - [x] 2.4 Implement `deleteDivision` server action
    - `deleteDivision(id: string): Promise<{ error?: string }>`
    - Attempt Drizzle delete inside try/catch — NO pre-check query
    - On FK constraint violation: return `{ error: 'Cannot delete division with existing income or expense records.' }`
    - On success: `revalidatePath('/divisions')` inside try → return `{}`
    - Never throw; detect FK violation by checking error message for Postgres code `23503`
    - _Requirements: 4.3, 4.4, 4.5, 4.7, 5.1, 5.3, 5.4, 8.1, 8.2, 8.3, 8.4_

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Client Components — `apps/admin/src/components/divisions/`
  - [x] 4.1 Implement `DivisionAddForm` (`division-add-form.tsx`)
    - `'use client'`; accepts `createAction: (formData: FormData) => Promise<{ error?: string }>`
    - `useTransition` + `useRef` pattern (same as `income-add-form.tsx`)
    - Single field: `name`; "Add Division" submit button
    - On success: `formRef.current?.reset()`; on error: inline error display below submit button
    - Disable input and button while `isPending`
    - _Requirements: 2.1, 2.2, 2.4, 2.6, 5.5_

  - [x] 4.2 Implement `DivisionsTable` (`divisions-table.tsx`)
    - `'use client'`; accepts `divisions: DivisionRow[]`, `updateAction`, `deleteAction`
    - Render shadcn `Table` with columns: Name, Total Income, Total Expenses, Net Profit, Lead Count, Actions
    - Currency columns (Total Income, Total Expenses, Net Profit) use `formatZAR`
    - Net Profit: `text-green-600` when `> 0`, `text-red-600` when `<= 0`
    - Inline rename: Edit button → text input pre-populated with current name + Save + Cancel buttons; Escape key also cancels; `useTransition` for pending state; disable input and buttons while pending; inline error below input on failure
    - Inline delete: Delete button → inline confirmation within the row (NOT a modal) → Confirm + Cancel buttons; `useTransition` for pending state; disable buttons while pending; inline error on failure
    - _Requirements: 1.2, 1.3, 1.5, 3.1, 3.2, 3.4, 3.6, 3.7, 4.1, 4.2, 4.4, 4.6, 5.5_

- [x] 5. Server Component Page — `apps/admin/src/app/(admin)/divisions/page.tsx`
  - Replace the existing stub (returns null) with a full async Server Component
  - Fetch `getDivisionsWithStats()` at the top of the component
  - Render: page header, `DivisionAddForm` with `createAction={createDivision}`, empty-state message when `divisions.length === 0`, or `DivisionsTable` with `divisions`, `updateAction={updateDivision}`, `deleteAction={deleteDivision}`
  - _Requirements: 1.1, 1.4, 2.1, 4.1_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Tests — `apps/admin/src/__tests__/divisions.test.ts`
  - [x] 7.1 Set up test file with mocks and `divisionRowArb` arbitrary
    - Create `apps/admin/src/__tests__/divisions.test.ts`
    - `vi.mock('@pmg/db')` for all DB helpers; `vi.mock('@/app/actions/divisions')` for server actions
    - Define `divisionRowArb` using `fc.record` matching the `DivisionRow` shape: `id` (uuid), `name` (string 1–100), `totalIncome` (float 0–999999), `totalExpenses` (float 0–999999), `netProfit` (float -999999–999999), `leadCount` (integer 0–1000)
    - _Requirements: 7.2_

  - [x] 7.2 Write property test P1: getDivisionsWithStats shape and sort order
    - **Property 1: getDivisionsWithStats shape and sort order (name ASC)**
    - **Validates: Requirements 1.1, 1.2, 1.5, 7.1, 7.2**

  - [x] 7.3 Write property test P2: getDivisionsWithStats zero defaults
    - **Property 2: getDivisionsWithStats zero defaults for divisions with no income, expenses, or leads**
    - **Validates: Requirements 7.3, 7.4, 7.5**

  - [x] 7.4 Write property test P3: netProfit computed correctly
    - **Property 3: netProfit equals totalIncome - totalExpenses for every DivisionRow**
    - **Validates: Requirements 7.6**

  - [x] 7.5 Write property test P4: createDivision round-trip
    - **Property 4: createDivision with valid name returns {} and division appears in getDivisionsWithStats**
    - **Validates: Requirements 2.3, 2.5, 5.4**

  - [x] 7.6 Write property test P5: updateDivision round-trip
    - **Property 5: updateDivision with valid name returns {} and getDivisionsWithStats reflects updated name and non-null updatedAt**
    - **Validates: Requirements 3.3, 3.5, 5.4**

  - [x] 7.7 Write property test P6: deleteDivision round-trip
    - **Property 6: deleteDivision with no FK references returns {} and division no longer appears in getDivisionsWithStats**
    - **Validates: Requirements 4.3, 4.5, 8.4**

  - [x] 7.8 Write property test P7: deleteDivision FK block
    - **Property 7: deleteDivision returns { error: 'Cannot delete division with existing income or expense records.' } on FK violation without throwing**
    - **Validates: Requirements 4.4, 4.7, 8.1, 8.2, 8.3**

  - [x] 7.9 Write property test P8: invalid input always returns { error }
    - **Property 8: empty name or name > 100 chars to createDivision/updateDivision always returns { error } without DB write and without throwing**
    - **Validates: Requirements 2.4, 3.4, 5.2, 6.1, 6.2**

  - [x] 7.10 Write property test P9: DivisionSchema round-trip
    - **Property 9: parsing { name } with DivisionSchema for any valid name (length 1–100) produces output with the same name value**
    - **Validates: Requirements 6.3**

  - [x] 7.11 Write property test P10: getDivisionsWithStats after create — appears sorted
    - **Property 10: after createDivision succeeds, the new division appears in getDivisionsWithStats at the correct name-ascending sort position**
    - **Validates: Requirements 1.5, 2.3, 7.1**

  - [x] 7.12 Write unit tests for DivisionsTable rendering
    - `DivisionsTable` renders correct column headers: Name, Total Income, Total Expenses, Net Profit, Lead Count, Actions
    - `DivisionsTable` applies `formatZAR` to Total Income, Total Expenses, and Net Profit columns
    - Net Profit applies `text-green-600` for positive values and `text-red-600` for zero or negative values
    - _Requirements: 1.2, 1.3_

  - [x] 7.13 Write unit tests for DivisionsTable inline rename state
    - Clicking Edit shows a text input pre-populated with the current division name
    - Clicking Cancel reverts the row to display state without saving
    - Pressing Escape reverts the row to display state without saving
    - _Requirements: 3.1, 3.2, 3.6_

  - [x] 7.14 Write unit tests for DivisionsTable inline delete state
    - Clicking Delete shows an inline confirmation prompt within the row (not a modal)
    - Clicking Cancel on the confirmation reverts the row to display state
    - _Requirements: 4.1, 4.2, 4.6_

  - [x] 7.15 Write unit tests for DivisionAddForm
    - `DivisionAddForm` resets the form on successful submission
    - `DivisionAddForm` displays inline error when action returns `{ error }`
    - _Requirements: 2.5, 2.4_

  - [x] 7.16 Write unit tests for page-level and server action edge cases
    - Empty-state message renders when `divisions.length === 0`
    - `deleteDivision` returns `{ error }` on FK constraint violation
    - `createDivision` returns `{ error }` on validation failure
    - `updateDivision` returns `{ error }` on validation failure
    - _Requirements: 1.4, 4.4, 2.4, 3.4_

- [x] 8. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests (P1–P10) validate universal correctness properties; unit tests validate specific UI states and error branches
- All DB functions and server actions are mocked in tests — no live DB connection required
- `getDivisionsWithStats()` is a separate helper and must NOT replace or duplicate `getAllDivisions()`
- Server Actions return `Promise<{ error?: string }>` always — never throw
- `revalidatePath` is called inside try on success only — never in catch
- `deleteDivision` relies solely on FK constraint — no pre-check query
