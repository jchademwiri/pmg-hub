# 💰 PMG Finance Module — Complete Guide

> **Finance 101 for non-accountants.** This guide explains how income, expenses, categories, and distributions work in plain language.

---

## What Is the Finance Module?

The **Finance** module is where you track money coming in and going out. It's your business's financial command centre:

- **Income** — Record every payment received from clients
- **Expenses** — Record every business cost paid
- **Categories** — Organise expenses into meaningful groups
- **Distributions** — See how profit gets split (PMG share, salary, reinvest, etc.)

---

## Table of Contents

| # | Topic | What It Covers |
|---|-------|----------------|
| 1 | **Income** | Recording money received from clients |
| 2 | **Expenses** | Recording business costs and outgoings |
| 3 | **Categories** | Organising expenses into meaningful groups |
| 4 | **Distributions** | How profit is allocated across divisions and purposes |

---

## 1. Income

### What Is Income?

**Income** is money your business has received. Every time a client pays you, it's recorded here.

### Where Does Income Come From?

Most income starts in **Billing**:
1. You send an invoice to a client
2. The client pays
3. You record the payment in **Billing → Payments**
4. The payment automatically appears in **Finance → Income**

### Income Categories

Every income record is linked to:
- A **client** (who paid)
- A **division** (`AWS`, `TES`, or `PMG`)
- An **invoice** (what they paid for)
- A **description** (what the payment was for)

### How Income Flows Into Accounting

When income is recorded, the system:

1. Records the money in the Finance module
2. Creates journal entries automatically:
   - **DR** Business Cheque Account (1010)
   - **CR** Sales Revenue (4010)
3. Also creates a **PMG Share transfer** entry:
   - **DR** Savings Account (1020) — 25%
   - **CR** Business Cheque Account (1010) — 25%

**The key insight:** You record income once, and it flows to both the Finance dashboard and the Accounting module.

### What You See on the Dashboard

| Metric | Meaning |
|--------|---------|
| **Total Revenue** | All income you've received, shown in Rands |
| **Revenue by Division** | How much each division earned |
| **Recent Income** | The most recent payments recorded |

---

## 2. Expenses

### What Is an Expense?

An **expense** is any money your business spends. Every cost of running your business goes here.

### Common Expense Types

| Category | Examples |
|----------|----------|
| Office & Supplies | Printing, stationery, document scanning |
| Travel & Transport | Uber, petrol, flights, tolls |
| Hosting & Infrastructure | Website hosting, domain fees, servers |
| Software & Subscriptions | SaaS tools, licences |
| Marketing & Advertising | Ads, social media promotions |
| Professional Fees | Accountant, legal, consulting |
| Telephone & Internet | Phone bills, data, fibre |
| Insurance | Business insurance premiums |
| Contractor Payments | Freelancers, subcontractors |
| Bank Charges | Monthly bank fees, transaction costs |

### How to Record an Expense

1. Go to **Finance → Expenses**
2. Click **Add Expense**
3. Fill in:
   - **Date** — when the expense happened
   - **Amount** — how much was spent
   - **Category** — what type of expense
   - **Division** — which division it belongs to
   - **Description** — what it was for
4. Save

### What Happens Automatically

When you save an expense:
1. It appears in the expenses list
2. A journal entry is created:
   - **DR** <Expense Account> (e.g., 5030 Office & Supplies)
   - **CR** Business Cheque Account (1010)
3. The P&L and dashboard update

**The category you choose determines which account is debited.** The system maps categories to accounts automatically.

| Category | Account Debited |
|----------|----------------|
| "printing", "office", "supplies" | 5030 Office & Supplies |
| "travel", "transport", "uber", "fuel" | 5070 Travel & Transport |
| "hosting", "server", "domain" | 5010 Hosting & Infrastructure |
| "software", "subscription" | 5020 Software & Subscriptions |
| (anything else) | 5140 Miscellaneous Expense |

### Deleting or Editing Expenses

- **Edit** an expense → System voids the old journal entry and creates a new one
- **Delete** an expense → System voids the journal entry automatically

**You never need to clean up orphaned journal entries.** The auto-posting system handles it.

---

## 3. Categories

### What Are Expense Categories?

**Categories** group similar expenses together so you can see where your money is going.

### Built-in Categories

