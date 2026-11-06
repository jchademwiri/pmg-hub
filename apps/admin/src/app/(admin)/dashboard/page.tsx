import type { Metadata } from 'next';
import {
  getCurrentMonthSummary,
  getPreviousMonthSummary,
  getYTDSummary,
  getPreviousYearYTDSummary,
  getDivisionRevenue,
  getDivisionAR,
  getDivisionInvoiced,
  getMonthlyFinancialsSeries,
  getBudgetChartSeriesForYear,
  getMoMChartData,
  getExpensesByDivision,
  getCurrentMonthLabel,
  getPreviousMonthLabel,
  getYTDLabel,
} from '@/lib/financial';
import { getSnapshotByPeriod, getAgingReport, getActiveRates } from '@pmg/db';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { getSASTParts } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { year, month } = getSASTParts();
  const fiscalYear = month < 2 ? year - 1 : year;

  // The period to close is ALWAYS the previous month, not the current one
  const prevDate = new Date(year, month - 1, 1);
  const periodToClose = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const [
    ytdSummary,
    previousYearYTDSummary,
    currentMonthSummary,
    previousMonthSummary,
    divisions,
    arByDivision,
    invoicedByDivision,
    monthlySeries,
    agingReport,
    budgetChartSeries,
    momData,
    expensesByDivision,
    currentPeriodSnapshot,
    activeRates,
  ] = await Promise.all([
    getYTDSummary(),
    getPreviousYearYTDSummary(),
    getCurrentMonthSummary(),
    getPreviousMonthSummary(),
    getDivisionRevenue(),
    getDivisionAR(),
    getDivisionInvoiced(),
    getMonthlyFinancialsSeries(),
    getAgingReport(),
    getBudgetChartSeriesForYear(fiscalYear),
    getMoMChartData(),
    getExpensesByDivision(),
    getSnapshotByPeriod(periodToClose),
    getActiveRates().catch(() => ({ pmg_share: 0.25 })),
  ]);

  const pmgShareRate = activeRates?.pmg_share ?? 0.25;

  const labels = {
    current: getCurrentMonthLabel(),
    previous: getPreviousMonthLabel(),
    ytd: getYTDLabel(),
  };

  const hasSnapshot = currentPeriodSnapshot !== null;
  const showCloseMonthButton = !hasSnapshot;

  // Build MoM deltas (current vs previous month)
  const revenueSnap = momData.find((d) => d.metric === 'Revenue');
  const expenseSnap = momData.find((d) => d.metric === 'Expenses');
  const profitSnap = momData.find((d) => d.metric === 'Profit Pool');

  const deltas = {
    revenue: revenueSnap ? { current: revenueSnap.current, previous: revenueSnap.previous } : null,
    expenses: expenseSnap ? { current: expenseSnap.current, previous: expenseSnap.previous } : null,
    profit: profitSnap ? { current: profitSnap.current, previous: profitSnap.previous } : null,
  };

  return (
    <DashboardShell
      // Period summaries
      ytdSummary={ytdSummary}
      previousYearYTDSummary={previousYearYTDSummary}
      currentMonthSummary={currentMonthSummary}
      previousMonthSummary={previousMonthSummary}
      labels={labels}
      deltas={deltas}
      // Supporting data
      divisions={divisions}
      arByDivision={arByDivision}
      invoicedByDivision={invoicedByDivision}
      monthlySeries={monthlySeries}
      sparklineData={monthlySeries.slice(-6)}
      agingReport={agingReport}
      budgetChartSeries={budgetChartSeries}
      expensesByDivision={expensesByDivision}
      // Snapshot
      currentPeriod={periodToClose}
      hasSnapshot={hasSnapshot}
      showCloseMonthButton={showCloseMonthButton}
      pmgShareRate={pmgShareRate}
    />
  );
}
