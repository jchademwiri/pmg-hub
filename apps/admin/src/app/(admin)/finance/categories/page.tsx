import type { Metadata } from 'next'
import { getAllExpenseCategories } from '@pmg/db'
import { CategoryList } from '@/components/expense-categories/category-list'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Expense Categories' }

export default async function ExpenseCategoriesPage() {
  const categories = await getAllExpenseCategories()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Expense Categories</h1>
      </div>
      <CategoryList initialCategories={categories} />
    </div>
  )
}
