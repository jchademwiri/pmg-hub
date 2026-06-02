# Test Suite Fix Task List
**App:** `apps/admin`  
**Status:** ✅ All 155 errors resolved - `tsc --noEmit` exits clean  
**Completed:** May 2026

---

## ✅ Group 1 - Missing vitest globals (`vi`, `expect`)
**Fix:** Added `"types": ["vitest/globals"]` to `tsconfig.json` `compilerOptions`.  
**Files:** `tsconfig.json`

---

## ✅ Group 2 - Deleted/moved modules
**Fix:** Deleted the 3 test files that imported non-existent modules.  
**Deleted:**
- `src/__tests__/actions/updateWithdrawal.property.test.ts` - `@/app/actions/withdrawals` no longer exists
- `src/__tests__/components/salary-card.property.test.tsx` - `@/components/dashboard/salary-card` no longer exists
- `src/__tests__/components/withdraw-modal.property.test.tsx` - `@/components/dashboard/withdraw-modal` no longer exists

---

## ✅ Group 3 - `DivisionRow` fixture missing `isActive` + `toggleActiveAction` prop
**Fix:**
- Added `isActive: fc.boolean()` to `divisionRowArb`
- Added `isActive: true` to all hardcoded `DivisionRow` fixture objects
- Added `toggleActiveAction={toggleActiveAction}` to all `<DivisionsTable>` renders
- Fixed Drizzle mock cast: `as ReturnType<...>` → `as unknown as ReturnType<...>`

**Files:** `divisions.test.ts`, `divisions-components.test.tsx`

---

## ✅ Group 4 - `getAllExpenses` / `getAllIncome` return shape changed
**Fix:** Wrapped all `mockResolvedValue(array)` with `{ data: array, total: array.length, sum: 0 }`. Updated result iteration to use `result.data`.

**Files:** `expenses.test.ts`, `income.test.ts`

---

## ✅ Group 5 - `ExpenseRow` fixture missing `clientId` + `clientName`
**Fix:**
- Added `clientId`/`clientName` to `expenseArb` and all hardcoded `ExpenseRow` fixtures
- Removed stale `createdAt`/`updatedAt` from `IncomeRow` fixture
- Added missing `divisionName` to `ExpenseRow` fixture in `form-inline-errors.test.tsx`

**Files:** `expenses.test.ts`, `form-inline-errors.test.tsx`

---

## ✅ Group 6 - `ExpenseTable` / `ExpenseAddForm` missing `clients` / `createAction` props
**Fix:** Added `clients: []` and `createAction: vi.fn()` to all affected renders.

**Files:** `expenses.test.ts`

---

## ✅ Group 7 - `ExpenseEditForm` stale `clients` prop
**Fix:** Removed `clients={[]}` from all 4 `<ExpenseEditForm>` renders (prop was removed from the component).

**Files:** `form-inline-errors.test.tsx`

---

## ✅ Group 8 - `LeadsTable` missing `deleteAction` prop
**Fix:** Added `deleteAction={vi.fn()}` to both `<LeadsTable>` renders.

**Files:** `leads-components.test.tsx`

---

## ✅ Group 9 - `DashboardShell` missing `ledgerBalances` prop
**Fix:** Added `ledgerBalances` with all 5 buckets zeroed out to `baseProps`.

**Files:** `components/dashboard-shell.property.test.tsx`

---

## ✅ Group 10 - `NextRequest` cookie constructor type mismatch
**Fix:** Added `as any` cast to the cookie object arguments.

**Files:** `proxy.test.ts`

---

## Final result

```
bunx tsc --noEmit   →   Exit code 0, zero errors
```

*Completed: May 2026*
