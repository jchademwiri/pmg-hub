# Implementation Plan: Income Management

## Overview

Implement full CRUD income management (Phase 3) following the established PMG admin
pattern: DB query helpers → Server Actions → Client Components → Server Component pages.
Each layer builds on the previous; no orphaned code.

## Tasks

- [ ] 1. Add DB query helpers to `packages/db/src/queries.ts`
  - Add `getAllIncome(filters?)` — INNER JOIN divisions, LEFT JOIN clients, optional WHERE clauses, ORDER BY date DESC
  - Add `getIncomeById(id)` — same joins, WHERE income.id = id, returns single row or null
  - Add `getDistinctIncomeMonths()` — SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') ORDER BY 1 DESC
  - Add `getAllDivisions()` — SELECT id, name FROM divisions ORDER BY name ASC. CHECK first: if it already exists with matching signature, skip
  - Add `getAllClients()` — SELECT id, name, business_name FROM clients ORDER BY name ASC
  - All five must be exported; `packages/db/src/index.ts` already re-exports via `export * from './queries'`
  - amount column returns string from Drizzle numeric — do NOT coerce to number in the query helper
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 1.1 Write property test for `getAllIncome` shape and sort order
    - **Property 1: getAllIncome returns all entries with correct shape, sorted date DESC**
    - **Validates: Requirements 1.1, 1.3, 8.1**
    - Use `fc.array(incomeArb)` — mock DB, assert shape and descending date order
    - Tag: `// Feature: income-management, Property 1: getAllIncome shape + sort`
    - Minimum 100 iterations

  - [ ]* 1.2 Write property test for division filter exclusivity
    - **Property 2: Division filter excludes entries from other divisions**
    - **Validates: Requirements 2.3, 7.3**
    - Use `fc.uuid()` as divisionId filter; assert no returned entry has a different divisionId
    - Tag: `// Feature: income-management, Property 2: Division filter`
    - Minimum 100 iterations

  - [ ]* 1.3 Write property test for month filter exclusivity
    - **Property 3: Month filter excludes entries outside the calendar month**
    - **Validates: Requirements 2.4, 7.3**
    - Use `fc.date()` mapped to YYYY-MM; assert all returned entries fall within that month
    - Tag: `// Feature: income-management, Property 3: Month filter`
    - Minimum 100 iterations

  - [ ]* 1.4 Write property test for `getDistinctIncomeMonths` distinctness and sort
    - **Property 9: getDistinctIncomeMonths returns distinct YYYY-MM strings sorted DESC**
    - **Validates: Requirements 2.2, 8.3**
    - Use `fc.array(fc.date())` spanning multiple months; assert no duplicates, sorted DESC
    - Tag: `// Feature: income-management, Property 9: getDistinctIncomeMonths`
    - Minimum 100 iterations

  - [ ]* 1.5 Write property test for `getAllDivisions` sort order
    - **Property 12: getAllDivisions returns all divisions sorted by name ASC**
    - **Validates: Requirements 8.4**
    - Use `fc.array(fc.string())` as division names; assert sorted alphabetically ASC
    - Tag: `// Feature: income-management, Property 12: getAllDivisions sort`
    - Minimum 100 iterations

  - [ ]* 1.6 Write property test for `getAllClients` sort order
    - **Property 13: getAllClients returns all clients sorted by name ASC**
    - **Validates: Requirements 8.5**
    - Use `fc.array(fc.record({ name: fc.string(), businessName: fc.option(fc.string()) }))` 
    - Tag: `// Feature: income-management, Property 13: getAllClients sort`
    - Minimum 100 iterations

