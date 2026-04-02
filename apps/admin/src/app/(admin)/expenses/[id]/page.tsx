import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getExpenseById, getAllDivisions, getDistinctExpenseCategories } from '@pmg/db'
import { updateExpense } from '@/app/actions/expenses'
import { ExpenseEditForm } from '@/components/expenses/expense-edit-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Edit Expense' }

interface EditExpensePageProps {
  params: Promise<{ id: string }>
}

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { id } = await params
  const entry = await getExpenseById(id)
  if (!entry) notFound()

  const [divisions, categories] = await Promise.all([
    getAllDivisions(),
    getDistinctExpenseCategories(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/expenses"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Expenses
        </Link>
        <h1 className="text-2xl font-semibold">Edit Expense</h1>
      </div>

      <ExpenseEditForm
        entry={entry}
        divisions={divisions}
        categories={categories}
        updateAction={updateExpense.bind(null, id)}
      />
    </div>
  )
}
