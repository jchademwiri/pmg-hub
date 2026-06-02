# Requirements Document

## Introduction

This document covers the five Stage 1 blockers from the PMG MVP v1 Readiness Plan.
These items must be resolved before the PMG Control Center handles real financial data.
They are implemented in strict dependency order: B2 → B1 → B3 → B4 → B5.

- **B2** - Build the `/clients` page (full CRUD) so clients can be created and managed
- **B1** - Enforce `clientId` as required on all income entries (depends on B2)
- **B3** - Replace freetext expense categories with a managed `expense_categories` table
- **B4** - Fix the hardcoded "Dashboard" breadcrumb in `top-nav.tsx`
- **B5** - Apply `formatZAR` to the income table amount column

All implementation must follow the existing patterns established in `/income`, `/expenses`,
and `/divisions`: Zod validation, `revalidatePath`, `useTransition`, sonner toasts, shadcn/ui
components, and server actions that never throw.

---

## Glossary

- **Admin**: The PMG Control Center Next.js application at `apps/admin`
- **ClientsPage**: The server component at `app/(admin)/clients/page.tsx`
- **ClientEditPage**: The server component at `app/(admin)/clients/[id]/page.tsx`
- **ClientAddForm**: The client component `components/clients/client-add-form.tsx`
- **ClientEditForm**: The client component `components/clients/client-edit-form.tsx`
- **ClientsTable**: The client component `components/clients/clients-table.tsx`
- **ClientsActions**: The server actions module `app/actions/clients.ts`
- **IncomeActions**: The server actions module `app/actions/income.ts`
- **IncomeAddForm**: The client component `components/income/income-add-form.tsx`
- **IncomeEditForm**: The client component `components/income/income-edit-form.tsx`
- **ExpenseCategoriesPage**: The server component `app/(admin)/expense-categories/page.tsx`
- **ExpenseCategoryAddForm**: The client component `components/expense-categories/expense-category-add-form.tsx`
- **ExpenseCategoriesTable**: The client component `components/expense-categories/expense-categories-table.tsx`
- **ExpenseCategoriesActions**: The server actions module `app/actions/expense-categories.ts`
- **ExpenseAddForm**: The client component `components/expenses/expense-add-form.tsx`
- **ExpenseEditForm**: The client component `components/expenses/expense-edit-form.tsx`
- **TopNav**: The layout component `components/layout/top-nav.tsx`
- **AppSidebar**: The layout component `components/layout/app-sidebar.tsx`
- **IncomeTable**: The client component `components/income/income-table.tsx`
- **ExpenseTable**: The client component `components/expenses/expense-table.tsx`
- **DB**: The `packages/db` package (Drizzle ORM + Neon PostgreSQL)
- **Queries**: The file `packages/db/src/queries.ts`
- **formatZAR**: The currency formatter in `apps/admin/src/lib/format.ts`
- **NO_CLIENT**: The sentinel string `'__none__'` previously used in income forms to represent "no client selected"
- **ServerAction**: A Next.js `'use server'` function returning `Promise<{ error?: string }>`

---

## Requirements

### Requirement 1: Client CRUD - Database Queries

**User Story:** As a developer, I want query helpers for the clients table, so that
server components and server actions can read client data without writing raw SQL inline.

#### Acceptance Criteria

1. THE Queries SHALL export a `getClientsWithIncomeCount()` function that returns all
   clients joined with a count of their associated income entries, ordered by client
   name ascending.
2. THE Queries SHALL export a `getClientById(id: string)` function that returns a single
   client row by primary key, or `null` if no matching row exists.
3. WHEN `getClientsWithIncomeCount()` is called, THE Queries SHALL return each row with
   fields: `id`, `name`, `businessName`, `email`, `phone`, `createdAt`, and `incomeCount`
   (integer, zero when no income rows reference the client).
4. THE Queries SHALL export both functions from `packages/db/src/index.ts` so they are
   accessible via the `@pmg/db` package import.

---

### Requirement 2: Client CRUD - Server Actions

**User Story:** As an admin user, I want to create, update, and delete clients via
server actions, so that client data is validated and persisted consistently.

#### Acceptance Criteria

1. THE ClientsActions SHALL export a `createClient(formData: FormData)` ServerAction
   that validates input with Zod schema `{ name: string (min 1), businessName?: string,
   email?: string (valid email format), phone?: string }`.
2. WHEN `createClient` validation passes, THE ClientsActions SHALL insert a new row into
   the `clients` table and call `revalidatePath('/clients')`.
3. THE ClientsActions SHALL export an `updateClient(id: string, formData: FormData)`
   ServerAction using the same Zod schema as `createClient`.
4. WHEN `updateClient` validation passes, THE ClientsActions SHALL update the matching
   row in the `clients` table and call `revalidatePath('/clients')`.
