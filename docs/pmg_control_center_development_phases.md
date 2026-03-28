# PMG Control Center – Development Phases

## 🎯 Objective
Build a scalable internal admin system for Playhouse Media Group that enforces financial discipline, tracks leads, and supports multi-division growth.

---

# 🪜 PHASE 0 — Foundation (Already Done ✅)

### What you already have
- Monorepo structure
- `packages/db` with Drizzle ORM + PostgreSQL
- Core tables:
  - divisions
  - income
  - expenses
  - leads

### Goal
Ensure schema is clean and consistent before building features.

### Tasks
- Validate foreign keys (division_id)
- Ensure timestamps exist on all tables
- Add indexes (date, division_id)
- Standardize numeric types (amount fields)

---

# 🪜 PHASE 1 — Core Financial Engine (MVP 🔥)

### Goal
Implement the **PMG financial model (truth-based system)**

### Features
- Revenue calculation (sum of income)
- Expense calculation (sum of expenses)
- PMG calculation (20% of revenue)
- Profit Pool calculation
- Allocation breakdown (salary, reinvest, reserve, flex)

### Tasks
- Create server-side functions (Next.js Server Actions):
  - getTotalRevenue()
  - getTotalExpenses()
  - calculatePMG()
  - calculateProfitPool()
  - calculateAllocations()

- Create reusable financial service layer

### Output
- Clean JSON response for dashboard

---

# 🪜 PHASE 2 — Dashboard UI (Visibility Layer)

### Goal
Give a **real-time financial overview**

### Features
- KPI cards:
  - Total Revenue
  - Total Expenses
  - PMG Share
  - Profit Pool
  - Salary (highlighted)

- Allocation breakdown UI
- Simple charts (optional)

### Tasks
- Build dashboard page `/admin/dashboard`
- Create reusable UI components (cards, stats)
- Connect to financial engine

---

# 🪜 PHASE 3 — Income Management

### Goal
Track all incoming revenue cleanly

### Features
- Add income
- Edit/delete income
- Assign division
- Filter by date/division

### Tasks
- Build `/admin/income`
- Create form (shadcn/ui)
- Server Actions:
  - createIncome()
  - updateIncome()
  - deleteIncome()

---

# 🪜 PHASE 4 — Expense Management

### Goal
Track **real expenses only** (critical rule)

### Features
- Add expense
- Categorize expense
- Assign division
- Filter by date/division/category

### Tasks
- Build `/admin/expenses`
- Create expense form
- Server Actions:
  - createExpense()
  - updateExpense()
  - deleteExpense()

---

# 🪜 PHASE 5 — Leads Management

### Goal
Centralize all incoming business opportunities

### Features
- View leads
- Update status (new → contacted → converted → lost)
- Filter by source/service

### Tasks
- Build `/admin/leads`
- Status update actions

---

# 🪜 PHASE 6 — Division Management

### Goal
Support multi-division tracking

### Features
- Add/edit divisions
- View performance per division

### Tasks
- Build `/admin/divisions`
- Link financial data to divisions

---

# 🪜 PHASE 7 — Financial Snapshots (VERY IMPORTANT ⚠️)

### Goal
Lock historical data (prevent recalculation issues)

### Features
- Monthly snapshot
- Stores:
  - revenue
  - expenses
  - pmg
  - profit
  - allocations

### New Table
`snapshots`
- id
- period (YYYY-MM)
- revenue
- expenses
- pmg
- profit
- salary
- reinvest
- reserve
- flex
- created_at

### Tasks
- Create snapshot generator
- Add “Close Month” action

---

# 🪜 PHASE 8 — Reporting & Insights

### Goal
Turn data into decisions

### Features
- Monthly trends
- Expense breakdown by category
- Division profitability

---

# 🪜 PHASE 9 — System Hardening

### Goal
Prepare for real usage

### Features
- Validation rules
- Error handling
- Audit logs (optional)

---

# 🪜 PHASE 10 — SaaS Expansion (Future 🚀)

### Goal
Turn into multi-tenant product

### Features
- Organizations
- Users & roles
- Data isolation per tenant

---

# 🧠 FINAL ARCHITECTURE OVERVIEW

## Reality Layer (Core)
- income
- expenses

## Control Layer (Logic)
- financial calculations (runtime)

## Future Layer
- snapshots (historical locking)

---

# 🔥 KEY PRINCIPLE

> Every rand has a job — but only after it exists.

---

# ✅ BUILD ORDER (CRITICAL)

1. Phase 1 (Financial Engine)
2. Phase 2 (Dashboard)
3. Phase 3 + 4 (Income + Expenses)
4. Phase 5 (Leads)
5. Phase 7 (Snapshots)

Skip this order → system becomes messy.

---

If you want next step:
👉 I can generate exact folder structure + server actions code for Phase 1.

