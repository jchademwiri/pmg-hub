# Design Document: Expense Management

## Overview

Expense Management is Phase 4 of the PMG Control Center admin app. It provides full CRUD for business expenses across divisions, mirroring the Income Management pattern exactly. Server Components fetch data, Server Actions mutate it, and `revalidatePath` refreshes the cache on success.

The feature adds:
- 4 DB query helpers and an `ExpenseRow` type to `@pmg/db`
- 3 Server Actions in `apps/admin/src/app/actions/expenses.ts`
- 4 Client Components under `apps/admin/src/components/expenses/`
- 2 Server Component pages at `/expenses` and `/expenses/[id]`
- Property-based and unit tests in `apps/admin/src/__tests__/expenses.test.ts`

---

## Architecture

The feature follows the same layered architecture as Income Management:

```mermaid
graph TD
  A[Browser] -->|GET /expenses?filters| B[ExpensePage - Server Component]
  A -->|GET /expenses/id| C[ExpenseEditPage - Server Component]
  B -->|Server Action| D[createExpense / deleteExpense]
  C -->|Server Action| E[updateExpense]
  D --> F[@pmg/db queries]
  E --> F
  B --> F
  C --> F
  F --> G[(PostgreSQL - expenses table)]
```

Data flow:
1. Pages call DB helpers directly (no API layer)
2. Mutations go through Server Actions (`'use server'`)
3. On success, `revalidatePath` invalidates `/expenses` and `/dashboard`
4. Client Components receive data as props; they never call DB helpers directly

---

## Components and Interfaces

### DB Query Helpers (`packages/db/src/queries.ts`)

```ts
export type ExpenseRow = {
  id: string
  date: string           // ISO date string e.g. "2026-03-15"
  divisionId: string
  divisionName: string
  category: string
  description: string | null
  amount: string         // numeric from DB — caller converts with Number()
  createdAt: Date
  updatedAt: Date | null
}

getAllExpenses(filters?: { divisionId?: string; category?: string; month?: string }): Promise<ExpenseRow[]>
getExpenseById(id: string): Promise<ExpenseRow | null>
getDistinctExpenseMonths(): Promise<string[]>   // YYYY-MM, sorted ASC
getDistinctExpenseCategories(): Promise<string[]> // sorted ASC
```

`getAllExpenses` performs an INNER JOIN with `divisions`, applies optional WHERE clauses, and orders by `date DESC`. Month filtering uses `TO_CHAR(date, 'YYYY-MM') = $month`.

### Server Actions (`apps/admin/src/app/actions/expenses.ts`)

```ts
'use server'
createExpense(formData: FormData): Promise<{ error?: string }>
updateExpense(id: string, formData: FormData): Promise<{ error?: string }>
deleteExpense(id: string): Promise<{ error?: string }>
```

All three wrap their logic in `try/catch` and never throw. `revalidatePath` is called only inside the `try` block on success.

### Client Components

**`ExpenseFilterBar`** (`expense-filter-bar.tsx`)
- Props: `divisions`, `categories`, `months`, `currentDivisionId?`, `currentCategory?`, `currentMonth?`
- Three shadcn `<Select>` controls; on change calls `router.push('/expenses?' + params)`
- Month labels formatted via `toLocaleString('en-ZA', { month: 'long', year: 'numeric' })`
- Each `<Select>` includes a default "all" option as its first item: `"All divisions"` (value `"all"`), `"All categories"` (value `"all"`), `"All months"` (value `"all"`). When the default option is selected, the corresponding query parameter is omitted from the URL — effectively clearing that filter. No separate reset button is needed.

**`ExpenseAddForm`** (`expense-add-form.tsx`)
- Props: `divisions`, `categories`, `createAction`
- `useTransition` + `useRef` for pending state and form reset
- Category field: `<input list="category-suggestions">` + `<datalist>` from `categories` prop
- On success: `formRef.current.reset()`; on error: inline message below form

**`ExpenseTable`** (`expense-table.tsx`)
- Props: `entries: ExpenseRow[]`, `deleteAction`
- Columns: Date, Division, Category, Description, Amount (`formatZAR`), Actions
- Edit: `<Button asChild><Link href={'/expenses/' + entry.id}>…</Link></Button>`
- Delete: inline confirm/cancel with `pendingDeleteId` state; errors via `toast.error`
- Delete pending UX: when a delete is confirmed, `startTransition` wraps the `deleteAction` call. While the transition is in flight, the row for that entry is visually disabled — `opacity-50 pointer-events-none` — to indicate the operation is pending. The row is only removed from the DOM after `revalidatePath` triggers a server re-render and the page data refreshes.

**`ExpenseEditForm`** (`expense-edit-form.tsx`)
- Props: `entry: ExpenseRow`, `divisions`, `categories`, `updateAction`
- Same fields as add form, pre-populated from `entry`
- On success: `router.push('/expenses')`; on error: inline message

