'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PrintButton } from '@/components/billing/print-button';
import { ExportPdfButton } from '@/components/billing/export-pdf-button';
import { SearchableClientSelect } from '@/components/billing/searchable-client-select';
import { SetPageLabel } from '@/components/navigation/page-header-context';
import { formatZAR, fmtDateLong, cleanPdfText } from '@/lib/format';
import { getDocumentLogoUrl } from '@/lib/document-logo';
import { cn } from '@/lib/utils';
import type { DocumentOrg } from '@/components/billing/document-preview';

export type ReportModuleType = 'invoices' | 'payments' | 'expenses' | 'aging';

type DatePreset =
  | 'this_month'
  | 'last_month'
  | 'past_3_months'
  | 'current_fy'
  | 'previous_fy'
  | 'all_time'
  | 'custom';

export interface ReportClientOption {
  id: string;
  name: string;
  businessName?: string | null;
  email?: string | null;
  phone?: string | null;
  isActive?: boolean;
}

export interface ReportDivisionOption {
  id: string;
  name: string;
}

interface InvoiceRow {
  documentNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  clientName: string;
  divisionName: string;
  status: string;
  total: number;
  paidAmount: number;
  outstandingAmount: number;
}

interface PaymentRow {
  date: string;
  clientName: string;
  divisionName: string;
  description: string;
  allocatedInvoices: string;
  amount: number;
}

interface AgingRow {
  clientId: string;
  clientName: string;
  reference?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  current: number;
  bucket_1_14: number;
  bucket_15_30: number;
  bucket_31_60: number;
  bucket_61_plus: number;
  totalOutstanding: number;
}

interface ExpenseRow {
  date: string;
  category: string;
  clientId: string | null;
  clientName: string;
  divisionName: string;
  description: string;
  amount: number;
}

type ReportPayload = (
  | {
      type: 'invoices';
      periodLabel: string;
      clientScopeLabel: string;
      divisionLabel: string;
      statusFilterLabel: string;
      summary: {
        count: number;
        totalInvoiced: number;
        totalPaid: number;
        totalOutstanding: number;
      };
      rows: InvoiceRow[];
    }
  | {
      type: 'payments';
      periodLabel: string;
      clientScopeLabel: string;
      divisionLabel: string;
      summary: {
        count: number;
        totalReceived: number;
      };
      rows: PaymentRow[];
    }
  | {
      type: 'aging';
      isClientDrilldown?: boolean;
      asOfDateLabel: string;
      periodLabel: string;
      clientScopeLabel: string;
      divisionLabel: string;
      summary: {
        count: number;
        clientCount: number;
        totalOutstanding: number;
        totalCurrent: number;
        total1_14: number;
        total15_30: number;
        total31_60: number;
        total61Plus: number;
        totalOverdue: number;
      };
      rows: AgingRow[];
    }
  | {
      type: 'expenses';
      periodLabel: string;
      clientScopeLabel: string;
      divisionLabel: string;
      categoryFilterLabel: string;
      summary: {
        count: number;
        totalExpenses: number;
      };
      rows: ExpenseRow[];
    }
) &
  GroupedFields;

export type ReportGroupBy = 'none' | 'client';

interface ClientSummaryRow {
  clientName: string;
  count: number;
  values: number[];
}

interface GroupedFields {
  grouped?: boolean;
  countLabel?: string;
  valueColumns?: { label: string; tone?: 'default' | 'success' | 'danger' | 'primary' }[];
  headlineIndex?: number;
  groupedRows?: ClientSummaryRow[];
}

const TONE_CLASS: Record<string, string> = {
  success: 'text-emerald-600',
  danger: 'text-red-600',
  primary: 'text-blue-700',
  default: 'text-zinc-900',
};

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computePresetDates(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (preset === 'this_month') {
    return {
      startDate: toIsoDate(new Date(y, m, 1)),
      endDate: toIsoDate(new Date(y, m + 1, 0)),
    };
  }
  if (preset === 'last_month') {
    return {
      startDate: toIsoDate(new Date(y, m - 1, 1)),
      endDate: toIsoDate(new Date(y, m, 0)),
    };
  }
  if (preset === 'past_3_months') {
    return {
      startDate: toIsoDate(new Date(y, m - 2, 1)),
      endDate: toIsoDate(new Date(y, m + 1, 0)),
    };
  }

  const fyStartYear = m < 2 ? y - 1 : y;
  if (preset === 'current_fy') {
    return {
      startDate: toIsoDate(new Date(fyStartYear, 2, 1)),
      endDate: toIsoDate(new Date(fyStartYear + 1, 2, 0)),
    };
  }
  if (preset === 'previous_fy') {
    const prevFy = fyStartYear - 1;
    return {
      startDate: toIsoDate(new Date(prevFy, 2, 1)),
      endDate: toIsoDate(new Date(prevFy + 1, 2, 0)),
    };
  }
  return { startDate: '', endDate: '' };
}

