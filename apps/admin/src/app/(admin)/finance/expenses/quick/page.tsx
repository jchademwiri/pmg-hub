import type { Metadata } from 'next';
import { getAllDivisions, getAllExpenseCategories } from '@pmg/db';
import { getSASTToday } from '@/lib/format';
import { QuickExpenseClient } from './quick-expense-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Quick Receipt Snap' };

export default async function QuickExpensePage() {
  const [divisions, categories] = await Promise.all([getAllDivisions(), getAllExpenseCategories()]);

  const defaultDivision =
    divisions.find((d) => d.name.toLowerCase().includes('tenderedge') || d.name === 'TES') ??
    divisions[0];

  return (
    <QuickExpenseClient
      divisions={divisions.map((d) => ({ id: d.id, name: d.name }))}
      defaultDivisionId={defaultDivision?.id ?? ''}
      categories={categories.map((c) => c.name)}
      todayStr={getSASTToday()}
    />
  );
}
