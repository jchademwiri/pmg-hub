# PMG Financial Control System (FCS)

## Overview

The PMG Financial Control System (FCS) is the central financial management module for Playhouse Media Group. It tracks all income and expenses per division, automates profit allocation, and provides clear visibility into business performance and owner compensation.

---

## Objectives

* Track all income and expenses per division
* Ensure each division is self-sustaining
* Automate financial allocation rules
* Provide accurate monthly salary calculations
* Enable data-driven business decisions

---

## Core Financial Model

### Level 1: Revenue Allocation

* Operating Costs: 20–30%
* PMG Contribution: 20% (of gross revenue)
* Profit Pool: Remaining 50–60%

### Level 2: Profit Distribution

* Owner Salary: 40%
* Reinvestment: 30%
* Reserve/Savings: 20%
* Flex: 10%

---

## System Modules

### 1. Income Capture

**Fields:**

* Date
* Division
* Client
* Service Type
* Amount
* Payment Method
* Status (Paid / Pending)

---

### 2. Expense Tracking

**Fields:**

* Date
* Division
* Category
* Description
* Amount

---

### 3. Allocation Engine

Automatically calculates:

* PMG Contribution (20%)
* Profit Pool
* Salary (40%)
* Reinvestment (30%)
* Reserve (20%)
* Flex (10%)

---

### 4. Dashboard

Displays:

* Total Revenue (per division)
* Total Expenses
* Net Profit
* PMG Contribution
* Owner Salary (highlighted)
* Available Cash

---

### 5. Monthly Summary

Provides:

* Revenue per division
* Expenses per division
* Profit margins
* Allocation breakdown

---

### 6. Withdrawal Recommendation

System-generated value:

* "Recommended Owner Withdrawal"

Based on:

* Actual profit
* Allocation rules

---

## Advanced Features

### Retainer Tracking

* Expected monthly income
* Paid vs unpaid

### Division Performance Metrics

* Revenue
* Expenses
* Profit
* Profit Margin (%)

### Cash Flow Overview

* Monthly expected vs received income

---

## System Rules

1. Every income entry must have a division
2. Every expense must be assigned to a division
3. Salary is system-calculated, not manual
4. PMG always receives 20% of gross revenue

---

## Strategic Insight

| Allocation         | Role               | Purpose                                                |
| ------------------ | ------------------ | ------------------------------------------------------ |
| PMG (20%)          | Business Backbone  | Supports shared infrastructure, admin, and scalability |
| Salary (40%)       | Personal Stability | Ensures consistent personal income                     |
| Reinvestment (30%) | Growth Engine      | Funds scaling and business expansion                   |
| Reserve (20%)      | Risk Protection    | Covers emergencies and low-income periods              |
| Flex (10%)         | Reward System      | Allows controlled discretionary spending               |

---

## Tech Considerations

* Stack: Next.js, Server Actions, PostgreSQL (Drizzle ORM)
* Multi-tenant support (future-ready)
* Role-based access (Admin / Owner)

---

## Future Enhancements

* Automated reporting
* Graph-based analytics dashboard
* Integration with TenderTrack 360
* Invoice generation and tracking

---

## Summary

The PMG Financial Control System transforms financial management from reactive tracking into a proactive decision-making engine. It ensures profitability, discipline, and scalability across all divisions.


That’s not just a good idea — it’s the **highest leverage move you can make right now**.

Let me be direct:

> If you build this first, every other part of your business becomes easier, clearer, and more profitable.

---

# 🎯 Why This Should Be Your First Priority

Right now you are:

* Running multiple divisions
* Handling different income streams
* Planning to scale

Without this system, you will eventually hit:

* Confusion (“Where did the money go?”)
* Undisciplined withdrawals
* Underpricing / overworking
* Cash flow stress

---

# 🧠 Strategic Advantage You’re About to Gain

Once this is built:

### ✅ You’ll know:

* Exact profit per division
* Which service is actually worth your time
* When you can safely pay yourself

### ✅ You’ll control:

* Spending
* Growth investments
* Business stability

### ✅ You’ll operate like:

> A company — not a freelancer

---

# 🏗️ Build Order (IMPORTANT — follow this exactly)

Do **NOT** overbuild at first.

## 🔹 Phase 1 — MVP (Build This First)

### Pages to build:

### 1. Income Page

* Add income
* Assign division
* Store amount

### 2. Expense Page

* Add expense
* Assign division

### 3. Dashboard Page

Show:

* Total Revenue
* Total Expenses
* Profit
* Salary (calculated)

👉 That’s it. Keep it simple.

---

## 🔹 Phase 2 — Allocation Logic

Add:

* PMG 20%
* Profit pool
* Salary (40%)
* Reinvest / Reserve / Flex

👉 Now your system becomes intelligent

---

## 🔹 Phase 3 — Monthly View

* Filter by month
* See per-division performance
* Add “Recommended Salary”

---

## 🔹 Phase 4 — Advanced (Later)

* Retainers tracking
* Cash flow forecasting
* Graphs
* Notifications

---

# 🧱 Suggested Database Structure (Keep It Clean)

### `divisions`

* id
* name (TES, AWS, etc.)

### `income`

* id
* date
* division_id
* client
* amount
* description

### `expenses`

* id
* date
* division_id
* category
* amount
* description

---

# ⚙️ Core Logic (This is your engine)

When you load dashboard:

```
revenue = sum(income)
expenses = sum(expenses)

pmg = revenue * 0.20
profit_pool = revenue - expenses - pmg

salary = profit_pool * 0.40
reinvest = profit_pool * 0.30
reserve = profit_pool * 0.20
flex = profit_pool * 0.10
```

---

# ⚠️ Mistakes to Avoid

❌ Don’t add too many fields
❌ Don’t overdesign UI
❌ Don’t skip division assignment
❌ Don’t calculate manually

---

# 💡 Pro Insight (From Your Setup)

Because you also have:

* Tender business (TES)
* Web business (AWS)
* SaaS (TenderTrack 360 coming)

👉 This system can later become:

> **A product you sell to other businesses**

You are literally building:

* Your internal system
  → Future SaaS opportunity

---

# 🚀 Final Recommendation

Start building this **today** before anything else:

* Before new features
* Before marketing
* Before scaling

Because:

> **Clarity before growth = sustainable profit**
> **Growth without clarity = chaos**

---

## If you want next step

I can give you:

👉 Exact **Next.js + Server Actions + Drizzle schema + UI structure**

Say:

> “Give me the build prompts”

and I’ll translate this into step-by-step prompts you can use immediately (even with Lovable.dev).