- [ ] 2. Implement Server Actions in `apps/admin/src/app/actions/income.ts`
  - Add `'use server'` directive at top of file
  - Define `IncomeSchema` with Zod: date (string min 1), divisionId (uuid), clientId (uuid optional), description (string optional), amount (coerce number positive)
  - Implement `createIncome(formData)` — normalize `clientId = ''` → delete key, parse, insert, `revalidatePath('/income')` + `revalidatePath('/dashboard')` inside try before `return {}`
  - Implement `updateIncome(id, formData)` — same normalization + parse, update with `updatedAt: new Date()`, revalidate inside try
  - Implement `deleteIncome(id)` — no FormData, delete by id, revalidate inside try
  - All three return `Promise<{ error?: string }>` — never throw
  - `revalidatePath` MUST only be called inside try block on success, never in catch
  - amount stored as `String(parsed.amount)` — never raw JS number
  - _Requirements: 3.5, 3.6, 3.7, 4.7, 4.8, 5.3, 5.6, 6.1, 6.2, 6.3, 6.4, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1_

  - [ ]* 2.1 Write property test for `createIncome` round-trip
    - **Property 5: createIncome round-trip — valid input succeeds and entry is retrievable**
    - **Validates: Requirements 3.5, 3.7, 6.4**
    - Use `fc.record({ date, divisionId: fc.uuid(), amount: fc.float({ min: 0.01 }), ... })`
    - Tag: `// Feature: income-management, Property 5: createIncome round-trip`
    - Minimum 100 iterations

  - [ ]* 2.2 Write property test for `updateIncome` round-trip
    - **Property 6: updateIncome round-trip — valid input succeeds and changes are reflected**
    - **Validates: Requirements 4.7**
    - Use existing entry + `fc.record(...)` for new values; assert getAllIncome reflects update
    - Tag: `// Feature: income-management, Property 6: updateIncome round-trip`
    - Minimum 100 iterations

  - [ ]* 2.3 Write property test for `deleteIncome` round-trip
    - **Property 7: deleteIncome round-trip — deleted entry is no longer retrievable**
    - **Validates: Requirements 5.3, 5.4**
    - Assert `getIncomeById(id)` returns null after `deleteIncome(id)` returns `{}`
    - Tag: `// Feature: income-management, Property 7: deleteIncome round-trip`
    - Minimum 100 iterations

  - [ ]* 2.4 Write property test for `getIncomeById` correctness
    - **Property 8: getIncomeById returns the correct entry or null**
    - **Validates: Requirements 4.2, 4.9, 8.2**
    - Test both existing id (returns correct row) and non-existent UUID (returns null)
    - Tag: `// Feature: income-management, Property 8: getIncomeById`
    - Minimum 100 iterations

  - [ ]* 2.5 Write property test for invalid input rejection
    - **Property 10: Invalid input to createIncome/updateIncome always returns an error**
    - **Validates: Requirements 3.6, 4.8, 9.2, 10.2, 10.3**
    - Use `fc.oneof(invalidAmountArb, invalidUuidArb, missingFieldArb)` — assert `{ error: <non-empty string> }` and no DB write
    - Tag: `// Feature: income-management, Property 10: Invalid input returns error`
    - Minimum 100 iterations

  - [ ]* 2.6 Write property test for amount precision round-trip
    - **Property 11: Amount precision is preserved on round-trip**
    - **Validates: Requirements 9.1, 9.2**
    - Use `fc.float({ min: 0.01, max: 999999.99 })`; assert `Number(String(amount))` equals original within 2 decimal places
    - Tag: `// Feature: income-management, Property 11: Amount precision`
    - Minimum 100 iterations

  - [ ]* 2.7 Write unit tests for Server Action edge cases
    - `IncomeSchema` rejects empty string date
    - `IncomeSchema` rejects `clientId = ''` before normalization
    - `IncomeSchema` accepts `clientId = undefined`
    - `createIncome` with `amount = 0` returns `{ error }`
    - `createIncome` with `amount = -1` returns `{ error }`
    - `deleteIncome` returns `{ error }` when DB throws (FK constraint or connection error) — verifies R5.6
    - `deleteIncome` calls `revalidatePath('/income')` and `revalidatePath('/dashboard')` on success — verifies R11.1
    - _Requirements: 3.6, 5.6, 6.2, 6.3, 9.2, 10.2, 10.3, 11.1_

- [ ] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement `FilterBar` client component at `apps/admin/src/components/income/filter-bar.tsx`
  - `'use client'` directive
  - Props: `divisions`, `months`, `currentDivisionId?`, `currentMonth?`
  - Two shadcn `<Select>` controls: division (default "All divisions") and month (default "All months")
  - Month options display as human-readable labels via `new Date(month + '-01').toLocaleString('en-ZA', { month: 'long', year: 'numeric' })` — option value stays YYYY-MM
  - On select change: build new URLSearchParams, call `router.push('/income?' + params.toString())`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.1, 7.2_

  - [ ]* 4.1 Write unit tests for `FilterBar`
    - `FilterBar` renders "All divisions" as default option
    - `FilterBar` renders "All months" as default option
    - Month options display human-readable labels (e.g. "March 2026") not raw YYYY-MM
    - _Requirements: 2.1, 2.2_

