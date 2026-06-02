# Requirements Document

## Introduction

Phase 9 hardens the PMG Control Center admin app for real daily use. The focus
is on six areas: consistent inline validation feedback from Server Actions,
error boundaries that prevent blank pages on unhandled errors, per-route loading
skeletons, graceful empty states on every list page, optimistic UI for lead
status changes, and an updated database seed that reflects all schema additions
from Phases 4–8.

Auth is explicitly out of scope - it is deferred to Phase 10.

---

## Glossary

- **Server_Action**: A Next.js `'use server'` function that mutates data and
  returns `{ error?: string }`.
- **Error_Boundary**: A Next.js `error.tsx` file that catches unhandled runtime
  errors within a route segment and renders a recovery UI.
- **Loading_UI**: A Next.js `loading.tsx` file that renders a skeleton while a
  route segment's async data is being fetched (Suspense boundary).
- **Empty_State**: A UI component rendered in place of a list when the data set
  contains zero items, including a call-to-action to guide the user.
- **Optimistic_Update**: A client-side state change applied immediately via
  `useOptimistic`, before the Server Action response is received.
- **Seed_File**: The `packages/db/src/seed.ts` script that populates the
  database with representative data for development and testing.
- **Admin_Route_Group**: The `app/(admin)/` Next.js route group containing
  dashboard, income, expenses, leads, divisions, and reports.
- **Inline_Error**: A validation message rendered adjacent to the form field
  that caused the error, not as a toast notification.
- **Skeleton**: A placeholder UI element that mirrors the shape of real content
  and is shown while data loads.

---

## Requirements

### Requirement 1: Inline Validation Feedback

**User Story:** As an admin user, I want validation errors to appear next to the
field that caused them, so that I can correct my input without losing context.

#### Acceptance Criteria

1. THE Server_Action SHALL return `{ error: string }` when Zod validation fails,
   containing a human-readable description of the first validation error.
2. THE Server_Action SHALL return `{ error: string }` when a database operation
   fails, containing a non-technical error message safe to display in the UI.
3. WHEN a Server_Action returns `{ error: string }`, THE form component SHALL
   display the error message as an Inline_Error adjacent to the relevant field.
4. WHEN a Server_Action returns `{ error: string }`, THE form component SHALL
   NOT navigate away from the current page.
5. WHEN a Server_Action succeeds, THE form component SHALL clear any previously
   displayed Inline_Error messages.
6. THE Server_Action SHALL NOT throw an unhandled exception - all errors MUST be
   caught and returned as `{ error: string }`.
7. WHEN a Server_Action returns `{ error: string }`, THE form component SHALL
   preserve the user's existing field values so the user does not need to
   re-enter data.

---

### Requirement 2: Error Boundaries

**User Story:** As an admin user, I want unhandled runtime errors to show a
recovery UI, so that I can continue using the app without a full page reload.

#### Acceptance Criteria

1. THE Admin_Route_Group SHALL contain an `error.tsx` file that renders a
   recovery UI when an unhandled error propagates to the route group boundary.
2. WHEN an unhandled error is caught by the Error_Boundary, THE Error_Boundary
   SHALL display a user-facing message that does not expose internal error
   details or stack traces.
3. WHEN an unhandled error is caught by the Error_Boundary, THE Error_Boundary
   SHALL provide a "Try again" action that calls the Next.js `reset` function to
   attempt recovery without a full page reload.
4. WHEN an unhandled error is caught by the Error_Boundary, THE Error_Boundary
   SHALL provide a navigation link back to `/dashboard` so the user can return
   to a known-good state.
5. THE `error.tsx` component SHALL be a `'use client'` component, as required by
   Next.js for error boundary files.

---

### Requirement 3: Loading States

**User Story:** As an admin user, I want to see a skeleton placeholder while a
page is loading, so that I know the app is working and not frozen.

#### Acceptance Criteria

1. THE Admin_Route_Group SHALL contain a `loading.tsx` file at the route group
   level that renders a Skeleton matching the general page layout.
