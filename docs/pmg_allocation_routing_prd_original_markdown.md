# Product Requirements Document (PRD)

## PMG Financial System: Allocation Routing Update

### 1. Overview
The Allocation Routing Update introduces a structural improvement to the PMG Financial System by separating Pre-Profit (Operational Expenses) from Post-Profit (Allocation-Based Spending).

This update replaces the existing “Withdrawals” model with a Ledger-based system, enabling accurate financial tracking, protecting salary allocations, and improving capital management across defined buckets.

### 2. Problem Statement
The current system treats all spending as operational expenses, which reduces the Profit Pool regardless of the nature of the expense.

#### Key Issue
Strategic growth spending (e.g., advertising) reduces the Profit Pool, which directly impacts Salary allocation. This results in users unintentionally subsidizing business growth from personal earnings.

### 3. Goals & Objectives
#### Primary Goals
- Separate operational costs from strategic spending
- Protect Salary allocations from growth-related deductions
- Introduce bucket-based capital management
- Improve financial transparency and reporting

#### Success Metrics
- 100% of growth-related spending logged via Ledger
- Zero impact of Ledger entries on Profit Pool
- Accurate real-time visibility of all bucket balances

### 4. Financial Model Definitions
To ensure consistency across the system, the following formulas are defined:

- Net Revenue = Gross Revenue - PMG Share (20%)
- Profit Pool = Net Revenue - Expenses

#### Allocation Split
The Profit Pool is distributed as follows:
- Salary: 35%
- Reinvest: 30%
- Reserve: 30%
- Flex: 5%

### 5. Core Concept: Spending Classification
#### Decision Rule
- If the expense is required to deliver an existing obligation, it is Pre-Profit (Expense)
- If the expense is intended to generate future revenue or growth, it is Post-Profit (Ledger Entry)

### 6. Functional Requirements

#### 6.1 Expense System (Pre-Profit)
- Logged via: "Add Expense"
- Stored in: expenses table
- Behavior:
  - Deducted before Profit Pool calculation
  - Reduces Net Revenue

#### 6.2 Ledger System (Post-Profit)
- Logged via: "Add Ledger Entry"
- Stored in: ledger table

##### Required Fields:
- amount
- allocationType: 'salary' | 'reinvest' | 'reserve' | 'flex'
- entryType: 'spend' | 'transfer' | 'adjustment'
- description (optional)
- createdAt
- createdBy

##### Behavior:
- Deducts only from selected allocation bucket
- Does NOT affect Profit Pool
- Maintains historical transaction record

### 7. Bucket Logic
#### Balance Calculation
For each allocation bucket:
- Expected Allocation = Profit Pool × Allocation %
- Used Amount = Sum of Ledger entries per allocationType
- Available Balance = Expected Allocation - Used Amount

#### Bucket Jumping
If a bucket has insufficient funds:
- Users may select another bucket manually
- System should allow this but log clearly

### 8. Constraints & Validation Rules
- Ledger entries cannot exceed available bucket balance
- Expenses must be positive values
- Allocation percentages must total 100%
- allocationType must match enum exactly

### 9. Edge Case Handling
#### Negative Profit Pool
If Expenses exceed Net Revenue:
- Profit Pool = 0
- No allocations distributed
- Loss carried forward (future enhancement optional)

#### Empty Buckets
- Prevent spending if balance is zero
- Suggest alternative bucket (manual selection)

### 10. User Interface Requirements

#### Ledger Form
- Dropdown for allocationType
- Display real-time available balance for selected bucket
- Input validation on submit

#### Dashboard
Display balances for:
- Salary
- Reinvest
- Reserve
- Flex

Salary metrics must ONLY query:
- allocationType = 'salary'

#### Ledger Page (/ledger)
- Unified transaction table
- Filter by allocationType
- Filter by entryType (future)

### 11. Navigation Changes
- Rename /withdrawals → /ledger
- Update labels across application

### 12. Backend Requirements

#### Database
- Replace withdrawals table with ledger
- Add enum: allocation_type
- Add entryType field

#### Server Logic
- Validate allocationType via Zod
- Introduce getLedgerBalances()
- Ensure calculations align with defined formulas

### 13. Data Integrity & Auditability
- All ledger entries must include timestamps
- Track user who created entry
- Optional description field for traceability

### 14. Non-Functional Requirements
- Type safety between DB, backend, and frontend
- High data consistency
- Scalable for multi-tenant architecture

### 15. Risks & Mitigation
#### Risk: Misclassification of Expenses
- Mitigation: Clear UI guidance + decision rule

#### Risk: Incorrect Financial Calculations
- Mitigation: Centralized calculation logic (financial.ts)

#### Risk: Data Pollution in Dashboard
- Mitigation: Strict filtering by allocationType

### 16. Implementation Phases

#### Phase 1: Database
- Create ledger table
- Define enums
- Run migrations

#### Phase 2: Backend
- Update server actions
- Implement balance calculations

#### Phase 3: UI
- Update forms
- Add dropdowns and validation

#### Phase 4: Navigation & Dashboard
- Rename routes
- Update KPI logic

### 17. Future Enhancements
- Bucket transfer automation
- Loss carry-forward system
- Financial reporting exports
- Multi-user approval flows

### 18. Summary
This update transforms the PMG Financial System into a structured financial control platform by separating operational costs from strategic capital allocation.

#### User Rule
- Survival (client delivery) → Log Expense
- Growth (business expansion) → Log Ledger Entry

