import 'server-only';

import {
  getOrganisationSettings,
  getProfitAndLoss,
  getTrialBalance,
  getGeneralLedger,
  getJournalEntries,
  getJournalLinesForEntries,
  type ProfitAndLossResult,
  type TrialBalanceRow,
  type GeneralLedgerRow,
  type JournalEntry,
  type JournalEntryLineRow,
} from '@pmg/db';
import { buildOrgProps } from '@pmg/billing/client-billing-helpers';
import { formatZAR, fmtDate, fmtDateLong, fmtMonthYear } from '@pmg/billing/format';
import { PAGE, split, ensurePage, drawShellHeader, drawShellFooter, type PdfOrgHeader } from '@pmg/billing/pdf-shell';
import { jsPDF } from 'jspdf';

export type AccountingReportType =
  | 'profit-and-loss'
  | 'trial-balance'
  | 'general-ledger'
  | 'journal-entries'
  | 'chart-of-accounts';

export interface AccountingPdfFilters {
  /** Accounting period, "YYYY-MM". Used by journal-entries, trial-balance, profit-and-loss. */
  period?: string;
  /** Chart-of-accounts account id. Used by general-ledger. */
  accountId?: string;
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
  'profit-and-loss',
  'trial-balance',
  'general-ledger',
  'journal-entries',
  'chart-of-accounts',
]);

export function isAccountingReportType(value: string): value is AccountingReportType {
  return REPORT_TYPES.has(value as AccountingReportType);
}

/** Playhouse Media Group is the top-level legal entity for these consolidated,
 * whole-company reports — unlike billing documents these aren't scoped to a
 * single division, so there's no divisionName to derive branding from. */
const COMPANY_NAME = 'Playhouse Media Group';

interface AccountingReportHeader {
  title: string;
  org: PdfOrgHeader;
  periodLabel: string;
  generatedAt: string;
}

async function buildReportHeader(title: string, period?: string): Promise<AccountingReportHeader> {
  const orgSettings = await getOrganisationSettings();
  return {
    title,
    org: buildOrgProps(COMPANY_NAME, null, orgSettings),
    periodLabel: period ? fmtMonthYear(period) : 'All Time',
    generatedAt: fmtDateLong(new Date()),
  };
}

function drawReportHeader(doc: jsPDF, header: AccountingReportHeader): void {
  drawShellHeader(doc, {
    org: header.org,
    title: header.title,
    number: header.periodLabel,
    status: `Generated ${header.generatedAt}`,
  });
}

function drawReportFooter(doc: jsPDF, header: AccountingReportHeader): void {
  drawShellFooter(doc, { divisionOf: header.org.divisionOf });
}

function drawAccountRow(doc: jsPDF, y: number, code: string, name: string, amount: number, bold = false): void {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);
  doc.text(`${code} — ${name}`, PAGE.margin + 2, y);
  doc.text(formatZAR(amount), PAGE.width - PAGE.margin - 2, y, { align: 'right' });
}

function drawSectionHeaderBand(doc: jsPDF, y: number, label: string): number {
  doc.setFillColor(249, 250, 251);
  doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text(label, PAGE.margin + 2, y + 6);
  doc.text('AMOUNT', PAGE.width - PAGE.margin - 2, y + 6, { align: 'right' });
  return y + 13;
}

function drawTotalRow(doc: jsPDF, y: number, label: string, amount: number): number {
  doc.setDrawColor(229, 231, 235);
  doc.line(PAGE.margin, y - 3, PAGE.width - PAGE.margin, y - 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);
  doc.text(label, PAGE.margin + 2, y + 4);
  doc.text(formatZAR(amount), PAGE.width - PAGE.margin - 2, y + 4, { align: 'right' });
  return y + 12;
}

