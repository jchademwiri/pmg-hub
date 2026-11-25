import type { Metadata } from 'next';
import { getAllExpenseCategories, getAllChartAccounts } from '@pmg/db';
import { CategoryList } from '@/components/expense-categories/category-list';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Expense Categories' };

export default async function ExpenseCategoriesPage() {
  const [categories, allAccounts] = await Promise.all([
    getAllExpenseCategories(),
    getAllChartAccounts(),
  ]);

  const expenseAccounts = allAccounts
    .filter((a) => a.type === 'expense' && a.isActive && a.isPostingAccount)
    .map((a) => ({ id: a.id, code: a.code, name: a.name }));

  return (
    <div className="flex flex-col gap-6">
      <CategoryList initialCategories={categories} expenseAccounts={expenseAccounts} />
    </div>
  );
}