- [ ] 5. Implement `IncomeAddForm` client component at `apps/admin/src/components/income/income-add-form.tsx`
  - `'use client'` directive
  - Props: `divisions`, `clients`, `createAction`
  - Fields: date (type="date" required), divisionId (Select required), clientId (Select with leading "No client" option value=""), description (Input optional), amount (type="number" min="0.01" step="0.01" required)
  - Uses `useTransition` + `useRef` on `<form>` element
  - On submit: call `createAction(new FormData(formRef.current))`, on success reset form via `formRef.current.reset()`, on error set `errorMessage` state and display below form
  - Submit button label: "Add Income" / "Adding…" while pending
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 6.5_

- [ ] 6. Implement `IncomeTable` client component at `apps/admin/src/components/income/income-table.tsx`
  - `'use client'` directive
  - Props: `entries: IncomeRow[]`, `deleteAction`
  - State: `pendingDeleteId: string | null`
  - Renders shadcn `<Table>` with columns: Date | Division | Client | Description | Amount | Actions
  - Edit action: `<Link href={'/income/' + entry.id}>` with Pencil icon button — verifies R4.1
  - Delete action: trash icon sets `pendingDeleteId = entry.id`; when `pendingDeleteId === entry.id` show "Confirm" + "Cancel" buttons
  - "Confirm": calls `deleteAction(id)`, on `result.error` shows `toast.error(result.error)` via sonner
  - "Cancel": sets `pendingDeleteId = null`
  - No optimistic removal — page revalidation handles refresh on success
  - _Requirements: 1.2, 1.3, 4.1, 5.1, 5.2, 5.4, 5.5, 5.6_

  - [ ]* 6.1 Write unit tests for `IncomeTable`
    - Renders edit link with correct href `/income/<id>` for each row
    - Empty entries array renders no table rows
    - _Requirements: 1.2, 4.1_

- [ ] 7. Implement `IncomeEditForm` client component at `apps/admin/src/components/income/income-edit-form.tsx`
  - `'use client'` directive
  - Props: `entry: IncomeRow`, `divisions`, `clients`, `updateAction`
  - Same fields as `IncomeAddForm`, pre-populated with `entry` values
  - `entry.clientId === null` → pre-select "No client" option (value="")
  - Uses `useTransition` + `useRouter`; on success: `router.push('/income')`; on error: inline error display
  - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.8, 6.5_

- [ ] 8. Implement Income list page at `apps/admin/src/app/(admin)/income/page.tsx`
  - Replace stub with full Server Component
  - Props: `{ searchParams: Promise<{ divisionId?: string; month?: string }> }`
  - Await `searchParams`, then `Promise.all([getAllIncome({ divisionId, month }), getAllDivisions(), getAllClients(), getDistinctIncomeMonths()])`
  - Compute `runningTotal = entries.reduce((sum, e) => sum + Number(e.amount), 0)`
  - Render: page header + `formatZAR(runningTotal)`, `<FilterBar>`, `<IncomeAddForm createAction={createIncome}>`, `<IncomeTable deleteAction={deleteIncome}>` or empty-state message when `entries.length === 0`
  - Filter values read exclusively from `searchParams` — no client-side state
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 2.5, 2.6, 2.7, 2.8, 3.1, 3.3, 3.4, 7.1, 7.3, 7.4_

  - [ ]* 8.1 Write property test for running total computation
    - **Property 4: Running total equals sum of amounts in the result set**
    - **Validates: Requirements 1.4, 2.6, 7.4**
    - Use `fc.array(fc.float({ min: 0.01 }))` as amounts; assert reduce equals arithmetic sum
    - Tag: `// Feature: income-management, Property 4: Running total`
    - Minimum 100 iterations

  - [ ]* 8.2 Write unit test for empty-state rendering
    - When `entries = []`, renders empty-state message instead of table
    - _Requirements: 1.5_

- [ ] 9. Implement Income edit page at `apps/admin/src/app/(admin)/income/[id]/page.tsx`
  - Replace stub with full Server Component
  - Props: `{ params: Promise<{ id: string }> }`
  - Await `params`, call `getIncomeById(id)`, call `notFound()` from `next/navigation` if null
  - `Promise.all([getAllDivisions(), getAllClients()])` for form selects
  - Render: back link to `/income` + `<IncomeEditForm updateAction={updateIncome.bind(null, id)}>`
  - _Requirements: 4.2, 4.3, 4.5, 4.6, 4.9_

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- `getAllDivisions` must be checked for existence before adding — do not duplicate
- Property tests use fast-check with minimum 100 iterations each
- Test file location: `apps/admin/src/__tests__/income.test.ts` — follow pattern from `financial.test.ts`
- `revalidatePath` is only ever called inside the try block on success, never in catch
