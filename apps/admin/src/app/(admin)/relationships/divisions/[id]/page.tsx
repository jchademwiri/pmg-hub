import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getDivisionWithStatsById,
  getAllIncome,
  getAllExpenses,
  getAllInvoices,
  getAllQuotations,
  getProfitAndLossByDivision,
  getActiveRates,
  getAvailableFiscalYears,
} from '@pmg/db';
import { getSASTParts } from '@/lib/format';
import { DivisionDetailClient } from './division-detail-client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 5;

interface DivisionDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    period?: string;
    invPage?: string;
    quotePage?: string;
    payPage?: string;
    expPage?: string;
  }>;
}

export async function generateMetadata({ params }: DivisionDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const division = await getDivisionWithStatsById(id);
  return { title: division ? division.name : 'Division' };
}

export default async function DivisionDetailPage({
  params,
  searchParams,
}: DivisionDetailPageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const invPage = Math.max(1, Number(sp.invPage) || 1);
  const quotePage = Math.max(1, Number(sp.quotePage) || 1);
  const payPage = Math.max(1, Number(sp.payPage) || 1);
  const expPage = Math.max(1, Number(sp.expPage) || 1);

  const fyYears = await getAvailableFiscalYears();
  const { year, month } = getSASTParts();
  const currentFyYear = month < 2 ? year : year + 1;
  const defaultPeriod = fyYears[0] ?? `${currentFyYear}-FY`;
  const period = sp.period || defaultPeriod;

  const availablePeriods = [
    ...fyYears.map((fy, idx) => ({
      value: fy,
      label: idx === 0 ? `${fy} (Current)` : idx === 1 ? `${fy} (Prior Year)` : fy,
    })),
    { value: 'all', label: 'All Time' },
  ];

  const fiscalYearStart = period.endsWith('-FY')
    ? parseInt(period.split('-')[0], 10) - 1
    : undefined;

  const [
    division,
    incomeEntries,
    expenseEntries,
    invoiceEntries,
    quoteEntries,
    profitAndLossByDivision,
    activeRates,
  ] = await Promise.all([
    getDivisionWithStatsById(id),
    getAllIncome(
      { divisionId: id, ...(fiscalYearStart ? { year: fiscalYearStart } : {}) },
      { page: payPage, pageSize: PAGE_SIZE },
    ),
    getAllExpenses(
      { divisionId: id, ...(fiscalYearStart ? { year: fiscalYearStart } : {}) },
      { page: expPage, pageSize: PAGE_SIZE },
    ),
    getAllInvoices(
      {
        divisionId: id,
        ...(fiscalYearStart ? { year: fiscalYearStart } : {}),
        onlyOutstanding: true,
      },
      { page: invPage, pageSize: PAGE_SIZE },
    ),
    getAllQuotations(
      { divisionId: id, ...(fiscalYearStart ? { year: fiscalYearStart } : {}) },
      { page: quotePage, pageSize: PAGE_SIZE },
    ),
    getProfitAndLossByDivision(period),
    getActiveRates().catch(() => ({ pmg_share: 0.25 })),
  ]);

  if (!division) notFound();

  // getProfitAndLossByDivision() omits divisions with no ledger activity at all
  const pnl = profitAndLossByDivision.find((row) => row.divisionId === id) ?? {
    divisionId: id,
    divisionName: division.name,
    totalRevenue: 0,
    totalIncome: 0,
    totalOutstandingAr: 0,
    totalExpenses: 0,
    totalBadDebt: 0,
    netProfit: 0,
    marginPercent: 0,
    distributionPercent: 0,
  };

  const pmgShare = Math.max(0, pnl.netProfit) * activeRates.pmg_share;
  const operatingExpenses = pnl.totalExpenses - pnl.totalBadDebt;

  return (
    <DivisionDetailClient
      division={division}
      period={period}
      availablePeriods={availablePeriods}
      pnl={pnl}
      pmgShare={pmgShare}
      operatingExpenses={operatingExpenses}
      invoiceEntries={invoiceEntries}
      incomeEntries={incomeEntries}
      quoteEntries={quoteEntries}
      expenseEntries={expenseEntries}
      pagination={{
        invPage,
        quotePage,
        payPage,
        expPage,
        pageSize: PAGE_SIZE,
      }}
    />
  );
}
