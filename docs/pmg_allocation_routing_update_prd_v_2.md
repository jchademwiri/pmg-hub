# Product Requirements Document (PRD)

## PMG Financial System: Allocation Routing Update (v2)

**Document Status:** Approved  
**Product:** PMG Control Center  
**Feature:** Allocation Routing & Corporate Ledger  
**Target Audience:** Admin / Agency Owner

---

## 1. Executive Summary

The PMG Financial Control System currently treats all outbound spending as an "Expense," which incorrectly shrinks the global Profit Pool and dilutes the owner's salary when reinvesting saved capital.

This update introduces a strict separation between:

- **Pre-Profit Spending (Operating Expenses)**
- **Post-Profit Spending (Allocation Ledger)**

This ensures that strategic growth investments do not cannibalize personal salary or emergency reserves, while enabling structured capital allocation across defined buckets.

---

## 2. Problem Statement

The current financial engine uses a single strict funnel:

**Gross Revenue - PMG Share (20%) - Expenses = Profit Pool**

The Profit Pool is then split into:

- Salary (35%)
- Reinvest (30%)
- Reserve (30%)
- Flex (5%)

### Core Flaw

If saved capital (e.g., Reinvest) is used and logged as an Expense, it reduces the Profit Pool, which in turn reduces Salary allocation.

This results in the owner unintentionally funding business growth from personal income.

---

## 3. Goals & Objectives

### Primary Goals

- Ensure accurate profit calculation
- Protect Salary from growth-related spending
- Enable independent bucket-based capital management
- Improve financial transparency and auditability

### Success Metrics

- 100% of growth spending logged via Ledger
- Zero impact of Ledger on Profit Pool
- Accurate real-time bucket balances

---

## 4. Financial Model (Source of Truth)

### Definitions

- **Net Revenue** = Gross Revenue - PMG Share (20%)
- **Profit Pool** = Net Revenue - Expenses

### Allocation Distribution

- Salary: 35%
- Reinvest: 30%
- Reserve: 30%
- Flex: 5%

### Rule

Allocation percentages must always total **100%**.

---

## 5. Core Concept: Spending Classification

### Decision Rule

- If the cost is required to **deliver an existing obligation** → **Expense (Pre-Profit)**
- If the cost is intended to **generate future revenue or growth** → **Ledger Entry (Post-Profit)**

---

## 6. Scope of Work

### 6.1 Data Model (Ledger)

- Drop existing `withdrawals` table
- Create new `ledger` table

#### Required Fields

- id
- amount (positive only)
- allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex'
- entryType: 'spend' | 'transfer' | 'adjustment'
- description (optional)
- createdAt
- createdBy

#### Enum

- allocation_type = ['salary', 'reinvest', 'reserve', 'flex']

---

### 6.2 Business Logic

#### Balance Formula

Available Bucket Balance = (All-Time Profit Pool × Allocation %) - Sum of Ledger Entries (per bucket)

#### Rules

- Ledger entries must NOT affect Profit Pool
- Salary calculations must filter: allocationType = 'salary'

---

## 7. Functional Requirements

### 7.1 Expense System (Pre-Profit)

- Logged via "Add Expense"
- Reduces Net Revenue before Profit Pool

### 7.2 Ledger System (Post-Profit)

- Logged via "Add Ledger Entry"
- Deducts from selected bucket only
- Maintains transaction history

---

## 8. Constraints & Validation Rules

- Ledger amount must be > 0
- Ledger amount must not exceed available bucket balance
- Expenses must be positive
- allocationType must match enum strictly
- Allocation percentages must equal 100%

---

## 9. Edge Case Handling

### Negative Profit Pool

- If Expenses > Net Revenue:
  - Profit Pool = 0
  - No allocations distributed

### Empty Buckets

- Prevent spending if balance is insufficient
- Allow manual selection of alternative bucket ("Bucket Jumping")

---

## 10. UI / UX Requirements

### Ledger Form

- Bucket dropdown (Salary, Reinvest, Reserve, Flex)
- Display available balance dynamically
- Validate before submit

### Ledger Page (/ledger)

- Unified table of all ledger entries
- Columns: Amount, Bucket, Entry Type, Date, Description
- Filters: allocationType, entryType (future)

### Dashboard

- Display balances for all buckets
- Salary metrics must ONLY query salary entries

---

## 11. Navigation Changes

- Rename /withdrawals → /ledger
- Update labels globally

---

## 12. User Stories & Acceptance Criteria

### Story 1: Logging an Expense

As an agency owner, I want to log operational costs so that profit is calculated correctly.

**Acceptance Criteria:**
- Expense reduces Net Revenue
- Included in Profit Pool calculation

---

### Story 2: Spending from Reinvest

As an agency owner, I want to spend from Reinvest without affecting Salary.

**Acceptance Criteria:**
- User selects "Reinvest"
- Balance decreases correctly
- Salary remains unchanged

---

### Story 3: Viewing Balances

As an agency owner, I want visibility of all bucket balances.

**Acceptance Criteria:**
- Dashboard shows all buckets
- Values reflect correct calculations

---

### Story 4: Viewing Ledger History

As an agency owner, I want a full audit trail of spending.

**Acceptance Criteria:**
- Ledger page shows all entries
- Each entry shows bucket and type

---

## 13. Data Integrity & Auditability

- All entries must include timestamps
- Track user who created entry
- Support optional descriptions for traceability

---

## 14. Migration Strategy

- Drop withdrawals table
- Create ledger table
- Run Drizzle migrations
- Update all references to new schema

---

## 15. Non-Functional Requirements

- Strong type safety (DB ↔ Backend ↔ UI)
- Consistent financial calculations
- Scalable for multi-tenant architecture

---

## 16. Risks & Mitigation

### Risk: Misclassification

- Mitigation: Clear decision rule in UI

### Risk: Incorrect Calculations

- Mitigation: Centralized financial logic

### Risk: Data Pollution

- Mitigation: Strict filtering by allocationType

---

## 17. Out of Scope

- Automated inter-bucket transfers
- Multi-currency support
- Legacy data preservation

---

## 18. Future Enhancements

- Automated bucket transfers
- Loss carry-forward
- Reporting exports
- Approval workflows

---

## 19. Summary Rule for Users

- Survival (client delivery) → Expense
- Growth (business expansion) → Ledger Entry

