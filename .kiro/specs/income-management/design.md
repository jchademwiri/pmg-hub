# Design Document — Income Management

## Overview

Phase 3 of the PMG Control Center adds full CRUD management for income entries.
The feature spans two routes (`/income` and `/income/[id]`), five new DB query
helpers, three new client components, one new server action file, and two server
component pages.

The design follows the established PMG admin pattern: Server Components fetch
data via `@pmg/db` query helpers, Server Actions mutate data and call
`revalidatePath`, and client components handle interactivity. No client-side
data state — the database is the single source of truth.

### Scope

- List all income entries with division/client/description/amount columns
- Filter by division and month via URL search params (server-side)
- Running total computed from the filtered result set
- Inline add form on the list page (no modal)
- Edit page at `/income/[id]` with pre-populated form
- Inline delete with confirmation in the table row
- Zod-validated Server Actions returning `Promise<{ error?: string }>`
- Five new DB query helpers in `packages/db/src/queries.ts`

---

## Architecture

```
packages/db (Drizzle + Neon)
  └── queries.ts  ← 5 new helpers: getAllIncome, getIncomeById,
                     getDistinctIncomeMonths, getAllDivisions, getAllClients
         ↓
app/(admin)/income/page.tsx          [Server Component — parallel fetches]
app/(admin)/income/[id]/page.tsx     [Server Component — parallel fetches]
         ↓
FilterBar          [Client — useRouter().push for URL params]
IncomeAddForm      [Client — useTransition + createIncome action]
IncomeTable        [Client — inline delete confirm + deleteIncome action]
IncomeEditForm     [Client — useTransition + updateIncome action + router.push]
         ↑
app/actions/income.ts  [Server Actions — createIncome, updateIncome, deleteIncome]
```

### Data flow

1. Admin navigates to `/income` (optionally with `?divisionId=&month=` params)
2. `page.tsx` reads `searchParams`, fires four parallel DB fetches
3. Server renders the page shell with filtered entries and running total
4. `FilterBar` (client) updates URL params on select change → triggers server re-render
5. `IncomeAddForm` (client) calls `createIncome` Server Action → on success resets form
6. `IncomeTable` (client) calls `deleteIncome` Server Action → on error shows sonner toast
7. Edit link navigates to `/income/[id]` → `IncomeEditForm` calls `updateIncome` → on success `router.push('/income')`

### Next.js 16 notes

- Middleware is `proxy.ts` (not `middleware.ts`), exported as `proxy`
- `searchParams` in Server Components is a `Promise` in Next.js 15+ — must be awaited
- Server Actions use `'use server'` directive at the top of the file

---

## Components and Interfaces

### DB Query Helpers (`packages/db/src/queries.ts`)

```ts
// Return type for getAllIncome and getIncomeById
type IncomeRow = {
  id: string
  date: string
  divisionId: string
  divisionName: string
  clientId: string | null
  clientName: string | null
  description: string | null
  amount: string  // numeric from DB — caller converts with Number()
}

getAllIncome(filters?: { divisionId?: string; month?: string }): Promise<IncomeRow[]>
getIncomeById(id: string): Promise<IncomeRow | null>
getDistinctIncomeMonths(): Promise<string[]>   // YYYY-MM[], sorted DESC
getAllDivisions(): Promise<{ id: string; name: string }[]>   // CHECK before adding — see note below
getAllClients(): Promise<{ id: string; name: string; businessName: string | null }[]>
```

All five are exported from `packages/db/src/index.ts` automatically via
`export * from './queries'`.

> **`getAllDivisions()` duplicate guard:** CHECK `packages/db/src/queries.ts` before
> implementing. If `getAllDivisions` already exists and returns `{ id, name }[]` sorted
> by name ASC, DO NOT add a duplicate. Only add it if it is absent. The function name
> and return shape must match exactly — do not create `getAllDivisions2()` or a
> differently-named variant.

### Server Actions (`apps/admin/src/app/actions/income.ts`)

```ts
'use server'

createIncome(formData: FormData): Promise<{ error?: string }>
updateIncome(id: string, formData: FormData): Promise<{ error?: string }>
deleteIncome(id: string): Promise<{ error?: string }>
```

