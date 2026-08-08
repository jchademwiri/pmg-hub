'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Download, Printer, BookOpen, FileText, Table2, Scale, TrendingUp, Building2, Landmark, Banknote, Calendar, Filter, Layers, ShieldCheck, Users, LayoutDashboard, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fmtMonthYear, formatZAR } from '@/lib/format';
import type { ChartAccount } from '@pmg/db';
import { ReportDocumentCanvas } from '@/components/accounting/report-document-canvas';
import { fetchReportPreviewData } from '@/app/actions/reports-data-actions';

interface ReportsClientProps {
  periods: string[];
  accounts: ChartAccount[];
  divisions: { id: string; name: string }[];
  selectedPeriod: string;
}

type ReportType =
  | 'overview'
  | 'annual-financial-statements'
  | 'balance-sheet'
  | 'profit-and-loss'
  | 'cash-flow'
  | 'changes-in-equity'
  | 'division-performance'
  | 'client-performance'
  | 'trial-balance'
  | 'journal-entries'
  | 'general-ledger'
  | 'chart-of-accounts';

interface ReportConfig {
  id: ReportType;
  label: string;
  description: string;
  icon: any;
  needsPeriod: boolean;
  needsAccount: boolean;
  needsDivision: boolean;
  supportsDateRange: boolean;
}

const REPORT_TYPES: ReportConfig[] = [
  {
    id: 'overview',
    label: 'Overview Dashboard',
    description: 'Financial reports hub, core statements overview, and quick access cards',
    icon: LayoutDashboard,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: false,
  },
  {
    id: 'annual-financial-statements',
    label: 'AFS',
    description: 'Full CIPC-compliant AFS package: Directors Report, Position, Income, Equity, Cash Flows & Notes',
    icon: ShieldCheck,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: false,
  },
  {
    id: 'balance-sheet',
    label: 'Financial Position',
    description: 'Statement of Financial Position: Assets, Liabilities & Equity',
    icon: Landmark,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: true,
  },
  {
    id: 'profit-and-loss',
    label: 'Income Statement',
    description: 'Statement of Comprehensive Income: Revenue, Expenses & Net Operating Profit',
    icon: TrendingUp,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: true,
  },
  {
    id: 'cash-flow',
    label: 'Cash Flows',
    description: 'Statement of Cash Flows: Operating collections, expenses & cash movements',
    icon: Banknote,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: true,
  },
  {
    id: 'changes-in-equity',
    label: 'Changes in Equity',
    description: 'Statement of Changes in Equity: Share capital & retained earnings movements',
    icon: Scale,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: false,
  },
  {
    id: 'division-performance',
    label: 'Division Performance',
    description: 'Division cash flow, revenue, cash collected, AR, expenses & margin %',
    icon: Building2,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: true,
  },
  {
    id: 'client-performance',
    label: 'Client Performance',
    description: 'Client billing, revenue, cash collected, AR balance & collection margin %',
    icon: Users,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: false,
    supportsDateRange: true,
  },
  {
    id: 'trial-balance',
    label: 'Trial Balance',
    description: 'Account balances summary verifying debits and credits equality',
    icon: Scale,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: true,
  },
  {
    id: 'general-ledger',
    label: 'General Ledger',
    description: 'Detailed transaction line items organized by date and account',
    icon: Table2,
    needsPeriod: true,
    needsAccount: true,
    needsDivision: true,
    supportsDateRange: true,
  },
  {
    id: 'journal-entries',
    label: 'Journal Entries',
    description: 'All posted double-entry journal entries with debits & credits',
    icon: FileText,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: true,
  },
  {
    id: 'chart-of-accounts',
    label: 'Chart of Accounts',
    description: 'Complete list of all account categories, codes, and types',
    icon: BookOpen,
    needsPeriod: false,
    needsAccount: false,
    needsDivision: false,
    supportsDateRange: false,
  },
];

