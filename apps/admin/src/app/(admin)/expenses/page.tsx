import type { Metadata } from 'next'
import {
  getAllExpenses,
  getAllDivisions,
  getAllExpenseCategories,
  getDistinctExpenseMonths,
  getAllClients,
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
  searchParams: Promise<{ divisionId?: string; category?: string; month?: string; page?: string }>
}

export default async function ExpensePage({ searchParams }: ExpensePageProps) {
  const { divisionId, category, month, page } = await searchParams

  const filters = {
    divisionId: divisionId || undefined,
    category: category || undefined,
    month: month || undefined,
  }

  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const pageSize = 20

  const [result, divisions, categoryObjects, months, clients] = await Promise.all([
    getAllExpenses(filters, { page: currentPage, pageSize }),
    getAllDivisions(),
    getAllExpenseCategories(),
    getDistinctExpenseMonths(),
    getAllClients(),
  ])

  const categories = categoryObjects.map((c) => c.name)

  const runningTotal = result.sum

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(runningTotal)} variant="amber" />

      <SetPageTotal value={formatZAR(runningTotal)} variant="amber" />

      <ExpenseFilterBar
        divisions={divisions}
        categories={categories}
        months={months}
        currentDivisionId={filters.divisionId}
        currentCategory={filters.category}
        currentMonth={filters.month}
      />

      <ExpenseAddForm divisions={divisions} categories={categories} clients={clients} createAction={createExpense} />

      {result.data.length === 0 ? (
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
        <>
          <ExpenseTable entries={result.data} divisions={divisions} categories={categories} clients={clients} deleteAction={deleteExpense} updateAction={updateExpense} />
          
          {result.total > pageSize && (
            <div className="flex justify-between items-center px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, result.total)} of {result.total} entries
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <a href={`?page=${currentPage - 1}${divisionId ? `&divisionId=${divisionId}` : ''}${category ? `&category=${category}` : ''}${month ? `&month=${month}` : ''}`} className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors">Previous</a>
                )}
                {currentPage * pageSize < result.total && (
                  <a href={`?page=${currentPage + 1}${divisionId ? `&divisionId=${divisionId}` : ''}${category ? `&category=${category}` : ''}${month ? `&month=${month}` : ''}`} className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors">Next</a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