IncomeSchema (Zod):
```ts
const IncomeSchema = z.object({
  date:        z.string().min(1),
  divisionId:  z.string().uuid(),
  clientId:    z.string().uuid().optional(),   // empty string → undefined via transform
  description: z.string().optional(),
  amount:      z.coerce.number().positive(),
})
```

`clientId` empty string handling: before parsing, replace `''` with `undefined`
so Zod's `.optional()` accepts it cleanly.

Before calling `IncomeSchema.parse()`, normalize the raw FormData object:
```ts
const raw = Object.fromEntries(formData)
if (raw.clientId === '') delete raw.clientId
```
This ensures Zod's `.optional()` accepts the missing key cleanly. Do NOT pass the
empty string directly to the schema — it will fail UUID validation.

> See **Error Handling — Server Action errors** for the full normalization pattern
> embedded in the try/catch block.

### Page: `/income` (`apps/admin/src/app/(admin)/income/page.tsx`)

Server Component. Props: `{ searchParams: Promise<{ divisionId?: string; month?: string }> }`.

```ts
const { divisionId, month } = await searchParams
const [entries, divisions, clients, months] = await Promise.all([
  getAllIncome({ divisionId, month }),
  getAllDivisions(),
  getAllClients(),
  getDistinctIncomeMonths(),
])
const runningTotal = entries.reduce((sum, e) => sum + Number(e.amount), 0)
```

Renders:
1. Page header + formatted running total (`formatZAR(runningTotal)`)
2. `<FilterBar divisions months currentDivisionId currentMonth />`
3. `<IncomeAddForm divisions clients createAction={createIncome} />`
4. `<IncomeTable entries deleteAction={deleteIncome} />` or empty-state message

### Page: `/income/[id]` (`apps/admin/src/app/(admin)/income/[id]/page.tsx`)

Server Component. Props: `{ params: Promise<{ id: string }> }`.

```ts
const { id } = await params
const entry = await getIncomeById(id)
if (!entry) notFound()
const [divisions, clients] = await Promise.all([getAllDivisions(), getAllClients()])
```

Renders: back link to `/income` + `<IncomeEditForm entry divisions clients updateAction={updateIncome.bind(null, id)} />`

### FilterBar (`apps/admin/src/components/income/filter-bar.tsx`)

`'use client'`. Props:
```ts
interface FilterBarProps {
  divisions: { id: string; name: string }[]
  months: string[]
  currentDivisionId?: string
  currentMonth?: string
}
```

Uses `useRouter` from `next/navigation`. On select change, builds new URLSearchParams
and calls `router.push('/income?' + params.toString())`. Two shadcn `<Select>`
controls: "All divisions" default + division options; "All months" default + month options.

> **Month display format:** The month select MUST display options as human-readable
> labels. Convert `YYYY-MM` to a display label using:
> ```ts
> new Date(month + '-01').toLocaleString('en-ZA', { month: 'long', year: 'numeric' })
> ```
> The option `value` remains `YYYY-MM` (what gets pushed to the URL).
> Example: `value="2026-03"` displays as `"March 2026"`.
> This is consistent with the label format used in the dashboard period selector.

### IncomeAddForm (`apps/admin/src/components/income/income-add-form.tsx`)

`'use client'`. Props:
```ts
interface IncomeAddFormProps {
  divisions: { id: string; name: string }[]
  clients: { id: string; name: string; businessName: string | null }[]
  createAction: (formData: FormData) => Promise<{ error?: string }>
}
```

Uses `useTransition` + `useRef` on the `<form>` element. On submit:
1. Calls `createAction(new FormData(formRef.current))`
2. On success (`!result.error`): resets form via `formRef.current.reset()`
3. On error: sets `errorMessage` state, displays below form

Fields: `date` (type="date"), `divisionId` (Select), `clientId` (Select with "No client"
leading option value=""), `description` (Input optional), `amount` (type="number"
min="0.01" step="0.01"). Submit button: "Add Income" / "Adding…" while pending.

> **"No client" option:** The leading client select option MUST render with the visible
> label `"No client"` and `value=""`. It MUST be the first option in the list. When
> selected, the submitted `formData` will contain `clientId = ""`.

### IncomeTable (`apps/admin/src/components/income/income-table.tsx`)

