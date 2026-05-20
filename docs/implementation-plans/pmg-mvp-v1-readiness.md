# PMG Control Center - MVP v1 Readiness Plan

> **Internal developer reference · Playhouse Media Group**
> `pmg-hub / docs / pmg-mvp-v1-readiness.md` · April 2026 · v1.0
>
> Consolidated pre-ship audit. Covers every identified gap, assigns a stage,
> and includes a self-contained AI prompt per item.
> Auth (Better Auth / magic link) is out of scope for MVP v1 - tracked in Phase 10.

---

## Table of Contents

1. [Current State Summary](#1-current-state-summary)
2. [Gap Overview](#2-gap-overview)
3. [Stage 1 - Blockers](#3-stage-1--blockers-ship-critical)
4. [Stage 2 - High Priority](#4-stage-2--high-priority)
5. [Stage 3 - Medium Priority](#5-stage-3--medium-priority)
6. [Stage 4 - Polish and Scale](#6-stage-4--polish--scale)
7. [Implementation Order](#7-implementation-order)

---

## 1. Current State Summary

Phases 0–9 are complete. The app is functionally operational.

| Route | Status |
|---|---|
| `/dashboard` | Complete |
| `/income` + `/income/[id]` | Complete |
| `/expenses` + `/expenses/[id]` | Complete |
| `/leads` + `/leads/[id]` | Complete (read/update only) |
| `/divisions` | Complete |
| `/snapshots` | Complete |
| `/reports` | Complete |
| `/clients` | MISSING entirely |
| `/withdrawals` | No dedicated page |
| `/login` | Stub - auth deferred to Phase 10 |

**Stack:** Next.js 16 · React 19 · TypeScript · Drizzle ORM · Neon PostgreSQL · Tailwind v4 · shadcn/ui · Recharts · Sonner · Zod · Bun · Turborepo

---

## 2. Gap Overview

### CRUD Coverage

| Entity | Create | Read | Update | Delete |
|---|---|---|---|---|
| Income | Yes | Yes | Yes | Yes |
| Expenses | Yes | Yes | Yes | Yes |
| Divisions | Yes | Yes | Yes | Yes |
| Clients | NO | Yes (via income) | NO | NO |
| Leads | NO | Yes | Yes (status/notes only) | NO |
| Withdrawals | Yes | Yes (dashboard only) | NO | NO |
| Snapshots | Yes | Yes | NO | NO |

### All Identified Gaps

| # | Gap | Source | Stage |
|---|---|---|---|
| 1 | `clientId` is optional on income - must be required | Owner rule | Blocker |
| 2 | No `/clients` page - cannot add/edit/delete clients | Codebase scan | Blocker |
| 3 | Expense categories are freetext - typos cause chart drift | Codebase scan | Blocker |
| 4 | Breadcrumb hardcoded to "Dashboard" on every page | Codebase scan | Blocker |
| 5 | `formatZAR` missing on income table amount column | Codebase scan | Blocker |
| 6 | No withdrawal history page or edit/delete | Owner + scan | High |
| 7 | No lead create or delete in admin | Owner + scan | High |
| 8 | Delete buttons have no loading/pending state | Codebase scan | High |
| 9 | No success toast on create/update - only errors shown | Codebase scan | High |
| 10 | Date fields do not default to today | Codebase scan | High |
| 11 | Close month button flashes before snapshot check resolves | Codebase scan | High |
| 12 | Withdrawal over-limit has no guard | Codebase scan | High |
| 13 | No pagination - all rows loaded at once | Codebase scan | Medium |
| 14 | Leads notes textarea style inconsistent with other inputs | Codebase scan | Medium |
| 15 | Dashboard loading skeleton does not match actual layout | Codebase scan | Medium |
| 16 | No client revenue report | Owner | Medium |

---

## 3. Stage 1 - Blockers (ship-critical)

Must be resolved before the app handles real financial data.
B2 and B1 are coupled - build B2 first.

---

### B2 - /clients Page (build first)

The `clients` table exists with full schema. There is no route, no server actions,
no UI. Clients can only be selected in the income form - there is no way to add one.

**Files needed:**
- `apps/admin/src/app/actions/clients.ts`
- `apps/admin/src/app/(admin)/clients/page.tsx`
- `apps/admin/src/app/(admin)/clients/[id]/page.tsx`
- `apps/admin/src/components/clients/client-add-form.tsx`
- `apps/admin/src/components/clients/clients-table.tsx`
- `apps/admin/src/components/clients/client-edit-form.tsx`
- Add `Clients` nav item to `app-sidebar.tsx`
- Add `getClientsWithIncomeCount()` and `getClientById()` to `packages/db/src/queries.ts`

**AI Prompt - B2:**

    Build a full /clients page for this Next.js 16 app following the exact patterns
    used in /divisions and /income.

    Schema (packages/db/src/schema/clients.ts):
      clients(id uuid PK, name text NOT NULL, businessName text, email text, phone text,
              createdAt timestamptz, updatedAt timestamptz)
      Unique partial index on email WHERE email IS NOT NULL.

    1. apps/admin/src/app/actions/clients.ts
       createClient(formData): Zod { name: string.min(1), businessName?: string,
         email?: string.email(), phone?: string }. Insert. revalidatePath('/clients').
       updateClient(id, formData): same schema. Update where id. revalidatePath('/clients').
       deleteClient(id): delete where id. income.clientId is onDelete:'set null' so safe.
         revalidatePath('/clients').
       All return Promise<{ error?: string }>. Never throw.

    2. apps/admin/src/components/clients/client-add-form.tsx
       'use client'. useTransition + useRef (same as income-add-form.tsx).
       Fields: name (required), businessName, email, phone.
       On success: reset form. On error: inline error message.

    3. apps/admin/src/components/clients/clients-table.tsx
       'use client'. shadcn Table.
       Columns: Name, Business Name, Email, Phone, Income Count, Actions.
       Edit: Link to /clients/[id]. Delete: inline confirm/cancel with pendingDeleteId state.
       Error feedback via sonner toast.error.

    4. apps/admin/src/app/(admin)/clients/page.tsx
       Server component. Fetch getClientsWithIncomeCount().
       Render: page header, ClientAddForm, ClientsTable or empty state.

    5. apps/admin/src/app/(admin)/clients/[id]/page.tsx
       Server component. getClientById(id) → notFound() if null.
       Render: back link + ClientEditForm.

    6. apps/admin/src/components/clients/client-edit-form.tsx
       'use client'. Pre-populated fields. On success: router.push('/clients').

    7. packages/db/src/queries.ts - add:
       getClientsWithIncomeCount(): SELECT clients.*, COUNT(income.id) as incomeCount
         FROM clients LEFT JOIN income ON income.client_id = clients.id
         GROUP BY clients.id ORDER BY clients.name ASC
       getClientById(id): SELECT * FROM clients WHERE id = $id

    8. apps/admin/src/components/layout/app-sidebar.tsx
       Add { href: '/clients', label: 'Clients', icon: UserCheck } to navItems.
       Import UserCheck from lucide-react.

    Follow all existing patterns: Zod, revalidatePath, useTransition, sonner, shadcn, formatZAR.

---

### B1 - Enforce clientId Required on Income (do after B2)

Owner rule: all income must have a client. Currently clientId is nullable at every
layer - schema, server action, and UI all allow "No client".

**Files to change:**
- `packages/db/src/schema/income.ts` - remove nullable on clientId
- Drizzle migration - handle existing nulls, then ALTER COLUMN SET NOT NULL
- `apps/admin/src/app/actions/income.ts` - make clientId required in Zod
- `apps/admin/src/components/income/income-add-form.tsx` - remove NO_CLIENT sentinel
- `apps/admin/src/components/income/income-edit-form.tsx` - remove "No client" option

**AI Prompt - B1:**

    Make clientId required on all income entries in this Next.js 16 / Drizzle app.

    Current state:
    - packages/db/src/schema/income.ts: clientId is nullable
    - apps/admin/src/app/actions/income.ts: clientId is z.string().uuid().optional()
    - income-add-form.tsx: has NO_CLIENT sentinel '__none__'
    - income-edit-form.tsx: has "No client" option

    1. packages/db/src/schema/income.ts
       Change: uuid("client_id").notNull().references(() => clients.id, { onDelete: "restrict" })
       onDelete changes from 'set null' to 'restrict' - cannot delete a client with income.

    2. Drizzle migration:
       UPDATE income SET client_id = (SELECT id FROM clients LIMIT 1) WHERE client_id IS NULL
       ALTER TABLE income ALTER COLUMN client_id SET NOT NULL

    3. apps/admin/src/app/actions/income.ts
       Change clientId from z.string().uuid().optional() to z.string().uuid()
       Remove the 'if (raw.clientId === "") delete raw.clientId' normalisation line.

    4. apps/admin/src/components/income/income-add-form.tsx
       Remove NO_CLIENT constant and '__none__' sentinel.
       Remove "No client" SelectItem.
       Default clientId state to '' with "Select client" placeholder.
       Show inline error if no client selected on submit.

    5. apps/admin/src/components/income/income-edit-form.tsx
       Remove "No client" option. Pre-select entry.clientId (always non-null after migration).

    Do not change any other files. Follow existing patterns.

---

### B3 - Expense Category Management

Categories are stored as freetext strings. Typos create phantom categories that
break the expense-by-category chart grouping (e.g. "Software" vs "software" are
treated as different categories). A managed table fixes this permanently.

**Files needed:**
- `packages/db/src/schema/expense-categories.ts` - new table
- Drizzle migration - create table, seed from existing distinct categories
- `apps/admin/src/app/actions/expense-categories.ts`
- `apps/admin/src/app/(admin)/expense-categories/page.tsx`
- `apps/admin/src/components/expense-categories/expense-category-add-form.tsx`
- `apps/admin/src/components/expense-categories/expense-categories-table.tsx`
- Update `expense-add-form.tsx` and `expense-edit-form.tsx` - replace datalist with Select
- Add Categories nav item to sidebar

**AI Prompt - B3:**

    Add expense category management to this Next.js 16 / Drizzle app.

    1. packages/db/src/schema/expense-categories.ts
       Table: expense_categories(id uuid PK defaultRandom, name text NOT NULL UNIQUE,
                                  createdAt timestamptz defaultNow NOT NULL)
       Export from packages/db/src/schema/index.ts.

    2. Drizzle migration:
       CREATE TABLE expense_categories ...
       INSERT INTO expense_categories (name)
         SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL ORDER BY category
       (seeds all existing categories automatically)

    3. packages/db/src/queries.ts - add:
       getAllExpenseCategories(): SELECT id, name FROM expense_categories ORDER BY name ASC
       getExpenseCategoryById(id): SELECT * WHERE id = $id

    4. apps/admin/src/app/actions/expense-categories.ts
       createExpenseCategory(formData): { name: z.string().min(1).max(100) }
         Insert. revalidatePath('/expense-categories'). revalidatePath('/expenses').
       updateExpenseCategory(id, formData): same schema. Update. revalidatePaths.
       deleteExpenseCategory(id): check if any expenses use this category name first.
         If yes: return { error: 'Category is in use by existing expenses' }.
         If no: delete. revalidatePaths.
       All return Promise<{ error?: string }>. Never throw.

    5. apps/admin/src/app/(admin)/expense-categories/page.tsx
       Server component. getAllExpenseCategories(). Same layout as /divisions.
       Render: add form + table or empty state.

    6. apps/admin/src/components/expense-categories/
       expense-category-add-form.tsx - inline add, name field only
       expense-categories-table.tsx - columns: Name, Expense Count, Actions (edit/delete)

    7. apps/admin/src/components/expenses/expense-add-form.tsx
       Replace the <datalist> text input with a shadcn <Select>.
       Prop change: categories: string[] → categories: { id: string; name: string }[]
       Submit the category name (not id) to keep expenses.category as plain text.

    8. apps/admin/src/components/expenses/expense-edit-form.tsx
       Same Select replacement as add form.

    9. apps/admin/src/components/layout/app-sidebar.tsx
       Add { href: '/expense-categories', label: 'Categories', icon: Tag } to navItems.
       Import Tag from lucide-react.

    Export getAllExpenseCategories from packages/db/src/index.ts.
    Follow all existing patterns.

---

### B4 - Fix Hardcoded "Dashboard" Breadcrumb

Every page shows "Dashboard" in the breadcrumb regardless of the current route.
`top-nav.tsx` is already a client component so `usePathname` can be added directly.

**AI Prompt - B4:**

    Fix the breadcrumb in apps/admin/src/components/layout/top-nav.tsx.

    Current issue: breadcrumb label is hardcoded to "Dashboard" on every page.

    Fix:
    - Import usePathname from 'next/navigation'
    - Map the first path segment to a human-readable label:
        /dashboard          → 'Dashboard'
        /income             → 'Income'
        /expenses           → 'Expenses'
        /leads              → 'Leads'
        /divisions          → 'Divisions'
        /clients            → 'Clients'
        /withdrawals        → 'Withdrawals'
        /snapshots          → 'Snapshots'
        /reports            → 'Reports'
        /expense-categories → 'Expense Categories'
        fallback            → capitalise the segment
    - For detail pages (/income/[id], /clients/[id] etc.) show two breadcrumb items:
        e.g. Income > Edit Entry
    - Do not change any other files.

---

### B5 - Apply formatZAR to Income Table Amount Column

The income table renders raw numeric strings (e.g. "15000.00") instead of
formatted ZAR amounts. `formatZAR` exists in `lib/format.ts` - it just is not applied.

**AI Prompt - B5:**

    In apps/admin/src/components/income/income-table.tsx:
    - Import formatZAR from '@/lib/format'
    - Find the table cell rendering entry.amount
    - Change it to: {formatZAR(Number(entry.amount))}

    Also check apps/admin/src/components/expenses/expense-table.tsx for the same
    issue and apply the same fix if the amount column is unformatted.

    Do not change any other columns or logic.

---

## 4. Stage 2 - High Priority

These do not block shipping but will cause friction or data integrity issues
within the first week of real use.

---

### H1 - Withdrawal History Page

No way to view, edit, or delete past withdrawals. The dashboard shows current
month only. `recordWithdrawal` exists but `updateWithdrawal` and `deleteWithdrawal` do not.

**AI Prompt - H1:**

    Add a /withdrawals page to this Next.js 16 app.

    1. packages/db/src/queries.ts - add:
       getAllWithdrawals(): SELECT * FROM withdrawals ORDER BY date DESC, created_at DESC
       getWithdrawalById(id): SELECT * FROM withdrawals WHERE id = $id

    2. apps/admin/src/app/actions/withdraw.ts - add:
       updateWithdrawal(id, formData): { date: z.string().min(1),
         amount: z.coerce.number().positive(), description: z.string().optional() }
         Update where id. revalidatePath('/withdrawals'). revalidatePath('/dashboard').
       deleteWithdrawal(id): delete where id. revalidatePaths. Return { error?: string }.
       Never throw.

    3. apps/admin/src/app/(admin)/withdrawals/page.tsx
       Server component. getAllWithdrawals(). Compute YTD total.
       Render: header with YTD total (formatZAR), WithdrawalsTable, empty state.

    4. apps/admin/src/app/(admin)/withdrawals/[id]/page.tsx
       getWithdrawalById(id) → notFound() if null.
       Render: back link + WithdrawalEditForm.

    5. apps/admin/src/components/withdrawals/
       withdrawals-table.tsx - columns: Date, Amount (formatZAR), Description, Actions
       withdrawal-edit-form.tsx - pre-populated, on success router.push('/withdrawals')

    6. apps/admin/src/components/layout/app-sidebar.tsx
       Add { href: '/withdrawals', label: 'Withdrawals', icon: Wallet } to navItems.

    Follow all existing patterns. Never throw in server actions.

---

### H2 - Lead Create and Delete in Admin

Leads only arrive via public Astro forms. Admin cannot manually add a lead or
remove a junk entry. `createLead` and `deleteLead` server actions do not exist.

**AI Prompt - H2:**

    Add lead creation and deletion to the /leads page.

    1. apps/admin/src/app/actions/leads.ts - add:
       createLead(formData):
         Schema: { name: z.string().min(1), email: z.string().email().optional(),
           phone: z.string().optional(), source: z.string().optional(),
           serviceInterest: z.string().optional(),
           divisionId: z.string().uuid().optional(), message: z.string().optional() }
         Refine: at least one of email or phone must be present.
         Status defaults to 'new'. Insert. revalidatePath('/leads'). revalidatePath('/dashboard').
       deleteLead(id): delete where id. revalidatePaths. Return { error?: string }.

    2. apps/admin/src/components/leads/lead-add-form.tsx
       'use client'. useTransition + useRef.
       Fields: name (required), email, phone, source, serviceInterest,
         divisionId (optional Select), message (textarea).
       Inline error display. On success: reset form.

    3. apps/admin/src/components/leads/leads-table.tsx
       Add delete button with inline confirm/cancel (same as income-table.tsx).
       Wire to deleteLead server action.

    4. apps/admin/src/app/(admin)/leads/page.tsx
       Pass createLead to LeadAddForm. Pass deleteLead to LeadsTable.
       Fetch getAllDivisions() for the add form division select.

    Follow all existing patterns.

---

### H3 - Delete Button Loading States

Delete buttons across income, expenses, leads, and divisions have no pending state.
The UI appears frozen while the server action runs.

**AI Prompt - H3:**

    Add loading/pending state to all delete buttons in:
    - apps/admin/src/components/income/income-table.tsx
    - apps/admin/src/components/expenses/expense-table.tsx
    - apps/admin/src/components/divisions/divisions-table.tsx

    Pattern for each:
    - Add isPendingDelete boolean state alongside pendingDeleteId
    - Set isPendingDelete = true before calling the delete server action
    - Set isPendingDelete = false after it resolves (success or error)
    - Disable the confirm button and show "Deleting..." label while pending
    - Use the existing Button component's disabled prop

    Do not change any other logic.

---

### H4 - Success Toasts on Create and Update

Forms only show errors. Successful creates and updates give no feedback -
the form just resets silently.

**AI Prompt - H4:**

    Add success toast notifications to all create and update forms using sonner.

    Files to update:
    - income-add-form.tsx → toast.success('Income added')
    - income-edit-form.tsx → toast.success('Income updated')
    - expense-add-form.tsx → toast.success('Expense added')
    - expense-edit-form.tsx → toast.success('Expense updated')
    - division-add-form.tsx → toast.success('Division created')
    - lead-status-form.tsx → toast.success('Status updated')
    - lead-notes-form.tsx → toast.success('Notes saved')

    Pattern: import { toast } from 'sonner'. In the startTransition callback,
    after confirming result.error is falsy, call toast.success('...').

    Do not add toasts to delete actions - the row disappearing is sufficient feedback.
    Do not change any validation logic or error handling.

---

### H5 - Date Fields Default to Today

All date inputs are blank on open. Users must manually pick today's date every time.

**AI Prompt - H5:**

    Set the default value of all date inputs to today's date (YYYY-MM-DD).

    Files to update:
    - apps/admin/src/components/income/income-add-form.tsx
    - apps/admin/src/components/expenses/expense-add-form.tsx
    - apps/admin/src/components/withdrawals/ (new form from H1)

    Pattern:
      const today = new Date().toISOString().split('T')[0]
      Add defaultValue={today} to each <Input type="date" ... /> element.

    Do not touch edit forms - they should show the existing entry date, not today.

---

### H6 - Withdrawal Over-Limit Guard

The withdrawal modal allows any amount, even exceeding the available salary balance.
No validation or warning exists.

**AI Prompt - H6:**

    Add a guard to the withdrawal flow that warns when the entered amount exceeds
    the remaining salary balance.

    1. apps/admin/src/components/dashboard/withdraw-modal.tsx
       Add maxAmount prop (number) - the remaining balance from SalaryCard.
       After the amount input, show a warning if entered amount > maxAmount:
         "This exceeds your remaining balance of {formatZAR(maxAmount)}"
       Style with text-destructive. Do NOT block submission - warning only.
       Import formatZAR from '@/lib/format'.

    2. apps/admin/src/components/dashboard/salary-card.tsx
       Compute remaining = Math.max(0, salary - withdrawn).
       Pass as maxAmount prop to WithdrawModal.

    Do not change the server action or any other files.

---

### H7 - Close Month Button Flash

The "Close Month" button briefly appears before the snapshot check resolves,
causing a visual flash on dashboard load.

**AI Prompt - H7:**

    Fix the close month button flash in the dashboard.

    The dashboard page.tsx already fetches currentPeriodSnapshot via getSnapshotByPeriod().

    Fix:
    - Pass a hasSnapshot boolean prop to CloseMonthButton (or wherever the button lives)
      instead of doing a client-side fetch.
    - If the component is currently fetching client-side, remove that fetch and use
      the server-provided prop.
    - If the button is conditionally rendered in the server component, wrap it in a
      Suspense boundary with a null fallback to prevent layout shift.

    Do not change the closeMonth server action.

---

## 5. Stage 3 - Medium Priority

Quality-of-life improvements. Address after Stage 1 and 2 are complete.

---

### M1 - Pagination on Income and Expenses Tables

All rows load in a single query. Will degrade as data grows past a few hundred rows.

**AI Prompt - M1:**

    Add offset-based pagination to the income and expenses list pages.

    1. packages/db/src/queries.ts
       Update getAllIncome(filters?) to accept { limit?: number, offset?: number }
         with defaults limit=50, offset=0.
       Add getTotalIncomeCount(filters?) for the total row count.
       Same for getAllExpenses / getTotalExpensesCount.

    2. apps/admin/src/app/(admin)/income/page.tsx
       Read page param from searchParams (default 1).
       Compute offset = (page - 1) * 50.
       Fetch total count alongside entries.
       Pass pagination props to a new PaginationBar component.

    3. apps/admin/src/components/ui/pagination-bar.tsx
       Prev/next buttons using router.push with updated page param.
       Show "Showing X–Y of Z entries".

    Apply the same pattern to /expenses.

---

### M2 - Leads Notes Textarea Style

The notes textarea on /leads/[id] uses a raw HTML textarea instead of the
shadcn Textarea component, making it visually inconsistent with all other inputs.

**AI Prompt - M2:**

    In apps/admin/src/components/leads/lead-notes-form.tsx:
    - Import Textarea from '@/components/ui/textarea'
      (add via: npx shadcn@latest add textarea - if not already present)
    - Replace the raw <textarea> with <Textarea>
    - Keep all existing props (rows, defaultValue, disabled, name, etc.)
    - Do not change any other logic.

---

### M3 - Dashboard Loading Skeleton Mismatch

The loading.tsx skeleton shows generic placeholder blocks instead of matching
the actual dashboard layout, causing a jarring layout shift on navigation.

**AI Prompt - M3:**

    Update apps/admin/src/app/(admin)/loading.tsx to match the actual dashboard layout.

    Dashboard layout structure:
    - Row 1: 4 KPI cards (2x2 mobile / 1x4 desktop) - each approx 120px tall
    - Row 2: Salary card (left) + Revenue sparkline (right) - approx 200px
    - Row 3: Division area chart (full width) - approx 300px
    - Row 4: Division revenue list (left) + Leads summary (right)
    - Row 5: Expense snapshot (full width)
    - Row 6: Allocation bar (full width)

    Use shadcn Skeleton component. Match approximate heights and grid classes
    used in the actual dashboard components.
    Do not import or reference any dashboard components - skeletons only.

---

### M4 - Client Revenue Report

Once clientId is required on income (B1), per-client revenue becomes meaningful.
The reports page currently has no client dimension.

**AI Prompt - M4:**

    Add a client revenue section to the /reports page.

    1. packages/db/src/queries.ts - add:
       getRevenueByClientForYear(year: number):
         SELECT clients.name, clients.business_name,
                COALESCE(SUM(income.amount), 0) as total
         FROM clients
         LEFT JOIN income ON income.client_id = clients.id
           AND EXTRACT(YEAR FROM income.date) = $year
         GROUP BY clients.id, clients.name, clients.business_name
         ORDER BY total DESC

    2. apps/admin/src/components/reports/revenue-by-client-chart.tsx
       Recharts horizontal BarChart.
       X axis: ZAR amount. Y axis: client name (businessName ?? name).
       Same dark theme styling as existing report charts.

    3. apps/admin/src/app/(admin)/reports/page.tsx
       Fetch getRevenueByClientForYear(selectedYear) alongside existing fetches.
       Render RevenueByClientChart below existing charts.
       Respect the existing year filter.

    Follow existing report component patterns.

---

## 6. Stage 4 - Polish and Scale

Low priority. Address post-launch based on real usage feedback.

| # | Item | Notes |
|---|---|---|
| P1 | Audit trail | Add createdBy / updatedBy fields once auth is live (Phase 10) |
| P2 | Bulk import | CSV import for income/expenses - useful for historical data entry |
| P3 | Mobile form UX | Inline add forms are cramped on small screens - consider modal forms |
| P4 | Dark mode toggle | Currently hardcoded dark - low demand for MVP |
| P5 | Email alerts | Notify on large transactions or low reserve - needs auth first |
| P6 | Lead to Client conversion | One-click convert a lead to a client when status changes to converted |
| P7 | Snapshot edit/delete | Currently immutable - add admin override with confirmation |
| P8 | Division archiving | Soft-delete divisions instead of hard FK block |

---

## 7. Implementation Order

### Stage 1 - Blockers (strict order)

B2 then B1 then B3 then B4 then B5

1. B2 first - build /clients so the income form has clients to select
2. B1 second - enforce clientId required now that clients exist
3. B3 - expense category management (independent, but do before launch)
4. B4 - fix breadcrumb (quick win, independent)
5. B5 - apply formatZAR to income table (5-minute fix)

### Stage 2 - High Priority (can be parallelised)

- H1 - withdrawals page (independent)
- H2 - lead create/delete (independent)
- H3 - delete loading states (independent)
- H4 - success toasts (independent)
- H5 - date defaults (independent)
- H6 - withdrawal guard (depends on H1)
- H7 - close month flash (independent)

### Stage 3 - Medium Priority

- M1 - pagination (after Stage 1 and 2 complete)
- M2 - textarea style (quick win, any time)
- M3 - loading skeleton (any time)
- M4 - client revenue report (after B1 and B2 complete)

### Stage 4 - Post-launch

Address based on real usage data and user feedback.

---

> Auth (Better Auth, magic link, invitation-only, roles) is tracked in Phase 10
> of `pmg-admin-development-phases.md` and is out of scope for MVP v1.
