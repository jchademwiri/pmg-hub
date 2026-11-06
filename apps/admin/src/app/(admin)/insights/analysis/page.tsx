import { Metadata } from 'next';
import Link from 'next/link';
import { getSASTParts } from '@/lib/format';
import {
  getAnalysisOverview,
  getThreeYearYoYComparison,
  getThreeYearMonthlyRevenue,
  getClientConcentration,
  getMonthlyFinancialsBreakdownForYear,
  getAllSnapshotsWithOpenMonths,
  getActiveRates,
  getProfitAndLossByDivision,
  getOrganisationSettings,
} from '@pmg/db';
import {
  getMonthlyFinancialsSeriesForYear,
  getBudgetChartSeriesForYear,
  getLedgerBalances,
} from '@/lib/financial';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';
import { AnalysisKpiStrip } from '@/components/analysis/analysis-kpi-strip';
import { RevenueTrendChart } from '@/components/analysis/revenue-trend-chart';
import { YoYComparisonTable } from '@/components/analysis/yoy-comparison-table';
import { ClientConcentrationTable } from '@/components/analysis/client-concentration-table';
import { MoMComparisonTable } from '@/components/analysis/mom-comparison-table';
import { AnalysisTabs } from '@/components/analysis/analysis-tabs';
import { AnalysisProfitTab } from '@/components/analysis/analysis-profit-tab';
import { SnapshotsCockpit } from '@/components/insights/snapshots-cockpit';
import { ReportDocumentCanvas } from '@/components/accounting/report-document-canvas';
import { DollarSign, Camera, Building2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Business Analysis | PMG Hub',
};

