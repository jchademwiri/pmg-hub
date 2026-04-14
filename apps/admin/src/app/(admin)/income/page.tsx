import type { Metadata } from 'next';
import { getAllIncome, getAllDivisions, getAllClients, getDistinctIncomeMonths } from '@pmg/db';
import { createIncome, updateIncome, deleteIncome } from '@/app/actions/income';
import { FilterBar } from '@/components/income/filter-bar';
import { formatZAR } from '@/lib/format';
import { SetPageTotal } from '@/components/layout/page-header-context';
import IncomePageClient from './income-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Income' };

interface IncomePageProps {
  searchParams: Promise<{ divisionId?: string; month?: string; page?: string }>;
}

export default async function IncomePage({ searchParams }: IncomePageProps) {
  const { divisionId, month, page } = await searchParams;

  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const pageSize = 20;

  const [result, divisions, clients, months] = await Promise.all([
    getAllIncome({ divisionId, month }, { page: currentPage, pageSize }),
    getAllDivisions(),
    getAllClients(),
    getDistinctIncomeMonths(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.sum)} variant="green" />
      <FilterBar
        divisions={divisions}
        months={months}
        currentDivisionId={divisionId}
        currentMonth={month}
      />
      <IncomePageClient
        entries={result.data}
        total={result.total}
        sum={result.sum}
        currentPage={currentPage}
        pageSize={pageSize}
        divisions={divisions}
        clients={clients}
        divisionId={divisionId}
        month={month}
        createAction={createIncome}
        deleteAction={deleteIncome}
        updateAction={updateIncome}
      />
    </div>
  );
}
