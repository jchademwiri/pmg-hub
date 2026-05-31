import type { Metadata } from 'next';
import {
  getFinancialSummary,
  getCurrentMonthSummary,
  getPreviousMonthSummary,
  getYTDSummary,
  getPreviousYearYTDSummary,
  getDivisionRevenue,
  getLeadCounts,
  getMonthlyFinancialsSeries,
  getAllDivisionSeriesData,
  getMoMChartData,
  getExpensesByDivision,
  getCurrentMonthLabel,
  getPreviousMonthLabel,
  getYTDLabel,
} from '@/lib/financial';
import { getSnapshotByPeriod, getAgingReport } from '@pmg/db';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { getSASTParts } from '@/lib/date-rules';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const { year, month, day: dayOfMonth } = getSASTParts();

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
    divisionSeriesData,
    momData,
    expensesByDivision,
    currentPeriodSnapshot,
  ] = await Promise.all([
    getYTDSummary(),
    getPreviousYearYTDSummary(),
    getCurrentMonthSummary(),
    getPreviousMonthSummary(),
    getDivisionRevenue(),
    getLeadCounts(),
    getMonthlyFinancialsSeries(),
    getAgingReport(),
    getAllDivisionSeriesData(),
    getMoMChartData(),
    getExpensesByDivision(),
    getSnapshotByPeriod(periodToClose),
  ]);

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
      divisionSeriesData={divisionSeriesData}
      expensesByDivision={expensesByDivision}
      // Snapshot
      currentPeriod={periodToClose}
      hasSnapshot={hasSnapshot}
      showCloseMonthButton={showCloseMonthButton}
    />
  );
}
