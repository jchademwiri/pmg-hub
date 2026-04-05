import type { Metadata } from 'next'
import {
  getAllExpenses,
  getAllDivisions,
  getDistinctExpenseCategories,
  getDistinctExpenseMonths,
} from '@pmg/db'
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses'
import { ExpenseFilterBar } from '@/components/expenses/expense-filter-bar'
import { ExpenseAddForm } from '@/components/expenses/expense-add-form'
import { ExpenseTable } from '@/components/expenses/expense-table'
import { EmptyState } from '@/components/ui/empty-state'
import { formatZAR } from '@/lib/format'
import { SetPageTotal } from '@/components/layout/page-header-context'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Expenses' }

interface ExpensePageProps {
  searchParams: Promise<{ divisionId?: string; category?: string; month?: string }>
}

export default async function ExpensePage({ searchParams }: ExpensePageProps) {
  const { divisionId, category, month } = await searchParams

  const filters = {
    divisionId: divisionId || undefined,
    category: category || undefined,
    month: month || undefined,
  }

  const [entries, divisions, categories, months] = await Promise.all([
    getAllExpenses(filters),
    getAllDivisions(),
    getDistinctExpenseCategories(),
    getDistinctExpenseMonths(),
  ])

  const runningTotal = entries.reduce((sum, e) => sum + Number(e.amount), 0)
  const divisionBreakdown = entries.reduce((map, e) => {
    map.set(e.divisionName, (map.get(e.divisionName) ?? 0) + Number(e.amount))
    return map
  }, new Map<string, number>())

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(runningTotal)} variant="amber" />

      {divisionBreakdown.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(divisionBreakdown.entries()).map(([division, amount]) => (
            <span
              key={division}
              className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground"
            >
              {division}: {formatZAR(amount)}
            </span>
          ))}
        </div>
      )}

      <ExpenseFilterBar
        divisions={divisions}
        categories={categories}
        months={months}
        currentDivisionId={filters.divisionId}
        currentCategory={filters.category}
        currentMonth={filters.month}
      />

      <ExpenseAddForm divisions={divisions} categories={categories} createAction={createExpense} />

      {entries.length === 0 ? (
        <EmptyState
          message={
            filters.divisionId || filters.category || filters.month
              ? 'No expense entries match the current filters.'
              : 'No expense entries yet.'
          }
          ctaLabel={
            filters.divisionId || filters.category || filters.month
              ? undefined
              : 'Add Expense'
          }
          ctaHref={
            filters.divisionId || filters.category || filters.month
              ? undefined
              : '#expense-add-form'
          }
          filtered={!!(filters.divisionId || filters.category || filters.month)}
        />
      ) : (
        <ExpenseTable entries={entries} divisions={divisions} categories={categories} deleteAction={deleteExpense} updateAction={updateExpense} />
      )}
    </div>
  )
}

