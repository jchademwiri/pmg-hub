# Design Document - MVP Stage 1 Blockers

## Overview

This document covers the technical design for the five Stage 1 blockers that must be
resolved before the PMG Control Center handles real financial data. They are implemented
in strict dependency order: **B2 → B1 → B3 → B4 → B5**.

| Blocker | Summary | Dependencies |
|---------|---------|--------------|
| B2 | Full CRUD for `/clients` | None |
| B1 | Enforce `clientId` required on income | B2 (clients must exist first) |
| B3 | Managed `expense_categories` table | None |
| B4 | Fix hardcoded breadcrumb in `top-nav.tsx` | None |
| B5 | Apply `formatZAR` to income table | None |

All five blockers follow the established patterns in `/income`, `/expenses`, and
`/divisions`: Zod validation, `revalidatePath`, `useTransition`, sonner toasts,
shadcn/ui components, and server actions that never throw.

---

## Architecture

The app is a Next.js 16 App Router monorepo (`apps/admin` + `packages/db`).

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  Client Components (useTransition, useRef, useState)    │
└────────────────────────┬────────────────────────────────┘
                         │ Server Actions / navigation
┌────────────────────────▼────────────────────────────────┐
│  Next.js App Router (apps/admin)                        │
│  Server Components → fetch data → pass to client comps  │
│  Server Actions → validate (Zod) → DB → revalidatePath  │
└────────────────────────┬────────────────────────────────┘
                         │ @pmg/db
┌────────────────────────▼────────────────────────────────┐
│  packages/db                                            │
│  Drizzle ORM → Neon PostgreSQL (serverless/pooled)      │
│  schema/ + queries.ts + migrations/                     │
└─────────────────────────────────────────────────────────┘
```

### Data flow pattern (consistent across all blockers)

```
Page (server component)
  └─ await query()          ← packages/db/src/queries.ts
  └─ render <AddForm>       ← passes createAction (server action)
  └─ render <Table>         ← passes deleteAction (server action)
       └─ user interaction
            └─ startTransition(async () => {
                 const result = await serverAction(formData)
                 if (result.error) setErrorMessage(result.error)
                 else formRef.current?.reset()
               })
```

---

## Components and Interfaces

### B2 - /clients

#### New files

```
packages/db/src/queries.ts
  + getClientsWithIncomeCount(): Promise<ClientWithIncomeCount[]>
  + getClientById(id: string): Promise<Client | null>

apps/admin/src/app/actions/clients.ts          (new)
apps/admin/src/app/(admin)/clients/page.tsx    (new)
apps/admin/src/app/(admin)/clients/[id]/page.tsx (new)
apps/admin/src/components/clients/
  client-add-form.tsx    (new)
  clients-table.tsx      (new)
  client-edit-form.tsx   (new)
```

#### Modified files

```
packages/db/src/index.ts
  + export getClientsWithIncomeCount, getClientById

apps/admin/src/components/layout/app-sidebar.tsx
  + Clients nav item (UserCheck icon, after Expenses)
```

#### ClientWithIncomeCount type

```typescript
type ClientWithIncomeCount = {
  id: string
  name: string
  businessName: string | null
  email: string | null
  phone: string | null
  createdAt: Date
  incomeCount: number
}
```

#### ClientsActions interface

```typescript
// apps/admin/src/app/actions/clients.ts
createClient(formData: FormData): Promise<{ error?: string }>
updateClient(id: string, formData: FormData): Promise<{ error?: string }>
deleteClient(id: string): Promise<{ error?: string }>
```

Zod schema:
```typescript
const ClientSchema = z.object({
  name:         z.string().min(1),
  businessName: z.string().optional(),
  email:        z.string().email().optional(),
  phone:        z.string().optional(),
})
```

Empty string normalisation: before parsing, delete any key whose value is `''`
for optional fields (`businessName`, `email`, `phone`) so Zod optional() works
correctly with FormData.

#### ClientAddForm props

```typescript
interface ClientAddFormProps {
  createAction: (formData: FormData) => Promise<{ error?: string }>
}
```

Pattern: `useRef<HTMLFormElement>` + `useTransition`. On success: `formRef.current?.reset()`.
On error: inline `<p className="w-full text-sm text-destructive">`.

#### ClientsTable props

```typescript
interface ClientsTableProps {
  clients: ClientWithIncomeCount[]
  deleteAction: (id: string) => Promise<{ error?: string }>
}
```

State: `pendingDeleteId: string | null`. Columns: Name, Business Name, Email, Phone,
Income Count, Actions. Edit link → `/clients/[id]`. Delete: inline Confirm/Cancel
(same pattern as `IncomeTable`). Error feedback via `toast.error`.

#### ClientEditForm props

```typescript
interface ClientEditFormProps {
  client: Client
  updateAction: (formData: FormData) => Promise<{ error?: string }>
}
```

On success: `router.push('/clients')`. On error: inline error message.

---

### B1 - Enforce clientId Required on Income

#### Modified files

```
packages/db/src/schema/income.ts
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "restrict" })

