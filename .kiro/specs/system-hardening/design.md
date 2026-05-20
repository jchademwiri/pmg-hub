# Design Document: System Hardening (Phase 9)

## Overview

Phase 9 hardens the PMG Control Center admin app for real daily use across six
areas: inline validation feedback, error boundaries, per-route loading
skeletons, graceful empty states, optimistic lead status updates, and an updated
database seed.

The app is a Next.js 15 monorepo app (`apps/admin`) using the App Router, React
Server Components, Server Actions, shadcn/ui, Tailwind CSS with OKLCH tokens,
and Drizzle ORM against a Neon PostgreSQL database. All six areas are additive
hardening - no schema migrations are required.

---

## Architecture

The admin app follows a layered architecture:

```
┌─────────────────────────────────────────────────────────┐
│  app/(admin)/  - Route Segments (RSC pages)             │
│    layout.tsx  - Sidebar + TopNav shell                 │
│    error.tsx   - Error Boundary (NEW)                   │
│    loading.tsx - Skeleton Loading UI (NEW)              │
│    [route]/page.tsx - Async data fetch + render         │
├─────────────────────────────────────────────────────────┤
│  components/   - Client Components                      │
│    ui/         - shadcn primitives (Skeleton, etc.)     │
│    [domain]/   - Domain-specific forms & tables         │
│    EmptyState  - Shared empty state component (NEW)     │
├─────────────────────────────────────────────────────────┤
│  app/actions/  - Server Actions ('use server')          │
│    Return type: Promise<{ error?: string }>             │
├─────────────────────────────────────────────────────────┤
│  @pmg/db       - Drizzle queries + schema               │
│    seed.ts     - Development seed script (UPDATED)      │
└─────────────────────────────────────────────────────────┘
```

Next.js conventions used:
- `error.tsx` at the route group level catches unhandled errors within the
  `(admin)` segment tree via React's error boundary mechanism.
- `loading.tsx` at the route group level wraps each page in a Suspense boundary,
  showing the skeleton until the async page component resolves.
- `useOptimistic` (React 19) applies client-side state changes before a Server
  Action response arrives.

---

## Components and Interfaces

### 1. `app/(admin)/error.tsx` - Error Boundary

A `'use client'` component required by Next.js for error boundary files.

```tsx
'use client'
interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}
export default function AdminError({ error, reset }: ErrorProps)
```

Renders:
- A safe, non-technical user message (no stack trace, no `error.message` in
  production)
- A "Try again" button that calls `reset()`
- A link to `/dashboard`

### 2. `app/(admin)/loading.tsx` - Route Group Loading UI

A server component (no `'use client'` needed) that renders a skeleton matching
the general admin page layout.

```tsx
export default function AdminLoading()
```

Uses `<Skeleton>` from `@/components/ui/skeleton` to mirror:
- A page header bar (title + optional action button)
- A table skeleton (header row + 5 placeholder rows)

Preserves the sidebar layout because `loading.tsx` renders inside the
`(admin)/layout.tsx` shell.

### 3. `components/ui/empty-state.tsx` - Shared Empty State

A reusable presentational component.

```tsx
interface EmptyStateProps {
  message: string
  ctaLabel?: string
  ctaHref?: string
}
export function EmptyState({ message, ctaLabel, ctaHref }: EmptyStateProps)
```

Renders a centered card with an icon, the descriptive message, and an optional
CTA link. Accepts an optional `ctaHref` so pages without an add form can omit
the CTA.

### 4. Inline Error Display - Form Components

All existing form components already follow the pattern:

```tsx
const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
// ...
{errorMessage && <p className="w-full text-sm text-destructive">{errorMessage}</p>}
```

The hardening work ensures this pattern is consistently applied to every form
that calls a Server Action, including edit forms and the division add form.
Field values are preserved on error because form state is managed in React
state (not reset on error).

### 5. `LeadStatusForm` - Optimistic Update

The existing `LeadStatusForm` component is upgraded to use `useOptimistic`:

```tsx
'use client'
const [optimisticStatus, setOptimisticStatus] = useOptimistic(currentStatus)
```

Flow:
1. User selects new status → `setOptimisticStatus(newStatus)` applied immediately
2. `startTransition` calls the Server Action
3. While pending: selector disabled, optimistic status displayed
4. On success: `revalidatePath` causes RSC re-render with confirmed status
5. On error: `useOptimistic` reverts to `currentStatus`; error message shown

### 6. `packages/db/src/seed.ts` - Updated Seed

New seed data added (with upsert semantics via `onConflictDoNothing()`):
- `expenses`: rows covering PMG, TES, and AWS divisions across categories
  (Salaries, Software, Marketing, Office, Travel)
- `leads`: one row per status (`new`, `contacted`, `converted`, `lost`)
- `snapshots`: one closed prior-month snapshot with valid `PeriodSummary` values

---

## Data Models

No schema changes. All tables already exist from Phases 4–8.

### Relevant existing types

```ts
// packages/db/src/schema/leads.ts
type Lead = {
  id: string
  status: 'new' | 'contacted' | 'converted' | 'lost'
  name: string | null
  email: string | null
  // ...
}

// packages/db/src/schema/expenses.ts
type Expense = {
  id: string
  divisionId: string
  category: string
  amount: string  // numeric stored as string
  // ...
}

// packages/db/src/schema/snapshots.ts
type Snapshot = {
  id: string
  period: string          // e.g. "2025-03"
  revenue: string
  expenses: string
  pmgShare: string
  profitPool: string
  salary: string
  reinvest: string
  reserve: string
  flex: string
  createdAt: Date
}
```

