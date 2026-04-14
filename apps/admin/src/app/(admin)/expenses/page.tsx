import type { Metadata } from 'next';
import {
  getAllExpenses,
  getAllDivisions,
  getAllExpenseCategories,
  getDistinctExpenseMonths,
  getAllClients,
} from '@pmg/db';
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses';
import { ExpenseFilterBar } from '@/components/expenses/expense-filter-bar';
import { formatZAR } from '@/lib/format';
import { SetPageTotal } from '@/components/layout/page-header-context';
import ExpensesPageClient from './expenses-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Expenses' };

interface ExpensePageProps {
  searchParams: Promise<{ divisionId?: string; category?: string; month?: string; page?: string }>;
}

export default async function ExpensePage({ searchParams }: ExpensePageProps) {
  const { divisionId, category, month, page } = await searchParams;

  const filters = {
    divisionId: divisionId || undefined,
    category: category || undefined,
    month: month || undefined,
  };

  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const pageSize = 20;

  const [result, divisions, categoryObjects, months, clients] = await Promise.all([
    getAllExpenses(filters, { page: currentPage, pageSize }),
    getAllDivisions(),
    getAllExpenseCategories(),
    getDistinctExpenseMonths(),
    getAllClients(),
  ]);

  const categories = categoryObjects.map((c) => c.name);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.sum)} variant="amber" />
      <ExpenseFilterBar
        divisions={divisions}
        categories={categories}
        months={months}
        currentDivisionId={filters.divisionId}
        currentCategory={filters.category}
        currentMonth={filters.month}
      />
      <ExpensesPageClient
        entries={result.data}
        total={result.total}
        sum={result.sum}
        currentPage={currentPage}
        pageSize={pageSize}
        divisions={divisions}
        categories={categories}
        clients={clients}
        divisionId={filters.divisionId}
        category={filters.category}
        month={filters.month}
        createAction={createExpense}
        deleteAction={deleteExpense}
        updateAction={updateExpense}
      />
    </div>
  );
}
