# Implementation Plan: MVP Stage 2 High Priority

## Overview

Implement eight high-priority items (H1–H7, mapped to Requirements 1–8) that close UX and
data-integrity gaps before the PMG Control Center handles sustained real financial data.
Tasks 1–6 are independent and can be executed in any order. Task 7 (H6 over-limit guard)
MUST follow Tasks 1–2 (H1 data layer and UI).

## Tasks

- [x] 1. H1 — Withdrawal History: Data Layer
  - [x] 1.1 Add `WithdrawalRow` type and `getAllWithdrawals()` to `packages/db/src/queries.ts`
    - Define `WithdrawalRow` type with fields: `id`, `date` (string), `amount` (string), `description` (string | null), `createdAt` (Date | null)
    - Implement `getAllWithdrawals()`: SELECT from `withdrawals` ORDER BY `date DESC`, `created_at DESC`
    - _Requirements: 1.1_

  - [x] 1.2 Write property test for `getAllWithdrawals` ordering invariant
    - **Property 1: getAllWithdrawals ordering invariant**
    - Generate arbitrary arrays of `{ date, createdAt }` pairs, insert, call `getAllWithdrawals()`, assert result is sorted by `date DESC` then `createdAt DESC`
    - Minimum 100 iterations; tag: `// Feature: mvp-stage2-high-priority, Property 1: getAllWithdrawals ordering invariant`
    - _Requirements: 1.1_

  - [x] 1.3 Add `getWithdrawalById(id)` to `packages/db/src/queries.ts`
    - Implement `getWithdrawalById(id: string)`: SELECT matching row or return `null`
    - _Requirements: 1.2_

  - [x] 1.4 Write property test for `getWithdrawalById` round-trip
    - **Property 2: getWithdrawalById round-trip**
    - Generate arbitrary `{ date, amount, description }` values, insert, retrieve by id, assert field equality; assert unknown UUIDs return `null`
    - Minimum 100 iterations; tag: `// Feature: mvp-stage2-high-priority, Property 2: getWithdrawalById round-trip`
    - _Requirements: 1.2_

  - [x] 1.5 Export `getAllWithdrawals`, `getWithdrawalById`, and `WithdrawalRow` from `packages/db/src/index.ts`
    - _Requirements: 1.1, 1.2_

  - [x] 1.6 Create `apps/admin/src/app/actions/withdrawals.ts` with `updateWithdrawal` and `deleteWithdrawal`
    - `updateWithdrawal(id, formData)`: Zod validation (date min 1, amount positive, description optional) → db.update → revalidatePath('/withdrawals') + revalidatePath('/dashboard') → return `{ error? }`
    - `deleteWithdrawal(id)`: db.delete where id → revalidatePath('/withdrawals') + revalidatePath('/dashboard') → return `{ error? }`
    - Both actions MUST never throw; wrap entire body in try/catch returning `{ error: string }`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7_

  - [x] 1.7 Write property test for `updateWithdrawal` validation gate
    - **Property 3: updateWithdrawal validation gate**
    - Generate invalid payloads (empty date, non-positive amount), assert `{ error }` returned and DB row unchanged
    - Minimum 100 iterations; tag: `// Feature: mvp-stage2-high-priority, Property 3: updateWithdrawal validation gate`
    - _Requirements: 1.4_

