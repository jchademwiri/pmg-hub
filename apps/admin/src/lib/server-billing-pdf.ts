import 'server-only';

import {
  getAllIncome,
  getClientStatement,
  getDivisionBillingSettings,
  getIncomeAllocations,
  getIncomeById,
  getInvoiceById,
  getQuotationById,
} from '@pmg/db';
import { generateReceiptNumber } from '@pmg/utils';
import { jsPDF } from 'jspdf';

import { fmtDate, formatZAR, getSASTParts, getSASTToday } from '@/lib/format';

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

type PdfDocumentData = {
  type: BillingPdfType;
  title: string;
  number: string;
  status: string;
  issueDate: string;
  dueDateLabel?: string;
  dueDate?: string | null;
  org: {
    name: string;
    divisionOf?: string;
    email?: string;
    phone?: string;
    website?: string;
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

function drawFooter(doc: jsPDF, data: PdfDocumentData) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
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
    data.org.email,
    data.org.phone,
    data.org.website,
    data.org.salesRep ? `Rep: ${data.org.salesRep}` : undefined,
  ].filter(Boolean) as string[];
  orgLines.slice(0, 5).forEach((line, index) => doc.text(line, PAGE.margin, 24 + index * 4));

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(39, 39, 42);
  doc.text(data.org.name.slice(0, 18), PAGE.width / 2, 20, { align: 'center' });

  doc.setFontSize(20);
  doc.setTextColor(161, 161, 170);
  doc.text(data.title.toUpperCase(), PAGE.width - PAGE.margin, 18, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(63, 63, 70);
  doc.text(`#${data.number}`, PAGE.width - PAGE.margin, 25, { align: 'right' });
  doc.setFontSize(8);
  doc.text(data.status, PAGE.width - PAGE.margin, 31, { align: 'right' });

  doc.setDrawColor(229, 231, 235);
  doc.line(PAGE.margin, 45, PAGE.width - PAGE.margin, 45);
}

function drawMeta(doc: jsPDF, data: PdfDocumentData) {
  let y = 57;
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

  if (data.reference) {
    y += 27;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(113, 113, 122);
    doc.text('REFERENCE', PAGE.margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(82, 82, 91);
    doc.text(split(doc, data.reference, 160), PAGE.margin, y + 5);
  }

  return 88;
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

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  for (const tx of transactions) {
    y = ensurePage(doc, y, 9);
    doc.setTextColor(24, 24, 27);
    doc.text(fmtDate(tx.date), PAGE.margin + 2, y + 4);
    doc.text(split(doc, tx.reference, 26), 45, y + 4);
    doc.text(split(doc, tx.description, 52), 78, y + 4);
    doc.text(tx.debit != null ? formatZAR(tx.debit) : '-', 145, y + 4, { align: 'right' });
    doc.text(tx.credit != null ? formatZAR(tx.credit) : '-', 170, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(tx.balance != null ? formatZAR(tx.balance) : '-', PAGE.width - PAGE.margin - 2, y + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 9;
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
    doc.setTextColor(24, 24, 27);
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
  drawTextBlocks(doc, data, y);
  drawFooter(doc, data);
  return Buffer.from(doc.output('arraybuffer'));
}

async function buildInvoicePdfData(id: string): Promise<PdfDocumentData | null> {
  const invoice = await getInvoiceById(id);
  if (!invoice) return null;
  const settings = await getDivisionBillingSettings(invoice.divisionId);

  return {
    type: 'invoice',
    title: 'Invoice',
    number: invoice.documentNumber,
    status: statusLabel(invoice.status),
    issueDate: invoice.invoiceDate,
    dueDateLabel: 'Due Date',
    dueDate: invoice.dueDate,
    reference: invoice.reference,
    org: {
      name: invoice.divisionName,
      divisionOf: 'Playhouse Media Group',
      email: settings?.salesRepEmail ?? undefined,
      phone: settings?.salesRepPhone ?? undefined,
      website: settings?.divisionWebsite ?? undefined,
      salesRep: settings?.salesRepName ?? undefined,
    },
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

  return {
    type: 'quote',
    title: 'Quotation',
    number: quote.documentNumber,
    status: statusLabel(quote.status),
    issueDate: quote.quoteDate,
    dueDateLabel: 'Expiry Date',
    dueDate: quote.expiryDate,
    reference: quote.reference,
    org: {
      name: quote.divisionName,
      divisionOf: 'Playhouse Media Group',
      email: settings?.salesRepEmail ?? undefined,
      phone: settings?.salesRepPhone ?? undefined,
      website: settings?.divisionWebsite ?? undefined,
      salesRep: settings?.salesRepName ?? undefined,
    },
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
  const [settings, allocations] = await Promise.all([
    getDivisionBillingSettings(payment.divisionId),
    getIncomeAllocations(id),
  ]);

  return {
    type: 'receipt',
    title: 'Receipt',
    number: generateReceiptNumber(payment.id, payment.divisionName),
    status: 'Paid',
    issueDate: payment.date,
    org: {
      name: payment.divisionName,
      divisionOf: 'Playhouse Media Group',
      email: settings?.salesRepEmail ?? undefined,
      phone: settings?.salesRepPhone ?? undefined,
      website: settings?.divisionWebsite ?? undefined,
      salesRep: settings?.salesRepName ?? undefined,
    },
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
  const incomeResult = await getAllIncome({ clientId, ...filters });
  const invoiceToIncome = new Map<string, string>();
  for (const invoice of statement.invoices) {
    if (invoice.incomeId) invoiceToIncome.set(invoice.incomeId, invoice.documentNumber);
  }

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
  ].sort((a, b) => a.date.localeCompare(b.date));

  let balance = statement.summary.openingBalance ?? 0;
  const transactions = raw.map((tx) => {
    balance = balance + (tx.debit ?? 0) - (tx.credit ?? 0);
    return { ...tx, balance };
  }).reverse();

  const { year } = getSASTParts();
  const status = statement.summary.totalOutstanding > 0 ? 'Outstanding' : 'Paid';
  return {
    type: 'statement',
    title: 'Statement',
    number: `ST-${statement.client.name.toUpperCase().substring(0, 3)}-${filters?.year ?? year}`,
    status,
    issueDate: getSASTToday(),
    org: {
      name: 'Playhouse Media Group',
      divisionOf: 'Playhouse Media Group',
    },
    client: {
      name: statement.client.businessName ?? statement.client.name,
      email: statement.client.email,
      phone: statement.client.phone,
    },
    transactions,
    totals: {
      subtotal: safeNumber(statement.summary.totalInvoiced),
      paid: safeNumber(statement.summary.totalPaid),
      balanceDue: safeNumber(statement.summary.totalOutstanding),
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
