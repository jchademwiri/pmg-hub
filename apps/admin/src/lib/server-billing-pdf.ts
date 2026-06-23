import 'server-only';

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import {
  and,
  creditNotes,
  creditRefunds,
  eq,
  getAllIncome,
  getClientById,
  getClientStatement,
  getDb,
  getDivisionBillingSettings,
  getAllDivisions,
  getIncomeAllocations,
  getIncomeById,
  getInvoiceById,
  getMonthPeriodDates,
  getOrganisationSettings,
  getQuotationById,
  sql,
} from '@pmg/db';
import { generateReceiptNumber } from '@pmg/utils';
import { jsPDF } from 'jspdf';

import { fmtDate, formatZAR, getSASTParts, getSASTToday } from '@/lib/format';
import { calculateAgeing, totalAgeingDue } from '@/lib/billing-ageing';
import { buildOrgProps, determineStatementStatus, buildIncomeInvoiceMap, buildTransactionHistory, adjustOpeningBalance, resolveDivisionBranding } from '@/lib/client-billing-helpers';

type BillingPdfType = 'invoice' | 'quote' | 'statement' | 'receipt';

type PdfLineItem = {
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

type PdfTransaction = {
  date: string;
  reference: string;
  description: string;
  debit?: number;
  credit?: number;
  balance?: number;
};

type PdfAgeing = {
  current: number;
  days1_14: number;
  days15_30: number;
  days31_60: number;
  days61plus: number;
};

type PdfDocumentData = {
  type: BillingPdfType;
  title: string;
  number: string;
  status: string;
  issueDate: string;
  dueDateLabel?: string;
  dueDate?: string | null;
  periodFrom?: string;
  periodTo?: string;
  org: {
    name: string;
    divisionOf?: string;
    registrationNumber?: string;
    vatNumber?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    salesRep?: string;
  };
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  reference?: string | null;
  lineItems?: PdfLineItem[];
  transactions?: PdfTransaction[];
  openingBalance?: number;
  ageing?: PdfAgeing;
  notes?: string | null;
  terms?: string | null;
  banking?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branchCode: string;
  };
  totals?: {
    subtotal?: number;
    discount?: number;
    vat?: number;
    total?: number;
    paid?: number;
    balanceDue?: number;
  };
};

const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
  bottom: 280,
};

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

function safeNumber(value: unknown) {
  return Number(value ?? 0) || 0;
}

function split(doc: jsPDF, text: string | undefined | null, width: number) {
  return doc.splitTextToSize(text || '', width) as string[];
}

function ensurePage(doc: jsPDF, y: number, needed = 16) {
  if (y + needed <= PAGE.bottom) return y;
  doc.addPage();
  return PAGE.margin;
}

function getLogoPath(orgName: string) {
  const normalized = orgName.toLowerCase();
  const fileName = /tender edge|tes/.test(normalized)
    ? 'tes-logo.png'
    : /apex|aws/.test(normalized)
    ? 'aws-logo.png'
    : 'pmg-logo.png';

  const fullPath = join(process.cwd(), 'public', 'logo', fileName);
  return existsSync(fullPath) ? fullPath : null;
}