- [x] 2. H1 — Withdrawal History: Pages and Components
  - [x] 2.1 Create `apps/admin/src/app/(admin)/withdrawals/page.tsx` server component
    - Fetch `getAllWithdrawals()`; derive `ytdTotal` by filtering current year and summing `Number(w.amount)`
    - Render page header, `Badge` with `formatZAR(ytdTotal)` + "YTD", `WithdrawalsTable`, and empty state when no withdrawals
    - _Requirements: 2.1_

  - [x] 2.2 Create `apps/admin/src/app/(admin)/withdrawals/[id]/page.tsx` server component
    - Fetch `getWithdrawalById(params.id)`; call `notFound()` when result is `null`
    - Render back link to `/withdrawals` and `WithdrawalEditForm`
    - _Requirements: 2.2_

  - [x] 2.3 Create `apps/admin/src/components/withdrawals/withdrawals-table.tsx` client component
    - Props: `entries: WithdrawalRow[]`, `deleteAction: (id: string) => Promise<{ error?: string }>`
    - Columns: Date, Amount (`formatZAR`), Description, Actions (edit link with Pencil icon → `/withdrawals/[id]`, delete with inline confirm/cancel)
    - Implement `isPendingDelete` boolean state + `pendingDeleteId` state; `toast.error` on delete error
    - _Requirements: 2.3, 2.5_

  - [x] 2.4 Create `apps/admin/src/components/withdrawals/withdrawal-edit-form.tsx` client component
    - Props: `entry: WithdrawalRow`, `updateAction: (formData: FormData) => Promise<{ error?: string }>`
    - Fields: date (pre-populated from `entry.date`), amount (pre-populated), description (optional)
    - `useTransition`; on success call `router.push('/withdrawals')`; `toast.error` on error
    - _Requirements: 2.4, 2.7_

  - [x] 2.5 Add `Withdrawals` nav item to `apps/admin/src/components/layout/app-sidebar.tsx`
    - Import `Wallet` from `lucide-react`; add `{ href: '/withdrawals', label: 'Withdrawals', icon: Wallet }` to navItems
    - _Requirements: 2.6_

- [x] 3. Checkpoint — H1 complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. H2 — Lead Create and Delete
  - [x] 4.1 Add `createLead` and `deleteLead` to `apps/admin/src/app/actions/leads.ts`
    - `createLead(formData)`: Zod schema (name min 1, email optional valid email, phone optional, source optional, serviceInterest optional, divisionId optional UUID, message optional) with `.refine` requiring at least one of email or phone → db.insert with `status: 'new'` → revalidatePath('/leads') + revalidatePath('/dashboard')
    - `deleteLead(id)`: db.delete where id → revalidatePath('/leads') + revalidatePath('/dashboard') → return `{ error? }`; never throw
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Write property test for `createLead` contact requirement
    - **Property 4: createLead contact requirement**
    - Generate lead payloads with `email: undefined` and `phone: undefined`, assert `{ error: 'At least one of email or phone is required' }` returned and no row inserted
    - Minimum 100 iterations; tag: `// Feature: mvp-stage2-high-priority, Property 4: createLead contact requirement`
    - _Requirements: 3.2_

  - [x] 4.3 Create `apps/admin/src/components/leads/lead-add-form.tsx` client component
    - Props: `divisions: { id: string; name: string }[]`, `createAction: (formData: FormData) => Promise<{ error?: string }>`
    - Fields: name (required), email, phone, source, serviceInterest, divisionId (Select from divisions), message (textarea)
    - `useTransition` + `useRef`; on success reset form and clear controlled Select state; on error display inline error below form
    - _Requirements: 3.6, 3.7, 3.8_

  - [x] 4.4 Update `apps/admin/src/components/leads/leads-table.tsx` to add delete column
    - Add `deleteAction: (id: string) => Promise<{ error?: string }>` prop
    - Add `pendingDeleteId` + `isPendingDelete` state; Actions column with inline confirm/cancel matching `income-table.tsx` pattern
    - `toast.error` on delete error
    - _Requirements: 3.9, 3.10_

  - [x] 4.5 Update `apps/admin/src/app/(admin)/leads/page.tsx` to wire new actions and form
    - Ensure `getAllDivisions()` is fetched and passed to `LeadAddForm`
    - Pass `createLead` to `LeadAddForm`; pass `deleteLead` to `LeadsTable`
    - Render `LeadAddForm` above the table
    - _Requirements: 3.11_