export default async function AnalysisPage(props: { searchParams: Promise<{ year?: string }> }) {
  const searchParams = await props.searchParams;
  const { year, month, day } = getSASTParts();

  // Default to current financial year
  let defaultYear = year;
  if (month < 2) defaultYear = year - 1;

  const parsedYear = searchParams.year ? parseInt(searchParams.year, 10) : defaultYear;
  const selectedYear =
    Number.isFinite(parsedYear) && !Number.isNaN(parsedYear) ? parsedYear : defaultYear;

  // Use current date string for YTD calculations
  const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const currentPeriod = `${year}-${String(month + 1).padStart(2, '0')}`;

  // Parallel data fetching
  const [
    overviewResult,
    yoyComparisonResult,
    monthlyRevenueResult,
    clientConcentrationResult,
    momBreakdownResult,
    monthlyFinancialsResult,
    budgetChartResult,
    ledgerBalancesResult,
    activeRatesResult,
    snapshotsResult,
    divisionPnlResult,
    orgSettingsResult,
  ] = await Promise.allSettled([
    getAnalysisOverview(selectedYear, currentDateStr),
    getThreeYearYoYComparison(selectedYear),
    getThreeYearMonthlyRevenue(selectedYear),
    getClientConcentration(selectedYear),
    getMonthlyFinancialsBreakdownForYear(selectedYear),
    getMonthlyFinancialsSeriesForYear(selectedYear),
    getBudgetChartSeriesForYear(selectedYear),
    getLedgerBalances(),
    getActiveRates(),
    getAllSnapshotsWithOpenMonths(),
    getProfitAndLossByDivision(undefined, `${selectedYear}-01-01`, `${selectedYear}-12-31`),
    getOrganisationSettings(),
  ]);

  if (overviewResult.status === 'rejected') console.error('Overview error:', overviewResult.reason);
  if (yoyComparisonResult.status === 'rejected')
    console.error('YoY comparison error:', yoyComparisonResult.reason);
  if (monthlyRevenueResult.status === 'rejected')
    console.error('Monthly revenue error:', monthlyRevenueResult.reason);
  if (clientConcentrationResult.status === 'rejected')
    console.error('Client concentration error:', clientConcentrationResult.reason);
  if (momBreakdownResult.status === 'rejected')
    console.error('MoM breakdown error:', momBreakdownResult.reason);
  if (monthlyFinancialsResult.status === 'rejected')
    console.error('Monthly financials error:', monthlyFinancialsResult.reason);
  if (budgetChartResult.status === 'rejected')
    console.error('Budget chart series error:', budgetChartResult.reason);
  if (ledgerBalancesResult.status === 'rejected')
    console.error('Ledger balances error:', ledgerBalancesResult.reason);
  if (snapshotsResult.status === 'rejected')
    console.error('Snapshots error:', snapshotsResult.reason);
  if (divisionPnlResult.status === 'rejected')
    console.error('Division PnL error:', divisionPnlResult.reason);
  if (orgSettingsResult.status === 'rejected')
    console.error('Org settings error:', orgSettingsResult.reason);

  const overview =
    overviewResult.status === 'fulfilled'
      ? overviewResult.value
      : {
          ytd: { currentRevenue: 0, priorRevenue: 0, growthRatePercent: 0 },
          averages: { currentAvgInvoice: 0, priorAvgInvoice: 0, currentAvgTransaction: 0 },
          pipeline: { outstandingAR: 0, pendingQuotes: 0, acceptedQuotes: 0, totalPotential: 0 },
        };
  const yoyComparison = yoyComparisonResult.status === 'fulfilled' ? yoyComparisonResult.value : [];
  const monthlyRevenue =
    monthlyRevenueResult.status === 'fulfilled' ? monthlyRevenueResult.value : [];
  const clientConcentration =
    clientConcentrationResult.status === 'fulfilled' ? clientConcentrationResult.value : [];
  const momBreakdown = momBreakdownResult.status === 'fulfilled' ? momBreakdownResult.value : [];

  const monthlyFinancials =
    monthlyFinancialsResult.status === 'fulfilled' ? monthlyFinancialsResult.value : [];
  const totalRevenue = monthlyFinancials.reduce((sum, m) => sum + m.revenue, 0);
  const totalExpenses = monthlyFinancials.reduce((sum, m) => sum + m.expenses, 0);
  const pmgShareRate =
    activeRatesResult.status === 'fulfilled' ? (activeRatesResult.value?.pmg_share ?? 0.25) : 0.25;
  const totalProfitPool = totalRevenue - totalExpenses;
  const totalPmgShare = Math.max(0, totalProfitPool) * pmgShareRate;
  const ledgerBalances =
    ledgerBalancesResult.status === 'fulfilled' ? ledgerBalancesResult.value : undefined;
  const snapshots = snapshotsResult.status === 'fulfilled' ? snapshotsResult.value : [];
  const divisionPnl = divisionPnlResult.status === 'fulfilled' ? divisionPnlResult.value : [];
  const orgSettings = orgSettingsResult.status === 'fulfilled' ? orgSettingsResult.value : null;

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title="Business Growth Analysis"
        description={`Analyzing Financial Year ${selectedYear} (Mar 1 - Feb 28)`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-medium">Select Year:</div>
            <div className="flex gap-2 flex-wrap">
              {[selectedYear + 1, selectedYear, selectedYear - 1, selectedYear - 2].map((y) => (
                <Link
                  key={y}
                  href={`/insights/analysis?year=${y}`}
                  className={`px-3 py-1 text-sm rounded-md border ${
                    y === selectedYear
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          </div>
        }
      />

      <AnalysisTabs defaultTab="overview">
        {/* Sticky tabs navigation bar */}
        <div className="sticky top-[3.25rem] z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-2.5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border/40 mb-6">
          <TabsList className="flex w-full justify-start overflow-x-auto overflow-y-hidden h-auto hide-scrollbar border border-border/50 p-1 gap-1">
            <TabsTrigger value="overview" className="shrink-0 min-w-[100px]">
              Overview
            </TabsTrigger>
            <TabsTrigger value="profit" className="shrink-0 min-w-[110px] gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Net Profit
            </TabsTrigger>
            <TabsTrigger value="snapshots" className="shrink-0 min-w-[110px] gap-1.5">
              <Camera className="h-3.5 w-3.5" /> Snapshots
            </TabsTrigger>
            <TabsTrigger value="divisions" className="shrink-0 min-w-[110px] gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Divisions
            </TabsTrigger>
            <TabsTrigger value="clients" className="shrink-0 min-w-[100px]">
              Clients
            </TabsTrigger>
            <TabsTrigger value="mom" className="shrink-0 min-w-[140px]">
              Month-over-Month
            </TabsTrigger>
            <TabsTrigger value="yoy" className="shrink-0 min-w-[140px]">
              3-Year Comparison
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Overview Tab ───────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          <AnalysisKpiStrip overview={overview} />

          <Card>
            <CardHeader>
              <CardTitle>3-Year Revenue Trend</CardTitle>
              <CardDescription>
                Monthly cash income overlaid across previous financial years.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <RevenueTrendChart
                data={monthlyRevenue}
                currentYear={selectedYear}
                currentMonth={month + 1}
                sastYear={year}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Net Profit Tab ─────────────────────────────────────────────── */}
        <TabsContent value="profit" className="space-y-6">
          <AnalysisProfitTab
            revenue={totalRevenue}
            expenses={totalExpenses}
            pmgShare={totalPmgShare}
            profitPool={totalProfitPool}
            ledgerBalances={ledgerBalances}
            monthlyFinancials={monthlyFinancials}
            currentPeriod={currentPeriod}
          />
        </TabsContent>

        {/* ── Snapshots Tab ──────────────────────────────────────────────── */}
        <TabsContent value="snapshots" className="space-y-6">
          <SnapshotsCockpit snapshots={snapshots} />
        </TabsContent>

        {/* ── Divisions Tab (Division Performance from Financial Reports) ── */}
        <TabsContent value="divisions" className="space-y-6">
          <ReportDocumentCanvas
            reportType="division-performance"
            reportTitle="Division Performance"
            divisionName="All Divisions"
            periodLabel={`Year ${selectedYear}`}
            dateRangeLabel={`01 Jan ${selectedYear} - 31 Dec ${selectedYear}`}
            orgSettings={orgSettings}
            data={{ divisions: divisionPnl }}
            loading={false}
          />
        </TabsContent>

        {/* ── Clients Tab ────────────────────────────────────────────────── */}
        <TabsContent value="clients" className="space-y-6">
          <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle>Client Concentration</CardTitle>
              <CardDescription>
                Income, invoiced amounts, and profit distribution across your client base for FY{' '}
                {selectedYear}.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ClientConcentrationTable
                data={clientConcentration}
                className="border-0 shadow-none rounded-none"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Month-over-Month Tab ───────────────────────────────────────── */}
        <TabsContent value="mom" className="space-y-6">
          <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle>Month-to-Month Comparison (FY {selectedYear})</CardTitle>
              <CardDescription>
                Detailed monthly breakdown of invoiced revenue, cash income, expenses, and net
                profit for the current financial year.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <MoMComparisonTable
                data={momBreakdown}
                year={selectedYear}
                className="border-0 shadow-none rounded-none"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 3-Year Comparison Tab (YoY) ────────────────────────────────── */}
        <TabsContent value="yoy" className="space-y-6">
          <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle>3-Year Comparison (YoY)</CardTitle>
              <CardDescription>
                Side-by-side metric comparison for the last three financial years.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <YoYComparisonTable
                data={yoyComparison}
                className="border-0 shadow-none rounded-none"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </AnalysisTabs>
    </div>
  );
}
