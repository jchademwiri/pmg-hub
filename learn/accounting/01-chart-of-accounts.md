# 1. Chart of Accounts — The Foundation of Everything

> **In plain English:** The Chart of Accounts is simply a **list of all the categories** where money can go in your business. Think of it like a filing cabinet — every financial transaction gets filed into the right drawer.

---

## What Is a Chart of Accounts?

Every business tracks money in categories. Your PMG business has categories like:

- "How much money is in the bank?" → **Bank Account**
- "How much did we earn?" → **Sales Revenue**
- "What did we spend on printing?" → **Office & Supplies**

The Chart of Accounts is the **master list** of all these categories. Every single transaction must be assigned to at least two of these categories (because of double-entry bookkeeping).

**Navigate to:** `/accounting/chart-of-accounts`

---

## How Accounts Are Numbered

Every account has a **code** (number) and a **name**. The first digit of the code tells you what **type** of account it is:

| Code Range | Type | What It Means | Example |
|------------|------|---------------|---------|
| **1xxx** | Assets | What you **OWN** | Bank accounts, money owed to you |
| **2xxx** | Liabilities | What you **OWE** | Accounts payable, VAT |
| **3xxx** | Equity | The owner's **STAKE** in the business | Owner's capital, retained earnings |
| **4xxx** | Revenue | What you **EARNED** | Sales revenue, interest income |
| **5xxx** | Expenses | What you **SPENT** | Office supplies, travel, software |

### The 5 Account Types Explained

#### 1. Assets (1xxx) — What You OWN
Assets are things of value that your business owns or is owed.

| Code | Account | What It Means | Currently Used? |
|------|---------|---------------|-----------------|
| 1010 | Business Cheque Account | Your main bank account. All client payments come here, all payments go out from here. | ✅ **Yes — R20,500 received, R2,360 spent** |
| 1020 | Savings Account | Money you've moved to savings | ❌ Not yet |
| 1030 | Accounts Receivable | Money clients owe you (invoices sent but not yet paid) | ❌ Not yet |
| 1040 | Client Deposits | Money clients pay you upfront before work starts | ❌ Not yet |
| 1050 | Petty Cash | Small cash amounts for daily purchases (parking, snacks) | ❌ Not yet |
| 1060 | Prepaid Expenses | Expenses you've paid for in advance (e.g., annual software) | ❌ Not yet |

**When to use:** Every time money comes INTO your business or someone owes you money, it affects an asset account.

#### 2. Liabilities (2xxx) — What You OWE
Liabilities are debts or obligations your business has.

| Code | Account | What It Means | Currently Used? |
|------|---------|---------------|-----------------|
| 2010 | Accounts Payable | Money you owe to suppliers/vendors | ❌ Not yet |
| 2020 | VAT Output | VAT you collected from clients (you owe this to SARS) | ⚠️ Inactive |
| 2030 | VAT Input | VAT you paid on business purchases (SARS owes you back) | ⚠️ Inactive |
| 2040 | Accrued Expenses | Expenses you've incurred but haven't paid yet | ❌ Not yet |
| 2050 | Client Credits | Credits you owe back to clients | ❌ Not yet |

**When to use:** Every time you owe money to someone or have a future obligation, it affects a liability account.

#### 3. Equity (3xxx) — The Owner's Stake
Equity represents the owner's investment in the business and accumulated profits.

| Code | Account | What It Means | Currently Used? |
|------|---------|---------------|-----------------|
| 3010 | Owner's Capital | Money the owner has put INTO the business | ❌ Not yet |
| 3020 | Retained Earnings | Profits the business has kept (not distributed) | ❌ Not yet |
| 3030 | Owner's Drawings | Money the owner has TAKEN OUT of the business | ❌ Not yet |

**When to use:** When the owner invests personal money into the business, or takes money out for personal use.

#### 4. Revenue (4xxx) — What You EARNED
Revenue accounts track all income your business generates.

