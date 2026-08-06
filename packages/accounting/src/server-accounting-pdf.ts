import 'server-only';

import { getOrganisationSettings, getProfitAndLoss, type ProfitAndLossResult } from '@pmg/db';
import { buildOrgProps } from '@pmg/billing/client-billing-helpers';
import { formatZAR, fmtDateLong, fmtMonthYear } from '@pmg/billing/format';
import { PAGE, ensurePage, drawShellHeader, drawShellFooter, type PdfOrgHeader } from '@pmg/billing/pdf-shell';
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

/**
 * Generates a PDF for one of the 5 accounting reports on /accounting/exports.
 * Returns null for a valid-but-not-yet-implemented type (filled in phase by
 * phase) or when the underlying data can't be found.
 */
export async function generateAccountingPdf(
  type: AccountingReportType,
  filters: AccountingPdfFilters = {},
): Promise<AccountingPdfResult | null> {
  switch (type) {
    case 'profit-and-loss':
      return buildProfitAndLossPdf(filters);
    case 'trial-balance':
      return null; // Phase 2
    case 'general-ledger':
      return null; // Phase 3
    case 'journal-entries':
      return null; // Phase 4
    case 'chart-of-accounts':
      return null; // Phase 5
    default:
      return null;
  }
}
