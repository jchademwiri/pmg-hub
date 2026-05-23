import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllIncome, getAllDivisions, getAllClients, getDistinctIncomeMonths } from '@pmg/db';
import { updateIncome, deleteIncome } from '@/app/actions/income';
import { FilterBar } from '@/components/income/filter-bar';
import { formatZAR } from '@/lib/format';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import IncomePageClient from './income-client';
import { getClosedPeriodsFromDates } from '@/lib/date-rules';

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

  const closedPeriods = await getClosedPeriodsFromDates(result.data.map((r) => r.date));

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.sum)} variant="green" />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Income</h2>
          <p className="text-sm text-muted-foreground">Monitor general cash entries and record client payments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/billing/payments/add">
              <Plus className="size-4" />
              Record Payment
            </Link>
          </Button>
        </div>
      </div>

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
        deleteAction={deleteIncome}
        updateAction={updateIncome}
        closedPeriods={closedPeriods}
      />
    </div>
  );
}
