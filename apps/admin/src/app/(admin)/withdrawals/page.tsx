import type { Metadata } from 'next';
import { getAllWithdrawals, getYTDSummary, getWithdrawalsByAccountYTD } from '@pmg/db';
import { createWithdrawal, updateWithdrawal, deleteWithdrawal } from '@/app/actions/withdrawals';
import { WithdrawalsTable } from '@/components/withdrawals/withdrawals-table';
import { WithdrawalAddForm } from '@/components/withdrawals/withdrawal-add-form';
import { EmptyState } from '@/components/ui/empty-state';
import { formatZAR } from '@/lib/format';
import { SetPageTotal } from '@/components/layout/page-header-context';
import { ACCOUNT_KEYS } from '@/lib/accounts';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Withdrawals' };

interface WithdrawalsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function WithdrawalsPage({ searchParams }: WithdrawalsPageProps) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page || '1', 10));
  const pageSize = 20;

  const [result, ytd, withdrawnByAccount] = await Promise.all([
    getAllWithdrawals({ page: currentPage, pageSize }),
    getYTDSummary(),
    getWithdrawalsByAccountYTD(),
  ]);

  const earned: Record<string, number> = {
    salary: ytd.salary,
    pmg_share: ytd.pmgShare,
    reinvest: ytd.reinvest,
    reserve: ytd.reserve,
    flex: ytd.flex,
  };

  const accountBalances: Record<string, number> = {};
  for (const key of ACCOUNT_KEYS) {
    const withdrawn = withdrawnByAccount[key] ?? 0;
    accountBalances[key] = Math.max(0, (earned[key] ?? 0) - withdrawn);
  }

  const totalBalance = Object.values(accountBalances).reduce((a, b) => a + b, 0);
  const isDisabled = totalBalance <= 0;

  return (
    <div className="flex flex-col gap-6">
      <SetPageTotal value={formatZAR(result.sum) + ' All-time'} variant="amber" />

      <WithdrawalAddForm createAction={createWithdrawal} disabled={isDisabled} />

      {result.data.length === 0 ? (
        <EmptyState message="No withdrawals yet." />
      ) : (
        <>
          <WithdrawalsTable
            entries={result.data}
            deleteAction={deleteWithdrawal}
            updateAction={updateWithdrawal}
          />

          {result.total > pageSize && (
            <div className="flex justify-between items-center px-2 py-4">
              <span className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, result.total)} of {result.total} entries
              </span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <a
                    href={`?page=${currentPage - 1}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Previous
                  </a>
                )}
                {currentPage * pageSize < result.total && (
                  <a
                    href={`?page=${currentPage + 1}`}
                    className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                  >
                    Next
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
