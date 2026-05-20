# Requirements Document

## Introduction

This document covers Stage 2 (High Priority) of the PMG Control Center MVP v1 Readiness Plan.
Seven items (H1–H7) address gaps that will cause friction or data integrity issues within the
first week of real use. None of these block shipping, but all should be resolved before the
app handles sustained real financial data.

The items span three concerns:
- **Missing CRUD surfaces** - withdrawal history (H1) and lead create/delete (H2)
- **UX feedback gaps** - delete loading states (H3), success toasts (H4), date defaults (H5)
- **Data integrity / visual correctness** - withdrawal over-limit guard (H6) and close-month flash (H7)

H1–H5 and H7 are independent and can be implemented in parallel. H6 depends on H1 (the
withdrawal modal must exist before the guard can be added to it).

---

## Glossary

- **Admin**: The Next.js 16 admin application at `apps/admin`
- **DB Package**: The shared Drizzle ORM package at `packages/db`
- **WithdrawalHistory**: The new `/withdrawals` route and its supporting components
- **WithdrawModal**: The existing `withdraw-modal.tsx` dialog used to record a withdrawal from the dashboard
- **SalaryCard**: The existing `salary-card.tsx` dashboard component that displays owner salary and withdrawal state
- **CloseMonthButton**: The existing `close-month-button.tsx` client component that triggers the month-close action
- **DashboardShell**: The existing `dashboard-shell.tsx` client component that orchestrates the dashboard layout
- **LeadsTable**: The existing `leads-table.tsx` component that renders the leads list
- **formatZAR**: The existing currency formatter in `apps/admin/src/lib/format.ts`
- **revalidatePath**: Next.js cache invalidation function called after every mutating server action
- **useTransition**: React hook used in all client forms to track server action pending state
- **Sonner**: The toast notification library (`sonner`) already installed and configured in the Admin app
- **YTD**: Year-to-date - from January 1 of the current calendar year to today
- **maxAmount**: The computed remaining salary balance passed as a prop to WithdrawModal to enable the over-limit warning

---

## Requirements

---

### Requirement 1: Withdrawal History - Data Layer

**User Story:** As the business owner, I want to view, edit, and delete past withdrawal records,
so that I can correct mistakes and maintain an accurate financial history.

#### Acceptance Criteria

1. THE DB Package SHALL expose a `getAllWithdrawals()` query that returns all rows from the
   `withdrawals` table ordered by `date DESC`, then `created_at DESC`.

2. THE DB Package SHALL expose a `getWithdrawalById(id: string)` query that returns the single
   matching `withdrawals` row, or `null` when no row with that `id` exists.

3. WHEN `updateWithdrawal(id, formData)` is called with a valid `id`, `date`, and positive
   `amount`, THE Admin SHALL update the matching withdrawal row and call `revalidatePath` for
   both `/withdrawals` and `/dashboard`.

4. WHEN `updateWithdrawal(id, formData)` is called with an invalid payload (missing date,
   non-positive amount, or non-UUID id), THE Admin SHALL return `{ error: string }` without
   throwing or mutating the database.

5. WHEN `deleteWithdrawal(id)` is called with a valid `id`, THE Admin SHALL delete the matching
   withdrawal row and call `revalidatePath` for both `/withdrawals` and `/dashboard`.

6. IF `deleteWithdrawal` encounters a database error, THEN THE Admin SHALL return
   `{ error: string }` without throwing.

7. THE Admin SHALL never throw from `updateWithdrawal` or `deleteWithdrawal` - all errors
   MUST be returned as `{ error: string }`.

---

### Requirement 2: Withdrawal History - Pages and Components

**User Story:** As the business owner, I want a dedicated withdrawals page with a full history
table and an edit form, so that I can review and correct individual withdrawal records.

#### Acceptance Criteria

1. THE Admin SHALL provide a `/withdrawals` server component page that fetches all withdrawals
   via `getAllWithdrawals()` and renders a page header, a YTD total formatted with `formatZAR`,
   a `WithdrawalsTable` component, and an empty state when no withdrawals exist.

2. THE Admin SHALL provide a `/withdrawals/[id]` server component page that fetches the
   withdrawal via `getWithdrawalById(id)` and calls `notFound()` when the result is `null`.

3. THE Admin SHALL provide a `withdrawals-table.tsx` client component with columns: Date,
   Amount (formatted with `formatZAR`), Description, and Actions (edit link + delete with
   inline confirm/cancel).

4. THE Admin SHALL provide a `withdrawal-edit-form.tsx` client component that pre-populates
   the date, amount, and description fields from the existing withdrawal record and calls
   `router.push('/withdrawals')` on successful save.