### Server Component Pages

**`/expenses/page.tsx`**
```ts
export const dynamic = 'force-dynamic'
// Awaits searchParams: { divisionId?, category?, month? }
// Promise.all([getAllExpenses(filters), getAllDivisions(),
//              getDistinctExpenseCategories(), getDistinctExpenseMonths()])
// Computes runningTotal and categoryBreakdown inline
// Renders: header + total, category breakdown pills, ExpenseFilterBar,
//          ExpenseAddForm, ExpenseTable or empty-state message
```

**`/expenses/[id]/page.tsx`**
```ts
export const dynamic = 'force-dynamic'
// Awaits params: { id }
// getExpenseById(id) → notFound() if null
// Promise.all([getAllDivisions(), getDistinctExpenseCategories()])
// Renders: back link + ExpenseEditForm with updateExpense.bind(null, id)
```

---

## Data Models

### `expenses` table (already exists in `packages/db/src/schema/expenses.ts`)

| Column       | Type                    | Constraints                        |
|--------------|-------------------------|------------------------------------|
| id           | uuid                    | PK, default gen_random_uuid()      |
| date         | date                    | NOT NULL                           |
| divisionId   | uuid                    | FK → divisions(id) ON DELETE RESTRICT |
| category     | text                    | NOT NULL                           |
| description  | text                    | nullable                           |
| amount       | numeric(12,2)           | NOT NULL, CHECK > 0                |
| createdAt    | timestamptz             | default now()                      |
| updatedAt    | timestamptz             | nullable, app-managed              |

Indexes: `expenses_date_idx`, `expenses_division_id_idx`, `expenses_category_idx`

### `ExpenseSchema` (Zod)

```ts
const ExpenseSchema = z.object({
  date:        z.string().min(1),
  divisionId:  z.string().uuid(),
  category:    z.string().min(1),
  description: z.string().optional(),
  amount:      z.coerce.number().positive(),
})
```

`amount` is stored as `String(parsed.amount)` — never a raw JS number — to preserve numeric precision through the `numeric(12,2)` column.

### Expense Summary (computed server-side, inline in page)

```ts
const runningTotal = entries.reduce((sum, e) => sum + Number(e.amount), 0)
const categoryBreakdown = entries.reduce((map, e) => {
  map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount))
  return map
}, new Map<string, number>())
```

Rendered as: total in the page header + a flex-wrap list of `category: formatZAR(amount)` badge/pill elements below the filter bar.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: getAllExpenses shape and sort order

*For any* array of expense entries returned by `getAllExpenses`, every entry must have the correct `ExpenseRow` shape (all required fields present with correct types), and entries must be ordered by `date` descending.

**Validates: Requirements 1.1, 1.2, 11.1, 11.7**

### Property 2: Division filter excludes other divisions

*For any* `divisionId` filter value and any backing dataset, `getAllExpenses({ divisionId })` must return only entries whose `divisionId` exactly matches the filter value — no entries from other divisions may appear.

**Validates: Requirements 2.2, 11.1**

### Property 3: Category filter excludes other categories

*For any* `category` filter value and any backing dataset, `getAllExpenses({ category })` must return only entries whose `category` exactly matches the filter value — no entries with a different category may appear.

**Validates: Requirements 2.3, 11.1**

### Property 4: Month filter excludes entries outside the calendar month

*For any* `month` filter value in `YYYY-MM` format and any backing dataset, `getAllExpenses({ month })` must return only entries whose `date` starts with that `YYYY-MM` prefix — no entries from other months may appear.

**Validates: Requirements 2.4, 11.6**

### Property 5: Running total equals sum of amounts

*For any* array of expense entries, the running total computed as `entries.reduce((sum, e) => sum + Number(e.amount), 0)` must equal the arithmetic sum of all `Number(entry.amount)` values in the array.

**Validates: Requirements 3.1, 3.4**

### Property 6: Category breakdown sums equal running total

*For any* array of expense entries, the sum of all per-category totals in the `categoryBreakdown` map must equal the `runningTotal` computed from the same entries array.

**Validates: Requirements 3.2, 3.5**

### Property 7: createExpense round-trip

*For any* valid expense input (non-empty date, valid UUID divisionId, non-empty category, positive amount), calling `createExpense` must return `{}` (no error), and a subsequent call to `getAllExpenses` must return an entry with matching field values.

**Validates: Requirements 5.3, 5.4**

### Property 8: updateExpense round-trip

*For any* existing expense entry and any valid new field values, calling `updateExpense(id, formData)` must return `{}` (no error), and a subsequent call to `getAllExpenses` must reflect the updated values for that entry.

**Validates: Requirements 7.3, 7.4**

### Property 9: deleteExpense round-trip

*For any* existing expense entry id, calling `deleteExpense(id)` must return `{}` (no error), and a subsequent call to `getExpenseById(id)` must return `null`.

**Validates: Requirements 9.1, 9.2**