2. WHEN a route within the Admin_Route_Group is navigated to, THE Loading_UI
   SHALL be displayed until the route segment's async data fetch completes.
3. THE Loading_UI SHALL use shadcn/ui `Skeleton` primitives to mirror the
   approximate shape of the page content (header, table rows, or card grid).
4. THE Loading_UI SHALL be visually consistent with the existing PMG admin theme
   (dark background, OKLCH tokens, sidebar layout preserved).
5. WHEN the async data fetch completes, THE Loading_UI SHALL be replaced by the
   actual page content without a visible flash.

---

### Requirement 4: Empty States

**User Story:** As an admin user, I want list pages to show a helpful message
when there is no data, so that I understand what to do next instead of seeing a
blank area.

#### Acceptance Criteria

1. WHEN `getAllIncome()` returns zero entries, THE income list page SHALL render
   an Empty_State component in place of the income table.
2. WHEN `getAllExpenses()` returns zero entries, THE expenses list page SHALL
   render an Empty_State component in place of the expenses table.
3. WHEN `getAllLeads()` returns zero entries, THE leads list page SHALL render an
   Empty_State component in place of the leads list.
4. WHEN `getAllDivisions()` returns zero entries, THE divisions list page SHALL
   render an Empty_State component in place of the divisions table.
5. WHEN the reports page has no data to display, THE reports page SHALL render
   an Empty_State component in place of the chart area.
6. THE Empty_State component SHALL display a short descriptive message
   explaining why the list is empty.
7. THE Empty_State component SHALL display a call-to-action that directs the
   user to the relevant add form or action (where one exists for that page).
8. IF a filter is active and produces zero results, THEN THE list page SHALL
   render an Empty_State component that indicates no results match the current
   filter, distinct from the zero-data state.

---

### Requirement 5: Optimistic Lead Status Updates

**User Story:** As an admin user, I want lead status changes to reflect
immediately in the UI, so that the interface feels responsive even on slow
connections.

#### Acceptance Criteria

1. WHEN the user selects a new status for a lead, THE leads detail component
   SHALL apply an Optimistic_Update via `useOptimistic` before the Server_Action
   completes.
2. WHILE the Server_Action is pending, THE leads detail component SHALL display
   the optimistically updated status in the UI.
3. WHEN the Server_Action completes successfully, THE leads detail component
   SHALL retain the updated status as the confirmed state.
4. IF the Server_Action returns `{ error: string }`, THEN THE leads detail
   component SHALL revert the displayed status to the value it held before the
   Optimistic_Update was applied.
5. IF the Server_Action returns `{ error: string }`, THEN THE leads detail
   component SHALL display the error message as an Inline_Error adjacent to the
   status selector.
6. WHILE the Server_Action is pending, THE status selector SHALL be disabled to
   prevent concurrent conflicting updates.

---

### Requirement 6: Database Seed Update

**User Story:** As a developer, I want the seed file to reflect all schema
changes from Phases 4–8, so that a fresh development environment has
representative data for every feature.

#### Acceptance Criteria

1. THE Seed_File SHALL insert representative rows into the `expenses` table
   covering at least 3 divisions and 3 distinct categories.
2. THE Seed_File SHALL insert representative rows into the `leads` table covering
   all four lead statuses: `new`, `contacted`, `converted`, and `lost`.
3. THE Seed_File SHALL insert at least one row into the `snapshots` table
   representing a closed prior month with valid `PeriodSummary` values.
4. WHEN the Seed_File is executed against an empty database, THE Seed_File SHALL
   complete without error and leave the database in a queryable state.
5. WHEN the Seed_File is executed against a database that already contains seed
   data, THE Seed_File SHALL use upsert semantics (insert or ignore / on
   conflict do nothing) to avoid duplicate-key errors.
6. THE Seed_File SHALL preserve all existing seed data from Phases 0–3
   (divisions, clients, income, withdrawals) so that no previously seeded data
   is lost.
