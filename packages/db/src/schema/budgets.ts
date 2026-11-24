import {
  pgTable,
  uuid,
  integer,
  varchar,
  numeric,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { divisions } from './divisions';

// ── budget_monthly_plan ───────────────────────────────────────────────────────
// Monthly revenue targets, operating expense budgets, director salary budgets,
// and tax reserve targets per South African financial year (Mar–Feb).
// Admin-only table protected by RLS (`budget_monthly_plan_admin_only`).

export const budgetMonthlyPlan = pgTable(
  'budget_monthly_plan',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Ending year of the SA financial year (e.g. 2028 = FY2027/28 Mar 2027 – Feb 2028) */
    fiscalYear: integer('fiscal_year').notNull(),
    /** Accounting period in YYYY-MM format (e.g. "2027-03") */
    period: varchar('period', { length: 7 }).notNull(),
    revenueTarget: numeric('revenue_target', { precision: 14, scale: 2 }).notNull().default('0.00'),
    expenseBudget: numeric('expense_budget', { precision: 14, scale: 2 }).notNull().default('0.00'),
    directorSalaryBudget: numeric('director_salary_budget', { precision: 14, scale: 2 })
      .notNull()
      .default('0.00'),
    taxReserveTarget: numeric('tax_reserve_target', { precision: 14, scale: 2 })
      .notNull()
      .default('0.00'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('budget_monthly_plan_period_uidx').on(t.period),
    index('budget_monthly_plan_fy_idx').on(t.fiscalYear),
  ],
);

export type BudgetMonthlyPlan = typeof budgetMonthlyPlan.$inferSelect;
export type NewBudgetMonthlyPlan = typeof budgetMonthlyPlan.$inferInsert;

// ── budget_revenue_targets ────────────────────────────────────────────────────
// Per-division monthly revenue targets (e.g. TES R210k | AWS R18k | PMG R12k).
// Admin-only table protected by RLS (`budget_revenue_targets_admin_only`).

export const budgetRevenueTargets = pgTable(
  'budget_revenue_targets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fiscalYear: integer('fiscal_year').notNull(),
    period: varchar('period', { length: 7 }).notNull(),
    divisionId: uuid('division_id')
      .notNull()
      .references(() => divisions.id, { onDelete: 'cascade' }),
    targetAmount: numeric('target_amount', { precision: 14, scale: 2 }).notNull().default('0.00'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('budget_revenue_targets_period_division_uidx').on(t.period, t.divisionId),
    index('budget_revenue_targets_fy_idx').on(t.fiscalYear),
    index('budget_revenue_targets_division_idx').on(t.divisionId),
  ],
);

export type BudgetRevenueTarget = typeof budgetRevenueTargets.$inferSelect;
export type NewBudgetRevenueTarget = typeof budgetRevenueTargets.$inferInsert;
