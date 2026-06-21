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

A **snapshot** is a locked monthly financial record. Once a month is closed:

- **The numbers can't change** — they're locked forever
- **You can compare months** — see how April compares to May
- **You can trust the history** — reports for closed months do not shift every time new data is entered

### How Snapshots Are Created

At the end of each month, you normally close the month that just finished.

Example: if today is in June, June is still open. The close-month button should say something like **Close May 2026**, because May is the completed month being locked.

1. You review your income and expenses
2. You click the period-specific close button on the dashboard, for example **Close May 2026**
3. The system calculates:
   - **Revenue** — Total income received
   - **Expenses** — Total costs incurred
   - **PMG Share** — The group's configured share
   - **Profit/Loss** — What remains after expenses and PMG share
4. The numbers are locked and stored as a snapshot

### The Snapshots Page

The Snapshots page is a financial history view.

At the top, you see summary totals across closed months:

- Closed months count
- Total revenue
- Total expenses
- Total profit or loss

Below that, you see the closed-month list. Select a month to open its detail panel.

The detail panel shows the selected period and its locked figures without competing charts or busy layouts.

### What Snapshots Tell You

| Question | Look At |
|----------|---------|
| "Which months are closed?" | Snapshot list |
| "How much did we make in total?" | Top summary strip |
| "Was April profitable?" | Select April and check Profit/Loss |
| "What did we spend?" | Expenses in the summary or detail panel |
| "Can this month still change?" | If it is not in the snapshot list, it is still open |

### Understanding Profit/Loss

Profit/Loss is based on the locked month:

```text
Revenue - Expenses - PMG Share = Profit/Loss
```

Positive profit is good. A loss means the month spent more than it retained after PMG share.

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
| **Division Report** | Performance by business unit (`AWS`, `TES`, and `PMG`) |
| **Executive Commentary** | AI-assisted month-over-month review based on the actual report numbers |

### When to Use Reports

| Situation | Use This Report |
|-----------|----------------|
| "Which client pays us the most?" | Revenue Report, sorted by client |
| "What's our biggest expense?" | Expenses Report, sorted by category |
| "Which division is most profitable?" | Division Report |
| "I need the full monthly P&L" | Profit & Loss Report |
| "I need a plain-English review" | Executive Commentary |
| "I need to drill into a specific number" | Click any drill-down link in a report |

### Drill-Downs

Many numbers in the reports are **clickable**. Clicking a number opens a side panel showing the underlying transactions. This is called **drilling down** — you start with a summary and click through to the details.

---

## 3. Trends

### What Trends Tell You

Trends show how your business is performing over time. Use reports, dashboard charts, and closed snapshots together:

- **Revenue** — Are you earning more or less?
- **Expenses** — Are costs going up or down?
- **Profit/Loss** — Is the bottom line improving?

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
2. Click the close button for the completed period, for example **Close May 2026**
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
- The dashboard badge shows the actual closed period, for example **May 2026 closed**

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
| View all closed months | `/insights/snapshots` | Use the snapshot list |
| See overall performance | Snapshots summary strip | Cumulative totals across closed months |
| See one month's breakdown | Snapshots → select a month | Opens the detail panel |
| Close the completed month | Dashboard close button | Usually closes the previous month |
| Run a detailed report | `/insights/reports` | Revenue, expenses, P&L, divisions |
| Get a plain-English review | Reports → Executive Commentary | Uses the actual report numbers |
| Compare months | Select closed months and compare figures | The simplified view shows key metrics |
| Check if my books are balanced | `/accounting/trial-balance` | Run before closing the month |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "I closed a month but the numbers look wrong" | You can't edit a closed month — adjust in the current month |
| "The snapshot shows zero revenue" | Check that journal entries for that month are posted (not draft) |
| "I can't see the current month" | Current month is open. It appears after it is closed. |
| "The dashboard says May closed but we are in June" | That is expected. It means May is locked and June is still open. |
| "My P&L doesn't match the snapshot" | The snapshot is based on data at the time of closing — recent entries after closing won't affect it |
| "I accidentally closed a month" | Contact support — snapshots are designed to be permanent and cannot be reopened |
