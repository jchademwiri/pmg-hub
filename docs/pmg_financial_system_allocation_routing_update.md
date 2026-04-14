# PMG Financial System: Allocation Routing Update

Internal reference · Playhouse Media Group
pmg-hub / docs / pmg-allocation-routing-update.md

Explains the separation of Operating Expenses vs. Allocation Withdrawals, and the shift to the Ledger system.

## 1. How Our Current System Works

Currently, the PMG Financial Control System operates as a single strict funnel:

- Gross Revenue enters the system.
- PMG Share (20%) is deducted immediately off the top.
- Expenses are deducted to find the true profit.
- Profit Pool is calculated from what remains.
- The Profit Pool is automatically split into four buckets:
  - Salary (35%)
  - Reinvest (30%)
  - Reserve (30%)
  - Flex (5%)

### The Current Flaw

Right now, the system treats all spending as an Expense (Step 3). If you pay for web web hosting (a survival cost) or if you pay for Facebook Ads (a growth cost), both reduce the total Profit Pool.

This means if you spend your saved Reinvest money on an ad campaign, the system recalculates the Profit Pool to be smaller, which unfairly slashes your Salary allocation. You end up personally subsidizing the business's growth.

## 2. The Proposed Solution: Pre-Profit vs. Post-Profit Spending

To fix this, we are drawing a hard technical line between two types of spending. We will utilize a new Ledger table (formerly withdrawals) to act as a transactional history for our virtual buckets.

### A. The Cost of Doing Business (Pre-Profit)

These are mandatory costs required to deliver your services.

Examples: AWS Client Domains, TES Stationery and Printing, Server Hosting.

- Action: Logged via "Add Expense".
- System Behavior: Goes into the expenses table. Reduces total Gross Revenue before the Profit Pool is split. Paid for by the business as a whole.

### B. The Cost of Growth (Post-Profit)

These are strategic choices made to expand the business, paid for using saved profits.

Examples: PMG Advertising, buying new business assets, team lunches, paying personal salary.

- Action: Logged via "Add Ledger Entry".
- System Behavior: Goes into the ledger table. You select the specific bucket (Salary, Reinvest, Reserve, Flex) from a dropdown. It deducts only from that bucket's saved balance, leaving the main Profit Pool and your personal Salary completely untouched.

### "Bucket Jumping"

By utilizing the ledger table, if the Reinvest bucket runs low, you can safely log a ledger entry against the Reserve bucket instead, acting exactly like an emergency corporate treasury transfer.

## 3. UI, Pages, & Terminology Architecture

Because we are tracking multiple corporate buckets rather than just a personal salary draw, we are renaming the concept of "Withdrawals" to "Ledger".

### The /accounts Page

- Status: No major changes needed.
- Function: Your Accounts page already has "withdraw" actions set for each bucket. These actions will now simply open the Ledger Form with the corresponding bucket (e.g., Reinvest) pre-selected in the dropdown.

### The /withdrawals Page ➡️ Renamed to /ledger

- Status: Replacing the old page.
- Function: Instead of just showing personal salary withdrawals, this page becomes your Corporate Ledger. It will display a unified table of all post-profit spending. You will be able to filter this table by bucket (e.g., "Show me all Reinvest spending").

### The Dashboard (/dashboard)

- Status: Updating KPI Cards.
- Function: The dashboard currently shows the Salary carry-over. We will expand the financial overview to show the available cash balances for all four buckets (Salary, Reinvest, Reserve, Flex) so you know exactly how much growth capital you have at a glance.

## 4. Development Phases & Required Updates

Here is the exact step-by-step plan to update the codebase.

### Phase 1: Database Schema Updates

We need to rename the old table to ledger and teach the database about our four virtual buckets by adding an enum.

- File: packages/db/src/schema/ledger.ts (Renamed from withdrawals.ts)
- Updates:
  - Import pgEnum.
  - Define the enum: export const allocationEnum = pgEnum('allocation_type', ['salary', 'reinvest', 'reserve', 'flex']);
  - Create the ledger table with the new column: allocationType: allocationEnum("allocation_type").notNull().default('salary').
