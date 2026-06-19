# 4. Trial Balance — The Health Check

> **In plain English:** The Trial Balance is a **quick health check** that tells you if your books are balanced. If total Debits = total Credits, your books are healthy. If they don't match, something is wrong.

---

## What Is a Trial Balance?

After all your journal entries are recorded, the Trial Balance shows you the **total debits and credits for every account** in one summary view. Its primary job is to answer one question:

**"Do my debits equal my credits?"**

If the answer is yes → your books are balanced ✅
If the answer is no → there's an error somewhere ❌

**Navigate to:** `/accounting/trial-balance`

---

## How to Read It

The Trial Balance shows a table with these columns:

| Column | What It Means |
|--------|---------------|
| **Code** | The account code (e.g., 1010) |
| **Account** | The account name (e.g., Business Cheque Account) |
| **Type** | Asset, Liability, Equity, Revenue, or Expense |
| **Debit** | Total debits for this account across all journal entries |
| **Credit** | Total credits for this account across all journal entries |
| **Balance** | Debit minus Credit (or Credit minus Debit depending on type) |

### Understanding the Balance Column

The "balance" means different things depending on the account type:

| Account Type | Balance Calculation | What It Means |
|-------------|-------------------|---------------|
| **Assets** | Debits - Credits | Positive = you have this much |
| **Liabilities** | Credits - Debits | Positive = you owe this much |
| **Equity** | Credits - Debits | Positive = owner's stake |
| **Revenue** | Credits - Debits | Positive = income earned |
| **Expenses** | Debits - Credits | Positive = money spent |

---

## The Bottom Line: Totals

At the bottom of the Trial Balance, you'll see:

```
Total Debits:   R22,860.00
Total Credits:  R22,860.00
Difference:     R0.00
```

**If the difference is R0.00, your books are balanced.** ✅

This is the most important number on the page. Every accounting system is built on the principle that debits must equal credits.

---

## Your Current Trial Balance

Here's what your Trial Balance looks like right now:

| Code | Account | Type | Debits | Credits |
|------|---------|------|--------|---------|
| 1010 | Business Cheque Account | Asset | R20,500 | R2,360 |
| 4010 | Sales Revenue | Revenue | — | R20,500 |
| 5030 | Office & Supplies | Expense | R1,785 | — |
| 5070 | Travel & Transport | Expense | R215 | — |
| 5140 | Miscellaneous Expense | Expense | R360 | — |
| | **TOTALS** | | **R22,860** | **R22,860** |

### What This Tells You:

1. **Bank Account (1010):** R20,500 came in (debit), R2,360 went out (credit). Net: R18,140 in the bank.
2. **Sales Revenue (4010):** R20,500 earned (credit). Revenue always shows as credits.
3. **Expenses (5xxx):** R1,785 + R215 + R360 = R2,360 total spent. Expenses always show as debits.
4. **Everything balances.** ✅

---

## Period Filter

You can filter the Trial Balance by accounting period (month). This is useful for:

- **Monthly reporting** — "What did my books look like at the end of May?"
- **Year-end close** — "What are the totals for the full financial year?"
- **Comparing periods** — Switch between months to see how accounts change

---

## When to Check the Trial Balance

| When | Why |
|------|-----|
| **After recording journal entries** | Confirm your entries are balanced |
| **End of each month** | Monthly health check |
| **Before generating reports** | Ensure data integrity |
| **When something looks wrong** | The Trial Balance is the first place to check |
| **Before closing a period** | Confirm everything is balanced before locking |

---

## What If It Doesn't Balance?

If the Trial Balance shows a non-zero difference:

1. **Check recent journal entries** — Go to `/accounting/journals` and review the most recent entries
2. **Look for one-sided entries** — A line might be missing a debit or credit
3. **Check for typos** — A wrong amount could cause an imbalance
4. **Review the General Ledger** — Filter by the suspected account to find the discrepancy

**Remember:** The system prevents unbalanced entries from being posted, so a non-zero difference would only occur from a system error or data migration issue.

---

## Trial Balance vs Other Reports

| Report | What It Shows | When to Use |
|--------|-------------|-------------|
| **Trial Balance** | Account totals (Dr/Cr) — health check | Daily/weekly verification |
| **Profit & Loss** | Revenue vs Expenses — performance | Monthly/quarterly review |
| **General Ledger** | Individual transactions — detail | Auditing, reconciling |

The Trial Balance sits between the General Ledger (details) and the Profit & Loss (summary). It's the bridge that confirms everything adds up.
