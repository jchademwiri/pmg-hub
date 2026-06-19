# 📊 PMG Insights Module — Complete Guide

> **Insights 101 for non-accountants.** This guide explains how financial snapshots, reports, and trends work in plain language.

---

## What Is the Insights Module?

The **Insights** module is your **business intelligence command centre**. It helps you understand:

- **Snapshots** — Locked monthly records of your financial performance
- **Reports** — Detailed financial breakdowns for in-depth analysis
- **Trends** — How your business is performing over time

Think of it as your **financial rearview mirror and GPS combined** — it shows where you've been and helps you decide where to go.

---

## Table of Contents

| # | Topic | What It Covers |
|---|-------|----------------|
| 1 | **Snapshots** | Locking and viewing monthly financial performance |
| 2 | **Reports** | Detailed financial reports for deeper analysis |
| 3 | **Trends** | Understanding how your business changes over time |

---

## 1. Snapshots

### What Is a Snapshot?

A **snapshot** is a frozen record of your financial position for a specific month. Once a month is closed:

- **The numbers can't change** — they're locked forever
- **You can compare months** — see how April compares to May
- **You can see trends** — Is revenue growing? Are expenses under control?

### How Snapshots Are Created

At the end of each month:

1. You review your income and expenses
2. You click **Close Month** on the dashboard
3. The system calculates:
   - **Gross Revenue** — Total income received
   - **Operating Expenses** — Total costs incurred
   - **PMG Share** — The group's 25% share
   - **Profit Pool** — What's left after expenses and PMG share
   - **Salary, Reinvest, Reserve, Flex** — How the profit pool is allocated
4. The numbers are locked and stored as a snapshot

### The Two Views

**All-Time Overview** — Shows cumulative totals across ALL closed months:
- Total revenue across every closed period
- Total expenses
- Total profit
- A trend chart showing month-by-month performance

**Single Month View** — Focuses on one specific month:
- Revenue, expenses, and profit for that month
- Revenue breakdown bar chart (Revenue vs PMG Share vs Expenses vs Profit)
- Comparison with previous periods

### What Snapshots Tell You

| Question | Look At |
|----------|---------|
| "How much did we make in total?" | All-Time Overview |
| "Was April better than May?" | Select each month and compare |
| "Are we growing?" | The trend chart on All-Time |
| "Where did the money go?" | Revenue breakdown for a single month |
| "How much is profit?" | Net Profit card |

### Understanding the Revenue Breakdown

When you select a single month, you see a bar chart showing 4 bars:

| Bar | What It Represents | Colour |
|-----|-------------------|--------|
| **Revenue** | Total money that came in | Green |
| **PMG Share** | The group's 25% share | Blue |
| **Expenses** | What was spent running the business | Amber |
| **Profit Pool** | What's left as profit | Purple |

The relationship is: **Revenue − PMG Share − Expenses = Profit Pool**

---

## 2. Reports

### What Are Reports?

**Reports** are detailed drill-downs into specific parts of your financial data. They give you the full story behind the snapshot numbers.

### Available Reports

| Report | What It Shows |
|--------|---------------|
| **Revenue Report** | All income broken down by client, division, and month |
| **Expenses Report** | All costs broken down by category and division |
| **Profit & Loss** | Full income statement for a period |
| **Division Report** | Performance by business unit (PMG vs TES) |

### When to Use Reports

| Situation | Use This Report |
|-----------|----------------|
| "Which client pays us the most?" | Revenue Report, sorted by client |
| "What's our biggest expense?" | Expenses Report, sorted by category |
| "Is PMG or TES more profitable?" | Division Report |
| "I need the full monthly P&L" | Profit & Loss Report |
| "I need to drill into a specific number" | Click any drill-down link in a report |

### Drill-Downs

Many numbers in the reports are **clickable**. Clicking a number opens a side panel showing the underlying transactions. This is called **drilling down** — you start with a summary and click through to the details.

---

## 3. Trends

### What Trends Tell You

Trends show how your business is performing over time. The main trend chart in the Snapshots page shows:

- **Revenue line** — Are you earning more or less?
- **Expenses line** — Are costs going up or down?
- **Profit line** — Is the bottom line improving?

### Reading the Trend Chart

```
        Revenue  ───────  (green, top line)
        Expenses ─ . . .  (amber, middle line)
        Profit   ───────  (blue, bottom line)
              ↗
              │
    Revenue is growing ↗
    Expenses are stable →
    Profit is growing ↗
```

### What to Look For

| Pattern | What It Means | Action |
|---------|---------------|--------|
| 📈 Revenue up, Expenses steady | Profitable growth | Keep doing what you're doing |
| 📈 Revenue up, Expenses up faster | Costs growing too fast | Review spending |
| 📉 Revenue down, Expenses steady | Revenue slump | Focus on sales/marketing |
| 📉 Profit going negative | Losing money | Urgent — cut costs or increase revenue |

---

## The Close Month Process (End of Month Routine)

### Step 1: Check Your Data

Before closing, run the pre-close checks:
- **Uncategorised expenses** — Make sure all expenses have categories
- **Draft invoices** — Issue or archive them
- **Income totals** — Does the income sum make sense?
- **Expense totals** — Do expenses match your bank statement?

### Step 2: Close the Month

1. Go to the **Dashboard** or **Insights → Snapshots**
2. Click **Close Month**
3. Review the summary
4. Confirm

### Step 3: Review the Snapshot

1. Go to **Insights → Snapshots**
2. Select the month you just closed
3. Verify the numbers look correct
4. Compare with the previous month

### After Closing

- The **P&L for that month is final** — no more changes
- The snapshot becomes a permanent record
- The dashboard updates to reflect the locked figures

---

## How Insights Connects to Everything

```
  Billing ──→ Income
  Expenses ──→ Costs          All of this flows into...
       ↓                            ↓
  ACCOUNTING MODULE           End of month, you close
  (Journals, GL, TB, P&L)    → Creates a SNAPSHOT
       ↓                            ↓
  Trial Balance confirms      Reports & Trends
  everything is balanced      analysis is based on
                              locked snapshot data
```

**Snapshots are the bridge between daily accounting and long-term business intelligence.**

---

## Quick Reference

| I want to... | Go to... | Notes |
|-------------|----------|-------|
| View all closed months | `/insights/snapshots` | Select All-Time or a specific month |
| See overall performance | Snapshots → All-Time | Cumulative totals + trend chart |
| See one month's breakdown | Snapshots → select a month | Revenue breakdown bar chart |
| Close the current month | Dashboard → Close Month | Reviews data before locking |
| Run a detailed report | `/insights/reports` | Revenue, expenses, P&L, divisions |
| Compare months | Select a closed month | The simplified view shows key metrics |
| Check if my books are balanced | `/accounting/trial-balance` | Run before closing the month |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "I closed a month but the numbers look wrong" | You can't edit a closed month — adjust in the current month |
| "The snapshot shows zero revenue" | Check that journal entries for that month are posted (not draft) |
| "I can't see the current month" | Current month isn't closed yet — close it first |
| "The trend chart looks flat" | You may only have one closed month; trends need 2+ months |
| "My P&L doesn't match the snapshot" | The snapshot is based on data at the time of closing — recent entries after closing won't affect it |
| "I accidentally closed a month" | Contact support — snapshots are designed to be permanent and cannot be reopened |