`'use client'`. Props:
```ts
interface IncomeTableProps {
  entries: IncomeRow[]
  deleteAction: (id: string) => Promise<{ error?: string }>
}
```

State: `pendingDeleteId: string | null`. Renders shadcn `<Table>` with columns:
Date | Division | Client | Description | Amount | Actions.

Actions cell per row:
- Edit: `<Link href={'/income/' + entry.id}>` with Pencil icon button
- Delete: when `pendingDeleteId !== entry.id`, shows trash icon button that sets
  `pendingDeleteId = entry.id`. When `pendingDeleteId === entry.id`, shows two
  buttons: "Confirm" (calls `deleteAction(id)`, on error shows sonner `toast.error`)
  and "Cancel" (sets `pendingDeleteId = null`).

### IncomeEditForm (`apps/admin/src/components/income/income-edit-form.tsx`)

`'use client'`. Props:
```ts
interface IncomeEditFormProps {
  entry: IncomeRow
  divisions: { id: string; name: string }[]
  clients: { id: string; name: string; businessName: string | null }[]
  updateAction: (formData: FormData) => Promise<{ error?: string }>
}
```

Same fields as IncomeAddForm, pre-populated with `entry` values. Uses `useTransition`
+ `useRouter`. On success: `router.push('/income')`. On error: inline error display.

> **"No client" option:** The leading client select option MUST render with the visible
> label `"No client"` and `value=""`. It MUST be the first option in the list. When
> selected, the submitted `formData` will contain `clientId = ""`. The pre-populated
> value should select "No client" when `entry.clientId` is `null`.

---

## Data Models

### `income` table (existing — `packages/db/src/schema/income.ts`)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | defaultRandom() |
| date | date | NOT NULL |
| division_id | uuid FK → divisions.id | NOT NULL, onDelete: restrict |
| client_id | uuid FK → clients.id | nullable, onDelete: set null |
| description | text | nullable |
| amount | numeric(12,2) | NOT NULL, CHECK > 0 |
| created_at | timestamptz | defaultNow() |
| updated_at | timestamptz | nullable, set by app on update |

DB constraint `income_amount_positive` enforces `amount > 0` at the database level,
complementing the Zod `z.coerce.number().positive()` check in the Server Action.

### `getAllIncome` query shape

The query performs:
- `INNER JOIN divisions` on `income.division_id = divisions.id`
- `LEFT JOIN clients` on `income.client_id = clients.id`
- Optional `WHERE income.division_id = $divisionId`
- Optional `WHERE TO_CHAR(income.date, 'YYYY-MM') = $month`
- `ORDER BY income.date DESC`

Returns `IncomeRow[]` as defined above.

### `getDistinctIncomeMonths` query shape

```sql
SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') AS month
FROM income
ORDER BY 1 DESC
```

Returns `string[]` of `YYYY-MM` values.

### Amount precision

Drizzle `numeric` columns return strings from the DB driver. The Server Action
stores `String(parsed.amount)` (where `parsed.amount` is a JS number from Zod
coercion). The page computes the running total with `Number(e.amount)`. This
round-trip preserves two decimal places as long as the input is a valid decimal.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid
executions of a system — essentially, a formal statement about what the system should
do. Properties serve as the bridge between human-readable specifications and
machine-verifiable correctness guarantees.*

### Property 1: getAllIncome returns all entries with correct shape, sorted date DESC

*For any* set of income entries inserted into the database, `getAllIncome()` with no
filters should return all of them, each with the fields `id`, `date`, `divisionId`,
`divisionName`, `clientId`, `clientName`, `description`, and `amount`, and the result
array should be sorted by `date` in descending order.

**Validates: Requirements 1.1, 1.3, 8.1**

---

### Property 2: Division filter excludes entries from other divisions

*For any* `divisionId` value, `getAllIncome({ divisionId })` should never return an
entry whose `divisionId` differs from the filter value.

**Validates: Requirements 2.3, 7.3**

---

### Property 3: Month filter excludes entries outside the calendar month

*For any* `month` value in `YYYY-MM` format, `getAllIncome({ month })` should never
return an entry whose `date` falls outside that calendar month.

**Validates: Requirements 2.4, 7.3**

---

### Property 4: Running total equals sum of amounts in the result set