- [x] 5. H3 — Delete Button Loading States
  - [x] 5.1 Add `isPendingDelete` pattern to `apps/admin/src/components/income/income-table.tsx`
    - Add `const [isPendingDelete, setIsPendingDelete] = React.useState(false)`
    - In `handleConfirmDelete`: `setIsPendingDelete(true)` before action, `setIsPendingDelete(false)` in `finally`
    - Confirm button: `disabled={isPendingDelete}`, label `{isPendingDelete ? 'Deleting…' : 'Confirm'}`
    - _Requirements: 4.1, 4.2, 4.6_

  - [x] 5.2 Align `apps/admin/src/components/expenses/expense-table.tsx` to `isPendingDelete` pattern
    - Replace existing `inFlightId` / `useTransition` approach with the canonical `isPendingDelete` boolean pattern
    - Confirm button: `disabled={isPendingDelete}`, label `{isPendingDelete ? 'Deleting…' : 'Confirm'}`
    - _Requirements: 4.3, 4.4, 4.6_

  - [x] 5.3 Verify `apps/admin/src/components/divisions/divisions-table.tsx` satisfies Req 4
    - Confirm `isDeletePending` (or equivalent) disables the confirm button and shows `"Deleting…"` during in-flight delete
    - Align to canonical pattern if any deviation found
    - _Requirements: 4.5, 4.6_

- [-] 6. H4 — Success Toasts on Create and Update
  - [x] 6.1 Add `toast.success` to income forms
    - `income-add-form.tsx`: add `toast.success('Income added')` in the `!result.error` branch; add `import { toast } from 'sonner'` if missing
    - `income-edit-form.tsx`: add `toast.success('Income updated')` in the `!result.error` branch
    - _Requirements: 5.1, 5.2, 5.9_

  - [~] 6.2 Add `toast.success` to expense forms
    - `expense-add-form.tsx`: add `toast.success('Expense added')` in the `!result.error` branch
    - `expense-edit-form.tsx`: add `toast.success('Expense updated')` in the `!result.error` branch
    - _Requirements: 5.3, 5.4, 5.9_

  - [~] 6.3 Add `toast.success` to division and lead forms
    - `division-add-form.tsx`: add `toast.success('Division created')` in the `!result.error` branch
    - `lead-status-form.tsx`: add `toast.success('Status updated')` in the `!result.error` branch
    - `lead-notes-form.tsx`: add `toast.success('Notes saved')` in the `!result.error` branch
    - Add `import { toast } from 'sonner'` to any file that doesn't already import it
    - _Requirements: 5.5, 5.6, 5.7, 5.9_

- [ ] 7. H5 — Date Fields Default to Today
  - [~] 7.1 Add `defaultValue={today}` to date input in `apps/admin/src/components/income/income-add-form.tsx`
    - Define `const today = new Date().toISOString().split('T')[0]` once at component top, outside render
    - Set `defaultValue={today}` on the date `<Input>`
    - _Requirements: 6.1, 6.4_

  - [~] 7.2 Add `defaultValue={today}` to date input in `apps/admin/src/components/expenses/expense-add-form.tsx`
    - Define `const today = new Date().toISOString().split('T')[0]` once at component top, outside render
    - Set `defaultValue={today}` on the date `<Input>`
    - _Requirements: 6.2, 6.4_