packages/db/src/migrations/
  000X_enforce_income_client_id.sql  (new migration)

apps/admin/src/app/actions/income.ts
  clientId: z.string().uuid()   (was .optional())
  remove: if (raw.clientId === '') delete raw.clientId

apps/admin/src/components/income/income-add-form.tsx
  remove: NO_CLIENT constant and '__none__' sentinel
  remove: "No client" SelectItem
  default clientId state: '' with "Select client" placeholder

apps/admin/src/components/income/income-edit-form.tsx
  remove: NO_CLIENT constant
  remove: "No client" SelectItem
  pre-select: entry.clientId (always non-null after migration)
```

#### Migration strategy

The migration must handle existing null `client_id` rows before applying the NOT NULL
constraint. It runs two statements in order:

```sql
-- Step 1: assign a fallback client to any orphaned income rows
UPDATE income
SET client_id = (SELECT id FROM clients LIMIT 1)
WHERE client_id IS NULL;

-- Step 2: enforce the constraint
ALTER TABLE income ALTER COLUMN client_id SET NOT NULL;
```

If no clients exist when the migration runs, step 1 is a no-op and step 2 will fail
only if there are income rows with null `client_id`. The migration is safe to run
after B2 is deployed (clients will exist).

#### onDelete change: set null → restrict

The FK changes from `onDelete: 'set null'` to `onDelete: 'restrict'`. This means
a client with associated income entries cannot be deleted. The `deleteClient` action
will receive a PostgreSQL error code `23503` (foreign key violation) and return
`{ error: 'Cannot delete client with existing income records.' }`.

---

### B3 - Expense Category Management

#### New files

```
packages/db/src/schema/expense-categories.ts   (new)
packages/db/src/migrations/
  000Y_expense_categories.sql                   (new migration)

apps/admin/src/app/actions/expense-categories.ts          (new)
apps/admin/src/app/(admin)/expense-categories/page.tsx    (new)
apps/admin/src/components/expense-categories/
  expense-category-add-form.tsx    (new)
  expense-categories-table.tsx     (new)
```

#### Modified files

```
packages/db/src/schema/index.ts
  + export * from "./expense-categories"

packages/db/src/queries.ts
  + getAllExpenseCategories(): Promise<{ id: string; name: string }[]>
  + getExpenseCategoryById(id: string): Promise<ExpenseCategory | null>

packages/db/src/index.ts
  + export getAllExpenseCategories, getExpenseCategoryById

apps/admin/src/components/expenses/expense-add-form.tsx
  categories prop: string[] → { id: string; name: string }[]
  replace <Input list="..."> + <datalist> with shadcn <Select>
  submit category name (not id)

apps/admin/src/components/expenses/expense-edit-form.tsx
  same changes as expense-add-form.tsx
  pre-select: entry.category (match by name)

apps/admin/src/components/layout/app-sidebar.tsx
  + Categories nav item (Tag icon, after Expenses)
