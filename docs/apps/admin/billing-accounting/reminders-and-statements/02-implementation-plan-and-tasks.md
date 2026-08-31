# Strategic Billing Reminders & Statement Schedule Implementation Plan

**Document Version:** 1.0  
**Status:** Ready for Execution  
**Target Applications:** `apps/admin`, `packages/db`, `packages/billing`, `packages/emails`

---

## 1. Overview & Strategy

This document outlines the phased technical roadmap for implementing the **3-Stage Monthly Billing & Statement Lifecycle** across the PMG Hub repository:
1. **25th of Month**: Invoicing cut-off. All invoices default `dueDate` to the last day of the current month.
2. **26th of Month (09:00 SAST)**: Retainer clients with `balance > 0` receive a consolidated Monthly Statement (current month invoices + carried-forward balance).
3. **15th of Month (09:00 SAST)**: Mid-month overdue-only reminder sent strictly for prior unpaid balances (`dueDate < today`). Current month invoices are ignored.
4. **Last Day of Month (09:00 SAST)**: Month-end statement & payment due notice sent to all clients with an open balance (`balance > 0`).

---

## 2. Detailed Task List

### Phase 1: Universal End-of-Month Due Date Engine
- [ ] **Task 1.1**: Update `getEndOfMonth` helper in `apps/admin/src/lib/format.ts` and `packages/billing/src/format.ts` to guarantee safe SAST timezone handling and correct leap-year calculations.
- [ ] **Task 1.2**: Update `apps/admin/src/actions/billing/invoices.ts`:
  - `createInvoice`: Default missing or empty `dueDate` to `getEndOfMonth(invoiceDate)`.
  - `convertQuoteToInvoice`: Change due date calculation from `+ paymentTermsDays` to `getEndOfMonth(invoiceDate)`.
- [ ] **Task 1.3**: Update `apps/admin/src/actions/billing/recurring.ts`:
  - In `triggerRecurringBillingRun`: Ensure generated retainer invoices always have `dueDate = getEndOfMonth(invoiceDate)`.
- [ ] **Task 1.4**: Update `apps/admin/src/app/(admin)/billing/invoices/new/invoice-form-client.tsx`:
  - Default due date to `getEndOfMonth(invoiceDate)` and dynamically update it when `invoiceDate` changes unless manually overridden.

### Phase 2: Cron Jobs & Automated Lifecycle Dispatchers
- [ ] **Task 2.1**: Refactor `apps/admin/src/app/api/cron/outstanding-reminders/route.ts` & `apps/admin/src/actions/billing/automated-statements.ts`:
  - **26th Day Sweep**: Retainer clients with positive balance receive consolidated monthly statements (invoices issued this month + carried-forward balance).
  - **Last Day of Month Sweep**: All clients with positive balance receive month-end statement & payment due notice.
  - **15th Day Sweep**: Overdue-only reminder sweep (strictly filter `dueDate < today`, ignoring current month invoices).
- [ ] **Task 2.2**: Update `apps/admin/vercel.json` and cron authentication to ensure daily execution at 07:00 UTC (09:00 SAST).

### Phase 3: Statement Email Template & Carried-Forward Data Structure
- [ ] **Task 3.1**: Enhance Statement email data payload (`StatementDeliveryEmail` / context) to explicitly list:
  - Carried-forward balance from previous months.
  - Invoices issued in the current month.
  - Payments received in the current month.
  - Net outstanding balance.
- [ ] **Task 3.2**: Verify Statement PDF generation attaches correct transaction history and aging breakdown.

### Phase 4: Admin UI & Interactive Overdue Reminders Modal
- [ ] **Task 4.1**: Update `apps/admin/src/actions/billing/reminders.ts` to return `isRetainer` status and categorize overdue vs current balances.
- [ ] **Task 4.2**: Update `apps/admin/src/components/billing/send-overdue-reminders-button.tsx` with tabs (`All`, `Ad-Hoc`, `Retainers`) and retainer visual indicators.

### Phase 5: Verification & Automated Tests
- [ ] **Task 5.1**: Write Vitest unit tests for due date generation across 28, 29, 30, and 31-day months.
- [ ] **Task 5.2**: Write tests for the 26th Retainer statement run, Last Day all-client statement run, and 15th overdue-only reminder logic.
- [ ] **Task 5.3**: Run pre-flight linting and typecheck.