5. THE ClientsActions SHALL export a `deleteClient(id: string)` ServerAction that
   deletes the matching row from the `clients` table and calls `revalidatePath('/clients')`.
6. IF any ClientsActions operation encounters a database error, THEN THE ClientsActions
   SHALL return `{ error: 'Failed to save. Please try again.' }` without throwing.
7. IF ClientsActions Zod validation fails, THEN THE ClientsActions SHALL return
   `{ error: <first validation message> }` without throwing.
8. THE ClientsActions SHALL never throw - all error paths return `{ error?: string }`.

---

### Requirement 3: Client CRUD - Add Form

**User Story:** As an admin user, I want an inline form to add a new client, so that
I can create clients without leaving the clients list page.

#### Acceptance Criteria

1. THE ClientAddForm SHALL render fields for: name (required), businessName (optional),
   email (optional), and phone (optional).
2. WHEN the ClientAddForm is submitted with a valid name, THE ClientAddForm SHALL call
   the `createClient` ServerAction via `useTransition` and disable all inputs while pending.
3. WHEN `createClient` returns no error, THE ClientAddForm SHALL reset the form to its
   empty state.
4. WHEN `createClient` returns an error, THE ClientAddForm SHALL display the error message
   inline below the form without navigating away.
5. THE ClientAddForm SHALL use `useRef` on the form element and `useTransition` for the
   pending state, matching the pattern used in `IncomeAddForm`.

---

### Requirement 4: Client CRUD - Clients Table

**User Story:** As an admin user, I want to see all clients in a table with their income
count, so that I can manage clients and navigate to edit or delete them.

#### Acceptance Criteria

1. THE ClientsTable SHALL render a shadcn `Table` with columns: Name, Business Name,
   Email, Phone, Income Count, and Actions.
2. THE ClientsTable SHALL render an edit link in the Actions column that navigates to
   `/clients/[id]` for each row.
3. THE ClientsTable SHALL render a delete button in the Actions column that, when clicked,
   shows inline Confirm and Cancel buttons for that row (matching the pattern in `IncomeTable`).
4. WHEN the Confirm delete button is clicked, THE ClientsTable SHALL call the `deleteClient`
   ServerAction and display a `toast.error` via sonner if the action returns an error.
5. THE ClientsTable SHALL track `pendingDeleteId` state so only one row shows the
   confirm/cancel UI at a time.

---

### Requirement 5: Client CRUD - List Page

**User Story:** As an admin user, I want a `/clients` page that lists all clients and
lets me add new ones, so that I have a central place to manage client records.

#### Acceptance Criteria

1. THE ClientsPage SHALL be a Next.js server component that fetches `getClientsWithIncomeCount()`
   on every request.
2. THE ClientsPage SHALL render a page header, the `ClientAddForm`, and the `ClientsTable`
   when clients exist.
3. WHEN no clients exist, THE ClientsPage SHALL render an empty state in place of the table.
4. THE ClientsPage SHALL pass `createClient` as the `createAction` prop to `ClientAddForm`
   and `deleteClient` as the `deleteAction` prop to `ClientsTable`.

---

### Requirement 6: Client CRUD - Edit Page

**User Story:** As an admin user, I want a `/clients/[id]` edit page, so that I can
update a client's details after creation.

#### Acceptance Criteria

1. THE ClientEditPage SHALL be a Next.js server component that calls `getClientById(id)`
   using the route param.
2. WHEN `getClientById` returns `null`, THE ClientEditPage SHALL call Next.js `notFound()`
   to render the 404 page.
3. THE ClientEditPage SHALL render a back link to `/clients` and the `ClientEditForm`
   pre-populated with the existing client data.
4. THE ClientEditForm SHALL call `updateClient(id, formData)` on submit via `useTransition`.
5. WHEN `updateClient` returns no error, THE ClientEditForm SHALL navigate to `/clients`
   using `router.push('/clients')`.
6. WHEN `updateClient` returns an error, THE ClientEditForm SHALL display the error message
   inline without navigating away.

---

### Requirement 7: Client CRUD - Sidebar Navigation

**User Story:** As an admin user, I want a Clients link in the sidebar, so that I can
navigate to the clients page from anywhere in the app.

#### Acceptance Criteria

1. THE AppSidebar SHALL include a nav item with `href: '/clients'`, `label: 'Clients'`,
   and the `UserCheck` icon from `lucide-react`.
2. THE AppSidebar SHALL position the Clients nav item after Expenses and before Leads
   in the navigation order.

---

### Requirement 8: Enforce clientId Required on Income - Schema

**User Story:** As a business owner, I want every income entry to be linked to a client,
so that revenue is always attributable and client reporting is accurate.