function drawCenteredLogo(doc: jsPDF, orgName: string) {
  const logoPath = getLogoPath(orgName);
  if (!logoPath) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(39, 39, 42);
    doc.text(split(doc, orgName, 42), PAGE.width / 2, 18, { align: 'center' });
    return;
  }

  const logoData = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`;
  const normalized = orgName.toLowerCase();
  const size = /tender edge|tes/.test(normalized) ? 22 : 20;
  doc.addImage(logoData, 'PNG', PAGE.width / 2 - size / 2, 10, size, size, undefined, 'FAST');
}

function drawFooter(doc: jsPDF, data: PdfDocumentData) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Draw ageing summary on every page for statements
    if (data.type === 'statement' && data.ageing) {
      const ageing = data.ageing;
      const totalDue = totalAgeingDue(ageing);
      const buckets = [
        ['61+ Days', ageing.days61plus],
        ['31-60 Days', ageing.days31_60],
        ['15-30 Days', ageing.days15_30],
        ['1-14 Days', ageing.days1_14],
        ['Current', ageing.current],
        ['Total Due', totalDue],
      ] as const;

      const tableWidth = PAGE.width - PAGE.margin * 2;
      const colWidth = tableWidth / buckets.length;
      const headerY = 261;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(113, 113, 122);
      doc.text('AGEING SUMMARY', PAGE.margin, headerY);

      const tableY = headerY + 2;
      doc.setFillColor(249, 250, 251);
      doc.rect(PAGE.margin, tableY, tableWidth, 8, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.rect(PAGE.margin, tableY, tableWidth, 16);

      doc.setFontSize(6);
      buckets.forEach(([label], index) => {
        const x = PAGE.margin + index * colWidth;
        if (index > 0) doc.line(x, tableY, x, tableY + 16);
        doc.text(label, x + colWidth / 2, tableY + 5, { align: 'center' });
      });

      buckets.forEach(([, amount], index) => {
        const x = PAGE.margin + index * colWidth;
        // 0=61+ Days, 1=31-60 Days → red; 2=15-30 Days, 3=1-14 Days → amber; rest → default
        if (index <= 1 && amount > 0) {
          const redIntensity = Math.min(255, 180 + index * 25);
          doc.setTextColor(redIntensity, 50 + index * 10, 50);
        } else if ((index === 2 || index === 3) && amount > 0) {
          doc.setTextColor(217, 119, 6);
        } else {
          doc.setTextColor(24, 24, 27);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(formatZAR(amount), x + colWidth / 2, tableY + 13, { align: 'center' });
      });
    }

    doc.setDrawColor(229, 231, 235);
    doc.line(PAGE.margin, 282, PAGE.width - PAGE.margin, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(data.org.divisionOf ? `A division of ${data.org.divisionOf}` : 'Thank you for your business.', PAGE.margin, 288);
    doc.text(`Page ${i} of ${pageCount}`, PAGE.width - PAGE.margin, 288, { align: 'right' });
  }
}

function drawHeader(doc: jsPDF, data: PdfDocumentData) {
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, PAGE.width, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(24, 24, 27);
  doc.text(data.org.name, PAGE.margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(82, 82, 91);
  const orgLines = [
    data.org.divisionOf ? `A division of ${data.org.divisionOf}` : undefined,
    data.org.registrationNumber ? `Reg: ${data.org.registrationNumber}` : undefined,
    data.org.vatNumber ? `VAT: ${data.org.vatNumber}` : undefined,
    data.org.email,
    data.org.phone,
    data.org.website,
    data.org.address,
    data.org.salesRep ? `Rep: ${data.org.salesRep}` : undefined,
  ].filter(Boolean) as string[];
  orgLines.slice(0, 8).forEach((line, index) => doc.text(line, PAGE.margin, 24 + index * 4));

  drawCenteredLogo(doc, data.org.name);

  doc.setFontSize(20);
  doc.setTextColor(161, 161, 170);
  doc.text(data.title.toUpperCase(), PAGE.width - PAGE.margin, 18, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(63, 63, 70);
  doc.text(`#${data.number}`, PAGE.width - PAGE.margin, 25, { align: 'right' });
  doc.setFontSize(8);
  doc.text(data.status, PAGE.width - PAGE.margin, 31, { align: 'right' });

  // Total Due line (only for statements, below the status badge)
  if (data.type === 'statement' && data.totals?.balanceDue != null) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text(`Total Due: ${formatZAR(data.totals.balanceDue)}`, PAGE.width - PAGE.margin, 37, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  }

  doc.setDrawColor(229, 231, 235);
  doc.line(PAGE.margin, 60, PAGE.width - PAGE.margin, 60);
}

