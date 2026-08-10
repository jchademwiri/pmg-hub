import type { Metadata } from 'next';
import { getDivisionsWithStats, getProfitAndLossByDivision } from '@pmg/db';
import {
  createDivision,
  updateDivision,
  deleteDivision,
  toggleDivisionActive,
} from '@/app/actions/divisions';
import { getSASTParts } from '@/lib/format';
import DivisionsPageClient, { type DivisionWithPnl } from './divisions-client';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Divisions' };

export default async function DivisionsPage() {
  // Mirrors /insights/financial-reports?type=division-performance's fiscal-year
  // labeling convention (label = the calendar year the FY ends in, e.g. the FY
  // that runs March 2026–February 2027 is "2027-FY").
  const { year, month } = getSASTParts();
  const period = `${month < 2 ? year : year + 1}-FY`;

  const [divisions, pnlRows] = await Promise.all([
    getDivisionsWithStats(),
    getProfitAndLossByDivision(period),
  ]);

  const pnlByDivision = new Map(pnlRows.map((row) => [row.divisionId, row]));

  const divisionsWithPnl: DivisionWithPnl[] = divisions.map((division) => {
    const pnl = pnlByDivision.get(division.id);
    return {
      ...division,
      pnlRevenue: pnl?.totalRevenue ?? 0,
      pnlCashReceived: pnl?.totalIncome ?? 0,
      pnlOutstandingAr: pnl?.totalOutstandingAr ?? 0,
      pnlExpenses: pnl?.totalExpenses ?? 0,
      pnlNetProfit: pnl?.netProfit ?? 0,
      pnlMarginPercent: pnl?.marginPercent ?? 0,
      pnlSharePercent: pnl?.distributionPercent ?? 0,
    };
  });

  return (
    <DivisionsPageClient
      divisions={divisionsWithPnl}
      period={period}
      createAction={createDivision}
      updateAction={updateDivision}
      deleteAction={deleteDivision}
      toggleActiveAction={toggleDivisionActive}
    />
  );
}
