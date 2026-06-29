import type { Metadata } from 'next';
import {
  getCurrentMonthSummary,
  getPreviousMonthSummary,
  getYTDSummary,
  getPreviousYearYTDSummary,
  getDivisionRevenue,
  getLeadCounts,
  getMonthlyFinancialsSeries,
  getBudgetChartSeriesForYear,
  getMoMChartData,
  getExpensesByDivision,
  getCurrentMonthLabel,
  getPreviousMonthLabel,
  getYTDLabel,
} from '@/lib/financial';
import { getSnapshotByPeriod, getAgingReport, getProjectScheduleSummary, getActiveRates } from '@pmg/db';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { getSASTParts } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { year, month, day: dayOfMonth } = getSASTParts();
  const fiscalYear = month < 2 ? year - 1 : year;

  // Close Month button is only shown between the 1st and 5th of the month
  const showCloseMonthButton = dayOfMonth >= 1 && dayOfMonth <= 5;

  // The period to close is ALWAYS the previous month, not the current one
  const prevDate = new Date(year, month - 1, 1);
  const periodToClose = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const [
    ytdSummary,
    previousYearYTDSummary,
    currentMonthSummary,
    previousMonthSummary,
    divisions,
    leads,
    monthlySeries,
    agingReport,
    budgetChartSeries,
    momData,
    expensesByDivision,
    currentPeriodSnapshot,
    projectScheduleSummary,
    activeRates,
  ] = await Promise.all([
    getYTDSummary(),
    getPreviousYearYTDSummary(),
    getCurrentMonthSummary(),
    getPreviousMonthSummary(),
    getDivisionRevenue(),
    getLeadCounts(),
    getMonthlyFinancialsSeries(),
    getAgingReport(),
    getBudgetChartSeriesForYear(fiscalYear),
    getMoMChartData(),
    getExpensesByDivision(),
    getSnapshotByPeriod(periodToClose),
    getProjectScheduleSummary(),
    getActiveRates().catch(() => ({ pmg_share: 0.25 })),
  ]);

  const pmgShareRate = activeRates?.pmg_share ?? 0.25;

  const labels = {
    current: getCurrentMonthLabel(),
    previous: getPreviousMonthLabel(),
    ytd: getYTDLabel(),
  };

  const hasSnapshot = currentPeriodSnapshot !== null;

  // Build MoM deltas (current vs previous month)
  const revenueSnap = momData.find((d) => d.metric === 'Revenue');
  const expenseSnap = momData.find((d) => d.metric === 'Expenses');
  const profitSnap = momData.find((d) => d.metric === 'Profit Pool');

  const deltas = {
    revenue: revenueSnap ? { current: revenueSnap.current, previous: revenueSnap.previous } : null,
    expenses: expenseSnap ? { current: expenseSnap.current, previous: expenseSnap.previous } : null,
    profit: profitSnap ? { current: profitSnap.current, previous: profitSnap.previous } : null,
  };

  // Build division expense map for the division revenue card
  const divisionExpenseMap = new Map(expensesByDivision.map((d) => [d.divisionName, d.total]));

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
      divisionExpenseMap={Object.fromEntries(divisionExpenseMap)}
      leads={leads}
      monthlySeries={monthlySeries}
      sparklineData={monthlySeries.slice(-6)}
      agingReport={agingReport}
      budgetChartSeries={budgetChartSeries}
      expensesByDivision={expensesByDivision}
      // Snapshot
      currentPeriod={periodToClose}
      hasSnapshot={hasSnapshot}
      showCloseMonthButton={showCloseMonthButton}
      projectScheduleSummary={projectScheduleSummary}
      pmgShareRate={pmgShareRate}
    />
  );
}
