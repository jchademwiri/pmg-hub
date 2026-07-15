import { Metadata } from 'next';
import Link from 'next/link';
import { getSASTParts } from '@/lib/format';
import { 
  getAnalysisOverview, 
  getDivisionQuotesMetrics, 
  getThreeYearYoYComparison, 
  getThreeYearMonthlyRevenue,
  getClientConcentration
} from '@pmg/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StickyPageHeader } from '@/components/ui/sticky-page-header';
import { AnalysisKpiStrip } from '@/components/analysis/analysis-kpi-strip';
import { RevenueTrendChart } from '@/components/analysis/revenue-trend-chart';
import { DivisionPerformanceChart } from '@/components/analysis/division-performance-chart';
import { YoYComparisonTable } from '@/components/analysis/yoy-comparison-table';
import { ClientConcentrationTable } from '@/components/analysis/client-concentration-table';
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
  ] = await Promise.allSettled([
    getAnalysisOverview(selectedYear, currentDateStr),
    getDivisionQuotesMetrics(selectedYear),
    getThreeYearYoYComparison(selectedYear),
    getThreeYearMonthlyRevenue(selectedYear),
    getClientConcentration(selectedYear),
  ]);

  if (overviewResult.status === 'rejected') console.error('Overview error:', overviewResult.reason);
  if (divisionMetricsResult.status === 'rejected') console.error('Division metrics error:', divisionMetricsResult.reason);
  if (yoyComparisonResult.status === 'rejected') console.error('YoY comparison error:', yoyComparisonResult.reason);
  if (monthlyRevenueResult.status === 'rejected') console.error('Monthly revenue error:', monthlyRevenueResult.reason);
  if (clientConcentrationResult.status === 'rejected') console.error('Client concentration error:', clientConcentrationResult.reason);

  const overview = overviewResult.status === 'fulfilled' ? overviewResult.value : {
    ytd: { currentRevenue: 0, priorRevenue: 0, growthRatePercent: 0 },
    averages: { currentAvgInvoice: 0, priorAvgInvoice: 0, currentAvgTransaction: 0 },
    pipeline: { outstandingAR: 0, pendingQuotes: 0, acceptedQuotes: 0, totalPotential: 0 }
  };
  const divisionMetrics = divisionMetricsResult.status === 'fulfilled' ? divisionMetricsResult.value : [];
  const yoyComparison = yoyComparisonResult.status === 'fulfilled' ? yoyComparisonResult.value : [];
  const monthlyRevenue = monthlyRevenueResult.status === 'fulfilled' ? monthlyRevenueResult.value : [];
  const clientConcentration = clientConcentrationResult.status === 'fulfilled' ? clientConcentrationResult.value : [];

  return (
    <div className="flex w-full flex-col">
      <StickyPageHeader
        title="Business Growth Analysis"
        description={`Analyzing Financial Year ${selectedYear} (Mar 1 - Feb 28)`}
        actions={
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Select Year:</div>
            <div className="flex gap-2">
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

      <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
        <AnalysisTabs defaultTab="overview">
          <TabsList className="mb-4 grid w-full grid-cols-2 md:grid-cols-3 lg:w-[800px] lg:grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Invoice Details</TabsTrigger>
            <TabsTrigger value="pipeline">Divisions & Pipeline</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="comparison">YoY Compare</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AnalysisKpiStrip overview={overview} />
            
            <Card>
              <CardHeader>
                <CardTitle>3-Year Revenue Trend</CardTitle>
                <CardDescription>Monthly cash income overlaid across previous financial years.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <RevenueTrendChart data={monthlyRevenue} currentYear={selectedYear} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Average Invoice Value</CardTitle>
                  <CardDescription>Historical size of client bills</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{formatZAR(overview.averages.currentAvgInvoice)}</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Prior FY: {formatZAR(overview.averages.priorAvgInvoice)}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Average Income Transaction</CardTitle>
                  <CardDescription>Average cash receipt size</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{formatZAR(overview.averages.currentAvgTransaction)}</div>
                </CardContent>
              </Card>
            </div>
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
            <Card>
              <CardHeader>
                <CardTitle>Client Concentration</CardTitle>
                <CardDescription>Income and profit distribution across your client base for FY {selectedYear}.</CardDescription>
              </CardHeader>
              <CardContent>
                <ClientConcentrationTable data={clientConcentration} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>3-Year Comparison</CardTitle>
                <CardDescription>Side-by-side metric comparison for the last three years.</CardDescription>
              </CardHeader>
              <CardContent>
                <YoYComparisonTable data={yoyComparison} />
              </CardContent>
            </Card>
          </TabsContent>
        </AnalysisTabs>
      </div>
    </div>
  );
}