*For any* result set returned by `getAllIncome()` (with or without filters), the
running total computed as `entries.reduce((sum, e) => sum + Number(e.amount), 0)`
should equal the arithmetic sum of all `amount` values in that result set.

**Validates: Requirements 1.4, 2.6, 7.4**

---

### Property 5: createIncome round-trip — valid input succeeds and entry is retrievable

*For any* valid `IncomeSchema` input (non-empty date, valid division UUID, optional
client UUID, optional description, positive amount), `createIncome` should return `{}`
(no error) and the new entry should subsequently appear in `getAllIncome()` with the
correct field values.

**Validates: Requirements 3.5, 3.7, 6.4**

---

### Property 6: updateIncome round-trip — valid input succeeds and changes are reflected

*For any* existing income entry and any valid `IncomeSchema` update input,
`updateIncome(id, formData)` should return `{}` and `getAllIncome()` should
subsequently reflect the updated field values for that entry.

**Validates: Requirements 4.7**

---

### Property 7: deleteIncome round-trip — deleted entry is no longer retrievable

*For any* existing income entry id, `deleteIncome(id)` should return `{}` and
`getIncomeById(id)` should return `null` afterwards.

**Validates: Requirements 5.3, 5.4**

---

### Property 8: getIncomeById returns the correct entry or null

*For any* income entry that has been inserted, `getIncomeById(entry.id)` should return
that entry with all correct field values. *For any* UUID that does not correspond to an
existing income entry, `getIncomeById(id)` should return `null`.

**Validates: Requirements 4.2, 4.9, 8.2**

---

### Property 9: getDistinctIncomeMonths returns distinct YYYY-MM strings sorted DESC

*For any* set of income entries spanning multiple months, `getDistinctIncomeMonths()`
should return a list of distinct `YYYY-MM` strings, with no duplicates, sorted in
descending order.

**Validates: Requirements 2.2, 8.3**

---

### Property 10: Invalid input to createIncome/updateIncome always returns an error

*For any* input that violates `IncomeSchema` — including amount ≤ 0, a non-UUID
`divisionId`, a missing required field, or a non-positive amount string — both
`createIncome` and `updateIncome` should return `{ error: <non-empty string> }` and
must not write any record to the database.

**Validates: Requirements 3.6, 4.8, 9.2, 10.2, 10.3**

---

### Property 11: Amount precision is preserved on round-trip

*For any* valid positive decimal amount submitted through `createIncome`, the value
stored in the database (as `String(parsed.amount)`) should equal the original amount
when read back and converted with `Number()`, within two decimal places of precision.

**Validates: Requirements 9.1, 9.2**

---

### Property 12: getAllDivisions returns all divisions sorted by name ASC

*For any* set of divisions in the database, `getAllDivisions()` should return all of
them as `{ id, name }` objects, sorted alphabetically by `name` ascending.

**Validates: Requirements 8.4**

---

### Property 13: getAllClients returns all clients sorted by name ASC

*For any* set of clients in the database, `getAllClients()` should return all of them
as `{ id, name, businessName }` objects, sorted alphabetically by `name` ascending.

**Validates: Requirements 8.5**

---

## Error Handling

### Server Action errors

> **KEY CONSTRAINT:** `revalidatePath('/income')` and `revalidatePath('/dashboard')`
> MUST only be called inside the `try` block, after a successful DB write, and BEFORE
> the final `return {}`. They MUST NOT be called in the `catch` block or after an error
> return. Calling `revalidatePath` on a failed write would cause the dashboard to show
> stale data or trigger unnecessary re-renders.

All three Server Actions follow the same pattern:

```ts
try {
  const raw = Object.fromEntries(formData)
  // normalize empty clientId
  if (raw.clientId === '') delete raw.clientId
  const parsed = IncomeSchema.parse(raw)
  // ... DB operation
  revalidatePath('/income')
  revalidatePath('/dashboard')
  return {}
} catch (err) {
  if (err instanceof z.ZodError) {
    return { error: err.errors[0]?.message ?? 'Validation error' }
  }
  const message = err instanceof Error ? err.message : 'Unknown error'
  return { error: message }
}
```

Key points:
- Zod errors produce human-readable field-level messages
- DB errors (FK violation, connection failure) are caught and returned as `{ error }`
- No exception is ever thrown to the caller
- `revalidatePath` is only called on success (inside the try, before `return {}`)

