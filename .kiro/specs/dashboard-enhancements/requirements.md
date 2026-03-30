# Requirements Document

## Introduction

Three targeted enhancements to the PMG Control Center admin dashboard:

1. **Salary Withdrawal Input** — a Withdraw button on the SalaryCard opens a modal dialog that lets the owner record a withdrawal amount directly, persisting it to a dedicated `withdrawals` table. The SalaryCard also gains a YTD salary sub-label alongside the primary current-month figure.
2. **Expense Sparkline Color Update** — the expense line on the Revenue vs Expenses sparkline is recolored to a soft/muted red so it is visually distinct from the revenue line.
3. **Division Revenue Chart Time Range Controls** — the DivisionAreaChart gains a "Previous Month" range option to complete the full set of five time ranges.

## Glossary

- **Dashboard**: The admin dashboard page at `/dashboard` in the PMG Control Center Next.js app.
- **SalaryCard**: The React component at `apps/admin/src/components/dashboard/salary-card.tsx` that displays the owner's calculated salary and withdrawal history.
- **WithdrawModal**: The new shadcn Dialog component that collects a withdrawal amount from the user.
- **Withdrawal**: A recorded cash draw by the owner against the current month's calculated salary, stored in the `withdrawals` table.
- **Withdrawals_Table**: A new PostgreSQL table (`withdrawals`) that stores individual withdrawal records with date, amount, and optional description.
- **RevenueSparkline**: The React component at `apps/admin/src/components/dashboard/revenue-sparkline.tsx` that renders the Revenue vs Expenses area chart.
- **DivisionAreaChart**: The React component at `apps/admin/src/components/dashboard/division-area-chart.tsx` that renders the interactive per-division revenue area chart.
- **Expense_Color**: The CSS variable used to color the expenses series in the RevenueSparkline, to be set to a muted red value.
- **RangeKey**: A string union type representing the selected time range in the DivisionAreaChart (`'current' | 'prev' | 'last3' | 'last6' | 'ytd'`).
- **Server_Action**: A Next.js Server Action used to persist a withdrawal to the database without a separate API route.
- **YTD_Salary**: The cumulative owner salary calculated from January 1 of the current year to the present date.

---

## Requirements

### Requirement 1: Salary Withdrawal Modal

**User Story:** As the business owner, I want to record a salary withdrawal directly from the dashboard, so that my withdrawal history is tracked without leaving the admin interface.

#### Acceptance Criteria

1. THE SalaryCard SHALL render a "Withdraw" button when the current-month tab is active and the profit pool is not negative.
2. WHEN the user clicks the Withdraw button, THE WithdrawModal SHALL open as a shadcn Dialog containing a single numeric amount input field and a Submit button.
3. THE WithdrawModal amount input SHALL start empty and SHALL accept any positive numeric value entered by the user.
4. WHEN the user submits the WithdrawModal with a valid positive amount, THE Server_Action SHALL insert a new row into the Withdrawals_Table with the current date, the entered amount, and a null description.
5. IF the user submits the WithdrawModal with an empty or non-positive amount, THEN THE WithdrawModal SHALL display an inline validation error and SHALL NOT submit the form.
6. WHEN the Server_Action completes successfully, THE WithdrawModal SHALL close and THE SalaryCard SHALL reflect the updated withdrawal total without a full page reload.
7. IF the Server_Action returns an error, THEN THE WithdrawModal SHALL display the error message and SHALL remain open.
8. THE WithdrawModal SHALL include a Cancel button that closes the dialog without submitting.

### Requirement 2: Withdrawals Table

**User Story:** As the system, I need a dedicated database table for withdrawal records, so that withdrawals are stored independently from general expenses and can be queried efficiently.

#### Acceptance Criteria

1. THE Withdrawals_Table SHALL contain columns: `id` (UUID primary key), `date` (date, not null), `amount` (numeric 12,2, not null), `description` (text, nullable), and `created_at` (timestamptz, default now).
2. THE Withdrawals_Table SHALL enforce a check constraint that `amount > 0`.
3. THE Withdrawals_Table SHALL have an index on the `date` column.
4. WHEN `getWithdrawalsCurrentMonth` is called, THE query SHALL read from the Withdrawals_Table instead of filtering the expenses table by category.
5. THE Withdrawals_Table schema SHALL be exported from `packages/db/src/schema/index.ts` and the corresponding Drizzle insert/select types SHALL be exported from `packages/db/src/index.ts`.

### Requirement 3: SalaryCard YTD Sub-label

**User Story:** As the business owner, I want to see both my current-month salary and my year-to-date salary on the salary card, so that I have a full picture of my earnings at a glance.

#### Acceptance Criteria

1. THE SalaryCard SHALL display the current-month salary as the primary large figure when the current-month tab is active.
2. THE SalaryCard SHALL display the YTD salary as a smaller sub-label beneath the primary salary figure when the current-month tab is active.
3. WHILE the previous-month or YTD tab is active, THE SalaryCard SHALL display only the period salary figure without a YTD sub-label.
4. THE SalaryCard SHALL receive the YTD salary as a prop (`ytdSalary: number`) and SHALL format it using `formatZAR`.

### Requirement 4: Expense Sparkline Color

**User Story:** As a dashboard user, I want the expense line on the revenue sparkline to appear in a soft red color, so that I can immediately distinguish expenses from revenue without reading the legend.

#### Acceptance Criteria

1. THE RevenueSparkline SHALL render the expenses `Area` series using a dedicated muted-red CSS variable (`--chart-expense`) for both stroke and fill gradient.
2. THE globals.css SHALL define `--chart-expense` in both `:root` and `.dark` selectors as a soft, muted red value (e.g. `oklch(0.65 0.15 25)`).
3. THE RevenueSparkline legend indicator for "Expenses" SHALL use the same `--chart-expense` color.
4. THE RevenueSparkline tooltip SHALL use the same `--chart-expense` color for the expenses row indicator.
5. WHEN `--chart-expense` is defined, THE revenue series SHALL continue to use `var(--chart-1)` unchanged.

### Requirement 5: Division Revenue Chart — Previous Month Range

**User Story:** As a dashboard user, I want to view division revenue for the previous calendar month, so that I can compare last month's performance by division without switching to the reports page.

#### Acceptance Criteria

1. THE DivisionAreaChart SHALL include a "Prev Month" button in the range selector alongside the existing "This Month", "Last 3 Months", "Last 6 Months", and "Year to Date" buttons.
2. WHEN the user selects "Prev Month", THE DivisionAreaChart SHALL display division revenue data for the previous calendar month only.
3. THE RangeKey type SHALL include `'prev'` as a valid value.
4. THE financial.ts helper `getAllDivisionSeriesData` SHALL fetch and return a `prev` series in addition to the existing `current`, `last3`, `last6`, and `ytd` series.
5. THE `getDivisionRevenuePreviousMonth` query in `packages/db/src/queries.ts` SHALL return revenue per division for the previous calendar month using `DATE_TRUNC('month', NOW()) - INTERVAL '1 month'` as the start bound and `DATE_TRUNC('month', NOW())` as the end bound.
6. THE DashboardShell Props type SHALL include `prev` in the `divisionSeriesData` object passed to DivisionAreaChart.
