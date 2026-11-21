import 'server-only';

import {
  getOrganisationSettings,
  getProfitAndLoss,
  getProfitAndLossByDivision,
  getClientPerformance,
  getBalanceSheet,
  getCashFlowStatement,
  getAnnualFinancialStatements,
  getTrialBalance,
  getGeneralLedger,
  getJournalEntries,
  getJournalLinesForEntries,
  getChartAccountsByType,
  getAllDivisions,
  type JournalEntryLineRow,
} from '@pmg/db';
import { buildOrgProps } from '@pmg/billing/client-billing-helpers';
import { fmtDateLong, fmtMonthYear } from '@pmg/billing/format';
import { type PdfOrgHeader } from '@pmg/billing/pdf';
import {
  renderDeclarativeProfitAndLoss,
  renderDeclarativeDivisionPerformance,
  renderDeclarativeBalanceSheet,
  renderDeclarativeCashFlow,
  renderDeclarativeTrialBalance,
  renderDeclarativeGeneralLedger,
  renderDeclarativeJournalEntries,
  renderDeclarativeChartOfAccounts,
  renderDeclarativeClientPerformance,
  renderDeclarativeAnnualFinancialStatements,
} from './pdf';

export type AccountingReportType =
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

export interface AccountingPdfFilters {
  /** Accounting period, "YYYY-MM". Used by journal-entries, trial-balance, profit-and-loss, division-performance, balance-sheet, cash-flow. */
  period?: string;
  /** Chart-of-accounts account id. Used by general-ledger. */
  accountId?: string;
  /** Division id. Scopes profit-and-loss, trial-balance, general-ledger, journal-entries to one division. */
  divisionId?: string;
}

export interface AccountingPdfResult {
  fileName: string;
  buffer: Buffer;
}

/** A caller-facing validation failure (e.g. missing required filters) — distinct
 * from `null`, which means "not found" / "not yet implemented". */
export interface AccountingPdfError {
  error: string;
}

const REPORT_TYPES: ReadonlySet<AccountingReportType> = new Set([
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
]);

export function isAccountingReportType(value: string): value is AccountingReportType {
  return REPORT_TYPES.has(value as AccountingReportType);
}

/** Playhouse Media Group is the top-level legal entity for these consolidated,
 * whole-company reports — unlike billing documents these aren't scoped to a
 * single division, so there's no divisionName to derive branding from. */
const COMPANY_NAME = 'Playhouse Media Group';

// Safety caps even when a filter is applied — narrower than this would need
// its own filter refinement rather than an ever-larger single PDF.
const GENERAL_LEDGER_MAX_ROWS = 5000;
const JOURNAL_ENTRIES_MAX_ROWS = 1000;

interface AccountingReportHeader {
  title: string;
  org: PdfOrgHeader;
  periodLabel: string;
  generatedAt: string;
}

/** Resolves a division id to its display name, so a division-filtered PDF is self-describing. */
async function resolveDivisionName(divisionId?: string): Promise<string | undefined> {
  if (!divisionId) return undefined;
  const allDivisions = await getAllDivisions();
  return allDivisions.find((d) => d.id === divisionId)?.name;
}

function formatPeriodLabel(period?: string): string {
  if (!period || period === 'all') return 'Period: All Time';
  if (period.endsWith('-FY')) return `Period: Annual FY${period.split('-')[0]} (Full Year)`;
  if (period.includes('-H')) return `Period: Bi-Annual ${period.replace('-', ' ')}`;
  if (period.includes('-Q')) return `Period: Quarterly ${period.replace('-', ' ')}`;
  return `Period: ${fmtMonthYear(period)}`;
}

async function buildReportHeader(
  title: string,
  period?: string,
  divisionLabel?: string,
): Promise<AccountingReportHeader> {
  const orgSettings = await getOrganisationSettings();
  return {
    title: divisionLabel ? `${title} — ${divisionLabel}` : title,
    org: buildOrgProps(COMPANY_NAME, null, orgSettings),
    periodLabel: formatPeriodLabel(period),
    generatedAt: fmtDateLong(new Date()),
  };
}

/** First and last day of a "YYYY-MM" period, for querying getGeneralLedger's date-range filter. */
function periodToDateRange(period: string): { startDate: string; endDate: string } {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
  return { startDate: `${period}-01`, endDate: `${period}-${String(lastDay).padStart(2, '0')}` };
}

