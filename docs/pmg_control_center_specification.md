# PMG Control Center

## Overview
PMG Control Center is an internal admin system for Playhouse Media Group designed to manage finances, track leads, and provide full visibility into business performance across multiple divisions.

The system combines:
- Financial tracking (income, expenses, profit distribution)
- Lead management (contact forms from all websites)
- Division-level performance tracking

---

## Core Objective
To build a system that:
- Ensures each division is self-sustaining
- Automates profit distribution
- Provides clear visibility of revenue, expenses, and profit
- Tracks leads and conversion potential
- Enables disciplined owner salary withdrawals

---

## Admin Structure (MVP)

```
/admin
  /dashboard
  /income
  /expenses
  /leads
  /divisions
```

---

## Financial Model (Final Agreed Structure)

### Flow

```
Revenue
  ↓
Expenses
  ↓
PMG (20% of gross income)
  ↓
Profit Pool
  ↓
 ├── Salary (35%)
 ├── Reinvest (30%)
 ├── Reserve (30%)
 └── Flex (5%)
```

---

## Financial Logic

```ts
revenue = total_income
expenses = total_expenses

pmg = revenue * 0.20
profitPool = revenue - expenses - pmg

salary = profitPool * 0.35
reinvest = profitPool * 0.30
reserve = profitPool * 0.30
flex = profitPool * 0.05
```

---

## Strategic Allocation Meaning

| Allocation | Role | Description |
|----------|------|------------|
| PMG (20%) | Business Backbone | Supports shared infrastructure, systems, admin, and scalability |
| Salary (35%) | Personal Stability | Fixed owner income to avoid random withdrawals |
| Reinvest (30%) | Growth Engine | Ads, tools, hiring, product development |
| Reserve (30%) | Risk Protection | Emergency fund and stability buffer |
| Flex (5%) | Reward System | Controlled discretionary spending |

---

## Database Schema (Phase 1 - MVP)

### divisions
- id (uuid, primary key)
- name (text)
- created_at (timestamp)

### income
- id (uuid, primary key)
- date (date)
- division_id (uuid, foreign key)
- client (text)
- description (text)
- amount (numeric)
- created_at (timestamp)

### expenses
- id (uuid, primary key)
- date (date)
- division_id (uuid, foreign key)
- category (text)
- description (text)
- amount (numeric)
- created_at (timestamp)

### leads
- id (uuid, primary key)
- name (text)
- email (text)
- phone (text)
- message (text)
- source (text)
- service_interest (text)
- status (text: new | contacted | converted | lost)
- created_at (timestamp)

---

## Relationships (MVP)

- divisions → income
- divisions → expenses
- leads (standalone for now)

---

## Core Features (Phase 1)

### Dashboard
- Total revenue
- Total expenses
- PMG share
- Profit pool
- Salary (highlighted)
- Reinvestment, reserve, flex
- Leads summary

### Income
- Capture all incoming payments
- Assign division

### Expenses
- Track all costs
- Assign division

### Leads
- Capture contact form submissions from all websites
- Track status (new → contacted → converted → lost)

### Divisions
- Manage business divisions (TES, AWS, etc.)

---

## System Rules

1. Every income must have a division
2. Every expense must have a division
3. Salary is calculated, not manually decided
4. PMG always takes 20% of revenue
5. Expenses are deducted before profit distribution
6. All allocations are calculated dynamically (not stored)

---

## Future Phases

### Phase 2: Conversion Tracking
- Link leads → income
- Add lead_id to income

### Phase 3: Client System
- Introduce clients table
- Track repeat customers

### Phase 4: Sales Pipeline
- deals
- invoices
- payments

### Phase 5: Financial Snapshots
- Monthly locked reports
- Historical tracking

### Phase 6: SaaS Expansion
- Multi-tenant (organizations)
- User roles

---

## Tech Stack

- Next.js (App Router)
- Server Actions
- PostgreSQL
- Drizzle ORM
- shadcn/ui

---

## Key Principle

> Every rand has a job.

---

## Summary

PMG Control Center is a financial and operational system that transforms a freelance business into a structured, scalable company by enforcing discipline, visibility, and strategic allocation of resources.

