# Client Forms Audit

> Audit date: 24 June 2026
> Scope: `client-add-form.tsx`, `client-edit-form.tsx`, `clients.ts` (actions), schema, queries

---

## Architecture Overview

### Files audited (6)

| File | Role | Lines |
|------|------|-------|
| `apps/admin/src/components/clients/client-add-form.tsx` | Add client form component | 120 |
| `apps/admin/src/components/clients/client-edit-form.tsx` | Edit client form component | 106 |
| `apps/admin/src/app/actions/clients.ts` | Server actions (CRUD + toggle/delete) | 97 |
| `packages/db/src/schema/clients.ts` | DB schema + relations | 53 |
| `packages/db/src/queries/clients.ts` | Query helpers | 68 |
| `packages/db/src/index.ts` | Barrel exports | — |

### Data flow

```text
Form (client-side)
  → startTransition → FormData
    → Server Action (Zod validation)
      → DB query (insert / update / delete)
        → revalidatePath
          → router.refresh / form.reset
```

### Schema (`clients` table)

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, defaultRandom |
| `name` | `text` | NOT NULL |
| `businessName` | `text` | nullable |
| `email` | `text` | nullable, unique index |
| `phone` | `text` | nullable |
| `divisionId` | `uuid` | FK → divisions.id, nullable |
| `isActive` | `boolean` | NOT NULL, default true |
| `createdAt` | `timestamp` | NOT NULL, defaultNow |
| `updatedAt` | `timestamp` | nullable |

Indexes: `clients_name_idx`, `clients_email_unique_idx` (partial on non-null)

### Server actions (4)

| Action | Method | Returns |
|--------|--------|---------|
| `createClient` | POST via FormData | `{ error?: string }` |
| `updateClient` | POST via FormData | `{ error?: string }` |
| `toggleClientActive` | By id + bool | `{ error?: string }` |
| `deleteClient` | By id | `{ error?: string }` |

---

## 🔴 High Severity: 0

No critical issues found.

---

## 🟡 Medium Severity: 2

### M1. Bare `catch {}` with no error logging (both server actions)

Both `createClient` and `updateClient` use bare `catch {}` blocks that swallow errors silently:

```typescript
} catch {
    return { error: 'Failed to save. Please try again.' };
}
```

The same pattern was already fixed in `tender-schedule.ts`. If the DB insert fails (constraint violation, connection drop, etc.), there is zero diagnostic information available.

**Fix:** Same as scheduling — change `catch {` to `catch (e) { console.error('createClient failed:', e);` and `catch (e) { console.error('updateClient failed:', e);`.

**Severity:** Medium — impacts debuggability, not functionality.

---

### M2. `deleteClient` doesn't check for invoices/quotes, only income

The `deleteClient` action checks if the client has income records before allowing deletion:

```typescript
const [incomeCount] = await db
  .select({ id: income.id })
  .from(income)
  .where(eq(income.clientId, id))
  .limit(1);

if (incomeCount) {
  return { error: 'Cannot delete a client that has payment records. Disable the client instead.' };
}
```

But it does **not** check for:
- Quotes (`billingQuotations`)
- Invoices (`billingInvoices`)
- Tender schedule entries (`tenderScheduleEntries`)

The DB schema has `onDelete: "restrict"` on these FKs, so the DB will reject the delete — but the user gets a raw Postgres error instead of a friendly message.

**Fix:** Add checks for quotes, invoices, and tender entries before attempting delete. Or remove the `deleteClient` action entirely and rely on `toggleClientActive` (which is safer).

**Severity:** Medium — impacts UX, not data integrity (DB enforces referential integrity).

---

## 🟢 Low Severity: 5

### L1. `createClient` doesn't reset `divisionId` state after form reset

When the add form succeeds, `formRef.current?.reset()` is called. This resets native form elements but **does not** reset the `divisionId` React state back to `'__none__'`. The hidden input retains the previously selected division value, while the Select shows its placeholder (since it's uncontrolled — see L2).

**Fix:** Add `setDivisionId('__none__')` to the success handler, or use `resetForm()` pattern from the tender dialog.

---

### L2. Division `<Select>` in add form is uncontrolled

The add form's Division `<Select>` has no `value` or `defaultValue` prop:

```tsx
<Select
  disabled={isPending}
  onValueChange={(value) => setDivisionId(value)}
>
```

The hidden input is controlled via `value={divisionId}`, but the Select's visual display is uncontrolled. If the dialog were ever force-mounted across sessions, the Select could show a stale value.

**Fix:** Add `value={divisionId}` to the Select, matching the hidden input. (The edit form already has `defaultValue={divisionId}` which is correct.)

---

### L3. `toggleClientActive` and `deleteClient` have bare `catch {}`

Same pattern as M1 — no error logging:

```typescript
} catch {
    return { error: 'Failed to update client status.' };
}
// and
} catch {
    return { error: 'Failed to delete. Please try again.' };
}
```

**Fix:** Add `console.error` with the error object.

---

### L4. No client-side validation for email format

The email field uses `type="email"` which provides basic browser-level validation, but both server actions use `z.string().email().optional()`. If the email is valid per HTML5 but invalid per Zod (e.g., `test@test` — valid HTML5, invalid Zod), the user submits and gets a generic error with no specific field feedback.

**Fix:** Add inline error display for the email field, or use Zod's `.email()` in a `safeParse` per-field check.

---

### L5. No test coverage for client forms

Unlike the scheduling module (54 tests), the client forms have **zero** test files. The server actions (`createClient`, `updateClient`, `toggleClientActive`, `deleteClient`) and both form components are untested.

**Fix:** Add unit tests following the same patterns as the scheduling tests.

---

## Summary

| Severity | Count | Items |
|----------|-------|-------|
| 🔴 High | 0 | — |
| 🟡 Medium | 2 | Bare catch blocks (M1), incomplete delete guard (M2) |
| 🟢 Low | 5 | Form reset state (L1), uncontrolled Select (L2), bare catches (L3), email validation (L4), no tests (L5) |