#### Acceptance Criteria

1. THE DB income schema SHALL define `clientId` as `NOT NULL` - the column SHALL NOT
   accept null values after the migration is applied.
2. THE DB income schema SHALL define the `clientId` foreign key with `onDelete: 'restrict'`
   so that a client with associated income entries cannot be deleted.
3. THE DB SHALL include a Drizzle migration that first assigns a fallback client to any
   income rows where `client_id IS NULL`, then executes `ALTER TABLE income ALTER COLUMN
   client_id SET NOT NULL`.

---

### Requirement 9: Enforce clientId Required on Income - Server Action

**User Story:** As a developer, I want the income server action to require a valid
clientId, so that the application layer enforces the same constraint as the database.

#### Acceptance Criteria

1. THE IncomeActions Zod schema SHALL define `clientId` as `z.string().uuid()` (required,
   not optional).
2. THE IncomeActions SHALL remove the `if (raw.clientId === '') delete raw.clientId`
   normalisation line from both `createIncome` and `updateIncome`.
3. WHEN `createIncome` or `updateIncome` is called without a valid UUID `clientId`,
   THE IncomeActions SHALL return a validation error without inserting or updating.

---

### Requirement 10: Enforce clientId Required on Income - Forms

**User Story:** As an admin user, I want the income add and edit forms to require a
client selection, so that I cannot accidentally save income without a client.

#### Acceptance Criteria

1. THE IncomeAddForm SHALL remove the `NO_CLIENT` sentinel constant and the "No client"
   `SelectItem` from the client select field.
2. THE IncomeAddForm SHALL default the client select to an empty/unselected state with
   a "Select client" placeholder.
3. WHEN the IncomeAddForm is submitted without a client selected, THE IncomeAddForm SHALL
   display an inline validation error.
4. THE IncomeEditForm SHALL remove the `NO_CLIENT` sentinel constant and the "No client"
   `SelectItem` from the client select field.
5. THE IncomeEditForm SHALL pre-select the existing `entry.clientId` value (which is
   always non-null after the B1 migration).

---

### Requirement 11: Expense Category Management - Schema and Migration

**User Story:** As a developer, I want a managed `expense_categories` table, so that
expense categories are controlled vocabulary and cannot drift due to typos.

#### Acceptance Criteria

1. THE DB SHALL include a new Drizzle schema file `packages/db/src/schema/expense-categories.ts`
   defining table `expense_categories` with columns: `id` (uuid PK defaultRandom),
   `name` (text NOT NULL UNIQUE), and `createdAt` (timestamptz defaultNow NOT NULL).
2. THE DB schema index SHALL export `expenseCategories` from
   `packages/db/src/schema/index.ts`.
3. THE DB SHALL include a Drizzle migration that creates the `expense_categories` table
   and seeds it with `INSERT INTO expense_categories (name) SELECT DISTINCT category
   FROM expenses WHERE category IS NOT NULL ORDER BY category` to preserve all existing
   category names.

---

### Requirement 12: Expense Category Management - Queries

**User Story:** As a developer, I want query helpers for expense categories, so that
server components and actions can read category data without inline SQL.

#### Acceptance Criteria

1. THE Queries SHALL export `getAllExpenseCategories()` returning all rows from
   `expense_categories` ordered by name ascending, with fields `id` and `name`.
2. THE Queries SHALL export `getExpenseCategoryById(id: string)` returning a single
   row or `null`.
3. THE Queries SHALL export both functions from `packages/db/src/index.ts`.

---

### Requirement 13: Expense Category Management - Server Actions

**User Story:** As an admin user, I want to create, update, and delete expense categories
via server actions, so that the category list stays accurate and consistent.

#### Acceptance Criteria

1. THE ExpenseCategoriesActions SHALL export `createExpenseCategory(formData: FormData)`
   with Zod schema `{ name: z.string().min(1).max(100) }`, inserting into
   `expense_categories` and calling `revalidatePath('/expense-categories')` and
   `revalidatePath('/expenses')` on success.
2. THE ExpenseCategoriesActions SHALL export `updateExpenseCategory(id, formData)`
   with the same schema, updating the matching row and calling both revalidatePaths.
3. THE ExpenseCategoriesActions SHALL export `deleteExpenseCategory(id)` that checks
   whether any rows in `expenses` reference the category name before deleting.
4. WHEN `deleteExpenseCategory` is called for a category that is referenced by one or
   more expense rows, THE ExpenseCategoriesActions SHALL return
   `{ error: 'Category is in use by existing expenses' }` without deleting.
5. WHEN `deleteExpenseCategory` is called for an unreferenced category, THE
   ExpenseCategoriesActions SHALL delete the row and call both revalidatePaths.