For `updateIncome`, the Drizzle update call MUST include `updatedAt: new Date()`:
```ts
await db.update(income)
  .set({ ...parsed, amount: String(parsed.amount), updatedAt: new Date() })
  .where(eq(income.id, id))
```

### deleteIncome error handling

`deleteIncome` follows the same try/catch pattern but requires no Zod validation
(no `FormData` input):

```ts
export async function deleteIncome(id: string): Promise<{ error?: string }> {
  try {
    await db.delete(income).where(eq(income.id, id))
    revalidatePath('/income')
    revalidatePath('/dashboard')
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { error: message }
  }
}
```

Key points:
- `revalidatePath('/income')` AND `revalidatePath('/dashboard')` are BOTH called on
  success — this satisfies R11 (dashboard consistency after delete).
- `revalidatePath` is only called inside the `try` block, BEFORE `return {}`. It is
  never called when an error is caught.
- No Zod validation is needed for `deleteIncome` (no FormData input).

### `notFound()` on missing entry

`/income/[id]` calls `notFound()` from `next/navigation` when `getIncomeById`
returns `null`. This renders the app's `not-found.tsx` page with a 404 status.

### Delete error feedback

`IncomeTable` calls `deleteAction(id)` and on `result.error` shows a sonner
`toast.error(result.error)`. The table row is not removed optimistically — the
page revalidation handles the refresh on success.

### Empty state

When `entries.length === 0`, the Income_Page renders an empty-state message
("No income entries yet. Add one above.") instead of the table.

---

## Testing Strategy

### Dual approach

Both unit tests and property-based tests are required. They are complementary:
unit tests catch concrete bugs and edge cases; property tests verify general
correctness across the full input space.

### Property-based testing library

Use **fast-check** (already a dev dependency from Phase 1 tests). Each property
test runs a minimum of **100 iterations**.

Tag format for each property test:
```
// Feature: income-management, Property N: <property_text>
```

### Property tests (one per correctness property)

Each property below maps 1:1 to a Correctness Property in this document.

| Test | Property | fast-check arbitraries |
|---|---|---|
| P1 | getAllIncome shape + sort | `fc.array(incomeArb)` — insert, query, assert |
| P2 | Division filter | `fc.uuid()` as divisionId filter |
| P3 | Month filter | `fc.date()` mapped to YYYY-MM |
| P4 | Running total | `fc.array(fc.float({ min: 0.01 }))` as amounts |
| P5 | createIncome round-trip | `fc.record({ date, divisionId, amount, ... })` |
| P6 | updateIncome round-trip | existing entry + `fc.record(...)` for new values |
| P7 | deleteIncome round-trip | existing entry id |
| P8 | getIncomeById | existing id + random non-existent UUID |
| P9 | getDistinctIncomeMonths | `fc.array(fc.date())` spanning multiple months |
| P10 | Invalid input returns error | `fc.oneof(invalidAmountArb, invalidUuidArb, ...)` |
| P11 | Amount precision | `fc.float({ min: 0.01, max: 999999.99 })` |
| P12 | getAllDivisions sort | `fc.array(fc.string())` as division names |
| P13 | getAllClients sort | `fc.array(fc.record({ name, businessName }))` |

### Unit tests

Focus on specific examples and edge cases not covered by property tests:

- `IncomeSchema` rejects empty string date
- `IncomeSchema` rejects `clientId = ''` (before normalization)
- `IncomeSchema` accepts `clientId = undefined`
- `createIncome` with `amount = 0` returns `{ error }`
- `createIncome` with `amount = -1` returns `{ error }`
- `getIncomeById` with a well-formed but non-existent UUID returns `null`
- Empty-state rendering when `entries = []`
- `IncomeTable` renders edit link with correct href `/income/<id>`
- `FilterBar` renders "All divisions" and "All months" as default options
- `deleteIncome` returns `{ error }` when the DB throws (e.g. FK constraint violation or connection error) — verifies R5.6
- `deleteIncome` calls `revalidatePath('/income')` and `revalidatePath('/dashboard')` on success — verifies R11.1

### Test file location

```
apps/admin/src/__tests__/income.test.ts   ← unit + property tests
```

Follows the existing pattern from `apps/admin/src/__tests__/financial.test.ts`.
