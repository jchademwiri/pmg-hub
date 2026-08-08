'use client';

import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Download, Printer, BookOpen, FileText, Table2, Scale, TrendingUp, Building2, Landmark, Banknote, Calendar, Filter, Layers, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fmtMonthYear } from '@/lib/format';
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
  | 'annual-financial-statements'
  | 'balance-sheet'
  | 'profit-and-loss'
  | 'division-performance'
  | 'client-performance'
  | 'trial-balance'
  | 'cash-flow'
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
    id: 'balance-sheet',
    label: 'Balance Sheet',
    description: 'Statement of Financial Position: Assets, Liabilities & Equity',
    icon: Landmark,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: true,
  },
  {
    id: 'profit-and-loss',
    label: 'Profit & Loss',
    description: 'Corporate income, expenses & net operating profit statement',
    icon: TrendingUp,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
    supportsDateRange: true,
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
    id: 'cash-flow',
    label: 'Cash Flow Statement',
    description: 'Operating cash collections, expenses & cash position movements',
    icon: Banknote,
    needsPeriod: true,
    needsAccount: false,
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
    id: 'chart-of-accounts',
    label: 'Chart of Accounts',
    description: 'Complete list of all account categories, codes, and types',
    icon: BookOpen,
    needsPeriod: false,
    needsAccount: false,
    needsDivision: false,
    supportsDateRange: false,
  },
  {
    id: 'annual-financial-statements',
    label: 'AFS',
    description: 'Full CIPC-compliant AFS package: Directors Report, Balance Sheet, P&L, Equity, Cash Flow & Notes',
    icon: ShieldCheck,
    needsPeriod: true,
    needsAccount: false,
    needsDivision: true,
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
    'annual-financial-statements',
    'balance-sheet',
    'profit-and-loss',
    'division-performance',
    'client-performance',
    'trial-balance',
    'cash-flow',
    'journal-entries',
    'general-ledger',
    'chart-of-accounts',
  ];

  const currentYear = new Date().getFullYear();
  const defaultFinancialYear = `${currentYear}-FY`;

  const initialReport: ReportType = urlType && validReportTypes.includes(urlType) ? urlType : 'trial-balance';

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
    updateUrl({ type: r, period, divisionId, accountId, startDate, endDate });
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
    const params = new URLSearchParams();
    if (reportConfig.needsPeriod && period !== 'all') params.set('period', period);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (reportConfig.needsAccount && accountId !== 'all') params.set('accountId', accountId);
    if (reportConfig.needsDivision && divisionId !== 'all') params.set('divisionId', divisionId);

    const url = `/api/accounting/export/${selectedReport}?${params.toString()}`;
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
                    <p className={`text-[11px] font-semibold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
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
                <Filter className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-semibold">Report Filters & Actions</h4>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handlePrint} variant="outline" size="sm" className="h-8 gap-1.5">
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Button onClick={handleDownloadPdf} size="sm" className="h-8 gap-1.5 shadow-sm">
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
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

          {/* Live Report A4 Canvas Preview */}
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
        </div>
      </div>
    </div>
  );
}