### Property 10: getExpenseById returns correct entry or null

*For any* expense entry id that exists in the database, `getExpenseById(id)` must return an `ExpenseRow` with all fields matching the stored values. *For any* UUID that does not correspond to an existing entry, `getExpenseById` must return `null`.

**Validates: Requirements 11.2, 6.1, 6.2**

### Property 11: getDistinctExpenseMonths returns distinct YYYY-MM strings sorted ASC

*For any* set of expense entries in the database, `getDistinctExpenseMonths()` must return an array of strings where: every string matches `YYYY-MM` format, there are no duplicate values, and the array is sorted in ascending order (oldest month first).

**Validates: Requirements 11.3, 2.7**

### Property 12: getDistinctExpenseCategories returns distinct strings sorted ASC

*For any* set of expense entries in the database, `getDistinctExpenseCategories()` must return an array of strings where: there are no duplicate values, and the array is sorted alphabetically ascending.

**Validates: Requirements 11.4, 2.6**

### Property 13: Invalid input to createExpense/updateExpense always returns `{ error }`

*For any* FormData input that fails `ExpenseSchema` validation (empty date, non-UUID divisionId, empty category, amount ≤ 0, or missing required fields), both `createExpense` and `updateExpense` must return an object with a non-empty `error` string and must not write to the database.

**Validates: Requirements 5.2, 5.6, 7.2, 7.6, 10.1–10.6**

### Property 14: Amount precision preserved on String/Number round-trip

*For any* positive numeric amount value, `Number(String(amount))` must equal the original value within two decimal places of precision — ensuring no precision is lost when storing as `String(parsed.amount)` and reading back with `Number(entry.amount)`.

**Validates: Requirements 5.3, 7.3**

---

## Error Handling

All three Server Actions follow the same pattern as `income.ts`:

```ts
export async function createExpense(formData: FormData): Promise<{ error?: string }> {
  try {
    // 1. Parse FormData
    // 2. Validate with ExpenseSchema.safeParse — return { error } on failure
    // 3. DB insert
    // 4. revalidatePath (inside try, only on success)
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

Key rules:
- `revalidatePath` is called only inside `try`, never in `catch`
- Actions never throw — all errors are returned as `{ error: string }`
- Validation errors return the first Zod issue message
- DB errors return the caught error message

Client Components handle errors as follows:
- `ExpenseAddForm` / `ExpenseEditForm`: inline `<p className="text-destructive">` below the form
- `ExpenseTable` delete errors: `toast.error(result.error)` via sonner
- `ExpenseEditPage`: `notFound()` when `getExpenseById` returns `null`

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests catch concrete bugs at specific inputs and verify UI rendering
- Property tests verify universal correctness across all generated inputs

### Property-Based Testing

Library: **fast-check** (already used in `income.test.ts`)

Each property test runs a minimum of **100 iterations** (`{ numRuns: 100 }`).

Each test is tagged with a comment in the format:
```
// Feature: expense-management, Property N: <property text>
```

Each correctness property above is implemented by exactly one property-based test.

**Property test file**: `apps/admin/src/__tests__/expenses.test.ts`

| Test | Property | Requirements |
|------|----------|--------------|
| P1: getAllExpenses shape + sort | Property 1 | 1.1, 1.2, 11.7 |
| P2: Division filter | Property 2 | 2.2 |
| P3: Category filter | Property 3 | 2.3 |
| P4: Month filter | Property 4 | 2.4, 11.6 |
| P5: Running total | Property 5 | 3.1, 3.4 |
| P6: Category breakdown | Property 6 | 3.2, 3.5 |
| P7: createExpense round-trip | Property 7 | 5.3, 5.4 |
| P8: updateExpense round-trip | Property 8 | 7.3, 7.4 |
| P9: deleteExpense round-trip | Property 9 | 9.1, 9.2 |
| P10: getExpenseById | Property 10 | 11.2, 6.1, 6.2 |
| P11: getDistinctExpenseMonths (sorted ASC) | Property 11 | 11.3, 2.7 |
| P12: getDistinctExpenseCategories | Property 12 | 11.4, 2.6 |
| P13: Invalid input returns error | Property 13 | 5.2, 7.2, 10.1–10.6 |
| P14: Amount precision | Property 14 | 5.3, 7.3 |

### Unit Tests

Unit tests focus on specific examples, UI rendering, and error conditions:

- `ExpenseFilterBar` renders "All divisions", "All categories", "All months" as defaults
- `ExpenseTable` renders edit links with correct `/expenses/<id>` hrefs
- `ExpenseTable` with empty array renders no data rows (only header row)
- `ExpenseSchema` rejects empty date, empty category, amount = 0, amount = -1
- `deleteExpense` returns `{ error }` when DB throws; returns `{}` and calls `revalidatePath` on success
- Empty-state condition renders message instead of table when `entries.length === 0`
- Category datalist is rendered with the correct `id` and populated options
