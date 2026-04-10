I've read through your entire PMG Control Center codebase. It's a well-structured, production-quality admin system. Here's my honest assessment organized by priority:

---

**Strengths worth keeping**
Your Server Actions pattern is clean and consistent. The `{ error?: string }` return type, Zod validation before DB operations, and `revalidatePath` calls are all solid. The component architecture — page fetches data, passes Server Actions down as props — is exactly right for Next.js 15.

---

**High Priority Issues**

**1. The `proxy.ts` / `middleware.ts` auth check is insufficient**
The middleware only checks for the existence of a session cookie, not its validity. An expired or tampered cookie would pass through. You need to validate the session server-side in the middleware, or at minimum add Better Auth's session verification there.

**2. No VAT handling on income**
Given this is a South African business, income recorded should probably distinguish between VAT-inclusive and VAT-exclusive amounts, and track VAT output liability separately. Right now all income flows in as a raw number with no VAT awareness.

**3. `autoClosePreviousMonthIfNeeded` runs on every dashboard load**
This is called `await autoClosePreviousMonthIfNeeded()` in the dashboard page on every request. It hits the DB every time. It should be guarded with a flag, a cron job, or at least memoized per-request.

**4. `recordWithdrawal` in `withdraw.ts` vs `withdrawals.ts` — duplicate action files**
You have `apps/admin/src/app/actions/withdraw.ts` and `withdrawals.ts`. The former is used by `salary-card.tsx` but bypasses the `account` field validation (hardcodes `'salary'`). This is a data integrity risk — salary withdrawals via the dashboard modal won't record to the correct account if it ever changes.

**5. Raw SQL in `users.ts` actions**
`UPDATE "user" SET "role" = ...` using raw SQL bypasses Drizzle's type safety entirely. You have Drizzle with the users table available via Better Auth's adapter — you should use the ORM or at minimum parameterize carefully. It works, but it's a maintenance liability.

---

**Medium Priority**

**6. `ACCOUNT_RATES` in `accounts.ts` has a math bug**
```ts
salary:    0.35,  // of profit pool
pmg_share: 0.20,  // of revenue — different base!
reinvest:  0.30,
reserve:   0.30,
flex:      0.05,
```
The rates for `salary + reinvest + reserve + flex` sum to 1.00, but `pmg_share` is on a different base (revenue, not profit pool). This is commented but the `ACCOUNT_RATES` object is misleading — it implies a uniform rate base. Someone consuming this object without reading the comment will calculate wrong. Separate these cleanly or add a type discriminator.

**7. The `WithdrawModal` doesn't pass the account key**
`recordWithdrawal` in `withdraw.ts` defaults `account` to `'salary'`. But if someone uses the dashboard salary card's withdraw button for a different period or account context, it always records to salary. The account should be passed explicitly.

**8. Statement page running balance uses `effectiveRate` approximation**
In `accounts/[account]/page.tsx`, each income entry is proportionally credited using `earned / totalRevenue`. This is a reasonable approximation but means the per-transaction balance is not the actual flow — it's a synthetic allocation. This could cause confusion if users expect it to reflect real cash movements. It should be clearly labeled as "allocated" not "deposited."

**9. No pagination anywhere**
`getAllIncome()`, `getAllExpenses()`, `getAllWithdrawals()` — all return full result sets. As data grows this will become slow and memory-intensive. You should add cursor-based or offset pagination to the table pages, at minimum with a `LIMIT` at the DB query level.

**10. `leads-table.tsx` badge classes use light-mode Tailwind colors**
```ts
new: 'bg-blue-100 text-blue-800',
converted: 'bg-green-100 text-green-800',
```
Your app is dark-mode locked (`className="dark"`). These hardcoded light classes look washed out in dark mode. They should use the CSS variable-based pattern the rest of your components use (e.g. `bg-chart-2/20 text-chart-2`).

---

**Lower Priority / Polish**

**11. `expense-categories` page exists as actions but has no route**
`apps/admin/src/app/actions/expense-categories.ts` and `ExpenseCategoryAddForm` exist but there's no `/expense-categories` page in the route structure, and no sidebar link. Categories are managed via the datalist on the expense form, which means you can create stranded categories. Either add the management page or remove the unused actions.

**12. `RevenueSparkline` component is imported nowhere**
`revenue-sparkline.tsx` is a full component that appears to have been removed from `DashboardShell` at some point but the file remains. Dead code.

**13. `AllocationBar` component is also not rendered in `DashboardShell`**
`allocation-bar.tsx` exists but `DashboardShell` doesn't render it. Another dead component — either integrate it or remove it.

**14. Invitation flow accepts the invite but doesn't redirect to account setup**
`/invite?token=...` is referenced in the email but there's no `/invite` route in the codebase. Users who click that link will hit the 404 page.

---

**Where would you like to dig in first?** The auth middleware gap and the missing `/invite` route are the most operationally risky. The pagination issue is the most likely to cause real pain as data grows. And the dead components are quick wins to clean up.