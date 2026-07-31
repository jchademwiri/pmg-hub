import { Metadata } from 'next';
import Link from 'next/link';
import { getSASTParts } from '@/lib/format';
import {
  getAnalysisOverview,
  getDivisionQuotesMetrics,
  getThreeYearYoYComparison,
  getThreeYearMonthlyRevenue,
  getClientConcentration,
  getMonthlyFinancialsBreakdownForYear,
} from '@pmg/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';
import { AnalysisKpiStrip } from '@/components/analysis/analysis-kpi-strip';
import { RevenueTrendChart } from '@/components/analysis/revenue-trend-chart';
import { DivisionPerformanceChart } from '@/components/analysis/division-performance-chart';
import { YoYComparisonTable } from '@/components/analysis/yoy-comparison-table';
import { ClientConcentrationTable } from '@/components/analysis/client-concentration-table';
import { MonthlyGrowthChart } from '@/components/analysis/monthly-growth-chart';
import { MoMComparisonTable } from '@/components/analysis/mom-comparison-table';
import { AnalysisTabs } from '@/components/analysis/analysis-tabs';
import { formatZAR } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Business Analysis | PMG Hub',
};

export default async function AnalysisPage(props: {
  searchParams: Promise<{ year?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { year, month, day } = getSASTParts();
  
  // Default to current financial year
  let defaultYear = year;
  if (month < 2) defaultYear = year - 1;

  const parsedYear = searchParams.year ? parseInt(searchParams.year, 10) : defaultYear;
  const selectedYear = Number.isFinite(parsedYear) && !Number.isNaN(parsedYear) ? parsedYear : defaultYear;

  // Use current date string for YTD calculations
  const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Parallel data fetching
  const [
    overviewResult,
    divisionMetricsResult,
    yoyComparisonResult,
    monthlyRevenueResult,
    clientConcentrationResult,
    momBreakdownResult,
  ] = await Promise.allSettled([
    getAnalysisOverview(selectedYear, currentDateStr),
    getDivisionQuotesMetrics(selectedYear),
    getThreeYearYoYComparison(selectedYear),
    getThreeYearMonthlyRevenue(selectedYear),
    getClientConcentration(selectedYear),
    getMonthlyFinancialsBreakdownForYear(selectedYear),
  ]);

  if (overviewResult.status === 'rejected') console.error('Overview error:', overviewResult.reason);
  if (divisionMetricsResult.status === 'rejected') console.error('Division metrics error:', divisionMetricsResult.reason);
  if (yoyComparisonResult.status === 'rejected') console.error('YoY comparison error:', yoyComparisonResult.reason);
  if (monthlyRevenueResult.status === 'rejected') console.error('Monthly revenue error:', monthlyRevenueResult.reason);
  if (clientConcentrationResult.status === 'rejected') console.error('Client concentration error:', clientConcentrationResult.reason);
  if (momBreakdownResult.status === 'rejected') console.error('MoM breakdown error:', momBreakdownResult.reason);

  const overview = overviewResult.status === 'fulfilled' ? overviewResult.value : {
    ytd: { currentRevenue: 0, priorRevenue: 0, growthRatePercent: 0 },
    averages: { currentAvgInvoice: 0, priorAvgInvoice: 0, currentAvgTransaction: 0 },
    pipeline: { outstandingAR: 0, pendingQuotes: 0, acceptedQuotes: 0, totalPotential: 0 }
  };
  const divisionMetrics = divisionMetricsResult.status === 'fulfilled' ? divisionMetricsResult.value : [];
  const yoyComparison = yoyComparisonResult.status === 'fulfilled' ? yoyComparisonResult.value : [];
  const monthlyRevenue = monthlyRevenueResult.status === 'fulfilled' ? monthlyRevenueResult.value : [];
  const clientConcentration = clientConcentrationResult.status === 'fulfilled' ? clientConcentrationResult.value : [];
  const momBreakdown = momBreakdownResult.status === 'fulfilled' ? momBreakdownResult.value : [];
  const monthlyGrowth = momBreakdown.map((r) => ({
    month: r.period,
    received: r.received,
    invoiced: r.invoiced,
  }));

  return (
    <div className="flex flex-col gap-6">
      <StickyPageHeader
        title="Business Growth Analysis"
        description={`Analyzing Financial Year ${selectedYear} (Mar 1 - Feb 28)`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-medium">Select Year:</div>
            <div className="flex gap-2 flex-wrap">
              {[selectedYear + 1, selectedYear, selectedYear - 1, selectedYear - 2].map(y => (
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
        <TabsList className="mb-4 flex w-full justify-start overflow-x-auto overflow-y-hidden lg:grid lg:w-[800px] lg:grid-cols-5 h-auto hide-scrollbar border border-border/50">
          <TabsTrigger value="overview" className="flex-1 min-w-[120px]">Overview</TabsTrigger>
          <TabsTrigger value="details" className="flex-1 min-w-[120px]">Growth Trend</TabsTrigger>
          <TabsTrigger value="pipeline" className="flex-1 min-w-[150px]">Divisions & Pipeline</TabsTrigger>
          <TabsTrigger value="clients" className="flex-1 min-w-[120px]">Clients</TabsTrigger>
          <TabsTrigger value="comparison" className="flex-1 min-w-[140px]">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AnalysisKpiStrip overview={overview} />
          
          <Card>
            <CardHeader>
              <CardTitle>3-Year Revenue Trend</CardTitle>
              <CardDescription>Monthly cash income overlaid across previous financial years.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <RevenueTrendChart data={monthlyRevenue} currentYear={selectedYear} currentMonth={month + 1} sastYear={year} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Month-over-Month Growth</CardTitle>
              <CardDescription>
                How invoiced revenue and payments received are trending, month to month, across FY {selectedYear}.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <MonthlyGrowthChart data={monthlyGrowth} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Outstanding (AR)</CardTitle>
                <CardDescription>Issued & unpaid invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatZAR(overview.pipeline.outstandingAR)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accepted Quotes</CardTitle>
                <CardDescription>Won but uninvoiced</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">
                  {formatZAR(overview.pipeline.acceptedQuotes)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Quotes</CardTitle>
                <CardDescription>Deals in negotiation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">
                  {formatZAR(overview.pipeline.pendingQuotes)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Division Performance</CardTitle>
              <CardDescription>Actual income vs quotes generated per division</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <DivisionPerformanceChart data={divisionMetrics} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle>Client Concentration</CardTitle>
              <CardDescription>Income, invoiced amounts, and profit distribution across your client base for FY {selectedYear}.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ClientConcentrationTable data={clientConcentration} className="border-0 shadow-none rounded-none" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle>Month-to-Month Comparison (FY {selectedYear})</CardTitle>
              <CardDescription>Detailed monthly breakdown of invoiced revenue, cash income, expenses, and net profit for the current financial year.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <MoMComparisonTable data={momBreakdown} year={selectedYear} className="border-0 shadow-none rounded-none" />
            </CardContent>
          </Card>

          <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle>3-Year Comparison (YoY)</CardTitle>
              <CardDescription>Side-by-side metric comparison for the last three financial years.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <YoYComparisonTable data={yoyComparison} className="border-0 shadow-none rounded-none" />
            </CardContent>
          </Card>
        </TabsContent>
      </AnalysisTabs>
    </div>
  );
}

