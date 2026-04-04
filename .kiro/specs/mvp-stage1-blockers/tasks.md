# Implementation Plan: MVP Stage 1 Blockers

## Overview

Five ship-critical blockers implemented in strict dependency order: B2 → B1 → B3 → B4 → B5.
Each task builds incrementally on the previous. All code follows existing patterns:
Zod validation, `revalidatePath`, `useTransition`, sonner toasts, shadcn/ui, server actions that never throw.

## Tasks

---

### B2 — /clients Page

- [x] 1. Add client query helpers to packages/db
  - Add `getClientsWithIncomeCount()` to `packages/db/src/queries.ts`: SELECT clients.* + COUNT(income.id) as incomeCount FROM clients LEFT JOIN income ON income.client_id = clients.id GROUP BY clients.id ORDER BY clients.name ASC
  - Add `getClientById(id: string)` to `packages/db/src/queries.ts`: SELECT * FROM clients WHERE id = $id, return null if not found
  - Export both functions from `packages/db/src/index.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 1.1 Write property test for getClientsWithIncomeCount round-trip
    - **Property 1: Client income count round-trip**
    - Generate random clients (1–20) and income rows referencing them, insert all, call `getClientsWithIncomeCount()`, assert every row's `incomeCount` equals the actual count of income rows for that client
    - **Validates: Requirements 1.1, 1.3**

  - [ ]* 1.2 Write property test for getClientById round-trip
    - **Property 2: Client lookup round-trip**
    - Generate random client data, insert, call `getClientById(insertedId)`, assert returned row matches; assert `getClientById(randomUUID)` returns null
    - **Validates: Requirements 1.2**

- [x] 2. Create client server actions
  - Create `apps/admin/src/app/actions/clients.ts` with `'use server'`
  - Implement `createClient(formData: FormData)`: Zod schema `{ name: z.string().min(1), businessName: z.string().optional(), email: z.string().email().optional(), phone: z.string().optional() }`, strip empty optional strings before parsing, insert into clients, `revalidatePath('/clients')`, return `{}`
  - Implement `updateClient(id: string, formData: FormData)`: same Zod schema, update matching row, `revalidatePath('/clients')`, return `{}`
  - Implement `deleteClient(id: string)`: delete matching row, `revalidatePath('/clients')`, catch `23503` FK violation → return `{ error: 'Cannot delete client with existing income records.' }`, all other errors → return `{ error: 'Failed to save. Please try again.' }`, never throw
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 2.1 Write property test for client server actions never throw
    - **Property 3: Client server actions never throw**
    - Generate random FormData inputs (valid and invalid, including malformed data, duplicate emails, FK violations), call each action wrapped in try/catch, assert no exception thrown and return value is always `{ error?: string }`
    - **Validates: Requirements 2.6, 2.7, 2.8**

- [x] 3. Create ClientAddForm component
  - Create `apps/admin/src/components/clients/client-add-form.tsx` as `'use client'`
  - Props: `{ createAction: (formData: FormData) => Promise<{ error?: string }> }`
  - Fields: name (required), businessName (optional), email (optional), phone (optional)
  - Use `useRef<HTMLFormElement>` + `useTransition`; disable all inputs while pending
  - On success: `formRef.current?.reset()`, clear error
  - On error: display inline `<p className="w-full text-sm text-destructive">{errorMessage}</p>`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Create ClientsTable component
  - Create `apps/admin/src/components/clients/clients-table.tsx` as `'use client'`
  - Props: `{ clients: ClientWithIncomeCount[], deleteAction: (id: string) => Promise<{ error?: string }> }`
  - Render shadcn `Table` with columns: Name, Business Name, Email, Phone, Income Count, Actions
  - Edit link in Actions column → `/clients/[id]`
  - Delete: track `pendingDeleteId: string | null`; clicking Delete shows inline Confirm/Cancel for that row only
  - On Confirm: call `deleteAction(id)`, on error call `toast.error(result.error)` via sonner
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Create ClientEditForm component
  - Create `apps/admin/src/components/clients/client-edit-form.tsx` as `'use client'`
  - Props: `{ client: Client, updateAction: (formData: FormData) => Promise<{ error?: string }> }`
  - Pre-populate all fields from `client` prop
  - Use `useTransition`; on success: `router.push('/clients')`; on error: inline error message
  - _Requirements: 6.4, 6.5, 6.6_

- [x] 6. Create ClientsPage server component
  - Create `apps/admin/src/app/(admin)/clients/page.tsx` as a server component
  - Fetch `getClientsWithIncomeCount()` on every request
  - Render: page header, `<ClientAddForm createAction={createClient} />`, `<ClientsTable clients={clients} deleteAction={deleteClient} />` or empty state when no clients
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Create ClientEditPage server component
  - Create `apps/admin/src/app/(admin)/clients/[id]/page.tsx` as a server component
  - Call `getClientById(params.id)`; if null call `notFound()`
  - Render: back link to `/clients` + `<ClientEditForm client={client} updateAction={...} />`
  - Bind `updateClient(id, formData)` via a partial application or inline wrapper
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Add Clients nav item to AppSidebar
  - In `apps/admin/src/components/layout/app-sidebar.tsx`, import `UserCheck` from `lucide-react`
  - Add `{ href: '/clients', label: 'Clients', icon: UserCheck }` to navItems after Expenses and before Leads
  - _Requirements: 7.1, 7.2_

- [x] 9. Checkpoint — B2 complete
  - Ensure all tests pass, ask the user if questions arise.

---

### B1 — Enforce clientId Required on Income

- [x] 10. Update income schema — clientId NOT NULL
  - In `packages/db/src/schema/income.ts`, change clientId from nullable to:
    `uuid("client_id").notNull().references(() => clients.id, { onDelete: "restrict" })`
  - _Requirements: 8.1, 8.2_

- [x] 11. Create Drizzle migration for clientId NOT NULL
  - Generate a new Drizzle migration file in `packages/db/src/migrations/`
  - Migration must run in order: first `UPDATE income SET client_id = (SELECT id FROM clients LIMIT 1) WHERE client_id IS NULL`, then `ALTER TABLE income ALTER COLUMN client_id SET NOT NULL`
  - _Requirements: 8.3_

- [x] 12. Update income server actions — clientId required
  - In `apps/admin/src/app/actions/income.ts`, change `clientId` from `z.string().uuid().optional()` to `z.string().uuid()` in both `createIncome` and `updateIncome` schemas
  - Remove the `if (raw.clientId === '') delete raw.clientId` normalisation line from both actions
  - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 12.1 Write property test for income requires clientId
    - **Property 4: Income requires clientId after B1**
    - Generate random income FormData missing `clientId` or with non-UUID values, call `createIncome`/`updateIncome`, assert returns `{ error: string }` and no DB row is inserted/updated
    - **Validates: Requirements 9.1, 9.2, 9.3**

- [x] 13. Update IncomeAddForm — remove NO_CLIENT sentinel
  - In `apps/admin/src/components/income/income-add-form.tsx`, remove the `NO_CLIENT` constant and `'__none__'` sentinel
  - Remove the "No client" `SelectItem`
  - Default clientId state to `''` with a "Select client" placeholder
  - Show inline validation error if no client is selected on submit
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 14. Update IncomeEditForm — remove NO_CLIENT sentinel
  - In `apps/admin/src/components/income/income-edit-form.tsx`, remove the `NO_CLIENT` constant and "No client" `SelectItem`
  - Pre-select `entry.clientId` (always non-null after migration)
  - _Requirements: 10.4, 10.5_

- [x] 15. Checkpoint — B1 complete
  - Ensure all tests pass, ask the user if questions arise.

---

### B3 — Expense Category Management

- [x] 16. Create expense-categories schema
  - Create `packages/db/src/schema/expense-categories.ts` with table `expense_categories`: `id` (uuid PK defaultRandom), `name` (text NOT NULL UNIQUE), `createdAt` (timestamptz defaultNow NOT NULL)
  - Export `expenseCategories`, `ExpenseCategory`, `NewExpenseCategory` types
  - Add `export * from "./expense-categories"` to `packages/db/src/schema/index.ts`
  - _Requirements: 11.1, 11.2_

- [x] 17. Create Drizzle migration for expense_categories
  - Generate a new Drizzle migration that creates the `expense_categories` table
  - Seed with: `INSERT INTO expense_categories (name) SELECT DISTINCT category FROM expenses WHERE category IS NOT NULL ORDER BY category ON CONFLICT (name) DO NOTHING`
  - _Requirements: 11.3_

- [x] 18. Add expense category query helpers
  - Add `getAllExpenseCategories()` to `packages/db/src/queries.ts`: SELECT id, name FROM expense_categories ORDER BY name ASC
  - Add `getExpenseCategoryById(id: string)` to `packages/db/src/queries.ts`: SELECT * WHERE id = $id, return null if not found
  - Export both from `packages/db/src/index.ts`
  - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 18.1 Write property test for expense category query round-trip
    - **Property 5: Expense category query round-trip**
    - Generate random unique category names (1–30), insert all, call `getAllExpenseCategories()`, assert all inserted names present, ordered by name ASC, no duplicates
    - **Validates: Requirements 12.1**

- [x] 19. Create expense category server actions
  - Create `apps/admin/src/app/actions/expense-categories.ts` with `'use server'`
  - Implement `createExpenseCategory(formData)`: Zod `{ name: z.string().min(1).max(100) }`, insert, `revalidatePath('/expense-categories')` + `revalidatePath('/expenses')`, return `{}`
  - Implement `updateExpenseCategory(id, formData)`: same schema, update, both revalidatePaths, return `{}`
  - Implement `deleteExpenseCategory(id)`: query expenses for any row where `category = (SELECT name FROM expense_categories WHERE id = $id)`; if count > 0 return `{ error: 'Category is in use by existing expenses' }`; else delete + both revalidatePaths; never throw
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

  - [ ]* 19.1 Write property test for delete category blocked when in use
    - **Property 6: Delete category blocked when in use**
    - Generate a random category + random expense rows referencing it by name, insert all, call `deleteExpenseCategory(id)`, assert returns `{ error: 'Category is in use by existing expenses' }` and the row still exists in the DB
    - **Validates: Requirements 13.3, 13.4**

- [x] 20. Create ExpenseCategoryAddForm component
  - Create `apps/admin/src/components/expense-categories/expense-category-add-form.tsx` as `'use client'`
  - Single `name` text input + submit button; `useTransition` + `useRef` matching ClientAddForm pattern
  - On success: reset form; on error: inline error message
  - _Requirements: 14.1, 14.2, 14.3_

- [~] 21. Create ExpenseCategoriesTable component
  - Create `apps/admin/src/components/expense-categories/expense-categories-table.tsx` as `'use client'`
  - shadcn `Table` with columns: Name, Actions (edit link + delete with inline confirm/cancel)
  - On delete confirm: call `deleteExpenseCategory`, on error call `toast.error(result.error)`
  - _Requirements: 14.4, 14.5_

- [~] 22. Create ExpenseCategoriesPage server component
  - Create `apps/admin/src/app/(admin)/expense-categories/page.tsx` as a server component
  - Fetch `getAllExpenseCategories()`; render `ExpenseCategoryAddForm` + `ExpenseCategoriesTable` or empty state
  - _Requirements: 14.6_

- [~] 23. Update ExpenseAddForm — replace datalist with Select
  - In `apps/admin/src/components/expenses/expense-add-form.tsx`, change `categories` prop type from `string[]` to `{ id: string; name: string }[]`
  - Replace `<Input type="text" list="...">` + `<datalist>` with shadcn `<Select name="category">` using `<SelectItem key={c.id} value={c.name}>` so the submitted value is the category name string
  - _Requirements: 15.1, 15.2, 15.3_

- [~] 24. Update ExpenseEditForm — replace datalist with Select
  - In `apps/admin/src/components/expenses/expense-edit-form.tsx`, apply the same Select replacement and prop type change as ExpenseAddForm
  - Pre-select the category matching `entry.category` by name
  - _Requirements: 15.4, 15.5_

- [~] 25. Update expense pages to pass category objects
  - In `apps/admin/src/app/(admin)/expenses/page.tsx`, replace `getDistinctExpenseCategories()` with `getAllExpenseCategories()` and pass the `{ id, name }[]` array to `ExpenseAddForm`
  - In `apps/admin/src/app/(admin)/expenses/[id]/page.tsx`, do the same for `ExpenseEditForm`
  - _Requirements: 15.1, 15.2_

- [~] 26. Add Categories nav item to AppSidebar
  - In `apps/admin/src/components/layout/app-sidebar.tsx`, import `Tag` from `lucide-react`
  - Add `{ href: '/expense-categories', label: 'Categories', icon: Tag }` to navItems after Expenses
  - _Requirements: 15.6_

- [~] 27. Checkpoint — B3 complete
  - Ensure all tests pass, ask the user if questions arise.

---

### B4 — Fix Hardcoded Breadcrumb

- [~] 28. Update TopNav with dynamic breadcrumb
  - In `apps/admin/src/components/layout/top-nav.tsx`, add `'use client'` directive if not already present
  - Import `usePathname` from `'next/navigation'`
  - Define `ROUTE_LABELS` map: `{ dashboard: 'Dashboard', income: 'Income', expenses: 'Expenses', leads: 'Leads', divisions: 'Divisions', clients: 'Clients', withdrawals: 'Withdrawals', snapshots: 'Snapshots', reports: 'Reports', 'expense-categories': 'Expense Categories' }`
  - Derive `segments = pathname.split('/').filter(Boolean)`, `label = ROUTE_LABELS[segments[0]] ?? capitalize(segments[0])`
  - Single segment → one `BreadcrumbItem` with `BreadcrumbPage`; two or more segments → `BreadcrumbLink` for section + `BreadcrumbSeparator` + `BreadcrumbPage` labelled `'Edit Entry'`
  - Unknown segment fallback: capitalise the raw segment
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 28.1 Write property test for breadcrumb label mapping is total
    - **Property 7: Breadcrumb label mapping is total**
    - Generate random pathname strings (known segments, unknown segments, multi-segment paths), call the label derivation function, assert always returns non-empty string; known segments return exact mapped label; unknown segments return capitalised segment
    - **Validates: Requirements 16.2, 16.3**

---

### B5 — Apply formatZAR to Income Table

- [~] 29. Apply formatZAR to IncomeTable amount column
  - In `apps/admin/src/components/income/income-table.tsx`, import `formatZAR` from `'@/lib/format'`
  - Change the amount cell from `{entry.amount}` to `{formatZAR(Number(entry.amount))}`
  - Do not change any other column rendering, sorting, filtering, or action logic
  - _Requirements: 17.1, 17.2, 17.4_

- [~] 30. Verify formatZAR on ExpenseTable
  - In `apps/admin/src/components/expenses/expense-table.tsx`, confirm `formatZAR` is already applied to the amount column
  - If not applied, add the same import and wrap: `{formatZAR(Number(entry.amount))}`
  - _Requirements: 17.3_

- [~] 31. Final checkpoint — all blockers complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Strict implementation order: B2 (tasks 1–9) → B1 (tasks 10–15) → B3 (tasks 16–27) → B4 (task 28) → B5 (tasks 29–30)
- B1 depends on B2 being deployed first so clients exist before the NOT NULL migration runs
- Property tests use `fast-check` with a minimum of 100 iterations per property
- Each property test is tagged with its property number and the requirements clause it validates
- The `deleteClient` FK error handler mirrors the existing `deleteDivision` pattern (check for `'23503'` in the error message)