The system comes with pre-configured categories that match the chart of accounts:

| Category | Typical Uses |
|----------|--------------|
| Office & Supplies | Stationery, printing, document costs |
| Travel & Transport | Uber, petrol, flights, tolls, courier |
| Hosting & Infrastructure | Domains, servers, cloud services |
| Software & Subscriptions | SaaS tools, licences |
| Marketing & Advertising | Ads, social media, promotions |
| Professional Fees | Accounting, legal, consulting |
| Telecommunications | Phone, internet, data |
| Insurance | Business insurance |
| Contractor Payments | Freelancers, subcontractors |
| Utilities | Electricity, water, municipal |
| Bank Charges | Bank fees, transaction costs |
| Staff Costs | Salaries, wages, UIF |
| Reinvestment | Money reinvested in the business |

### Why Categories Matter

- **Better reporting** — See exactly where money is being spent
- **Correct accounting** — Each category maps to the right account code
- **Tax preparation** — SARS requires expenses by category

---

## 4. Distributions

### What Are Distributions?

**Distributions** show how your business's profit is shared. When money comes in, it doesn't all go to one place — it gets split:

1. **PMG Share** (25%) — Goes to the group
2. **Operating Expenses** — Business costs are paid
3. **Profit Pool** — What's left is split:
   - Salary
   - Reinvestment
   - Reserve
   - Flex

### Distribution Rates

Each division has its own distribution rates. For example:

| Division | PMG Share | Retained |
|----------|-----------|----------|
| PMG | 25% | 75% |
| TES | 15% | 85% |
| AWS | Configured in settings | Configured in settings |

The **PMG Share** is the portion of revenue that goes to Playhouse Media Group. The **Retained** portion stays with the division to cover expenses and profit.

### How to View Distributions

Go to **Finance → Distributions** to see:
- The current rates for each division
- How much has been allocated to each bucket
- The expected vs actual transfers

---

## How Finance Connects to Everything

```
             ┌─────────────────┐
             │   Billing        │
             │  (invoices,      │
             │   payments)      │
             └────────┬────────┘
                      │ payments
                      ▼
             ┌─────────────────┐
   ┌────────┤   FINANCE       ├────────┐
   │        │ (income +        │        │
   │        │  expenses)       │        │
   │        └────────┬────────┘        │
   │                 │                  │
   ▼                 ▼                  ▼
┌────────┐   ┌──────────────┐   ┌──────────────┐
│ Income │   │  Expenses    │   │ Distributions│
│ auto-  │   │  auto-posts  │   │ (rate-based  │
│ posts  │   │  Dr Expense  │   │  allocations)│
│ to     │   │  Cr Bank     │   │              │
│ Acc-   │   │  to Acc-     │   │              │
│ ounting│   │  ounting     │   │              │
└────────┘   └──────────────┘   └──────────────┘
     │              │                    │
     └──────────────┴────────────────────┘
                        │
                        ▼
               ┌────────────────┐
               │   Accounting   │
               │  (Journal      │
               │   Entries,     │
               │   GL, TB, P&L) │
               └────────────────┘
```

**Every income and expense you record automatically creates double-entry journal entries.** You don't need to understand accounting to use it correctly.

---

## Quick Reference

| I want to... | Go to... | Notes |
|-------------|----------|-------|
| Record money received | `/finance/income` | Usually comes from billing payments |
| Record a business cost | `/finance/expenses` | Select the right category |
| Edit an expense | `/finance/expenses` | Click the expense to edit |
| Delete an expense | `/finance/expenses` | Journal entry voids automatically |
| Manage categories | `/finance/categories` | Add or edit expense categories |
| View distributions | `/finance/distributions` | See division rates and allocations |
| See the big picture | `/finance` | Finance overview dashboard |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "I recorded an expense but it's not on the P&L" | Check the Journals page — the auto-post may have failed. You can post it manually. |
| "The wrong category was used" | Edit the expense and change the category — the journal entry updates automatically |
| "I see duplicate income" | Check if the payment was recorded twice in Billing |
| "An expense shows the wrong amount" | Edit it — the system voids the old JE and creates a new one |
| "Where's my PMG Share?" | Check the Distributions page for the expected vs actual allocation |
| "A report shows the wrong division" | Check the original invoice, payment, or expense division first. Finance follows the source record. |