| Code | Account | What It Means | Currently Used? |
|------|---------|---------------|-----------------|
| 4010 | Sales Revenue | All income from your services | ✅ **Yes — R20,500 earned** |
| 4020 | PMG Share Revenue | Revenue specifically from PMG's share | ❌ Not yet |
| 4030 | Interest Income | Interest earned on bank accounts | ❌ Not yet |
| 4040 | Other Income | Any other income (e.g., selling old equipment) | ❌ Not yet |

**When to use:** Every time you earn money, it goes to a revenue account.

#### 5. Expenses (5xxx) — What You SPENT
Expense accounts track all money the business spends.

| Code | Account | What It Means | Currently Used? |
|------|---------|---------------|-----------------|
| 5010 | Hosting & Internet | Website hosting, domains, internet | ❌ Not yet |
| 5020 | Software & Subscriptions | SaaS tools, licences | ❌ Not yet |
| 5030 | Office & Supplies | Printing, stationery, office materials | ✅ **Yes — R1,785 spent** |
| 5040 | Marketing & Advertising | Ads, marketing materials | ❌ Not yet |
| 5050 | Professional Fees | Accountant, lawyer, consultants | ❌ Not yet |
| 5060 | Telephone & Communications | Phone bills, airtime | ❌ Not yet |
| 5070 | Travel & Transport | Uber, petrol, travel | ✅ **Yes — R215 spent** |
| 5080 | Insurance | Business insurance | ❌ Not yet |
| 5090 | Contractor Payments | Freelancer/subcontractor payments | ❌ Not yet |
| 5100 | Utilities | Electricity, water | ❌ Not yet |
| 5110 | Bank Charges | Bank fees | ❌ Not yet |
| 5120 | Staff Costs | Salaries, wages | ❌ Not yet |
| 5130 | Reinvestment | Money reinvested into the business | ❌ Not yet |
| 5140 | Miscellaneous Expense | Anything that doesn't fit other categories | ✅ **Yes — R360 spent** |

**When to use:** Every time you spend money on business operations, it goes to an expense account.

---

## Posting Accounts vs Header Accounts

You'll notice some accounts are **headers** (like "Assets", "Liabilities", etc.) and some are **posting accounts**.

- **Header accounts** are just labels/groups. They don't have transactions posted to them. Example: the "Assets" label that groups all 1xxx accounts.
- **Posting accounts** are the real accounts where transactions go. Example: "Business Cheque Account" (1010).

**You should always post transactions to posting accounts, never to header accounts.**

---

## When Should I Create a New Account?

Create a new account when:
1. You have a new type of expense that doesn't fit existing categories
2. You open a new bank account
3. You start tracking a new type of income
4. Your accountant recommends it

**Don't** create accounts for one-off transactions — use the "Miscellaneous Expense" (5140) or "Other Income" (4040) accounts instead.

---

## How Account Types Affect Reports

| Account Type | Appears On | How It's Calculated |
|-------------|-----------|---------------------|
| Assets | Balance Sheet | Listed as-is |
| Liabilities | Balance Sheet | Listed as-is |
| Equity | Balance Sheet | Listed as-is |
| Revenue | Profit & Loss | Credits minus Debits (positive = income) |
| Expenses | Profit & Loss | Debits minus Credits (positive = expense) |

---

## Real Example from Your Data

Here's what happened when a client paid you R5,000 for tender services:

```
Journal Entry: JE-2026-0001
Description: "TES-INV-0001 - Full Tender"
Date: 2026-04-15

  DR  1010  Business Cheque Account    R5,000  ← Money came into the bank
  CR  4010  Sales Revenue              R5,000  ← You earned this income
```

**What happened:** Your bank account (asset) increased by R5,000, and your revenue (income) increased by R5,000. Both sides balance. ✅

---

## Tips

1. **Use the code system** — accounts are sorted by code, so the numbering matters
2. **Don't delete accounts with transactions** — deactivate them instead (use the toggle)
3. **Use the filter** — toggle between All / Active Only / Inactive Only to find accounts
4. **When in doubt, check your accountant** — they can advise which account category to use