```

#### ExpenseCategory schema

```typescript
// packages/db/src/schema/expense-categories.ts
export const expenseCategories = pgTable('expense_categories', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
```

#### ExpenseCategoriesActions interface

```typescript
createExpenseCategory(formData: FormData): Promise<{ error?: string }>
updateExpenseCategory(id: string, formData: FormData): Promise<{ error?: string }>
deleteExpenseCategory(id: string): Promise<{ error?: string }>
```

Zod schema: `{ name: z.string().min(1).max(100) }`

`revalidatePath` calls on success: both `/expense-categories` and `/expenses`.

`deleteExpenseCategory` guard: before deleting, query `expenses` for any row where
`category = (SELECT name FROM expense_categories WHERE id = $id)`. If count > 0,
return `{ error: 'Category is in use by existing expenses' }`.

#### Expense form Select migration

The `categories` prop type changes from `string[]` to `{ id: string; name: string }[]`.
The submitted form field value remains the category `name` string (not the `id`),
preserving full compatibility with the existing `expenses.category` text column.
No migration of the `expenses` table is required.

```tsx
// Before
<Input name="category" list="category-suggestions" />
<datalist id="category-suggestions">
  {categories.map(c => <option key={c} value={c} />)}
</datalist>

// After
<Select name="category" required>
  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
  <SelectContent>
    {categories.map(c => (
      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

The expense pages (`/expenses/page.tsx` and `/expenses/[id]/page.tsx`) must be updated
to fetch `getAllExpenseCategories()` instead of `getDistinctExpenseCategories()` and
pass the `{ id, name }[]` array to the forms.

---

### B4 - Fix Hardcoded Breadcrumb

#### Modified file

```
apps/admin/src/components/layout/top-nav.tsx
```

`TopNav` becomes a client component (`'use client'`) and imports `usePathname` from
`next/navigation`.

#### Path-to-label map

```typescript
const ROUTE_LABELS: Record<string, string> = {
  dashboard:          'Dashboard',
  income:             'Income',
  expenses:           'Expenses',
  leads:              'Leads',
  divisions:          'Divisions',
  clients:            'Clients',
  withdrawals:        'Withdrawals',
  snapshots:          'Snapshots',
  reports:            'Reports',
  'expense-categories': 'Expense Categories',
}
```

#### Breadcrumb rendering logic

```typescript
const pathname = usePathname()
const segments = pathname.split('/').filter(Boolean)
const firstSegment = segments[0] ?? ''
const label = ROUTE_LABELS[firstSegment] ?? capitalize(firstSegment)
const isDetailPage = segments.length >= 2
```

- Single segment → one `BreadcrumbItem` with `BreadcrumbPage`
- Two or more segments → `BreadcrumbLink` for section + `BreadcrumbSeparator` + `BreadcrumbPage` for "Edit Entry"

Uses existing shadcn components: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`,
`BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbLink`.

---

### B5 - Apply formatZAR to Income Table

#### Modified file

```
apps/admin/src/components/income/income-table.tsx
```

Single change: import `formatZAR` from `'@/lib/format'` and wrap the amount cell:

```tsx
// Before
<TableCell>{entry.amount}</TableCell>

// After
<TableCell>{formatZAR(Number(entry.amount))}</TableCell>
```

`expense-table.tsx` is verified only - no change required if `formatZAR` is already applied.

---

## Data Models

### Existing schema changes (B1)

```typescript
// packages/db/src/schema/income.ts - clientId column
// Before:
clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" })

// After:
clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "restrict" })
```

### New schema (B3)

```typescript
// packages/db/src/schema/expense-categories.ts
export const expenseCategories = pgTable('expense_categories', {
  id:        uuid('id').primaryKey().defaultRandom(),
  name:      text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type ExpenseCategory = typeof expenseCategories.$inferSelect
export type NewExpenseCategory = typeof expenseCategories.$inferInsert
```

### New query return types

```typescript
// packages/db/src/queries.ts

// B2
type ClientWithIncomeCount = {
  id: string
  name: string
  businessName: string | null
  email: string | null
  phone: string | null
  createdAt: Date
  incomeCount: number
}

// B3
// getAllExpenseCategories returns { id: string; name: string }[]
// getExpenseCategoryById returns ExpenseCategory | null
```

### Migration files

**B1 migration** (`000X_enforce_income_client_id.sql`):
```sql
UPDATE income
SET client_id = (SELECT id FROM clients LIMIT 1)
WHERE client_id IS NULL;

ALTER TABLE income ALTER COLUMN client_id SET NOT NULL;
```

**B3 migration** (`000Y_expense_categories.sql`):
```sql
CREATE TABLE IF NOT EXISTS expense_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO expense_categories (name)
SELECT DISTINCT category
FROM expenses
WHERE category IS NOT NULL
ORDER BY category
ON CONFLICT (name) DO NOTHING;
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid
executions of a system - essentially, a formal statement about what the system should
do. Properties serve as the bridge between human-readable specifications and
machine-verifiable correctness guarantees.*

### Property 1: Client income count round-trip

*For any* set of clients and income rows, calling `getClientsWithIncomeCount()` SHALL
return each client with an `incomeCount` equal to the actual number of income rows
referencing that client (zero when none exist).

**Validates: Requirements 1.1, 1.3**

---

### Property 2: Client lookup round-trip

*For any* client inserted into the database, calling `getClientById(id)` with that
client's id SHALL return a row with matching `id`, `name`, `businessName`, `email`,
and `phone` fields. Calling `getClientById` with a non-existent id SHALL return `null`.

**Validates: Requirements 1.2**

---

### Property 3: Client server actions never throw

*For any* input to `createClient`, `updateClient`, or `deleteClient` - including
malformed data, duplicate emails, and FK violations - the action SHALL return
`{ error?: string }` and SHALL NOT throw an exception.

**Validates: Requirements 2.6, 2.7, 2.8**

---

### Property 4: Income requires clientId after B1

*For any* call to `createIncome` or `updateIncome` that omits `clientId` or provides
a non-UUID value, the action SHALL return a validation error without inserting or
updating any row.

**Validates: Requirements 9.1, 9.2, 9.3**

---

### Property 5: Expense category query round-trip

*For any* set of expense categories inserted into `expense_categories`, calling
`getAllExpenseCategories()` SHALL return all of them ordered by name ascending, with
no duplicates and no omissions.

**Validates: Requirements 12.1**

---

### Property 6: Delete category blocked when in use

*For any* expense category that is referenced by one or more rows in the `expenses`
table, calling `deleteExpenseCategory(id)` SHALL return
`{ error: 'Category is in use by existing expenses' }` and SHALL NOT delete the row.

**Validates: Requirements 13.3, 13.4**

---

### Property 7: Breadcrumb label mapping is total

*For any* pathname string, the breadcrumb label derivation function SHALL return a
non-empty string. For all known route segments defined in `ROUTE_LABELS`, it SHALL
return the exact mapped label. For unknown segments, it SHALL return the segment
with its first letter capitalised.

**Validates: Requirements 16.2, 16.3**

---

## Error Handling

### Server action error contract

All server actions across B2 and B3 follow the same contract:

```typescript
async function action(...): Promise<{ error?: string }> {
  try {
    // validate → db operation → revalidatePath
    return {}
  } catch (err) {
    // FK violation (23503) gets a specific message
    // all other errors get the generic message
    return { error: 'Failed to save. Please try again.' }
  }
}
```

### FK violation handling (B1 + B2)

`deleteClient` will receive a PostgreSQL error code `23503` when income rows reference
the client (after B1 enforces `onDelete: 'restrict'`). The action inspects the error
message for `'23503'` and returns a user-friendly message:

```typescript
} catch (err) {
  const message = err instanceof Error ? err.message : ''
  if (message.includes('23503')) {
    return { error: 'Cannot delete client with existing income records.' }
  }
  return { error: 'Failed to save. Please try again.' }
}
```

This mirrors the existing pattern in `deleteDivision`.

### B3 delete guard (application-level)

`deleteExpenseCategory` performs an application-level check before attempting the
delete, avoiding a FK constraint (the `expenses.category` column is plain text, not
a FK). The check queries `expenses` for any row where `category` matches the category
name, and returns early with an error if any exist.

### Form-level error display

All forms display inline errors below the submit button:

```tsx
{errorMessage && (
  <p className="w-full text-sm text-destructive">{errorMessage}</p>
)}
```

Table-level delete errors use `toast.error(result.error)` via sonner.

---

## Testing Strategy

### Unit tests (example-based)

Focus on specific behaviors with concrete inputs:

- `ClientAddForm` renders all four fields; submits correctly; resets on success; shows error on failure
- `ClientsTable` shows confirm/cancel on delete click; only one row in confirm state at a time
- `ClientEditForm` pre-populates fields from the client prop; navigates to `/clients` on success
- `IncomeAddForm` (post-B1) has no "No client" option; shows validation error when no client selected
- `ExpenseCategoryAddForm` resets on success; shows error on failure
- `ExpenseCategoriesTable` shows confirm/cancel; calls `toast.error` on delete failure
- `TopNav` renders "Dashboard" for `/dashboard`; renders two items for `/income/abc`
- `IncomeTable` (post-B5) renders amounts through `formatZAR`

### Property-based tests

Use a property-based testing library (e.g. `fast-check` for TypeScript) with a
minimum of 100 iterations per property. Each test is tagged with its design property.

**Property 1** - `getClientsWithIncomeCount` round-trip
- Generate: random clients (1–20), random income rows referencing them
- Insert all, call `getClientsWithIncomeCount()`
- Assert: every returned row's `incomeCount` equals the actual count of income rows for that client
- Tag: `Feature: mvp-stage1-blockers, Property 1: client income count round-trip`

**Property 2** - `getClientById` round-trip
- Generate: random client data (name, optional businessName/email/phone)
- Insert, call `getClientById(insertedId)`
- Assert: returned row matches inserted data; `getClientById(randomUUID)` returns null
- Tag: `Feature: mvp-stage1-blockers, Property 2: client lookup round-trip`

**Property 3** - Server actions never throw
- Generate: random FormData inputs (valid and invalid)
- Call each action, wrap in try/catch
- Assert: no exception thrown; return value is always `{ error?: string }`
- Tag: `Feature: mvp-stage1-blockers, Property 3: client server actions never throw`

**Property 4** - Income requires clientId
- Generate: random income FormData missing `clientId` or with invalid UUID
- Call `createIncome` / `updateIncome`
- Assert: returns `{ error: string }`, no DB row inserted/updated
- Tag: `Feature: mvp-stage1-blockers, Property 4: income requires clientId after B1`

**Property 5** - Expense category query round-trip
- Generate: random category names (1–30, unique strings)
- Insert all, call `getAllExpenseCategories()`
- Assert: all inserted names present, ordered by name ASC, no duplicates
- Tag: `Feature: mvp-stage1-blockers, Property 5: expense category query round-trip`

**Property 6** - Delete category blocked when in use
- Generate: random category + random expense rows referencing it
- Insert all, call `deleteExpenseCategory(id)`
- Assert: returns `{ error: 'Category is in use by existing expenses' }`, row still exists
- Tag: `Feature: mvp-stage1-blockers, Property 6: delete category blocked when in use`

**Property 7** - Breadcrumb label mapping is total
- Generate: random pathname strings (known segments, unknown segments, multi-segment paths)
- Call the label derivation function
- Assert: always returns non-empty string; known segments return exact mapped label; unknown segments return capitalised segment
- Tag: `Feature: mvp-stage1-blockers, Property 7: breadcrumb label mapping is total`

### Integration tests

- B1 migration: run migration against a test DB, verify `client_id` column is NOT NULL
- B3 migration: run migration, verify `expense_categories` table exists and is seeded from `expenses.category`
- B2 + B1 interaction: verify `deleteClient` returns FK error when income rows reference the client

### Smoke tests

- `getClientsWithIncomeCount` and `getClientById` are importable from `@pmg/db`
- `getAllExpenseCategories` and `getExpenseCategoryById` are importable from `@pmg/db`
- Sidebar renders a Clients nav item and a Categories nav item