async function buildProfitAndLossPdf(filters: AccountingPdfFilters): Promise<AccountingPdfResult> {
  const [result, byDivision, divisionName] = await Promise.all([
    getProfitAndLoss(filters.period, filters.divisionId),
    getProfitAndLossByDivision(filters.period),
    resolveDivisionName(filters.divisionId),
  ]);
  const header = await buildReportHeader('Profit & Loss Statement', filters.period, divisionName);
  const suffix = [filters.period ?? 'all-time', filters.divisionId].filter(Boolean).join('-');
  const fileName = `profit-and-loss-${suffix}.pdf`;

  const buffer = await renderDeclarativeProfitAndLoss(
    result,
    byDivision.length > 0 ? byDivision : undefined,
    header.org,
    header.periodLabel,
    divisionName,
    header.generatedAt,
  );
  return { fileName, buffer };
}

async function buildTrialBalancePdf(filters: AccountingPdfFilters): Promise<AccountingPdfResult> {
  const [rows, divisionName] = await Promise.all([
    getTrialBalance(filters.period, filters.divisionId),
    resolveDivisionName(filters.divisionId),
  ]);
  const header = await buildReportHeader('Trial Balance', filters.period, divisionName);
  const suffix = [filters.period ?? 'all-time', filters.divisionId].filter(Boolean).join('-');
  const fileName = `trial-balance-${suffix}.pdf`;

  const buffer = await renderDeclarativeTrialBalance(
    rows,
    header.org,
    header.periodLabel,
    divisionName,
    header.generatedAt,
  );
  return { fileName, buffer };
}

async function buildGeneralLedgerPdf(
  filters: AccountingPdfFilters,
): Promise<AccountingPdfResult | AccountingPdfError> {
  if (!filters.period && !filters.accountId) {
    return {
      error:
        "Select a period or an account before exporting the General Ledger — exporting all activity at once isn't supported.",
    };
  }

  const dateRange = filters.period ? periodToDateRange(filters.period) : {};
  const [ledgerResult, divisionName] = await Promise.all([
    getGeneralLedger({
      ...dateRange,
      accountId: filters.accountId,
      divisionId: filters.divisionId,
      page: 1,
      pageSize: GENERAL_LEDGER_MAX_ROWS,
    }),
    resolveDivisionName(filters.divisionId),
  ]);
  const header = await buildReportHeader('General Ledger', filters.period, divisionName);
  const suffix =
    [filters.period, filters.accountId, filters.divisionId].filter(Boolean).join('-') || 'filtered';
  const fileName = `general-ledger-${suffix}.pdf`;

  const buffer = await renderDeclarativeGeneralLedger(
    ledgerResult.data,
    ledgerResult.total,
    header.org,
    header.periodLabel,
    divisionName,
    header.generatedAt,
  );
  return { fileName, buffer };
}

async function buildJournalEntriesPdf(filters: AccountingPdfFilters): Promise<AccountingPdfResult> {
  const [entriesResult, divisionName] = await Promise.all([
    getJournalEntries({
      period: filters.period,
      divisionId: filters.divisionId,
      page: 1,
      pageSize: JOURNAL_ENTRIES_MAX_ROWS,
    }),
    resolveDivisionName(filters.divisionId),
  ]);
  const header = await buildReportHeader('Journal Entries', filters.period, divisionName);

  const linesByEntryRecord: Record<string, JournalEntryLineRow[]> = {};
  const allLines = await getJournalLinesForEntries(entriesResult.data.map((e) => e.id));
  for (const line of allLines) {
    const arr = linesByEntryRecord[line.journalEntryId] ?? [];
    arr.push(line);
    linesByEntryRecord[line.journalEntryId] = arr;
  }
  const suffix = [filters.period ?? 'all-time', filters.divisionId].filter(Boolean).join('-');
  const fileName = `journal-entries-${suffix}.pdf`;

  const buffer = await renderDeclarativeJournalEntries(
    entriesResult.data,
    linesByEntryRecord,
    entriesResult.total,
    header.org,
    header.periodLabel,
    divisionName,
    header.generatedAt,
  );
  return { fileName, buffer };
}

async function buildChartOfAccountsPdf(): Promise<AccountingPdfResult> {
  const [grouped, header] = await Promise.all([
    getChartAccountsByType(),
    buildReportHeader('Chart of Accounts', undefined),
  ]);
  const fileName = 'chart-of-accounts.pdf';

  const buffer = await renderDeclarativeChartOfAccounts(grouped, header.org, header.generatedAt);
  return { fileName, buffer };
}

async function buildDivisionPerformancePdf(
  filters: AccountingPdfFilters,
): Promise<AccountingPdfResult> {
  const [byDivision, divisionName] = await Promise.all([
    getProfitAndLossByDivision(filters.period),
    resolveDivisionName(filters.divisionId),
  ]);
  const header = await buildReportHeader(
    'Division Performance Report',
    filters.period,
    divisionName,
  );
  const suffix = [filters.period ?? 'all-time', filters.divisionId].filter(Boolean).join('-');
  const fileName = `division-performance-${suffix}.pdf`;

  const buffer = await renderDeclarativeDivisionPerformance(
    byDivision,
    header.org,
    header.periodLabel,
    divisionName,
    header.generatedAt,
  );
  return { fileName, buffer };
}

