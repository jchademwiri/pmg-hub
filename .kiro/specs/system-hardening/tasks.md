# Implementation Plan: System Hardening (Phase 9)

## Overview

Harden the PMG Control Center admin app across six areas: inline validation
feedback, error boundaries, loading skeletons, empty states, optimistic lead
status updates, and an updated database seed. Tasks follow the dependency chain:
shared components first, then per-route integration, then property-based and
integration tests.

## Tasks

- [x] 1. Create shared `EmptyState` component
  - Create `apps/admin/src/components/ui/empty-state.tsx` with props
    `message`, `ctaLabel?`, `ctaHref?`
  - Render a centered card with an icon, the message, and an optional CTA link
  - Accept a `filtered` boolean to switch between zero-data and filtered-zero
    message variants
  - _Requirements: 4.6, 4.7, 4.8_

  - [x] 1.1 Write property test for EmptyState (Property 2)
    - **Property 2: EmptyState renders its message and CTA for any input**
    - Generate arbitrary non-empty `message` strings and `ctaLabel`/`ctaHref`
      pairs with `fc.string()` / `fc.webUrl()`; render and assert both appear
    - Minimum 100 iterations
    - **Validates: Requirements 4.6, 4.7**

  - [x] 1.2 Write unit tests for EmptyState
    - Render with message + CTA; assert both present
    - Render without CTA; assert no link rendered
    - Render with `filtered=true`; assert filter-specific message shown
    - _Requirements: 4.6, 4.7, 4.8_

- [x] 2. Add `error.tsx` error boundary to `app/(admin)/`
  - Create `apps/admin/src/app/(admin)/error.tsx` as a `'use client'` component
  - Display a safe, non-technical user message - no `error.message` or stack
    trace in the UI
  - Render a "Try again" button that calls `reset()`
  - Render a navigation link to `/dashboard`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.1 Write unit tests for AdminError
    - Render with a mock error and `reset` spy; assert safe message shown
    - Assert "Try again" calls `reset()`
    - Assert `/dashboard` link is present
    - _Requirements: 2.2, 2.3, 2.4_

- [x] 3. Add `loading.tsx` skeleton to `app/(admin)/`
  - Create `apps/admin/src/app/(admin)/loading.tsx` (server component, no
    `'use client'`)
  - Use `<Skeleton>` from `@/components/ui/skeleton` to mirror a page header
    bar and a table with 5 placeholder rows
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.1 Write unit tests for AdminLoading
    - Render and assert `Skeleton` elements are present
    - _Requirements: 3.3_

- [x] 4. Harden Server Actions - wrap all actions in try/catch returning `{ error? }`
  - Audit every action in `apps/admin/src/app/actions/` (`createIncome`,
    `updateIncome`, `deleteIncome`, `createExpense`, `updateExpense`,
    `deleteExpense`, `updateLeadStatus`, `updateLeadNotes`, `createDivision`)
  - Replace any `parse()` calls with `safeParse()` and return
    `{ error: validationMessage }` on failure
  - Wrap database calls in `try/catch`; return `{ error: humanReadableMessage }`
    on failure - never re-throw
  - _Requirements: 1.1, 1.2, 1.6_

  - [x] 4.1 Write property test for Server Actions (Property 1)
    - **Property 1: Server Actions never throw - they always return `{ error? }`**
    - For each action, generate arbitrary `FormData` payloads with
      `fc.dictionary(fc.string(), fc.string())`; mock `db` to succeed or throw
      randomly; assert return value always matches `{ error?: string }` and
      never throws
    - Minimum 100 iterations per action
    - **Validates: Requirements 1.1, 1.2, 1.6**

- [x] 5. Checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Apply inline error display to all form components
  - For each form that calls a Server Action (income add/edit, expense add/edit,
    division add, lead status, lead notes): ensure `errorMessage` state is
    initialised, set on `{ error }` response, cleared on success, and rendered
    as `<p className="text-sm text-destructive">`
  - Ensure field values are preserved on error (state-managed inputs, not reset)
  - _Requirements: 1.3, 1.4, 1.5, 1.7_

  - [x] 6.1 Write unit tests for form inline errors
    - For each form: render with mock action returning `{ error: 'test error' }`,
      submit, assert error text appears and field values are preserved
    - Submit with mock action returning `{}`; assert error is cleared
    - _Requirements: 1.3, 1.4, 1.5, 1.7_

- [x] 7. Upgrade `LeadStatusForm` with optimistic updates
  - Add `useOptimistic(currentStatus)` to `LeadStatusForm`
  - On status select: call `setOptimisticStatus(newStatus)` then invoke the
    Server Action inside `startTransition`
  - Disable the selector while the transition is pending
  - On error: display inline error; optimistic state reverts automatically to
    `currentStatus`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 7.1 Write unit tests for LeadStatusForm optimistic update
    - Render with `currentStatus='new'`, select `'contacted'`, assert UI shows
      `'contacted'` before action resolves
    - Trigger action returning `{ error: '...' }`, assert status reverts to
      `'new'` and error message appears
    - Trigger successful action, assert status remains `'contacted'`
    - Assert selector is disabled while action is pending
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 8. Integrate `EmptyState` into list pages
  - `/income` - render `EmptyState` when `getAllIncome()` returns `[]`; include
    CTA to add income form; render filtered-empty variant when filter active
  - `/expenses` - render `EmptyState` when `getAllExpenses()` returns `[]`;
    include CTA to add expense form; filtered-empty variant
  - `/leads` - render `EmptyState` when `getAllLeads()` returns `[]`; include
    CTA to add lead; filtered-empty variant
  - `/divisions` - render `EmptyState` when `getAllDivisions()` returns `[]`;
    include CTA to add division
  - `/reports` - render `EmptyState` when no snapshot data is available
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.8_

- [x] 9. Update database seed in `packages/db/src/seed.ts`
  - Add expense rows covering ≥ 3 divisions (PMG, TES, AWS) and ≥ 3 categories
    (Salaries, Software, Marketing, Office, Travel) using
    `onConflictDoNothing()`
  - Add lead rows for all four statuses: `new`, `contacted`, `converted`, `lost`
    using `onConflictDoNothing()`
  - Add ≥ 1 snapshot row for a closed prior month with valid `PeriodSummary`
    numeric fields using `onConflictDoNothing()`
  - Preserve all existing Phase 0–3 seed data (divisions, clients, income,
    withdrawals)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 9.1 Write integration tests for seed idempotency
    - Run seed against a test database; assert expenses cover ≥ 3 distinct
      `divisionId` and ≥ 3 distinct `category` values
    - Assert leads table contains all four statuses
    - Assert snapshots table has ≥ 1 row with valid numeric fields
    - Run seed a second time; assert no errors and row counts unchanged
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Final checkpoint - ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` (already installed in `apps/admin`)
- Integration tests for the seed live in `packages/db/__tests__/seed.test.ts`
- No schema migrations are required - all six areas are additive hardening