6. IF any ExpenseCategoriesActions operation encounters a database error, THEN THE
   ExpenseCategoriesActions SHALL return `{ error: 'Failed to save. Please try again.' }`
   without throwing.
7. THE ExpenseCategoriesActions SHALL never throw.

---

### Requirement 14: Expense Category Management - UI Components

**User Story:** As an admin user, I want an `/expense-categories` page where I can
add, rename, and delete categories, so that the category list stays clean and accurate.

#### Acceptance Criteria

1. THE ExpenseCategoryAddForm SHALL render a single `name` text input and a submit button,
   using `useTransition` and `useRef` matching the pattern in `ClientAddForm`.
2. WHEN `createExpenseCategory` returns no error, THE ExpenseCategoryAddForm SHALL reset
   the form.
3. WHEN `createExpenseCategory` returns an error, THE ExpenseCategoryAddForm SHALL display
   the error inline.
4. THE ExpenseCategoriesTable SHALL render a shadcn `Table` with columns: Name and Actions
   (edit link to a future edit page, delete with inline confirm/cancel).
5. WHEN the delete confirm is clicked, THE ExpenseCategoriesTable SHALL call
   `deleteExpenseCategory` and display a `toast.error` if the action returns an error.
6. THE ExpenseCategoriesPage SHALL be a server component that fetches
   `getAllExpenseCategories()` and renders `ExpenseCategoryAddForm` and
   `ExpenseCategoriesTable`, or an empty state when no categories exist.

---

### Requirement 15: Expense Category Management - Replace Datalist with Select

**User Story:** As an admin user, I want the expense add and edit forms to use a
controlled Select for category, so that I can only choose from valid managed categories.

#### Acceptance Criteria

1. THE ExpenseAddForm SHALL replace the freetext `<Input type="text" list="...">` and
   `<datalist>` with a shadcn `<Select>` component for the category field.
2. THE ExpenseAddForm `categories` prop type SHALL change from `string[]` to
   `{ id: string; name: string }[]`.
3. THE ExpenseAddForm SHALL submit the category `name` string (not the `id`) as the
   `category` form field value, preserving compatibility with the existing
   `expenses.category` text column.
4. THE ExpenseEditForm SHALL apply the same Select replacement and prop type change as
   the ExpenseAddForm.
5. THE ExpenseEditForm SHALL pre-select the category matching the existing
   `entry.category` value.
6. THE AppSidebar SHALL include a nav item with `href: '/expense-categories'`,
   `label: 'Categories'`, and the `Tag` icon from `lucide-react`.

---

### Requirement 16: Fix Hardcoded Breadcrumb

**User Story:** As an admin user, I want the breadcrumb in the top navigation to reflect
the current page, so that I always know where I am in the app.

#### Acceptance Criteria

1. THE TopNav SHALL import `usePathname` from `next/navigation` and become a client
   component (`'use client'`).
2. THE TopNav SHALL map the first path segment to a human-readable label using this
   mapping: `/dashboard` → `'Dashboard'`, `/income` → `'Income'`, `/expenses` →
   `'Expenses'`, `/leads` → `'Leads'`, `/divisions` → `'Divisions'`, `/clients` →
   `'Clients'`, `/withdrawals` → `'Withdrawals'`, `/snapshots` → `'Snapshots'`,
   `/reports` → `'Reports'`, `/expense-categories` → `'Expense Categories'`.
3. WHEN the current path does not match any known segment, THE TopNav SHALL capitalise
   the raw segment as the fallback label.
4. WHEN the current path has two or more segments (e.g. `/income/[id]`), THE TopNav
   SHALL render two breadcrumb items: the section label (e.g. `'Income'`) and a second
   item labelled `'Edit Entry'`.
5. WHEN the current path has exactly one segment, THE TopNav SHALL render a single
   breadcrumb item with the section label.
6. THE TopNav SHALL use the existing shadcn `Breadcrumb`, `BreadcrumbList`,
   `BreadcrumbItem`, `BreadcrumbPage`, `BreadcrumbSeparator`, and `BreadcrumbLink`
   components for the two-item case.

---

### Requirement 17: Apply formatZAR to Income Table

**User Story:** As an admin user, I want income amounts displayed as formatted ZAR
currency, so that the income table is consistent with the rest of the app.

#### Acceptance Criteria

1. THE IncomeTable SHALL import `formatZAR` from `'@/lib/format'`.
2. THE IncomeTable SHALL render each `entry.amount` cell as
   `{formatZAR(Number(entry.amount))}` instead of the raw numeric string.
3. THE ExpenseTable amount column SHALL already use `formatZAR` - no change required
   if it is already applied (verify only).
4. THE IncomeTable SHALL not change any other column rendering, sorting, filtering,
   or action logic.
