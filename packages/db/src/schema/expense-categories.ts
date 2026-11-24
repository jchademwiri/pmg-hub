import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { chartAccounts } from './accounting';

export const expenseCategories = pgTable(
  'expense_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    chartAccountId: uuid('chart_account_id').references(() => chartAccounts.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('expense_categories_chart_account_id_idx').on(t.chartAccountId)],
);

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type NewExpenseCategory = typeof expenseCategories.$inferInsert;