- [ ] 8. H7 — Close Month Flash Fix
  - [~] 8.1 Derive `hasSnapshot` in `apps/admin/src/app/(admin)/dashboard/page.tsx` and pass to `DashboardShell`
    - Add `const hasSnapshot = currentPeriodSnapshot !== null` (no additional DB query)
    - Pass `hasSnapshot={hasSnapshot}` to `<DashboardShell>`
    - _Requirements: 8.1, 8.5_

  - [~] 8.2 Update `apps/admin/src/components/dashboard/dashboard-shell.tsx` to accept and use `hasSnapshot` prop
    - Add `hasSnapshot: boolean` to Props type
    - Replace existing snapshot conditional: render `<Badge variant="secondary">Month closed</Badge>` when `hasSnapshot` is `true`; render `<CloseMonthButton period={currentPeriod} hasSnapshot={hasSnapshot} />` when `false`
    - Remove `currentPeriodSnapshot` prop if no longer used elsewhere in the component
    - If snapshot-dependent UI cannot resolve synchronously, wrap in `<Suspense fallback={null}>`
    - _Requirements: 8.1, 8.3, 8.4, 8.6_

  - [~] 8.3 Write property test for `DashboardShell` snapshot-conditional rendering
    - **Property 7: DashboardShell snapshot-conditional rendering**
    - Generate arbitrary `hasSnapshot: boolean`, render `DashboardShell`, assert exactly one of badge or button is rendered matching the `hasSnapshot` value
    - Minimum 100 iterations; tag: `// Feature: mvp-stage2-high-priority, Property 7: DashboardShell snapshot-conditional rendering`
    - _Requirements: 8.3, 8.4_

  - [~] 8.4 Update `apps/admin/src/components/dashboard/close-month-button.tsx` to accept `hasSnapshot` prop
    - Add `hasSnapshot: boolean` to props; use it as initial render state to avoid flash
    - Remove any client-side snapshot fetch the component currently performs
    - _Requirements: 8.2_

- [~] 9. Checkpoint — H2–H5, H7 complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. H6 — Withdrawal Over-Limit Guard (depends on Tasks 1–2)
  - [~] 10.1 Add `maxAmount` prop and over-limit warning to `apps/admin/src/components/dashboard/withdraw-modal.tsx`
    - Add `maxAmount: number` to `WithdrawModalProps`
    - Add `const [enteredAmount, setEnteredAmount] = React.useState<number | null>(null)` and `const isOverLimit = enteredAmount !== null && enteredAmount > maxAmount`
    - Wire `onChange` on the amount input to update `enteredAmount`
    - Render `<p className="text-sm text-destructive">This exceeds your remaining balance of {formatZAR(maxAmount)}</p>` below the input when `isOverLimit` is true
    - Warning is advisory — do NOT block form submission
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [~] 10.2 Write property test for `WithdrawModal` over-limit warning visibility
    - **Property 5: WithdrawModal over-limit warning visibility**
    - Generate arbitrary `(maxAmount: number, enteredAmount: number)` pairs, render the component, assert warning is shown iff `enteredAmount > maxAmount`
    - Minimum 100 iterations; tag: `// Feature: mvp-stage2-high-priority, Property 5: WithdrawModal over-limit warning visibility`
    - _Requirements: 7.2, 7.3_

  - [~] 10.3 Compute `remaining` in `apps/admin/src/components/dashboard/salary-card.tsx` and pass to `WithdrawModal`
    - Add `const remaining = Math.max(0, salary - withdrawn)` after the existing `withdrawn` derivation
    - Pass `maxAmount={remaining}` to `<WithdrawModal>`
    - _Requirements: 7.5, 7.6_

  - [~] 10.4 Write property test for `SalaryCard` remaining balance computation
    - **Property 6: SalaryCard remaining balance computation**
    - Generate arbitrary `(salary: number, withdrawn: number)` pairs including cases where `withdrawn > salary`, assert `remaining === Math.max(0, salary - withdrawn)`
    - Minimum 100 iterations; tag: `// Feature: mvp-stage2-high-priority, Property 6: SalaryCard remaining balance computation`
    - _Requirements: 7.5, 7.6_

- [~] 11. Final Checkpoint — All tasks complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Tasks 1–8 (H1 data layer through H7) are independent and can run in parallel
- Task 10 (H6 over-limit guard) MUST follow Tasks 1–2 (H1 data layer and UI)
- All property tests use fast-check with a minimum of 100 iterations
- All server actions follow the never-throw contract: entire body wrapped in try/catch returning `{ error: string }`
- New files follow existing conventions established in `income.ts`, `income-table.tsx`, and `income-add-form.tsx`