export function ReportsClient({ periods, accounts, divisions, selectedPeriod }: ReportsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlType = searchParams.get('type') as ReportType | null;
  const urlPeriod = searchParams.get('period');
  const urlDivisionId = searchParams.get('divisionId');
  const urlAccountId = searchParams.get('accountId');
  const urlStartDate = searchParams.get('startDate');
  const urlEndDate = searchParams.get('endDate');

  const validReportTypes: ReportType[] = [
    'overview',
    'annual-financial-statements',
    'balance-sheet',
    'profit-and-loss',
    'cash-flow',
    'changes-in-equity',
    'division-performance',
    'client-performance',
    'trial-balance',
    'journal-entries',
    'general-ledger',
    'chart-of-accounts',
  ];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentFyYear = currentMonth >= 3 ? currentYear + 1 : currentYear;
  const defaultFinancialYear = `${currentFyYear}-FY`;

  const initialReport: ReportType = urlType && validReportTypes.includes(urlType) ? urlType : 'overview';

  const [selectedReport, setSelectedReportState] = React.useState<ReportType>(initialReport);
  const [period, setPeriodState] = React.useState<string>(urlPeriod || selectedPeriod || defaultFinancialYear);
  const [startDate, setStartDateState] = React.useState<string>(urlStartDate || '');
  const [endDate, setEndDateState] = React.useState<string>(urlEndDate || '');
  const [accountId, setAccountIdState] = React.useState<string>(urlAccountId || 'all');
  const [divisionId, setDivisionIdState] = React.useState<string>(urlDivisionId || 'all');

  const updateUrl = React.useCallback(
    (paramsToUpdate: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(paramsToUpdate).forEach(([key, val]) => {
        if (val && val !== 'all') {
          params.set(key, val);
        } else {
          params.delete(key);
        }
      });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const setSelectedReport = (r: ReportType) => {
    setSelectedReportState(r);
    updateUrl({ type: r === 'overview' ? undefined : r, period, divisionId, accountId, startDate, endDate });
  };

  const setPeriod = (p: string) => {
    setPeriodState(p);
    updateUrl({ type: selectedReport, period: p, divisionId, accountId, startDate, endDate });
  };

  const setDivisionId = (d: string) => {
    setDivisionIdState(d);
    updateUrl({ type: selectedReport, period, divisionId: d, accountId, startDate, endDate });
  };

  const setAccountId = (a: string) => {
    setAccountIdState(a);
    updateUrl({ type: selectedReport, period, divisionId, accountId: a, startDate, endDate });
  };

  const setStartDate = (s: string) => {
    setStartDateState(s);
    updateUrl({ type: selectedReport, period, divisionId, accountId, startDate: s, endDate });
  };

  const setEndDate = (e: string) => {
    setEndDateState(e);
    updateUrl({ type: selectedReport, period, divisionId, accountId, startDate, endDate: e });
  };

  const [previewData, setPreviewData] = React.useState<any>(null);
  const [orgSettings, setOrgSettings] = React.useState<any>(null);
  const [loading, setLoading] = React.useState<boolean>(false);

  const reportConfig = REPORT_TYPES.find((r) => r.id === selectedReport) || REPORT_TYPES[3];

  // Fetch live preview data whenever report type or filters change
  const loadPreview = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReportPreviewData({
        reportType: selectedReport,
        period,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        divisionId,
        accountId,
      });

      if (res.success) {
        setPreviewData(res.data);
        if (res.orgSettings) setOrgSettings(res.orgSettings);
      }
    } catch (err) {
      console.error('Failed to load report preview:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedReport, period, startDate, endDate, divisionId, accountId]);

  React.useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // Handle PDF Export download link
  function handleDownloadPdf() {
    const exportType = selectedReport === 'overview' ? 'annual-financial-statements' : selectedReport;
    const params = new URLSearchParams();
    if (reportConfig.needsPeriod && period !== 'all') params.set('period', period);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (reportConfig.needsAccount && accountId !== 'all') params.set('accountId', accountId);
    if (reportConfig.needsDivision && divisionId !== 'all') params.set('divisionId', divisionId);

    const url = `/api/accounting/export/${exportType}?${params.toString()}`;
    window.open(url, '_blank');
  }

  // Handle Print trigger
  function handlePrint() {
    window.print();
  }

  const selectedDivisionName = divisionId !== 'all' 
    ? (divisions.find((d) => d.id === divisionId)?.name ?? 'All Divisions')
    : 'All Divisions';

  let periodDisplay = 'All Time';
  if (period && period !== 'all') {
    if (period.endsWith('-FY')) periodDisplay = `Annual FY${period.substring(0, 4)}`;
    else if (period.endsWith('-H1')) periodDisplay = `Bi-Annual ${period.substring(0, 4)} H1 (Jan–Jun)`;
    else if (period.endsWith('-H2')) periodDisplay = `Bi-Annual ${period.substring(0, 4)} H2 (Jul–Dec)`;
    else if (period.includes('-Q')) periodDisplay = `Quarterly ${period.substring(0, 4)} ${period.substring(5)}`;
    else periodDisplay = fmtMonthYear(period);
  }

  let dateRangeDisplay = '';
  if (startDate && endDate) {
    dateRangeDisplay = `${startDate} to ${endDate}`;
  } else if (startDate) {
    dateRangeDisplay = `From ${startDate}`;
  } else if (endDate) {
    dateRangeDisplay = `Until ${endDate}`;
  }

  const afsData = previewData?.afs;
  const pnlSummary = afsData?.statementOfProfitLoss;
  const bsSummary = afsData?.statementOfPosition;
  const cfSummary = afsData?.statementOfCashFlows;
  const eqSummary = afsData?.statementOfChangesInEquity;

  return (
    <div className="flex flex-col gap-6">
      {/* Two-Column Workbench Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Report Selector Sidebar (Compacted ~35% smaller to give maximum preview room) */}
        <div className="lg:col-span-2 flex flex-col gap-2.5 lg:sticky lg:top-16 lg:self-start">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="size-3" /> Reports
            </h3>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
              {REPORT_TYPES.length}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {REPORT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedReport === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedReport(type.id)}
                  className={`group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-xs'
                      : 'bg-card border-border/70 hover:bg-muted/40 hover:border-muted-foreground/30'
                  }`}
                >
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted text-muted-foreground group-hover:text-foreground'
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p suppressHydrationWarning className={`text-[11px] font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {type.label}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Controls & Live Document Canvas */}
        <div className="lg:col-span-10 flex flex-col gap-4">
          {/* Top Filter & Control Bar */}
          <div className="rounded-2xl border bg-card p-4 sm:p-5 shadow-xs flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                {selectedReport !== 'overview' ? (
                  <Button onClick={() => setSelectedReport('overview')} variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Overview Dashboard
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Financial Reports Filters & Actions</h4>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handlePrint} variant="outline" size="sm" className="h-8 gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Button onClick={handleDownloadPdf} size="sm" className="h-8 gap-1.5 shadow-sm">
                  <Download className="h-3.5 w-3.5" />
                  Download AFS PDF
                </Button>
              </div>
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Reporting Period */}
              {reportConfig.needsPeriod && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="size-3" /> Period
                  </label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      
                      {/* Annually */}
                      <SelectItem value={`${currentYear}-FY`}>Annual: FY{currentYear} (Full Year)</SelectItem>
                      <SelectItem value={`${currentYear - 1}-FY`}>Annual: FY{currentYear - 1} (Full Year)</SelectItem>

                      {/* Bi-Annually */}
                      <SelectItem value={`${currentYear}-H1`}>Bi-Annual: {currentYear} H1 (Jan – Jun)</SelectItem>
                      <SelectItem value={`${currentYear}-H2`}>Bi-Annual: {currentYear} H2 (Jul – Dec)</SelectItem>

                      {/* Quarterly */}
                      <SelectItem value={`${currentYear}-Q1`}>Quarterly: {currentYear} Q1 (Jan – Mar)</SelectItem>
                      <SelectItem value={`${currentYear}-Q2`}>Quarterly: {currentYear} Q2 (Apr – Jun)</SelectItem>
                      <SelectItem value={`${currentYear}-Q3`}>Quarterly: {currentYear} Q3 (Jul – Sep)</SelectItem>
                      <SelectItem value={`${currentYear}-Q4`}>Quarterly: {currentYear} Q4 (Oct – Dec)</SelectItem>

                      {/* Monthly */}
                      {periods.map((p) => (
                        <SelectItem key={p} value={p}>Monthly: {fmtMonthYear(p)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Division Selector */}
              {reportConfig.needsDivision && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Division
                  </label>
                  <Select value={divisionId} onValueChange={setDivisionId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Account Selector (General Ledger) */}
              {reportConfig.needsAccount && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Account
                  </label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Custom Date Range (Start Date) */}
              {reportConfig.supportsDateRange && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}

              {/* Custom Date Range (End Date) */}
              {reportConfig.supportsDateRange && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* OVERVIEW DASHBOARD VIEW */}
          {selectedReport === 'overview' ? (
            <div className="flex flex-col gap-6">
              {/* Overview Hero Card */}
              <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 p-6 sm:p-8 text-white shadow-xl">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex flex-col gap-2 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground border border-primary/30 text-xs font-semibold w-fit">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" /> PMG Financial Intelligence Hub
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Financial Reports & Statements Workbench</h2>
                    <p className="text-xs sm:text-sm text-zinc-300">
                      Consolidated corporate reporting for {orgSettings?.registeredName || 'PLAYHOUSE MEDIA GROUP (PTY) LTD'}. Generating CIPC compliant Annual Financial Statements (AFS), real-time financial position, income statements, and cash flows.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <Button onClick={() => setSelectedReport('annual-financial-statements')} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg">
                      <ShieldCheck className="h-4 w-4" /> Open Full AFS Package
                    </Button>
                    <Button onClick={handleDownloadPdf} variant="outline" className="gap-2 text-white border-zinc-700 hover:bg-zinc-800">
                      <Download className="h-4 w-4" /> Export Complete AFS PDF
                    </Button>
                  </div>
                </div>
              </div>

              {/* Core Financial Statements Section */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-primary" /> Core Financial Statements ({periodDisplay})
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium">IFRS & CIPC Compliant</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Card 1: AFS */}
                  <div className="group rounded-2xl border bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Complete 6-Page Package
                        </span>
                      </div>
                      <h4 className="text-base font-bold group-hover:text-primary transition-colors">Annual Financial Statements (AFS)</h4>
                      <p className="text-xs text-muted-foreground">Full CIPC compliance package: Directors Report, Position, Income, Equity, Cash Flows & Notes.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('annual-financial-statements')} variant="secondary" size="sm" className="w-full gap-1.5 text-xs font-semibold">
                      Preview Full Document <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Card 2: Financial Position */}
                  <div className="group rounded-2xl border bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <Landmark className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {formatZAR(bsSummary?.totalAssets?.current || 0)}
                        </span>
                      </div>
                      <h4 className="text-base font-bold group-hover:text-primary transition-colors">Financial Position</h4>
                      <p className="text-xs text-muted-foreground">Statement of Financial Position: Total corporate assets, liabilities, and shareholder equity.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('balance-sheet')} variant="outline" size="sm" className="w-full gap-1.5 text-xs font-semibold">
                      View Position Statement <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Card 3: Income Statement */}
                  <div className="group rounded-2xl border bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className={`text-xs font-mono font-bold ${(pnlSummary?.netProfit?.current || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          Net: {formatZAR(pnlSummary?.netProfit?.current || 0)}
                        </span>
                      </div>
                      <h4 className="text-base font-bold group-hover:text-primary transition-colors">Income Statement</h4>
                      <p className="text-xs text-muted-foreground">Statement of Comprehensive Income: Gross sales revenue, operating expenses, and net profit.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('profit-and-loss')} variant="outline" size="sm" className="w-full gap-1.5 text-xs font-semibold">
                      View Income Statement <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Card 4: Cash Flows */}
                  <div className="group rounded-2xl border bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Banknote className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatZAR(cfSummary?.current?.netOperatingCashFlow || 0)}
                        </span>
                      </div>
                      <h4 className="text-base font-bold group-hover:text-primary transition-colors">Cash Flows</h4>
                      <p className="text-xs text-muted-foreground">Statement of Cash Flows: Customer receipts, operating cash expenses, and bank balances.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('cash-flow')} variant="outline" size="sm" className="w-full gap-1.5 text-xs font-semibold">
                      View Cash Flows <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Card 5: Changes in Equity */}
                  <div className="group rounded-2xl border bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                          <Scale className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-foreground">
                          {formatZAR(100 + (eqSummary?.currentClosingRetained || 0))}
                        </span>
                      </div>
                      <h4 className="text-base font-bold group-hover:text-primary transition-colors">Changes in Equity</h4>
                      <p className="text-xs text-muted-foreground">Statement of Changes in Equity: Share capital and retained earnings balance movements.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('changes-in-equity')} variant="outline" size="sm" className="w-full gap-1.5 text-xs font-semibold">
                      View Equity Statement <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Management & Performance Reports Section */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border/60">
                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Management Accounts & Performance
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Division Performance */}
                  <div className="group rounded-2xl border bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">Operating Divisions</span>
                      </div>
                      <h4 className="text-base font-bold group-hover:text-primary transition-colors">Division Performance</h4>
                      <p className="text-xs text-muted-foreground">Revenue, cash collected, outstanding AR, operating expenses, and profit margin % grouped by division.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('division-performance')} variant="outline" size="sm" className="w-full gap-1.5 text-xs font-semibold">
                      View Division Performance <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Client Performance */}
                  <div className="group rounded-2xl border bg-card p-5 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          <Users className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">Client Analytics</span>
                      </div>
                      <h4 className="text-base font-bold group-hover:text-primary transition-colors">Client Performance</h4>
                      <p className="text-xs text-muted-foreground">Invoiced billing totals, cash collections, accounts receivable balance, and collection rate % per client.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('client-performance')} variant="outline" size="sm" className="w-full gap-1.5 text-xs font-semibold">
                      View Client Performance <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Audit & Bookkeeping Schedules Section */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border/60">
                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase flex items-center gap-2">
                  <Table2 className="h-4 w-4 text-primary" /> Audit & Bookkeeping Schedules
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Trial Balance */}
                  <div className="group rounded-2xl border bg-card p-4 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                        <Scale className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-bold group-hover:text-primary transition-colors">Trial Balance</h4>
                      <p className="text-[11px] text-muted-foreground">Verifying debit & credit equality.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('trial-balance')} variant="ghost" size="sm" className="w-full gap-1 text-xs justify-between">
                      Open <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* General Ledger */}
                  <div className="group rounded-2xl border bg-card p-4 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        <Table2 className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-bold group-hover:text-primary transition-colors">General Ledger</h4>
                      <p className="text-[11px] text-muted-foreground">Detailed line items per account.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('general-ledger')} variant="ghost" size="sm" className="w-full gap-1 text-xs justify-between">
                      Open <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Journal Entries */}
                  <div className="group rounded-2xl border bg-card p-4 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-bold group-hover:text-primary transition-colors">Journal Entries</h4>
                      <p className="text-[11px] text-muted-foreground">Double-entry posted vouchers.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('journal-entries')} variant="ghost" size="sm" className="w-full gap-1 text-xs justify-between">
                      Open <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Chart of Accounts */}
                  <div className="group rounded-2xl border bg-card p-4 shadow-xs hover:shadow-md hover:border-primary/50 transition-all flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <h4 className="text-sm font-bold group-hover:text-primary transition-colors">Chart of Accounts</h4>
                      <p className="text-[11px] text-muted-foreground">Posting accounts master list.</p>
                    </div>
                    <Button onClick={() => setSelectedReport('chart-of-accounts')} variant="ghost" size="sm" className="w-full gap-1 text-xs justify-between">
                      Open <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Live Report A4 Canvas Preview */
            <ReportDocumentCanvas
              reportType={selectedReport}
              reportTitle={reportConfig.label}
              divisionName={selectedDivisionName}
              periodLabel={periodDisplay}
              dateRangeLabel={dateRangeDisplay}
              orgSettings={orgSettings}
              data={previewData}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