function drawMeta(doc: jsPDF, data: PdfDocumentData) {
  let y = 72;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text(data.type === 'statement' ? 'ACCOUNT' : data.type === 'receipt' ? 'RECEIVED FROM' : 'BILL TO', PAGE.margin, y);

  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text(data.client.name, PAGE.margin, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(82, 82, 91);
  if (data.client.email) doc.text(data.client.email, PAGE.margin, y + 12);
  if (data.client.phone) doc.text(data.client.phone, PAGE.margin, y + 17);

  if (data.type === 'statement' && data.periodFrom && data.periodTo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text('PERIOD FROM', PAGE.width - PAGE.margin - 45, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(24, 24, 27);
    doc.text(fmtDate(data.periodFrom), PAGE.width - PAGE.margin, y, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text('PERIOD TO', PAGE.width - PAGE.margin - 45, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(24, 24, 27);
    doc.text(fmtDate(data.periodTo), PAGE.width - PAGE.margin, y + 7, { align: 'right' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text('ISSUE DATE', PAGE.width - PAGE.margin - 45, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(24, 24, 27);
    doc.text(fmtDate(data.issueDate), PAGE.width - PAGE.margin, y, { align: 'right' });

    if (data.dueDateLabel && data.dueDate) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(113, 113, 122);
      doc.text(data.dueDateLabel.toUpperCase(), PAGE.width - PAGE.margin - 45, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(24, 24, 27);
      doc.text(fmtDate(data.dueDate), PAGE.width - PAGE.margin, y + 7, { align: 'right' });
    }
  }

  let bottomY = 96;

  if (data.reference) {
    y += 27;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text('REFERENCE', PAGE.margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91);
    const referenceLines = split(doc, data.reference, 160);
    doc.text(referenceLines, PAGE.margin, y + 5);
    bottomY = Math.max(bottomY, y + 8 + referenceLines.length * 4);
  }

  return bottomY + 8;
}

function drawLineItems(doc: jsPDF, data: PdfDocumentData, startY: number) {
  let y = startY;
  const items = data.lineItems ?? [];

  doc.setFillColor(249, 250, 251);
  doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text('DESCRIPTION', PAGE.margin + 2, y + 6);
  doc.text('QTY', 126, y + 6, { align: 'right' });
  doc.text('UNIT PRICE', 156, y + 6, { align: 'right' });
  doc.text('AMOUNT', PAGE.width - PAGE.margin - 2, y + 6, { align: 'right' });
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  for (const item of items) {
    const lines = split(doc, item.description, 92);
    const rowHeight = Math.max(10, lines.length * 4 + 4);
    y = ensurePage(doc, y, rowHeight);
    doc.setTextColor(24, 24, 27);
    doc.text(lines, PAGE.margin + 2, y + 4);
    doc.text(String(item.qty), 126, y + 4, { align: 'right' });
    doc.text(formatZAR(item.unitPrice), 156, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatZAR(item.amount), PAGE.width - PAGE.margin - 2, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(244, 244, 245);
    doc.line(PAGE.margin, y + rowHeight, PAGE.width - PAGE.margin, y + rowHeight);
    y += rowHeight;
  }

  return y + 6;
}

function drawTransactions(doc: jsPDF, data: PdfDocumentData, startY: number) {
  let y = startY;
  const transactions = data.transactions ?? [];

  doc.setFillColor(249, 250, 251);
  doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 9, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text('DATE', PAGE.margin + 2, y + 6);
  doc.text('REF', 45, y + 6);
  doc.text('DESCRIPTION', 78, y + 6);
  doc.text('DEBIT', 145, y + 6, { align: 'right' });
  doc.text('CREDIT', 170, y + 6, { align: 'right' });
  doc.text('BALANCE', PAGE.width - PAGE.margin - 2, y + 6, { align: 'right' });
  y += 12;

  if (data.openingBalance != null && data.openingBalance !== 0) {
    y = ensurePage(doc, y, 9);
    doc.setFillColor(249, 250, 251);
    doc.rect(PAGE.margin, y - 2, PAGE.width - PAGE.margin * 2, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(82, 82, 91);
    doc.text(fmtDate(data.periodFrom ?? data.issueDate), PAGE.margin + 2, y + 3);
    doc.text('Balance Brought Forward', 78, y + 3);
    doc.text('-', 145, y + 3, { align: 'right' });
    doc.text('-', 170, y + 3, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatZAR(data.openingBalance), PAGE.width - PAGE.margin - 2, y + 3, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 9;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  for (const tx of transactions) {
    const referenceLines = split(doc, tx.reference, 26);
    const descriptionLines = split(doc, tx.description, 52);
    const rowHeight = Math.max(
      9,
      Math.max(referenceLines.length, descriptionLines.length, 1) * 4 + 5,
    );
    y = ensurePage(doc, y, rowHeight);
    doc.setTextColor(24, 24, 27);
    doc.text(fmtDate(tx.date), PAGE.margin + 2, y + 4);
    doc.text(referenceLines, 45, y + 4);
    doc.text(descriptionLines, 78, y + 4);
    doc.text(tx.debit != null ? formatZAR(tx.debit) : '-', 145, y + 4, { align: 'right' });
    if (tx.credit != null) {
      doc.setTextColor(5, 150, 105); // green for credit/paid
    }
    doc.text(tx.credit != null ? formatZAR(tx.credit) : '-', 170, y + 4, { align: 'right' });
    doc.setTextColor(24, 24, 27);
    doc.setFont('helvetica', 'bold');
    doc.text(
      tx.balance != null ? formatZAR(tx.balance) : '-',
      PAGE.width - PAGE.margin - 2,
      y + 4,
      { align: 'right' },
    );
    doc.setFont('helvetica', 'normal');
    y += rowHeight;
  }

  return y + 6;
}

function drawTotals(doc: jsPDF, data: PdfDocumentData, startY: number) {
  let y = ensurePage(doc, startY, 45);
  const totals = data.totals;
  if (!totals) return y;

  const rows = [
    totals.subtotal != null ? ['Subtotal', totals.subtotal] as const : null,
    totals.discount && totals.discount > 0 ? ['Discount', -totals.discount] as const : null,
    totals.vat && totals.vat > 0 ? ['VAT', totals.vat] as const : null,
    totals.paid != null ? ['Total Paid', totals.paid] as const : null,
    totals.balanceDue != null ? ['Balance Due', totals.balanceDue] as const : null,
    totals.total != null ? ['Total', totals.total] as const : null,
  ].filter(Boolean) as ReadonlyArray<readonly [string, number]>;

  for (const [label, amount] of rows) {
    doc.setFont('helvetica', label === 'Total' || label === 'Balance Due' ? 'bold' : 'normal');
    doc.setFontSize(label === 'Total' || label === 'Balance Due' ? 10 : 8);
    if (label === 'Total Paid') {
      doc.setTextColor(5, 150, 105); // green for paid
    } else {
      doc.setTextColor(24, 24, 27);
    }
    doc.text(label, 132, y);
    doc.text(formatZAR(amount), PAGE.width - PAGE.margin, y, { align: 'right' });
    y += 7;
  }

  return y + 4;
}

function drawTextBlocks(doc: jsPDF, data: PdfDocumentData, startY: number) {
  let y = startY;
  const blocks = [
    data.banking
      ? {
          title: 'BANKING DETAILS',
          body: [
            `Bank: ${data.banking.bankName}`,
            `Account Name: ${data.banking.accountName}`,
            `Account Number: ${data.banking.accountNumber}`,
            `Branch Code: ${data.banking.branchCode}`,
          ].join('\n'),
        }
      : null,
    data.notes ? { title: 'NOTES', body: data.notes } : null,
    data.terms ? { title: 'TERMS & CONDITIONS', body: data.terms } : null,
  ].filter(Boolean) as Array<{ title: string; body: string }>;

  for (const block of blocks) {
    y = ensurePage(doc, y, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text(block.title, PAGE.margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91);
    const lines = split(doc, block.body, PAGE.width - PAGE.margin * 2);
    doc.text(lines, PAGE.margin, y + 5);
    y += lines.length * 4 + 12;
  }

  return y;
}

function renderPdf(data: PdfDocumentData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawHeader(doc, data);
  let y = drawMeta(doc, data);

  if (data.type === 'statement') {
    y = drawTransactions(doc, data, y);
  } else if (data.type === 'receipt') {
    y = drawTransactions(doc, data, y);
  } else {
    y = drawLineItems(doc, data, y);
  }

  y = drawTotals(doc, data, y);
  y = drawTextBlocks(doc, data, y);
  drawFooter(doc, data);
  return Buffer.from(doc.output('arraybuffer'));
}

async function buildInvoicePdfData(id: string): Promise<PdfDocumentData | null> {
  const invoice = await getInvoiceById(id);
  if (!invoice) return null;
  const settings = await getDivisionBillingSettings(invoice.divisionId);
  const orgSettings = await getOrganisationSettings();

  return {
    type: 'invoice',
    title: 'Invoice',
    number: invoice.documentNumber,
    status: statusLabel(invoice.status),
    issueDate: invoice.invoiceDate,
    dueDateLabel: 'Due Date',
    dueDate: invoice.dueDate,
    reference: invoice.reference,
    org: buildOrgProps(invoice.divisionName, settings, orgSettings),
    client: {
      name: invoice.clientName ?? 'No client',
      email: invoice.clientEmail,
      phone: invoice.clientPhone,
    },
    lineItems: invoice.lineItems.map((line) => ({
      description: line.itemName || line.description,
      qty: safeNumber(line.quantity),
      unitPrice: safeNumber(line.unitPrice),
      amount: safeNumber(line.lineTotal) || safeNumber(line.quantity) * safeNumber(line.unitPrice),
    })),
    notes: invoice.notes ?? settings?.invoiceNotes,
    terms: invoice.terms,
    banking: settings?.bankName
      ? {
          bankName: settings.bankName,
          accountName: settings.bankAccountName ?? '',
          accountNumber: settings.bankAccountNumber ?? '',
          branchCode: settings.bankBranchCode ?? '',
        }
      : undefined,
    totals: {
      subtotal: safeNumber(invoice.subtotal),
      discount: safeNumber(invoice.discountAmount),
      vat: safeNumber(invoice.vatAmount),
      total: safeNumber(invoice.total),
    },
  };
}

async function buildQuotePdfData(id: string): Promise<PdfDocumentData | null> {
  const quote = await getQuotationById(id);
  if (!quote) return null;
  const settings = await getDivisionBillingSettings(quote.divisionId);
  const orgSettings = await getOrganisationSettings();

  return {
    type: 'quote',
    title: 'Quotation',
    number: quote.documentNumber,
    status: statusLabel(quote.status),
    issueDate: quote.quoteDate,
    dueDateLabel: 'Expiry Date',
    dueDate: quote.expiryDate,
    reference: quote.reference,
    org: buildOrgProps(quote.divisionName, settings, orgSettings),
    client: {
      name: quote.clientName ?? 'No client',
      email: quote.clientEmail,
      phone: quote.clientPhone,
    },
    lineItems: quote.lineItems.map((line) => ({
      description: line.itemName || line.description,
      qty: safeNumber(line.quantity),
      unitPrice: safeNumber(line.unitPrice),
      amount: safeNumber(line.lineTotal) || safeNumber(line.quantity) * safeNumber(line.unitPrice),
    })),
    notes: quote.notes ?? settings?.quoteNotes,
    terms: quote.terms,
    banking: settings?.bankName
      ? {
          bankName: settings.bankName,
          accountName: settings.bankAccountName ?? '',
          accountNumber: settings.bankAccountNumber ?? '',
          branchCode: settings.bankBranchCode ?? '',
        }
      : undefined,
    totals: {
      subtotal: safeNumber(quote.subtotal),
      discount: safeNumber(quote.discountAmount),
      vat: safeNumber(quote.vatAmount),
      total: safeNumber(quote.total),
    },
  };
}

async function buildReceiptPdfData(id: string): Promise<PdfDocumentData | null> {
  const payment = await getIncomeById(id);
  if (!payment) return null;
  const [settings, allocations, orgSettings] = await Promise.all([
    getDivisionBillingSettings(payment.divisionId),
    getIncomeAllocations(id),
    getOrganisationSettings(),
  ]);

  return {
    type: 'receipt',
    title: 'Receipt',
    number: generateReceiptNumber(payment.id, payment.divisionName),
    status: 'Paid',
    issueDate: payment.date,
    org: buildOrgProps(payment.divisionName, settings, orgSettings),
    client: {
      name: payment.clientName ?? 'Client',
    },
    reference: payment.description,
    transactions: allocations.length
      ? allocations.map((allocation) => ({
          date: allocation.createdAt instanceof Date ? allocation.createdAt.toISOString() : String(allocation.createdAt),
          reference: allocation.invoiceNumber,
          description: 'Invoice allocation',
          credit: safeNumber(allocation.amount),
          balance: 0,
        }))
      : [{
          date: payment.date,
          reference: '-',
          description: payment.description ?? 'Unallocated payment / retainer',
          credit: safeNumber(payment.amount),
          balance: 0,
        }],
    totals: {
      paid: safeNumber(payment.amount),
    },
    notes: `This is an official payment receipt issued by ${payment.divisionName}.`,
  };
}

async function buildStatementPdfData(
  clientId: string,
  filters?: { year?: number; monthPeriod?: 'current' | 'previous' | 'past3' | 'past6' },
): Promise<PdfDocumentData | null> {
  const statement = await getClientStatement(clientId, filters);
  if (!statement) return null;
  const db = getDb();
  const orgSettings = await getOrganisationSettings();
  const [incomeResult, dbCreditNotes, dbRefunds] = await Promise.all([
    getAllIncome({ clientId, ...filters }),
    db.select().from(creditNotes).where(and(eq(creditNotes.clientId, clientId), sql`${creditNotes.status} != 'void'`)),
    db.select().from(creditRefunds).where(eq(creditRefunds.clientId, clientId)),
  ]);

  const { year: currentYear, month } = getSASTParts();
  const currentFY = month < 2 ? currentYear - 1 : currentYear;
  let periodFrom: string;
  let periodTo: string;
  if (filters?.monthPeriod) {
    const { startDate, endDate } = getMonthPeriodDates(filters.monthPeriod);
    periodFrom = startDate;
    periodTo = endDate;
  } else {
    const y = filters?.year ?? currentFY;
    periodFrom = `${y}-03-01`;
    const nextFYStart = new Date(y + 1, 2, 1);
    const lastDayOfFY = new Date(nextFYStart.getTime() - 24 * 60 * 60 * 1000);
    periodTo = `${lastDayOfFY.getFullYear()}-${String(lastDayOfFY.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfFY.getDate()).padStart(2, '0')}`;
  }

  const openingBalance = adjustOpeningBalance(
    statement.summary.openingBalance,
    dbCreditNotes,
    dbRefunds,
    periodFrom,
  );

  const invoiceToIncome = buildIncomeInvoiceMap(statement.invoices);

  const raw = [
    ...statement.invoices
      .filter((invoice) => invoice.status !== 'void')
      .map((invoice) => ({
        date: invoice.invoiceDate,
        reference: invoice.documentNumber,
        description: invoice.reference ?? 'Invoice',
        debit: safeNumber(invoice.total),
        credit: undefined,
      })),
    ...incomeResult.data.map((payment) => ({
      date: payment.date,
      reference: invoiceToIncome.get(payment.id) ?? '-',
      description: 'Payment received',
      debit: undefined,
      credit: safeNumber(payment.amount),
    })),
    ...dbCreditNotes
      .filter((note) => {
        const date = note.createdAt.toISOString().split('T')[0];
        return note.type !== 'overpayment' && date >= periodFrom && date <= periodTo;
      })
      .map((note) => ({
        date: note.createdAt.toISOString().split('T')[0],
        reference: note.documentNumber,
        description: note.reason ?? 'Credit Note',
        debit: undefined,
        credit: safeNumber(note.amount),
      })),
    ...dbRefunds
      .filter((refund) => refund.refundDate >= periodFrom && refund.refundDate <= periodTo)
      .map((refund) => ({
        date: refund.refundDate,
        reference: refund.reference ?? '-',
        description: refund.description ?? 'Credit refund',
        debit: safeNumber(refund.amount),
        credit: undefined,
      })),
  ];

  const transactions = buildTransactionHistory(raw, openingBalance);
  const finalBalance = transactions.length > 0 ? transactions[0]!.balance : openingBalance;

  const todayStr = getSASTToday();
  const ageing = calculateAgeing(
    statement.outstandingInvoices ?? statement.invoices,
    todayStr,
  );

  const clientRecord = await getClientById(clientId);
  const allDivisions = await getAllDivisions();
  const { divisionName, effectiveDivisionId } = resolveDivisionBranding(
    clientRecord?.divisionId,
    statement.invoices,
    allDivisions,
  );
  const settings = effectiveDivisionId ? await getDivisionBillingSettings(effectiveDivisionId) : null;

  const status = determineStatementStatus(statement.summary.totalOutstanding, statement.invoices);
  return {
    type: 'statement',
    title: 'Statement',
    number: `ST-${statement.client.name.toUpperCase().substring(0, 3)}-${filters?.year ?? currentYear}`,
    status,
    issueDate: getSASTToday(),
    periodFrom,
    periodTo,
    org: buildOrgProps(divisionName, settings, orgSettings),
    client: {
      name: statement.client.businessName ?? statement.client.name,
      email: statement.client.email,
      phone: statement.client.phone,
    },
    transactions,
    openingBalance,
    ageing,
    banking: settings?.bankName
      ? {
          bankName: settings.bankName,
          accountName: settings.bankAccountName ?? '',
          accountNumber: settings.bankAccountNumber ?? '',
          branchCode: settings.bankBranchCode ?? '',
        }
      : undefined,
    totals: {
      subtotal: safeNumber(statement.summary.totalInvoiced),
      paid: safeNumber(statement.summary.totalPaid),
      balanceDue: finalBalance,
    },
  };
}

export async function generateBillingPdf(
  type: BillingPdfType,
  id: string,
  filters?: { year?: number; monthPeriod?: 'current' | 'previous' | 'past3' | 'past6' },
) {
  const data =
    type === 'invoice'
      ? await buildInvoicePdfData(id)
      : type === 'quote'
      ? await buildQuotePdfData(id)
      : type === 'receipt'
      ? await buildReceiptPdfData(id)
      : await buildStatementPdfData(id, filters);

  if (!data) return null;

  return {
    fileName: `${data.title}-${data.number}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '-'),
    buffer: renderPdf(data),
  };
}