- Action Required: Run bunx drizzle-kit generate and bunx drizzle-kit migrate from the packages/db directory. (Note: Since there is no historical data to preserve, replacing the old table is safe).

### Phase 2: Server Actions & Backend Logic

We need to update the server actions to point to the new Ledger table and accept the allocation type.

- File: apps/admin/src/app/actions/ledger.ts (Renamed from withdrawals.ts)
- Updates:
  - Update ledgerSchema Zod validation to include allocationType: z.enum(['salary', 'reinvest', 'reserve', 'flex']).default('salary').
  - Map parsed.data.allocationType into the db.insert statement.

- File: apps/admin/src/lib/financial.ts
- Updates:
  - Currently, getWithdrawals() only calculates carry-over for Salary.
  - We need to expand this into a new function, e.g., getLedgerBalances(), to calculate the remaining balance for all buckets.
  - Calculate total historical expected Reinvest (Profit Pool * 0.30).
  - Sum all ledger entries where allocationType === 'reinvest'.
  - Available Reinvest = Expected - Ledger Entries.
  - Repeat for Reserve and Flex.

### Phase 3: User Interface Updates

We need to update the UI forms to match the new Ledger terminology and include the bucket dropdown.

- File: apps/admin/src/components/ledger/ledger-add-form.tsx (Renamed folder and file)
- Updates:
  - Add allocationType to the component's formSchema.
  - Add a Shadcn <Select> component to the form UI with the four bucket options.
  - Pass the selected value to the FormData object during onSubmit.

### Phase 4: Navigation & Data Fetching Updates

We must update the app navigation to point to the new route and ensure existing components filter ledger data correctly.

- File: apps/admin/src/components/layout/app-sidebar.tsx
- Updates:
  - Find the navigation array/links and change the href from /withdrawals to /ledger.
  - Update the link label from "Withdrawals" to "Ledger".

- File: apps/admin/src/components/dashboard/salary-card.tsx (and related charts)
- Updates:
  - Update data fetching logic to query the new ledger table instead of withdrawals.
  - Critical: Add a where clause to filter by allocationType === 'salary'. This ensures that spending on Reinvest or Reserve does not accidentally decrease the visual display of the user's available personal salary.

## 5. AI Co-Worker Implementation Guide

ATTENTION AI ASSISTANT: If you are reading this document to implement the Allocation Routing Update, you MUST adhere to the following rules to ensure codebase stability.

- Pace Yourself (One Phase at a Time): Do not attempt to write the code for all phases in a single response. Complete Phase 1 (Schema), ask the user to run the Drizzle migrations, and wait for confirmation before proceeding to Phase 2.
- Handle the Rename Carefully: This update replaces the concept of withdrawals with ledger. You must rigorously search for and update all imports pointing to packages/db/src/schema/withdrawals.ts and apps/admin/src/app/actions/withdrawals.ts. Leaving orphaned imports will break the build.
- Type Safety is Paramount: Ensure the allocationEnum defined in the Drizzle schema exactly matches the Zod validation schemas used in the server actions and the React hook forms. The valid enum values are strictly: 'salary', 'reinvest', 'reserve', and 'flex'.
- Data Purge Authorization: The user has explicitly stated that they do not have historical data to lose. It is safe to drop the withdrawals table and generate a fresh ledger table via Drizzle. Do not write complex data-preservation migrations.
- Dashboard Filtering: When updating financial.ts and the UI cards, ensure that any metric labeled "Salary" is strictly querying the ledger with where: eq(ledger.allocationType, 'salary'). Unfiltered queries will pollute the personal pay metrics with corporate spending.

## Summary of Rule Changes for the User

If you are buying it to complete a client's job (survival) ➡️ Log an Expense.

If you are buying it to get more clients or upgrade the business (growth) ➡️ Log a Ledger Entry (Reinvest/Reserve).

