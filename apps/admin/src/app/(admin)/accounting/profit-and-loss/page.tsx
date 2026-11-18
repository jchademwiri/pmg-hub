import type { Metadata } from 'next';
import { getProfitAndLoss, getAllAccountingPeriods, getAllDivisions } from '@pmg/db';
import { SetPageTotal } from '@/components/navigation/page-header-context';
import { ProfitAndLossClient } from './profit-and-loss-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Profit & Loss' };

export default async function ProfitAndLossPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; divisionId?: string }>;
}) {
  const params = await searchParams;
  const [data, allPeriods, allDivisions] = await Promise.all([
    getProfitAndLoss(params.period, params.divisionId),
    getAllAccountingPeriods(),
    getAllDivisions(),
  ]);

  const periods = allPeriods.map((p) => p.period);
  const divisions = allDivisions.map((d) => ({ id: d.id, name: d.name }));
  const selectedDivision = divisions.find((d) => d.id === params.divisionId);

  const prefix = selectedDivision ? `${selectedDivision.name}: ` : '';
  const totalValue =
    data.netProfit >= 0
      ? `${prefix}Net profit: R${data.netProfit.toFixed(2)}`
      : `${prefix}Net loss: R${Math.abs(data.netProfit).toFixed(2)}`;

  return (
    <div className="flex flex-col gap-5">
      <SetPageTotal value={totalValue} variant={data.netProfit >= 0 ? 'green' : 'red'} />

      <ProfitAndLossClient
        data={data}
        periods={periods}
        selectedPeriod={params.period || ''}
        divisions={divisions}
        selectedDivisionId={params.divisionId || ''}
      />
    </div>
  );
}
