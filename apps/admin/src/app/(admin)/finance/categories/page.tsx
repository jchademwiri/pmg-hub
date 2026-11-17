import type { Metadata } from 'next';
import { getAllExpenseCategories } from '@pmg/db';
import { CategoryList } from '@/components/expense-categories/category-list';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Expense Categories' };

export default async function ExpenseCategoriesPage() {
  const categories = await getAllExpenseCategories();

  return (
    <div className="flex flex-col gap-6">
      <CategoryList initialCategories={categories} />
    </div>
  );
}
