import type { Metadata } from 'next';
import {
  getDivisionsWithStats,
  getProfitAndLossByDivision,
  getAvailableFiscalYears,
} from '@pmg/db';
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

interface DivisionsPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DivisionsPage({ searchParams }: DivisionsPageProps) {
  const { period: periodParam } = await searchParams;
  const fyYears = await getAvailableFiscalYears();
  const { year, month } = getSASTParts();
  const currentFyYear = month < 2 ? year : year + 1;
  const defaultPeriod = fyYears[0] ?? `${currentFyYear}-FY`;
  const period = periodParam || defaultPeriod;

  const availablePeriods = [
    ...fyYears.map((fy, idx) => ({
      value: fy,
      label: idx === 0 ? `${fy} (Current)` : idx === 1 ? `${fy} (Prior Year)` : fy,
    })),
    { value: 'all', label: 'All Time' },
  ];

  const [divisions, pnlRows] = await Promise.all([
    getDivisionsWithStats(),
    getProfitAndLossByDivision(period),
  ]);

  const pnlByDivision = new Map(pnlRows.map((row) => [row.divisionId, row]));

  const divisionsWithPnl: DivisionWithPnl[] = divisions.map((division) => {
    const pnl = pnlByDivision.get(division.id);
    const badDebt = pnl?.totalBadDebt ?? 0;
    return {
      ...division,
      pnlRevenue: pnl?.totalRevenue ?? 0,
      pnlCashReceived: pnl?.totalIncome ?? 0,
      pnlOutstandingAr: pnl?.totalOutstandingAr ?? 0,
      pnlExpenses: (pnl?.totalExpenses ?? 0) - badDebt,
      pnlBadDebt: badDebt,
      pnlNetProfit: pnl?.netProfit ?? 0,
      pnlMarginPercent: pnl?.marginPercent ?? 0,
      pnlSharePercent: pnl?.distributionPercent ?? 0,
    };
  });

  return (
    <DivisionsPageClient
      divisions={divisionsWithPnl}
      period={period}
      availablePeriods={availablePeriods}
      createAction={createDivision}
      updateAction={updateDivision}
      deleteAction={deleteDivision}
      toggleActiveAction={toggleDivisionActive}
    />
  );
}