async function buildBalanceSheetPdf(filters: AccountingPdfFilters): Promise<AccountingPdfResult> {
  const [result, divisionName] = await Promise.all([
    getBalanceSheet(filters.period, filters.divisionId),
    resolveDivisionName(filters.divisionId),
  ]);
  const header = await buildReportHeader(
    'Balance Sheet (Statement of Financial Position)',
    filters.period,
    divisionName,
  );
  const suffix = [filters.period ?? 'all-time', filters.divisionId].filter(Boolean).join('-');
  const fileName = `balance-sheet-${suffix}.pdf`;

  const buffer = await renderDeclarativeBalanceSheet(
    result,
    header.org,
    header.periodLabel,
    divisionName,
    header.generatedAt,
  );
  return { fileName, buffer };
}

async function buildCashFlowPdf(filters: AccountingPdfFilters): Promise<AccountingPdfResult> {
  const [result, divisionName] = await Promise.all([
    getCashFlowStatement(filters.period, filters.divisionId),
    resolveDivisionName(filters.divisionId),
  ]);
  const header = await buildReportHeader('Cash Flow Statement', filters.period, divisionName);
  const suffix = [filters.period ?? 'all-time', filters.divisionId].filter(Boolean).join('-');
  const fileName = `cash-flow-${suffix}.pdf`;

  const buffer = await renderDeclarativeCashFlow(
    result,
    header.org,
    header.periodLabel,
    divisionName,
    header.generatedAt,
  );
  return { fileName, buffer };
}

async function buildAnnualFinancialStatementsPdf(
  filters: AccountingPdfFilters,
): Promise<AccountingPdfResult> {
  const result = await getAnnualFinancialStatements(filters.period, filters.divisionId);
  const header = await buildReportHeader('Annual Financial Statements (AFS)', filters.period);
  const suffix = [filters.period ?? 'all-time', filters.divisionId].filter(Boolean).join('-');
  const fileName = `annual-financial-statements-${suffix}.pdf`;

  const buffer = await renderDeclarativeAnnualFinancialStatements(
    result,
    header.org,
    header.periodLabel,
    header.generatedAt,
  );
  return { fileName, buffer };
}

async function buildClientPerformancePdf(
  filters: AccountingPdfFilters,
): Promise<AccountingPdfResult> {
  const clients = await getClientPerformance(filters.period);
  const header = await buildReportHeader('Client Performance Report', filters.period);
  const suffix = [filters.period ?? 'all-time'].filter(Boolean).join('-');
  const fileName = `client-performance-${suffix}.pdf`;

  const buffer = await renderDeclarativeClientPerformance(
    clients,
    header.org,
    header.periodLabel,
    header.generatedAt,
  );
  return { fileName, buffer };
}

/**
 * Generates a PDF for one of the 10 accounting reports on /accounting/reports
 * using the declarative pdfcn (Takumi WASM) engine.
 */
export async function generateAccountingPdf(
  type: AccountingReportType,
  filters: AccountingPdfFilters = {},
): Promise<AccountingPdfResult | AccountingPdfError | null> {
  switch (type) {
    case 'annual-financial-statements':
      return buildAnnualFinancialStatementsPdf(filters);
    case 'balance-sheet':
      return buildBalanceSheetPdf(filters);
    case 'profit-and-loss':
      return buildProfitAndLossPdf(filters);
    case 'division-performance':
      return buildDivisionPerformancePdf(filters);
    case 'client-performance':
      return buildClientPerformancePdf(filters);
    case 'trial-balance':
      return buildTrialBalancePdf(filters);
    case 'cash-flow':
      return buildCashFlowPdf(filters);
    case 'general-ledger':
      return buildGeneralLedgerPdf(filters);
    case 'journal-entries':
      return buildJournalEntriesPdf(filters);
    case 'chart-of-accounts':
      return buildChartOfAccountsPdf();
    default:
      return null;
  }
}

export {
  renderDeclarativeInvoicesReport,
  renderDeclarativePaymentsReport,
  renderDeclarativeExpensesReport,
  renderDeclarativeClientSummaryReport,
  renderDeclarativeAgingReport,
  type AgingReportRow,
  type AgingReportDocumentProps,
  type InvoiceReportRow,
  type PaymentReportRow,
  type ExpenseReportRow,
  type ClientSummaryRow,
  type ClientSummaryValueColumn,
} from './pdf';