function formatStatusLabel(status: string): string {
  switch (status) {
    case 'partially_paid':
      return 'Part Paid';
    case 'written_off':
      return 'Written Off';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

export interface ReportsTemplateClientProps {
  org: DocumentOrg;
  clients: ReportClientOption[];
  divisions: ReportDivisionOption[];
  categories: string[];
  initialType: ReportModuleType;
  initialClientId: string;
  initialDivisionId: string;
  initialStatus: string;
  initialCategory: string;
  initialStartDate: string;
  initialEndDate: string;
  initialGroupBy?: ReportGroupBy;
}

export function ReportsTemplateClient({
  org,
  clients,
  divisions,
  categories,
  initialType,
  initialClientId,
  initialDivisionId,
  initialStatus,
  initialCategory,
  initialStartDate,
  initialEndDate,
  initialGroupBy = 'none',
}: ReportsTemplateClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [reportType, setReportType] = React.useState<ReportModuleType>(initialType);
  const [clientId, setClientId] = React.useState<string>(initialClientId);
  const [groupBy, setGroupBy] = React.useState<ReportGroupBy>(initialGroupBy);
  // Grouping only applies when the report spans all clients.
  const isGrouped = groupBy === 'client' && clientId === 'all';
  const [divisionId, setDivisionId] = React.useState<string>(initialDivisionId);
  const [status, setStatus] = React.useState<string>(initialStatus);
  const [category, setCategory] = React.useState<string>(initialCategory);
  const [preset, setPreset] = React.useState<DatePreset>(
    initialStartDate || initialEndDate ? 'custom' : 'current_fy',
  );
  const [startDate, setStartDate] = React.useState<string>(() => {
    if (initialStartDate || initialEndDate) return initialStartDate;
    return computePresetDates('current_fy').startDate;
  });
  const [endDate, setEndDate] = React.useState<string>(() => {
    if (initialStartDate || initialEndDate) return initialEndDate;
    return computePresetDates('current_fy').endDate;
  });

  const [reportData, setReportData] = React.useState<ReportPayload | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [downloadingCsv, setDownloadingCsv] = React.useState<boolean>(false);

  // Sync URL query params cleanly
  const syncUrl = React.useCallback(
    (next: {
      type?: ReportModuleType;
      clientId?: string;
      divisionId?: string;
      status?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
      groupBy?: ReportGroupBy;
    }) => {
      const sp = new URLSearchParams(searchParams.toString());
      const t = next.type ?? reportType;
      const c = next.clientId ?? clientId;
      const d = next.divisionId ?? divisionId;
      const st = next.status ?? status;
      const cat = next.category ?? category;
      const g = next.groupBy ?? groupBy;
      const sDate = next.startDate !== undefined ? next.startDate : startDate;
      const eDate = next.endDate !== undefined ? next.endDate : endDate;

      sp.set('type', t);
      if (c && c !== 'all') sp.set('clientId', c);
      else sp.delete('clientId');
      if (g === 'client') sp.set('groupBy', 'client');
      else sp.delete('groupBy');
      if (d && d !== 'all') sp.set('divisionId', d);
      else sp.delete('divisionId');
      if (t === 'invoices' && st && st !== 'all_active') sp.set('status', st);
      else sp.delete('status');
      if (t === 'expenses' && cat && cat !== 'all') sp.set('category', cat);
      else sp.delete('category');
      if (sDate) sp.set('startDate', sDate);
      else sp.delete('startDate');
      if (eDate) sp.set('endDate', eDate);
      else sp.delete('endDate');

      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    },
    [
      searchParams,
      reportType,
      clientId,
      divisionId,
      status,
      category,
      groupBy,
      startDate,
      endDate,
      router,
      pathname,
    ],
  );

  const buildExportQuery = React.useCallback(
    (format: 'pdf' | 'csv' | 'json') => {
      const sp = new URLSearchParams();
      sp.set('format', format);
      if (clientId && clientId !== 'all') sp.set('clientId', clientId);
      if (isGrouped) sp.set('groupBy', 'client');
      if (divisionId && divisionId !== 'all') sp.set('divisionId', divisionId);
      if (startDate) sp.set('startDate', startDate);
      if (endDate) sp.set('endDate', endDate);
      if (reportType === 'invoices' && status) sp.set('status', status);
      if (reportType === 'expenses' && category && category !== 'all') sp.set('category', category);
      return sp.toString();
    },
    [clientId, isGrouped, divisionId, startDate, endDate, reportType, status, category],
  );

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const qs = buildExportQuery('json');
        const res = await fetch(`/api/reports/export/${reportType}?${qs}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load report');
        const data = (await res.json()) as ReportPayload;
        if (active) setReportData(data);
      } catch {
        if (active) toast.error('Could not load report data');
      } finally {
        if (active) setLoading(false);
      }
    }, 100);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [reportType, buildExportQuery]);

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      const qs = buildExportQuery('csv');
      const res = await fetch(`/api/reports/export/${reportType}?${qs}`);
      if (!res.ok) throw new Error('Failed to export CSV');
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="([^"]+)"/);
      const fileName = match?.[1] || `${reportType}-report.csv`;

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success(`Downloaded ${fileName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'CSV export failed');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const selectedDivisionName =
    divisionId !== 'all' ? divisions.find((d) => d.id === divisionId)?.name : undefined;
  const displayOrgName = selectedDivisionName || org.name;
  const logoUrl = org.logoUrl ?? getDocumentLogoUrl(displayOrgName);

  const selectedClientObj =
    clientId !== 'all' && clientId !== 'unassigned'
      ? clients.find((c) => c.id === clientId)
      : undefined;

  const showClientColumn = clientId === 'all';

  const searchableClients = React.useMemo(() => {
    if (reportType === 'expenses') {
      return [
        { id: 'unassigned', name: 'General (No Client)', businessName: 'General (No Client)' },
        ...clients,
      ];
    }
    return clients;
  }, [reportType, clients]);

  const pdfUrl = `/api/reports/export/${reportType}?${buildExportQuery('pdf')}`;

  const reportTitle =
    reportType === 'aging'
      ? 'AR Aging Report'
      : isGrouped
        ? reportType === 'invoices'
          ? 'Client Balances Report'
          : reportType === 'payments'
            ? 'Payments by Client'
            : 'Expenses by Client'
        : reportType === 'invoices'
          ? 'Invoice Report'
          : reportType === 'payments'
            ? 'Payment Report'
            : 'Expense Report';

  const reportNumber = `${
    reportType === 'invoices'
      ? 'INV'
      : reportType === 'payments'
        ? 'PAY'
        : reportType === 'expenses'
          ? 'EXP'
          : 'AG'
  }-${isGrouped ? 'CLT' : 'RPT'}-${new Date().getFullYear()}`;

  const groupedView =
    reportData?.grouped && reportData.groupedRows && reportData.valueColumns
      ? {
          rows: reportData.groupedRows,
          columns: reportData.valueColumns,
          headlineIndex: reportData.headlineIndex ?? 0,
          countLabel: reportData.countLabel ?? 'Records',
        }
      : null;

  const sortedClients = React.useMemo(() => {
    return [...clients].sort((a, b) =>
      (a.businessName || a.name).localeCompare(b.businessName || b.name),
    );
  }, [clients]);

  return (
    <div className="flex flex-col gap-6">
      <SetPageLabel value={reportTitle} />

      {/* Top Page Header (matches Statement page) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold truncate">
              {reportData?.clientScopeLabel ?? 'All Clients'} — {reportTitle}
            </h2>
            {loading && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 ring-1 ring-blue-700/10 animate-pulse">
                <Loader2 className="size-3 animate-spin" />
                Updating...
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Period: {reportData?.periodLabel ?? 'Loading...'}
          </p>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <div className="hidden sm:block">
            <PrintButton
              documentTitle={`${reportTitle.replace(/\s+/g, '-')}-${(reportData?.clientScopeLabel || 'All').replace(/\s+/g, '-')}`}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={downloadingCsv || loading}
            onClick={() => void handleDownloadCsv()}
          >
            {downloadingCsv ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4 mr-2 text-emerald-600" />
            )}
            Export CSV
          </Button>
          <ExportPdfButton
            fileName={`${reportTitle.replace(/\s+/g, '-')}-${(reportData?.clientScopeLabel || 'All').replace(/\s+/g, '-')}`}
            pdfUrl={pdfUrl}
            disabled={loading}
          />
        </div>
      </div>

      {/* Two-Column Template Layout (Document Preview on Left, Filter Sidebar on Right) */}
      <div className="flex flex-col-reverse lg:grid lg:grid-cols-3 gap-6 lg:items-start">
        {/* Left 2 Columns: A4 Document Template Preview */}
        <div className="lg:col-span-2 overflow-x-auto">
          <div
            id="printable-area"
            className="print-document w-full max-w-[794px] min-h-[1123px] mx-auto flex flex-col bg-white text-zinc-900 shadow-md print:shadow-none ring-1 ring-zinc-200 print:ring-0 border-t-[4px] border-t-blue-700"
          >
            <div
              className={cn(
                'flex flex-col flex-1 transition-opacity duration-200',
                loading && reportData ? 'opacity-50 pointer-events-none' : 'opacity-100',
              )}
            >
              {/* ── Document Header (matches pdfcn PageHeader & DocumentPreview) ── */}
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-6 px-6 sm:px-10 pt-10 pb-6">
                {/* Left: Company Info */}
                <div className="flex flex-col gap-0.5 max-w-[16rem]">
                  <span className="text-base font-bold tracking-tight text-zinc-900">
                    {displayOrgName}
                  </span>
                  {org.vatNumber && (
                    <span className="text-xs text-zinc-500">VAT: {org.vatNumber}</span>
                  )}
                  {org.email && <span className="text-xs text-zinc-500">{org.email}</span>}
                  {org.phone && <span className="text-xs text-zinc-500">{org.phone}</span>}
                  {org.website && <span className="text-xs text-zinc-500">{org.website}</span>}
                  {org.address && (
                    <span className="mt-0.5 text-xs text-zinc-500 whitespace-pre-line">
                      {org.address}
                    </span>
                  )}
                </div>

                {/* Center: Logo */}
                <div className="flex h-14 w-32 items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={displayOrgName}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-bold text-zinc-800">PMG</span>
                  )}
                </div>

                {/* Right: Document Title & Number */}
                <div className="flex flex-col items-end gap-1 justify-self-end text-right">
                  <span className="text-lg font-bold uppercase tracking-wider text-blue-700">
                    {reportTitle}
                  </span>
                  <span className="text-xs font-semibold text-zinc-700 tabular-nums">
                    #{reportNumber}
                  </span>
                </div>
              </div>

              <div className="mx-6 sm:mx-10 border-t border-zinc-200" />

              {/* ── Account Scope & Report Details ── */}
              <div className="flex items-start justify-between gap-6 px-6 sm:px-10 py-6">
                {/* Left: Account Scope */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    Account Scope
                  </span>
                  <span className="text-sm font-bold text-zinc-900">
                    {reportData?.clientScopeLabel ?? 'All Clients'}
                  </span>
                  {selectedClientObj?.email && (
                    <span className="text-xs text-zinc-500">{selectedClientObj.email}</span>
                  )}
                  {selectedClientObj?.phone && (
                    <span className="text-xs text-zinc-500">{selectedClientObj.phone}</span>
                  )}
                  {selectedDivisionName && (
                    <span className="text-xs text-zinc-500">Division: {selectedDivisionName}</span>
                  )}
                  {reportData?.type === 'invoices' &&
                    reportData.statusFilterLabel &&
                    reportData.statusFilterLabel !== 'All Statuses' && (
                      <span className="text-xs text-zinc-500">
                        Filter: {reportData.statusFilterLabel}
                      </span>
                    )}
                </div>

                {/* Right: KeyValue Metadata */}
                <div className="flex flex-col gap-1 min-w-[220px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 text-right">
                    Report Details
                  </span>
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-zinc-500">Period</span>
                    <span className="font-semibold text-zinc-900">
                      {reportData?.periodLabel ?? '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs py-0.5">
                    <span className="text-zinc-500">Generated</span>
                    <span className="font-semibold text-zinc-900">{fmtDateLong(new Date())}</span>
                  </div>
                  {reportData?.type === 'invoices' ? (
                    <div className="flex justify-between text-xs py-0.5">
                      <span className="text-zinc-500">Total Invoiced</span>
                      <span className="font-semibold text-zinc-900 tabular-nums">
                        {formatZAR(reportData.summary.totalInvoiced)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-xs py-0.5">
                      <span className="text-zinc-500">Records</span>
                      <span className="font-semibold text-zinc-900 tabular-nums">
                        {reportData?.summary.count ?? 0}
                      </span>
                    </div>
                  )}
                  {reportData?.type === 'invoices' && (
                    <div className="flex justify-between text-xs py-0.5 pt-1 border-t border-zinc-100">
                      <span className="font-bold text-zinc-900">Balance Due</span>
                      <span
                        className={cn(
                          'font-bold tabular-nums',
                          reportData.summary.totalOutstanding > 0
                            ? 'text-blue-700'
                            : 'text-emerald-600',
                        )}
                      >
                        {formatZAR(reportData.summary.totalOutstanding)}
                      </span>
                    </div>
                  )}
                  {reportData?.type === 'payments' && (
                    <div className="flex justify-between text-xs py-0.5 pt-1 border-t border-zinc-100">
                      <span className="font-bold text-zinc-900">Total Received</span>
                      <span className="font-bold tabular-nums text-emerald-600">
                        {formatZAR(reportData.summary.totalReceived)}
                      </span>
                    </div>
                  )}
                  {reportData?.type === 'aging' && (
                    <>
                      <div className="flex justify-between text-xs py-0.5">
                        <span className="text-zinc-500">
                          {reportData.isClientDrilldown
                            ? 'Invoices with Balance'
                            : 'Clients with Balance'}
                        </span>
                        <span className="font-semibold text-zinc-900 tabular-nums">
                          {reportData.summary.clientCount}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs py-0.5 pt-1 border-t border-zinc-100">
                        <span className="font-bold text-zinc-900">Total Outstanding</span>
                        <span
                          className={cn(
                            'font-bold tabular-nums',
                            reportData.summary.totalOutstanding > 0
                              ? 'text-blue-700'
                              : 'text-emerald-600',
                          )}
                        >
                          {formatZAR(reportData.summary.totalOutstanding)}
                        </span>
                      </div>
                    </>
                  )}
                  {reportData?.type === 'expenses' && (
                    <div className="flex justify-between text-xs py-0.5 pt-1 border-t border-zinc-100">
                      <span className="font-bold text-zinc-900">Total Expenses</span>
                      <span className="font-bold tabular-nums text-blue-700">
                        {formatZAR(reportData.summary.totalExpenses)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Essential Table Body ── */}
              <div className="px-6 sm:px-10 pb-8 flex-1">
                {loading && !reportData ? (
                  <div className="py-16 flex items-center justify-center text-zinc-400 text-xs gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading report...
                  </div>
                ) : groupedView ? (
                  <>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 uppercase text-[10px] font-bold">
                          <th className="py-2 px-2 text-left">Client</th>
                          <th className="py-2 px-2 text-right">{groupedView.countLabel}</th>
                          {groupedView.columns.map((col) => (
                            <th key={col.label} className="py-2 px-2 text-right">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {groupedView.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={2 + groupedView.columns.length}
                              className="py-8 text-center text-zinc-400"
                            >
                              No records for this period.
                            </td>
                          </tr>
                        ) : (
                          groupedView.rows.map((row) => (
                            <tr key={row.clientName}>
                              <td className="py-2 px-2 font-semibold text-zinc-900">
                                {row.clientName}
                              </td>
                              <td className="py-2 px-2 text-right tabular-nums text-zinc-600">
                                {row.count}
                              </td>
                              {groupedView.columns.map((col, i) => {
                                const val = row.values[i] ?? 0;
                                const isHeadline = i === groupedView.headlineIndex;
                                const isZeroBalance = isHeadline && val <= 0.005;

                                return (
                                  <td
                                    key={col.label}
                                    className={cn(
                                      'py-2 px-2 text-right tabular-nums',
                                      isHeadline
                                        ? isZeroBalance
                                          ? 'font-semibold text-emerald-600'
                                          : cn('font-semibold', TONE_CLASS[col.tone ?? 'default'])
                                        : 'text-zinc-800',
                                    )}
                                  >
                                    {formatZAR(val)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Bottom-Right Totals */}
                    <div className="mt-6 flex justify-end">
                      <div className="w-64 flex flex-col divide-y divide-zinc-200 text-xs">
                        <div className="flex justify-between py-1.5 text-zinc-600">
                          <span>Clients</span>
                          <span className="tabular-nums font-semibold text-zinc-900">
                            {groupedView.rows.length}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 text-zinc-600">
                          <span>Total {groupedView.countLabel}</span>
                          <span className="tabular-nums font-semibold text-zinc-900">
                            {groupedView.rows.reduce((acc, r) => acc + r.count, 0)}
                          </span>
                        </div>
                        {groupedView.columns.map((col, i) => {
                          const total = groupedView.rows.reduce(
                            (acc, r) => acc + (r.values[i] ?? 0),
                            0,
                          );
                          const isHeadline = i === groupedView.headlineIndex;
                          return (
                            <div
                              key={col.label}
                              className={cn(
                                'flex justify-between',
                                isHeadline
                                  ? 'py-2 text-sm font-bold text-zinc-900'
                                  : 'py-1.5 text-zinc-600',
                              )}
                            >
                              <span>{col.label}</span>
                              <span
                                className={cn(
                                  'tabular-nums',
                                  isHeadline
                                    ? total <= 0.005
                                      ? 'text-emerald-600 font-bold'
                                      : TONE_CLASS[col.tone ?? 'default']
                                    : 'font-semibold text-zinc-900',
                                )}
                              >
                                {formatZAR(total)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : reportData?.type === 'invoices' ? (
                  <>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 uppercase text-[10px] font-bold">
                          <th className="py-2 px-2 text-left">Date</th>
                          <th className="py-2 px-2 text-left">Invoice #</th>
                          {showClientColumn && <th className="py-2 px-2 text-left">Client</th>}
                          <th className="py-2 px-2 text-left">Status</th>
                          <th className="py-2 px-2 text-right">Total</th>
                          <th className="py-2 px-2 text-right">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {reportData.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={showClientColumn ? 6 : 5}
                              className="py-8 text-center text-zinc-400"
                            >
                              No invoices recorded for this period.
                            </td>
                          </tr>
                        ) : (
                          reportData.rows.map((row, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-2 text-zinc-600">
                                {fmtDateLong(row.invoiceDate)}
                              </td>
                              <td className="py-2 px-2 font-semibold text-zinc-900">
                                {row.documentNumber}
                              </td>
                              {showClientColumn && (
                                <td className="py-2 px-2 text-zinc-800">{row.clientName}</td>
                              )}
                              <td className="py-2 px-2 text-zinc-600">
                                {formatStatusLabel(row.status)}
                              </td>
                              <td className="py-2 px-2 text-right tabular-nums text-zinc-800">
                                {formatZAR(row.total)}
                              </td>
                              <td
                                className={cn(
                                  'py-2 px-2 text-right tabular-nums font-semibold',
                                  row.outstandingAmount > 0 ? 'text-zinc-900' : 'text-emerald-600',
                                )}
                              >
                                {row.outstandingAmount > 0
                                  ? formatZAR(row.outstandingAmount)
                                  : formatZAR(0)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Bottom-Right Totals Breakdown */}
                    <div className="mt-6 flex justify-end">
                      <div className="w-64 flex flex-col divide-y divide-zinc-200 text-xs">
                        <div className="flex justify-between py-1.5 font-semibold text-zinc-900">
                          <span>Total Invoiced</span>
                          <span className="tabular-nums">
                            {formatZAR(reportData.summary.totalInvoiced)}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 text-zinc-600">
                          <span>Less Paid</span>
                          <span className="tabular-nums text-emerald-600 font-medium">
                            {reportData.summary.totalPaid > 0
                              ? `-${formatZAR(reportData.summary.totalPaid)}`
                              : '-R 0,00'}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 text-sm font-bold text-zinc-900">
                          <span>Balance Due</span>
                          <span
                            className={cn(
                              'tabular-nums',
                              reportData.summary.totalOutstanding > 0
                                ? 'text-blue-700'
                                : 'text-emerald-600',
                            )}
                          >
                            {formatZAR(reportData.summary.totalOutstanding)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : reportData?.type === 'payments' ? (
                  <>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 uppercase text-[10px] font-bold">
                          <th className="py-2 px-2 text-left">Date</th>
                          {showClientColumn && <th className="py-2 px-2 text-left">Client</th>}
                          <th className="py-2 px-2 text-left">Reference / Invoice</th>
                          <th className="py-2 px-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {reportData.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={showClientColumn ? 4 : 3}
                              className="py-8 text-center text-zinc-400"
                            >
                              No payments recorded for this period.
                            </td>
                          </tr>
                        ) : (
                          reportData.rows.map((row, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-2 text-zinc-600">{fmtDateLong(row.date)}</td>
                              {showClientColumn && (
                                <td className="py-2 px-2 text-zinc-900">{row.clientName}</td>
                              )}
                              <td className="py-2 px-2 text-zinc-700">
                                {row.allocatedInvoices || row.description || '-'}
                              </td>
                              <td className="py-2 px-2 text-right tabular-nums font-semibold text-emerald-600">
                                {formatZAR(row.amount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Bottom-Right Totals Breakdown */}
                    <div className="mt-6 flex justify-end">
                      <div className="w-64 flex flex-col divide-y divide-zinc-200 text-xs">
                        <div className="flex justify-between py-1.5 text-zinc-600">
                          <span>Payments Count</span>
                          <span className="tabular-nums font-semibold text-zinc-900">
                            {reportData.summary.count}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 text-sm font-bold text-zinc-900">
                          <span>Total Received</span>
                          <span className="tabular-nums text-emerald-600">
                            {formatZAR(reportData.summary.totalReceived)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : reportData?.type === 'expenses' ? (
                  <>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 uppercase text-[10px] font-bold">
                          <th className="py-2 px-2 text-left">Date</th>
                          <th className="py-2 px-2 text-left">Category</th>
                          {showClientColumn && <th className="py-2 px-2 text-left">Client</th>}
                          <th className="py-2 px-2 text-left">Description</th>
                          <th className="py-2 px-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {reportData.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={showClientColumn ? 5 : 4}
                              className="py-8 text-center text-zinc-400"
                            >
                              No expenses recorded for this period.
                            </td>
                          </tr>
                        ) : (
                          reportData.rows.map((row, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-2 text-zinc-600">{fmtDateLong(row.date)}</td>
                              <td className="py-2 px-2 font-semibold text-zinc-900">
                                {row.category}
                              </td>
                              {showClientColumn && (
                                <td className="py-2 px-2 text-zinc-700">{row.clientName}</td>
                              )}
                              <td className="py-2 px-2 text-zinc-600">{row.description || '-'}</td>
                              <td className="py-2 px-2 text-right tabular-nums font-semibold text-zinc-900">
                                {formatZAR(row.amount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>

                    {/* Bottom-Right Totals Breakdown */}
                    <div className="mt-6 flex justify-end">
                      <div className="w-64 flex flex-col divide-y divide-zinc-200 text-xs">
                        <div className="flex justify-between py-1.5 text-zinc-600">
                          <span>Expense Entries</span>
                          <span className="tabular-nums font-semibold text-zinc-900">
                            {reportData.summary.count}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 text-sm font-bold text-zinc-900">
                          <span>Total Expenses</span>
                          <span className="tabular-nums text-blue-700">
                            {formatZAR(reportData.summary.totalExpenses)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : reportData?.type === 'aging' ? (
                  <>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 uppercase text-[10px] font-bold">
                          <th className="py-2 px-2 text-left">
                            {reportData.isClientDrilldown ? 'Invoice' : 'Client'}
                          </th>
                          <th className="py-2 px-2 text-right">Current</th>
                          <th className="py-2 px-2 text-right">1–14 Days</th>
                          <th className="py-2 px-2 text-right">15–30 Days</th>
                          <th className="py-2 px-2 text-right">31–60 Days</th>
                          <th className="py-2 px-2 text-right">61+ Days</th>
                          <th className="py-2 px-2 text-right">Total Due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {reportData.rows.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-zinc-400">
                              No outstanding accounts receivable found.
                            </td>
                          </tr>
                        ) : (
                          reportData.rows.map((row, idx) => {
                            const isZero = row.totalOutstanding <= 0.005;
                            return (
                              <tr key={`${row.clientName}-${idx}`}>
                                <td className="py-2 px-2 text-zinc-900">
                                  <div className="flex flex-col">
                                    <span className="font-semibold">{row.clientName}</span>
                                    {reportData.isClientDrilldown &&
                                      (row.dueDate || row.reference) && (
                                        <span className="text-[10px] text-zinc-500 font-normal">
                                          {row.dueDate ? `Due ${fmtDateLong(row.dueDate)}` : ''}
                                          {row.dueDate && row.reference ? ' · ' : ''}
                                          {cleanPdfText(row.reference) || ''}
                                        </span>
                                      )}
                                  </div>
                                </td>
                                <td
                                  className={cn(
                                    'py-2 px-2 text-right tabular-nums',
                                    row.current > 0
                                      ? 'text-emerald-600 font-medium'
                                      : 'text-zinc-400',
                                  )}
                                >
                                  {formatZAR(row.current)}
                                </td>
                                <td
                                  className={cn(
                                    'py-2 px-2 text-right tabular-nums',
                                    row.bucket_1_14 > 0
                                      ? 'text-amber-600 font-medium'
                                      : 'text-zinc-400',
                                  )}
                                >
                                  {formatZAR(row.bucket_1_14)}
                                </td>
                                <td
                                  className={cn(
                                    'py-2 px-2 text-right tabular-nums',
                                    row.bucket_15_30 > 0
                                      ? 'text-orange-600 font-medium'
                                      : 'text-zinc-400',
                                  )}
                                >
                                  {formatZAR(row.bucket_15_30)}
                                </td>
                                <td
                                  className={cn(
                                    'py-2 px-2 text-right tabular-nums',
                                    row.bucket_31_60 > 0
                                      ? 'text-rose-600 font-medium'
                                      : 'text-zinc-400',
                                  )}
                                >
                                  {formatZAR(row.bucket_31_60)}
                                </td>
                                <td
                                  className={cn(
                                    'py-2 px-2 text-right tabular-nums',
                                    row.bucket_61_plus > 0
                                      ? 'text-red-600 font-bold'
                                      : 'text-zinc-400',
                                  )}
                                >
                                  {formatZAR(row.bucket_61_plus)}
                                </td>
                                <td
                                  className={cn(
                                    'py-2 px-2 text-right tabular-nums font-bold',
                                    isZero ? 'text-emerald-600' : 'text-zinc-900',
                                  )}
                                >
                                  {formatZAR(row.totalOutstanding)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>

                    {/* Bottom Horizontal Aging Summary Boxes (matches Statement Ageing Summary) */}
                    <div className="mt-8 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                          Aging Summary
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>
                            {reportData.isClientDrilldown
                              ? 'Invoices with Balance:'
                              : 'Clients with Balance:'}{' '}
                            <span className="font-semibold text-zinc-800">
                              {reportData.summary.count}
                            </span>
                          </span>
                          <span className="text-zinc-300">·</span>
                          <span>
                            Total Outstanding (AR):{' '}
                            <span
                              className={cn(
                                'font-bold tabular-nums',
                                reportData.summary.totalOutstanding > 0
                                  ? 'text-blue-700'
                                  : 'text-emerald-600',
                              )}
                            >
                              {formatZAR(reportData.summary.totalOutstanding)}
                            </span>
                          </span>
                        </div>
                      </div>
                      <table className="w-full text-xs text-center border border-zinc-200 table-fixed">
                        <thead>
                          <tr className="border-b border-zinc-200">
                            <th className="py-2 px-1 font-semibold uppercase tracking-wider text-[10px] bg-red-100 text-red-800 whitespace-nowrap">
                              61+ Days
                            </th>
                            <th className="py-2 px-1 font-semibold uppercase tracking-wider text-[10px] border-l border-zinc-200 bg-rose-100 text-rose-800 whitespace-nowrap">
                              31–60 Days
                            </th>
                            <th className="py-2 px-1 font-semibold uppercase tracking-wider text-[10px] border-l border-zinc-200 bg-orange-100 text-orange-800 whitespace-nowrap">
                              15–30 Days
                            </th>
                            <th className="py-2 px-1 font-semibold uppercase tracking-wider text-[10px] border-l border-zinc-200 bg-amber-100 text-amber-800 whitespace-nowrap">
                              1–14 Days
                            </th>
                            <th className="py-2 px-1 font-semibold uppercase tracking-wider text-[10px] border-l border-zinc-200 bg-emerald-100 text-emerald-800 whitespace-nowrap">
                              Current
                            </th>
                            <th className="py-2 px-1 font-bold uppercase tracking-wider text-[10px] border-l border-zinc-200 bg-zinc-100 text-zinc-950 whitespace-nowrap">
                              Total Overdue
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td
                              className={cn(
                                'py-3 px-1 tabular-nums font-bold whitespace-nowrap',
                                reportData.summary.total61Plus > 0
                                  ? 'text-red-600'
                                  : 'text-zinc-400',
                              )}
                            >
                              {formatZAR(reportData.summary.total61Plus)}
                            </td>
                            <td
                              className={cn(
                                'py-3 px-1 tabular-nums font-semibold border-l border-zinc-200 whitespace-nowrap',
                                reportData.summary.total31_60 > 0
                                  ? 'text-rose-600'
                                  : 'text-zinc-400',
                              )}
                            >
                              {formatZAR(reportData.summary.total31_60)}
                            </td>
                            <td
                              className={cn(
                                'py-3 px-1 tabular-nums font-semibold border-l border-zinc-200 whitespace-nowrap',
                                reportData.summary.total15_30 > 0
                                  ? 'text-orange-600'
                                  : 'text-zinc-400',
                              )}
                            >
                              {formatZAR(reportData.summary.total15_30)}
                            </td>
                            <td
                              className={cn(
                                'py-3 px-1 tabular-nums font-semibold border-l border-zinc-200 whitespace-nowrap',
                                reportData.summary.total1_14 > 0
                                  ? 'text-amber-600'
                                  : 'text-zinc-400',
                              )}
                            >
                              {formatZAR(reportData.summary.total1_14)}
                            </td>
                            <td
                              className={cn(
                                'py-3 px-1 tabular-nums font-semibold border-l border-zinc-200 whitespace-nowrap',
                                reportData.summary.totalCurrent > 0
                                  ? 'text-emerald-600'
                                  : 'text-zinc-400',
                              )}
                            >
                              {formatZAR(reportData.summary.totalCurrent)}
                            </td>
                            <td
                              className={cn(
                                'py-3 px-1 tabular-nums font-bold border-l border-zinc-200 whitespace-nowrap',
                                reportData.summary.totalOverdue > 0
                                  ? 'text-red-600'
                                  : 'text-zinc-700',
                              )}
                            >
                              {formatZAR(reportData.summary.totalOverdue)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
              </div>

              {/* ── Document Footer (matches pdfcn PageFooter) ── */}
              <div className="mt-auto mx-6 sm:mx-10 py-4 border-t border-zinc-200 flex items-center justify-between text-[10px] text-zinc-400">
                <span>
                  A division of Playhouse Media Group · Reg:{' '}
                  {org.registrationNumber || '2023/683669/07'}
                </span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Filter Controls (matches Statement page sidebar) */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-16 lg:self-start">
          <Card size="sm" className="overflow-hidden relative">
            {/* Sidebar Loading Progress Bar */}
            {loading && (
              <div
                aria-label="Updating filters"
                role="progressbar"
                className="absolute top-0 left-0 right-0 h-0.5 bg-primary/10 overflow-hidden z-10"
              >
                <div className="h-full bg-primary animate-indeterminate w-full origin-left" />
              </div>
            )}
            <CardContent className="pt-4">
              <div className="flex flex-col gap-4">
                {/* 1. Report Type */}
                <div className="flex flex-col gap-1.5 pb-3 border-b border-border/40">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Report Type
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(
                      [
                        { value: 'invoices', label: 'Invoices' },
                        { value: 'payments', label: 'Payments' },
                        { value: 'expenses', label: 'Expenses' },
                        { value: 'aging', label: 'AR Aging' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => {
                          const nextClient =
                            t.value !== 'expenses' && clientId === 'unassigned' ? 'all' : clientId;
                          setReportType(t.value);
                          setClientId(nextClient);
                          syncUrl({ type: t.value, clientId: nextClient });
                        }}
                        className={cn(
                          'flex items-center justify-center rounded-md border px-2.5 py-1.5 text-xs transition-all',
                          reportType === t.value
                            ? 'border-primary bg-primary/10 font-semibold text-primary shadow-xs'
                            : 'border-border text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Client Filter */}
                <div className="flex flex-col gap-1.5 pb-3 border-b border-border/40">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Client
                  </span>
                  <SearchableClientSelect
                    clients={searchableClients}
                    value={clientId}
                    onValueChange={(val) => {
                      const nextVal = val || 'all';
                      setClientId(nextVal);
                      syncUrl({ clientId: nextVal });
                    }}
                    emptyOption={{ value: 'all', label: 'All Clients' }}
                    placeholder="All Clients"
                  />
                  {clientId === 'all' && reportType !== 'aging' && (
                    <div className="flex flex-col gap-1.5 pt-2">
                      <span className="text-[11px] text-muted-foreground">Group records</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { value: 'none', label: 'Detailed' },
                            { value: 'client', label: 'By Client' },
                          ] as const
                        ).map((g) => (
                          <button
                            key={g.value}
                            type="button"
                            aria-pressed={groupBy === g.value}
                            onClick={() => {
                              setGroupBy(g.value);
                              syncUrl({ groupBy: g.value });
                            }}
                            className={cn(
                              'flex items-center justify-center rounded-md border px-2.5 py-1.5 text-xs transition-all',
                              groupBy === g.value
                                ? 'border-primary bg-primary/10 font-semibold text-primary shadow-xs'
                                : 'border-border text-muted-foreground hover:bg-muted',
                            )}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                      {groupBy === 'client' && (
                        <span className="text-[11px] text-muted-foreground/80">
                          {reportType === 'invoices'
                            ? 'Totals invoiced, paid and owing per client.'
                            : reportType === 'payments'
                              ? 'Total payments received per client.'
                              : 'Total expenses per client.'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Rolling Period Presets (hidden for point-in-time Aging) */}
                {reportType !== 'aging' && (
                  <>
                    <div className="flex flex-col gap-1.5 pb-3 border-b border-border/40">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Quick Periods
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            { id: 'this_month', label: 'Current Month' },
                            { id: 'last_month', label: 'Previous Month' },
                            { id: 'past_3_months', label: 'Past 3 Months' },
                            { id: 'current_fy', label: 'Current FY' },
                            { id: 'previous_fy', label: 'Previous FY' },
                            { id: 'all_time', label: 'All Time' },
                          ] as const
                        ).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setPreset(p.id);
                              const { startDate: s, endDate: e } = computePresetDates(p.id);
                              setStartDate(s);
                              setEndDate(e);
                              syncUrl({ startDate: s, endDate: e });
                            }}
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-xs transition-all',
                              preset === p.id
                                ? 'border-primary bg-primary/10 font-semibold text-primary'
                                : 'border-border text-muted-foreground hover:bg-muted',
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. Custom Date Range */}
                    <div className="flex flex-col gap-2 pb-3 border-b border-border/40">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Date Range
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] text-muted-foreground">From</label>
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                              const s = e.target.value;
                              setStartDate(s);
                              setPreset('custom');
                              syncUrl({ startDate: s });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] text-muted-foreground">To</label>
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                              const eVal = e.target.value;
                              setEndDate(eVal);
                              setPreset('custom');
                              syncUrl({ endDate: eVal });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 5. Division Filter */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Division
                  </span>
                  <Select
                    value={divisionId}
                    onValueChange={(val) => {
                      setDivisionId(val);
                      syncUrl({ divisionId: val });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Divisions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {divisions.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 6. Status (Invoices) or Category (Expenses) */}
                {(reportType === 'invoices' || (reportType === 'aging' && clientId !== 'all')) && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Invoice Status
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: 'all_active', label: 'All Active' },
                          { id: 'only_outstanding', label: 'Unpaid & Not Fully Paid' },
                          { id: 'unpaid', label: 'Unpaid Only' },
                          { id: 'partially_paid', label: 'Not Fully Paid' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setStatus(opt.id);
                            syncUrl({ status: opt.id });
                          }}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-xs transition-all',
                            status === opt.id
                              ? 'border-primary bg-primary/10 font-semibold text-primary'
                              : 'border-border text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <Select
                      value={status}
                      onValueChange={(val) => {
                        setStatus(val);
                        syncUrl({ status: val });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_active">Active (Excl. Draft & Void)</SelectItem>
                        <SelectItem value="only_outstanding">Unpaid & Not Fully Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid Only</SelectItem>
                        <SelectItem value="partially_paid">
                          Not Fully Paid (Partially Paid)
                        </SelectItem>
                        <SelectItem value="issued">Issued</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="all">All Statuses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {reportType === 'expenses' && categories.length > 0 && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-border/40">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Category
                    </span>
                    <Select
                      value={category}
                      onValueChange={(val) => {
                        setCategory(val);
                        syncUrl({ category: val });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