function drawProfitAndLossTable(doc: jsPDF, startY: number, result: ProfitAndLossResult): number {
  let y = startY;

  y = ensurePage(doc, y, 22);
  y = drawSectionHeaderBand(doc, y, 'REVENUE');
  for (const row of result.revenue) {
    y = ensurePage(doc, y, 8);
    drawAccountRow(doc, y, row.accountCode, row.accountName, row.amount);
    y += 7;
  }
  y = ensurePage(doc, y, 12);
  y = drawTotalRow(doc, y, 'Total Revenue', result.totalRevenue);

  y += 4;
  y = ensurePage(doc, y, 22);
  y = drawSectionHeaderBand(doc, y, 'EXPENSES');
  for (const row of result.expenses) {
    y = ensurePage(doc, y, 8);
    drawAccountRow(doc, y, row.accountCode, row.accountName, row.amount);
    y += 7;
  }
  y = ensurePage(doc, y, 12);
  y = drawTotalRow(doc, y, 'Total Expenses', result.totalExpenses);

  y += 6;
  y = ensurePage(doc, y, 16);
  doc.setDrawColor(24, 24, 27);
  doc.line(PAGE.margin, y - 4, PAGE.width - PAGE.margin, y - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(result.netProfit >= 0 ? 5 : 220, result.netProfit >= 0 ? 150 : 38, result.netProfit >= 0 ? 105 : 38);
  doc.text('Net Profit', PAGE.margin + 2, y + 6);
  doc.text(formatZAR(result.netProfit), PAGE.width - PAGE.margin - 2, y + 6, { align: 'right' });

  return y + 14;
}

async function buildProfitAndLossPdf(filters: AccountingPdfFilters): Promise<AccountingPdfResult> {
  const [result, header] = await Promise.all([
    getProfitAndLoss(filters.period),
    buildReportHeader('Profit & Loss Statement', filters.period),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawReportHeader(doc, header);
  drawProfitAndLossTable(doc, 72, result);
  drawReportFooter(doc, header);

  const periodSuffix = filters.period ?? 'all-time';
  return {
    fileName: `profit-and-loss-${periodSuffix}.pdf`,
    buffer: Buffer.from(doc.output('arraybuffer')),
  };
}

const TRIAL_BALANCE_COLS = { code: PAGE.margin + 2, name: PAGE.margin + 24, type: 132, debit: 168, credit: PAGE.width - PAGE.margin - 2 };

function drawTrialBalanceTable(doc: jsPDF, startY: number, rows: TrialBalanceRow[]): number {
  let y = startY;

  y = ensurePage(doc, y, 12);
  doc.setFillColor(249, 250, 251);
  doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text('CODE', TRIAL_BALANCE_COLS.code, y + 6);
  doc.text('ACCOUNT', TRIAL_BALANCE_COLS.name, y + 6);
  doc.text('TYPE', TRIAL_BALANCE_COLS.type, y + 6);
  doc.text('DEBIT', TRIAL_BALANCE_COLS.debit, y + 6, { align: 'right' });
  doc.text('CREDIT', TRIAL_BALANCE_COLS.credit, y + 6, { align: 'right' });
  y += 13;

  let totalDebits = 0;
  let totalCredits = 0;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  for (const row of rows) {
    if (row.totalDebits === 0 && row.totalCredits === 0) continue; // skip untouched accounts
    y = ensurePage(doc, y, 8);
    totalDebits += row.totalDebits;
    totalCredits += row.totalCredits;
    doc.setTextColor(24, 24, 27);
    doc.text(row.accountCode, TRIAL_BALANCE_COLS.code, y + 4);
    doc.text(row.accountName, TRIAL_BALANCE_COLS.name, y + 4);
    doc.setTextColor(113, 113, 122);
    doc.text(row.accountType.charAt(0).toUpperCase() + row.accountType.slice(1), TRIAL_BALANCE_COLS.type, y + 4);
    doc.setTextColor(24, 24, 27);
    doc.text(row.totalDebits > 0 ? formatZAR(row.totalDebits) : '-', TRIAL_BALANCE_COLS.debit, y + 4, { align: 'right' });
    doc.text(row.totalCredits > 0 ? formatZAR(row.totalCredits) : '-', TRIAL_BALANCE_COLS.credit, y + 4, { align: 'right' });
    doc.setDrawColor(244, 244, 245);
    doc.line(PAGE.margin, y + 6, PAGE.width - PAGE.margin, y + 6);
    y += 8;
  }

  y = ensurePage(doc, y, 12);
  doc.setDrawColor(24, 24, 27);
  doc.line(PAGE.margin, y + 2, PAGE.width - PAGE.margin, y + 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);
  doc.text('Total', TRIAL_BALANCE_COLS.name, y + 9);
  const balanced = Math.abs(totalDebits - totalCredits) < 0.01;
  doc.setTextColor(balanced ? 24 : 220, balanced ? 24 : 38, balanced ? 27 : 38);
  doc.text(formatZAR(totalDebits), TRIAL_BALANCE_COLS.debit, y + 9, { align: 'right' });
  doc.text(formatZAR(totalCredits), TRIAL_BALANCE_COLS.credit, y + 9, { align: 'right' });

  return y + 16;
}

async function buildTrialBalancePdf(filters: AccountingPdfFilters): Promise<AccountingPdfResult> {
  const [rows, header] = await Promise.all([
    getTrialBalance(filters.period),
    buildReportHeader('Trial Balance', filters.period),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawReportHeader(doc, header);
  drawTrialBalanceTable(doc, 72, rows);
  drawReportFooter(doc, header);

  const periodSuffix = filters.period ?? 'all-time';
  return {
    fileName: `trial-balance-${periodSuffix}.pdf`,
    buffer: Buffer.from(doc.output('arraybuffer')),
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

// Safety cap even when a filter is applied — narrower than this would need
// its own filter refinement rather than an ever-larger single PDF.
const GENERAL_LEDGER_MAX_ROWS = 5000;

const GL_COLS = { date: PAGE.margin + 2, entryNo: 42, account: 66, description: 98, debit: 168, credit: PAGE.width - PAGE.margin - 2 };

function drawGeneralLedgerTable(doc: jsPDF, startY: number, rows: GeneralLedgerRow[]): number {
  let y = startY;

  y = ensurePage(doc, y, 12);
  doc.setFillColor(249, 250, 251);
  doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(113, 113, 122);
  doc.text('DATE', GL_COLS.date, y + 6);
  doc.text('ENTRY #', GL_COLS.entryNo, y + 6);
  doc.text('ACCOUNT', GL_COLS.account, y + 6);
  doc.text('DESCRIPTION', GL_COLS.description, y + 6);
  doc.text('DEBIT', GL_COLS.debit, y + 6, { align: 'right' });
  doc.text('CREDIT', GL_COLS.credit, y + 6, { align: 'right' });
  y += 12;

  let totalDebit = 0;
  let totalCredit = 0;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  for (const row of rows) {
    const descLines = split(doc, row.lineDescription || row.description, 66);
    const rowHeight = Math.max(8, descLines.length * 3.5 + 3);
    y = ensurePage(doc, y, rowHeight);
    totalDebit += row.debit;
    totalCredit += row.credit;
    doc.setTextColor(24, 24, 27);
    doc.text(fmtDate(row.entryDate), GL_COLS.date, y + 4);
    doc.text(row.entryNumber, GL_COLS.entryNo, y + 4);
    doc.text(row.accountCode, GL_COLS.account, y + 4);
    doc.text(descLines, GL_COLS.description, y + 4);
    doc.text(row.debit > 0 ? formatZAR(row.debit) : '-', GL_COLS.debit, y + 4, { align: 'right' });
    doc.text(row.credit > 0 ? formatZAR(row.credit) : '-', GL_COLS.credit, y + 4, { align: 'right' });
    doc.setDrawColor(244, 244, 245);
    doc.line(PAGE.margin, y + rowHeight, PAGE.width - PAGE.margin, y + rowHeight);
    y += rowHeight;
  }

  y = ensurePage(doc, y, 12);
  doc.setDrawColor(24, 24, 27);
  doc.line(PAGE.margin, y + 2, PAGE.width - PAGE.margin, y + 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(24, 24, 27);
  doc.text('Total', GL_COLS.account, y + 9);
  doc.text(formatZAR(totalDebit), GL_COLS.debit, y + 9, { align: 'right' });
  doc.text(formatZAR(totalCredit), GL_COLS.credit, y + 9, { align: 'right' });

  return y + 16;
}

async function buildGeneralLedgerPdf(filters: AccountingPdfFilters): Promise<AccountingPdfResult | AccountingPdfError> {
  if (!filters.period && !filters.accountId) {
    return { error: 'Select a period or an account before exporting the General Ledger — exporting all activity at once isn\'t supported.' };
  }

  const dateRange = filters.period ? periodToDateRange(filters.period) : {};
  const [ledgerResult, header] = await Promise.all([
    getGeneralLedger({ ...dateRange, accountId: filters.accountId, page: 1, pageSize: GENERAL_LEDGER_MAX_ROWS }),
    buildReportHeader('General Ledger', filters.period),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawReportHeader(doc, header);
  let y = drawGeneralLedgerTable(doc, 72, ledgerResult.data);
  if (ledgerResult.total > ledgerResult.data.length) {
    y = ensurePage(doc, y, 10);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text(
      `Showing ${ledgerResult.data.length} of ${ledgerResult.total} entries — narrow your filters to see the rest.`,
      PAGE.margin,
      y,
    );
  }
  drawReportFooter(doc, header);

  const suffix = [filters.period, filters.accountId].filter(Boolean).join('-') || 'filtered';
  return {
    fileName: `general-ledger-${suffix}.pdf`,
    buffer: Buffer.from(doc.output('arraybuffer')),
  };
}

// Same safety-net cap/truncation-notice pattern as general ledger.
const JOURNAL_ENTRIES_MAX_ROWS = 1000;

const STATUS_COLOR: Record<string, [number, number, number]> = {
  posted: [5, 150, 105],
  void: [220, 38, 38],
  draft: [217, 119, 6],
};

function drawJournalEntries(
  doc: jsPDF,
  startY: number,
  entries: JournalEntry[],
  linesByEntry: Map<string, JournalEntryLineRow[]>,
): number {
  let y = startY;

  for (const entry of entries) {
    const lines = linesByEntry.get(entry.id) ?? [];
    y = ensurePage(doc, y, 11 + Math.min(lines.length, 4) * 5.5);

    doc.setFillColor(249, 250, 251);
    doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(24, 24, 27);
    doc.text(entry.entryNumber, PAGE.margin + 2, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 82, 91);
    doc.text(fmtDate(entry.entryDate), PAGE.margin + 32, y + 5.5);
    doc.text(split(doc, entry.description, 78)[0] ?? '', PAGE.margin + 58, y + 5.5);
    doc.setFont('helvetica', 'bold');
    const [r, g, b] = STATUS_COLOR[entry.status] ?? [113, 113, 122];
    doc.setTextColor(r, g, b);
    doc.text(entry.status.toUpperCase(), PAGE.width - PAGE.margin - 2, y + 5.5, { align: 'right' });
    y += 11;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    for (const line of lines) {
      y = ensurePage(doc, y, 6);
      doc.setTextColor(82, 82, 91);
      doc.text(`${line.accountCode} — ${line.accountName}`, PAGE.margin + 8, y + 4);
      doc.setTextColor(24, 24, 27);
      doc.text(line.debit > 0 ? formatZAR(line.debit) : '', 150, y + 4, { align: 'right' });
      doc.text(line.credit > 0 ? formatZAR(line.credit) : '', PAGE.width - PAGE.margin - 2, y + 4, { align: 'right' });
      y += 5.5;
    }
    y += 4;
  }

  return y;
}

async function buildJournalEntriesPdf(filters: AccountingPdfFilters): Promise<AccountingPdfResult> {
  const [entriesResult, header] = await Promise.all([
    getJournalEntries({ period: filters.period, page: 1, pageSize: JOURNAL_ENTRIES_MAX_ROWS }),
    buildReportHeader('Journal Entries', filters.period),
  ]);

  const linesByEntry = new Map<string, JournalEntryLineRow[]>();
  const allLines = await getJournalLinesForEntries(entriesResult.data.map((e) => e.id));
  for (const line of allLines) {
    const arr = linesByEntry.get(line.journalEntryId) ?? [];
    arr.push(line);
    linesByEntry.set(line.journalEntryId, arr);
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawReportHeader(doc, header);
  let y = drawJournalEntries(doc, 72, entriesResult.data, linesByEntry);
  if (entriesResult.total > entriesResult.data.length) {
    y = ensurePage(doc, y, 10);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text(
      `Showing ${entriesResult.data.length} of ${entriesResult.total} entries — narrow your filters to see the rest.`,
      PAGE.margin,
      y,
    );
  }
  drawReportFooter(doc, header);

  const periodSuffix = filters.period ?? 'all-time';
  return {
    fileName: `journal-entries-${periodSuffix}.pdf`,
    buffer: Buffer.from(doc.output('arraybuffer')),
  };
}

/**
 * Generates a PDF for one of the 5 accounting reports on /accounting/exports.
 * Returns null for a valid-but-not-yet-implemented type (filled in phase by
 * phase) or when the underlying data can't be found, or an
 * `AccountingPdfError` when the caller needs to fix their request (e.g.
 * missing a required filter).
 */
export async function generateAccountingPdf(
  type: AccountingReportType,
  filters: AccountingPdfFilters = {},
): Promise<AccountingPdfResult | AccountingPdfError | null> {
  switch (type) {
    case 'profit-and-loss':
      return buildProfitAndLossPdf(filters);
    case 'trial-balance':
      return buildTrialBalancePdf(filters);
    case 'general-ledger':
      return buildGeneralLedgerPdf(filters);
    case 'journal-entries':
      return buildJournalEntriesPdf(filters);
    case 'chart-of-accounts':
      return null; // Phase 5
    default:
      return null;
  }
}