### Server Action return contract

All Server Actions in `app/actions/` already return `Promise<{ error?: string }>`.
The hardening work enforces this contract is complete - no action throws
unhandled exceptions.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all
valid executions of a system - essentially, a formal statement about what the
system should do. Properties serve as the bridge between human-readable
specifications and machine-verifiable correctness guarantees.*

### Property 1: Server Actions never throw - they always return `{ error? }`

*For any* Server Action in `app/actions/` and *for any* input (valid, invalid,
or malformed), calling the action must return an object of shape
`{ error?: string }` and must never propagate an unhandled exception to the
caller.

**Validates: Requirements 1.1, 1.2, 1.6**

### Property 2: EmptyState renders its message and CTA for any input

*For any* non-empty `message` string and any `ctaLabel`/`ctaHref` pair, the
`EmptyState` component must render the message text and the CTA link in its
output.

**Validates: Requirements 4.6, 4.7**

---

## Error Handling

### Server Actions

- All `try/catch` blocks return `{ error: humanReadableMessage }` - never
  re-throw.
- Zod `safeParse` is used (not `parse`) so validation failures are caught
  without exceptions.
- Database errors: `err instanceof Error ? err.message : 'Unknown error'` is
  the fallback. For production, this should be replaced with a generic message
  like `'Failed to save. Please try again.'` to avoid leaking DB internals.

### Error Boundary (`error.tsx`)

- Catches any unhandled error that propagates out of a route segment within
  `(admin)/`.
- Does **not** display `error.message` or `error.stack` to the user.
- Logs the error digest (`error.digest`) for server-side tracing without
  exposing it in the UI.
- Provides `reset()` to attempt in-place recovery before requiring a full
  page reload.

### Optimistic Updates

- `useOptimistic` automatically reverts to the committed state when the
  enclosing transition completes without updating the optimistic value.
- On Server Action error, the component explicitly sets the error message and
  the optimistic state reverts to `currentStatus` (the prop from the server).

### Empty States

- Empty state vs. filtered-empty state are distinguished by whether any filter
  params are active. Pages pass a `filtered` boolean (or equivalent) to
  `EmptyState` to render the appropriate message.

---

## Testing Strategy

### Unit / Component Tests (Vitest + Testing Library)

Located in `apps/admin/src/__tests__/`.

**Error Boundary:**
- Render `AdminError` with a mock error and `reset` spy; assert safe message
  shown, "Try again" calls `reset`, dashboard link present.

**Loading UI:**
- Render `AdminLoading`; assert `Skeleton` elements are present.

**EmptyState component:**
- Render with message + CTA; assert both appear.
- Render without CTA; assert no link rendered.
- Render with `filtered=true`; assert filter-specific message shown.

**Form inline errors:**
- For each form component (income, expense, division, lead status): render with
  a mock action returning `{ error: 'test error' }`, submit, assert error text
  appears and field values are preserved.
- Submit with mock action returning `{}` (success); assert error is cleared.

**LeadStatusForm optimistic update:**
- Render with `currentStatus='new'`, select `'contacted'`, assert UI shows
  `'contacted'` before action resolves.
- Trigger action returning `{ error: '...' }`, assert status reverts to `'new'`
  and error message appears.
- Trigger successful action, assert status remains `'contacted'`.
- Assert selector is disabled while action is pending.

### Property-Based Tests (fast-check)

`fast-check` is already installed in `apps/admin/node_modules/fast-check`.

**Property 1 - Server Actions never throw:**

```
Feature: system-hardening, Property 1: Server Actions never throw
```

For each action (`createIncome`, `updateIncome`, `deleteIncome`,
`createExpense`, `updateExpense`, `deleteExpense`, `updateLeadStatus`,
`updateLeadNotes`, `createDivision`):
- Generate arbitrary `FormData` payloads using `fc.dictionary` / `fc.string`
- Mock the `db` module to either succeed or throw randomly
- Assert the action always returns `{ error?: string }` and never throws
- Minimum 100 iterations per action

**Property 2 - EmptyState renders message and CTA:**

```
Feature: system-hardening, Property 2: EmptyState renders message and CTA
```

- Generate arbitrary `message` strings (non-empty) and `ctaLabel`/`ctaHref`
  pairs using `fc.string` / `fc.webUrl`
- Render `EmptyState` with generated props
- Assert rendered output contains the message text and the CTA link
- Minimum 100 iterations

### Integration Tests (seed)

Located in `packages/db/__tests__/seed.test.ts`.

- Run seed against a test database; assert:
  - `expenses` table has rows covering ≥ 3 distinct `divisionId` values and
    ≥ 3 distinct `category` values
  - `leads` table contains all four statuses: `new`, `contacted`, `converted`,
    `lost`
  - `snapshots` table has ≥ 1 row with valid numeric fields
  - All pre-existing divisions, clients, income, and withdrawal rows are present
- Run seed a second time; assert no duplicate-key errors and row counts are
  unchanged (upsert idempotency).