5. WHEN a delete is confirmed in `WithdrawalsTable` and the server action returns an error,
   THE Admin SHALL display the error via `toast.error`.

6. THE Admin SHALL add a `Withdrawals` navigation item (icon: `Wallet` from lucide-react,
   href: `/withdrawals`) to `app-sidebar.tsx`.

7. THE Admin SHALL add a `date` input to the withdrawal recording flow (the `recordWithdrawal`
   action currently hard-codes today's date - the new edit form requires an explicit date field).

---

### Requirement 3: Lead Create and Delete in Admin

**User Story:** As the business owner, I want to manually add leads and remove junk entries
from the admin panel, so that the leads list reflects only real, actionable prospects.

#### Acceptance Criteria

1. THE Admin SHALL provide a `createLead(formData)` server action in
   `apps/admin/src/app/actions/leads.ts` that validates: `name` (required, min 1 char),
   `email` (optional, valid email format), `phone` (optional), `source` (optional),
   `serviceInterest` (optional), `divisionId` (optional, valid UUID), `message` (optional).

2. WHEN `createLead` is called and neither `email` nor `phone` is provided, THE Admin SHALL
   return `{ error: 'At least one of email or phone is required' }` without inserting.

3. WHEN `createLead` is called with a valid payload, THE Admin SHALL insert the lead with
   `status` defaulting to `'new'` and call `revalidatePath` for both `/leads` and `/dashboard`.

4. THE Admin SHALL provide a `deleteLead(id)` server action that deletes the matching lead
   row and calls `revalidatePath` for `/leads` and `/dashboard`.

5. IF `deleteLead` encounters a database error, THEN THE Admin SHALL return `{ error: string }`
   without throwing.

6. THE Admin SHALL provide a `lead-add-form.tsx` client component using `useTransition` and
   `useRef` with fields: name (required), email, phone, source, serviceInterest, divisionId
   (optional Select populated from divisions), and message (textarea).

7. WHEN `lead-add-form.tsx` submits successfully, THE Admin SHALL reset the form to its
   initial empty state.

8. WHEN `lead-add-form.tsx` receives a server error, THE Admin SHALL display the error message
   inline below the form.

9. THE `LeadsTable` component SHALL render a delete button for each row with inline
   confirm/cancel behaviour matching the pattern used in `income-table.tsx`.

10. WHEN a lead delete is confirmed in `LeadsTable` and the server action returns an error,
    THE Admin SHALL display the error via `toast.error`.

11. THE `/leads` server component page SHALL fetch `getAllDivisions()` and pass the result to
    `LeadAddForm` for the division select, and pass `deleteLead` to `LeadsTable`.

---

### Requirement 4: Delete Button Loading States

**User Story:** As the business owner, I want delete buttons to show a loading state while
the server action runs, so that the UI does not appear frozen during deletion.

#### Acceptance Criteria

1. WHEN a delete is confirmed in `income-table.tsx` and the server action is in flight,
   THE Admin SHALL disable the confirm button and display the label `"Deleting…"`.

2. WHEN a delete is confirmed in `income-table.tsx` and the server action resolves (success
   or error), THE Admin SHALL re-enable the confirm button.

3. WHEN a delete is confirmed in `expense-table.tsx` and the server action is in flight,
   THE Admin SHALL disable the confirm button and display the label `"Deleting…"`.

4. WHEN a delete is confirmed in `expense-table.tsx` and the server action resolves,
   THE Admin SHALL re-enable the confirm button.

5. WHILE a delete is in flight in `divisions-table.tsx`, THE Admin SHALL disable the confirm
   button and display the label `"Deleting…"`.

6. THE Admin SHALL use an `isPendingDelete` boolean state (or equivalent `useTransition`
   pending flag) to track the in-flight state - the pattern MUST NOT rely on a global
   loading indicator.

---

### Requirement 5: Success Toasts on Create and Update

**User Story:** As the business owner, I want a confirmation toast when I successfully create
or update a record, so that I know the action completed without having to check the table.

#### Acceptance Criteria

1. WHEN `income-add-form.tsx` submits successfully, THE Admin SHALL call
   `toast.success('Income added')` via the Sonner library.

2. WHEN `income-edit-form.tsx` saves successfully, THE Admin SHALL call
   `toast.success('Income updated')`.

3. WHEN `expense-add-form.tsx` submits successfully, THE Admin SHALL call
   `toast.success('Expense added')`.

4. WHEN `expense-edit-form.tsx` saves successfully, THE Admin SHALL call
   `toast.success('Expense updated')`.

5. WHEN `division-add-form.tsx` submits successfully, THE Admin SHALL call
   `toast.success('Division created')`.

6. WHEN `lead-status-form.tsx` saves successfully, THE Admin SHALL call
   `toast.success('Status updated')`.

7. WHEN `lead-notes-form.tsx` saves successfully, THE Admin SHALL call
   `toast.success('Notes saved')`.

8. THE Admin SHALL NOT add success toasts to delete actions - the row disappearing from
   the table is sufficient feedback.

9. THE Admin SHALL call `toast.success` only after confirming the server action returned
   no error (i.e. `result.error` is falsy).

---

### Requirement 6: Date Fields Default to Today

**User Story:** As the business owner, I want date inputs on add forms to default to today's
date, so that I do not have to manually select today every time I record a transaction.

#### Acceptance Criteria

1. WHEN `income-add-form.tsx` mounts, THE Admin SHALL set the date input's `defaultValue`
   to today's date in `YYYY-MM-DD` format.

2. WHEN `expense-add-form.tsx` mounts, THE Admin SHALL set the date input's `defaultValue`
   to today's date in `YYYY-MM-DD` format.

3. WHEN the withdrawal add/record form mounts (new component from H1), THE Admin SHALL set
   the date input's `defaultValue` to today's date in `YYYY-MM-DD` format.

4. THE Admin SHALL compute today's date as
   `new Date().toISOString().split('T')[0]` - a plain string constant defined once per
   component, not recalculated on every render.

5. THE Admin SHALL NOT change the `defaultValue` of any date input on edit forms
   (`income-edit-form.tsx`, `expense-edit-form.tsx`, `withdrawal-edit-form.tsx`) - edit
   forms MUST pre-populate from the existing record's date.

---

### Requirement 7: Withdrawal Over-Limit Guard

**User Story:** As the business owner, I want a warning when I try to withdraw more than my
remaining salary balance, so that I can avoid accidentally overdrawing my account.

#### Acceptance Criteria

1. THE `WithdrawModal` component SHALL accept a `maxAmount` prop of type `number` representing
   the remaining salary balance available for withdrawal.

2. WHEN the amount entered in `WithdrawModal` exceeds `maxAmount`, THE Admin SHALL display
   the warning message `"This exceeds your remaining balance of {formatZAR(maxAmount)}"` styled
   with `text-destructive`, immediately below the amount input.

3. WHEN the amount entered in `WithdrawModal` is less than or equal to `maxAmount`, THE Admin
   SHALL NOT display the over-limit warning.

4. THE `WithdrawModal` SHALL NOT block form submission when the over-limit warning is shown -
   the warning is advisory only.

5. THE `SalaryCard` component SHALL compute `remaining = Math.max(0, salary - withdrawn)` and
   pass `remaining` as the `maxAmount` prop to `WithdrawModal`.

6. THE `SalaryCard` SHALL ensure `remaining` is always a non-negative number - it SHALL NOT
   pass a negative value as `maxAmount`.

---

### Requirement 8: Close Month Button Flash Fix

**User Story:** As the business owner, I want the "Close Month" button to appear only after
the snapshot check has resolved, so that the dashboard does not flash an incorrect UI state
on load.

#### Acceptance Criteria

1. THE `DashboardShell` component SHALL receive a `hasSnapshot` boolean prop derived from the
   server-fetched `currentPeriodSnapshot` value, rather than performing a client-side fetch
   to determine snapshot state.

2. THE `CloseMonthButton` component SHALL accept a `hasSnapshot` boolean prop and use it to
   determine its initial render state, removing any client-side data fetching it currently
   performs.

3. WHEN `hasSnapshot` is `true`, THE `DashboardShell` SHALL render the `"Month closed"` badge
   and SHALL NOT render `CloseMonthButton`.

4. WHEN `hasSnapshot` is `false`, THE `DashboardShell` SHALL render `CloseMonthButton` and
   SHALL NOT render the `"Month closed"` badge.

5. THE dashboard `page.tsx` server component already fetches `currentPeriodSnapshot` via
   `getSnapshotByPeriod(currentPeriod)` - THE Admin SHALL derive `hasSnapshot` from this
   existing fetch result as `currentPeriodSnapshot !== null`, with no additional database
   query.

6. IF the snapshot-dependent UI cannot be resolved synchronously from the server component,
   THE Admin SHALL wrap the conditional section in a React `Suspense` boundary with a `null`
   fallback to prevent layout shift.

---

## Implementation Order

Per the readiness plan:

- H1 (Req 1 + 2), H2 (Req 3), H3 (Req 4), H4 (Req 5), H5 (Req 6), H7 (Req 8) are
  independent and can be implemented in parallel.
- H6 (Req 7) depends on H1 - the `WithdrawModal` component must exist before the
  `maxAmount` prop and over-limit warning can be added.
