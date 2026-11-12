import React from 'react';
import {
  formatZAR,
  formatZARWithCR,
  fmtDateLong,
  formatStatementDueDate,
  isDueDateOverdue,
} from '../../format';
import { Document } from '../primitives';
import type { OrgDetails } from '../components/page-header';
import {
  DOC_COLORS,
  DocumentPage,
  DocumentHeader,
  DocumentMetaRow,
  DocTable,
  DocRow,
  DocumentTotalsBlock,
  DocumentBankingSection,
  DocumentAgeingSummary,
  DocumentFooter,
  type DocColumn,
  type MetaRowItem,
  type TotalsRow,
} from '../components/document-layout';
import type { InvoiceBankingDetails } from './invoice-pdf-document';

export interface StatementTransaction {
  date: string;
  /** Reference No.: invoice, receipt, credit note or refund number. */
  reference: string;
  description: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

export interface StatementAgeing {
  current: number;
  days1_14: number;
  days15_30: number;
  days31_60: number;
  days61plus: number;
}

export interface StatementPdfData {
  statementNumber: string;
  status: string;
  statementType?: 'activity' | 'outstanding';
  periodFrom?: string;
  periodTo?: string;
  dueDate?: string;
  org: OrgDetails;
  client: {
    name: string;
    accountRef?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  openingBalance?: number;
  transactions: StatementTransaction[];
  ageing?: StatementAgeing;
  /** Final amount due (matches the on-screen statement). */
  totalDue?: number;
  /** @deprecated Totals are derived from `transactions` so they always reconcile. */
  subtotal?: number;
  /** @deprecated Totals are derived from `transactions` so they always reconcile. */
  totalPaid?: number;
  banking?: InvoiceBankingDetails;
  terms?: string | null;
}

const COLUMNS: DocColumn[] = [
  { key: 'date', label: 'Date', width: '17%' },
  { key: 'ref', label: 'Reference No.', width: '21%' },
  { key: 'desc', label: 'Description', width: '26%' },
  { key: 'debit', label: 'Debit', width: '12%', align: 'right' },
  { key: 'credit', label: 'Credit', width: '12%', align: 'right' },
  { key: 'balance', label: 'Balance', width: '12%', align: 'right' },
];

export function StatementPdfDocument({ data }: { data: StatementPdfData }) {
  const transactions = data.transactions ?? [];
  const isOutstanding = data.statementType === 'outstanding';
  const openingBalance = isOutstanding ? 0 : (data.openingBalance ?? 0);

  // Totals are derived from the rows shown so the summary always reconciles.
  const totalInvoiced = transactions.reduce((sum, tx) => sum + (tx.debit ?? 0), 0);
  const totalPaid = transactions.reduce((sum, tx) => sum + (tx.credit ?? 0), 0);
  const amountDue = data.totalDue ?? openingBalance + totalInvoiced - totalPaid;
  const showBroughtForward = !isOutstanding && openingBalance !== 0;

  const metaRows: MetaRowItem[] = [];
  if (!isOutstanding && data.periodFrom) {
    metaRows.push({ label: 'Period From', value: fmtDateLong(data.periodFrom) });
  }
  if (data.periodTo) {
    metaRows.push({ label: 'Period To', value: fmtDateLong(data.periodTo) });
  }
  if (data.dueDate && amountDue > 0) {
    metaRows.push({
      label: 'Payment Due Date',
      value: formatStatementDueDate(data.dueDate, { long: true }),
      valueStyle: {
        fontWeight: 700,
        color: isDueDateOverdue(data.dueDate) ? DOC_COLORS.rose : DOC_COLORS.amber,
      },
    });
  }

  const totals: TotalsRow[] = [];
  if (isOutstanding) {
    if (totalPaid > 0) {
      totals.push({ label: 'Total Invoiced', value: formatZAR(totalInvoiced) });
      totals.push({
        label: 'Less Payments',
        value: `-${formatZAR(totalPaid)}`,
        color: DOC_COLORS.emerald,
      });
    }
  } else {
    if (showBroughtForward) {
      totals.push({ label: 'Balance Brought Forward', value: formatZARWithCR(openingBalance) });
    }
    totals.push({ label: 'Total Invoiced (Period)', value: formatZAR(totalInvoiced) });
    totals.push({
      label: 'Total Paid (Period)',
      value: formatZAR(totalPaid),
      color: DOC_COLORS.emerald,
    });
  }
  totals.push({
    label: isOutstanding ? 'Total Outstanding' : 'Amount Due',
    value: formatZARWithCR(amountDue),
    color: amountDue <= 0 ? DOC_COLORS.emerald : DOC_COLORS.red,
    bold: true,
    divider: true,
    emphasize: true,
  });

  const paymentReference = data.client.accountRef || data.client.name.slice(0, 14).toUpperCase();
  const ageingTotal = data.ageing
    ? data.ageing.current +
      data.ageing.days1_14 +
      data.ageing.days15_30 +
      data.ageing.days31_60 +
      data.ageing.days61plus
    : 0;

  return (
    <Document title={`Statement ${data.statementNumber}`}>
      <DocumentPage>
        <DocumentHeader
          org={data.org}
          title={isOutstanding ? 'Outstanding Invoices' : 'Statement'}
          number={data.statementNumber}
          status={data.status}
          amountDue={amountDue}
          amountDueFormatted={formatZARWithCR(amountDue)}
        />

        <DocumentMetaRow
          partyLabel="Account"
          party={{
            name: data.client.name,
            address: data.client.address,
            email: data.client.email,
            phone: data.client.phone,
          }}
          rows={metaRows}
        />

        {transactions.length === 0 && !showBroughtForward ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '36px 0',
              border: `1px dashed ${DOC_COLORS.borderStrong}`,
            }}
          >
            <span style={{ fontSize: 11, color: DOC_COLORS.muted }}>
              No transactions for this period.
            </span>
          </div>
        ) : (
          <DocTable columns={COLUMNS}>
            {showBroughtForward && (
              <DocRow
                columns={COLUMNS}
                muted
                cells={[
                  {
                    content: data.periodFrom ? fmtDateLong(data.periodFrom) : '-',
                    style: { color: DOC_COLORS.subtle },
                  },
                  {
                    content: 'Balance Brought Forward',
                    span: 2,
                    style: { fontStyle: 'italic', color: DOC_COLORS.subtle },
                  },
                  { content: '—', style: { color: DOC_COLORS.subtle } },
                  { content: '—', style: { color: DOC_COLORS.subtle } },
                  {
                    content: formatZARWithCR(openingBalance),
                    style: { fontWeight: 600, color: DOC_COLORS.subtle },
                  },
                ]}
              />
            )}
            {transactions.map((tx, idx) => {
              const hasRef = !!tx.reference && tx.reference !== '-';
              const isCredit = !!tx.credit;
              return (
                <DocRow
                  key={idx}
                  columns={COLUMNS}
                  cells={[
                    { content: fmtDateLong(tx.date), style: { whiteSpace: 'nowrap' } },
                    {
                      content: hasRef ? tx.reference : '-',
                      style: {
                        fontWeight: hasRef ? 500 : 400,
                        color: hasRef ? DOC_COLORS.blue : DOC_COLORS.muted,
                      },
                    },
                    {
                      content: tx.description,
                      style: {
                        color: isCredit ? DOC_COLORS.emerald : DOC_COLORS.text,
                        fontWeight: isCredit ? 500 : 400,
                      },
                    },
                    {
                      content: tx.debit ? formatZAR(tx.debit) : '-',
                    },
                    {
                      content: isCredit ? formatZAR(tx.credit as number) : '-',
                      style: {
                        fontWeight: isCredit ? 500 : 400,
                        color: isCredit ? DOC_COLORS.emerald : DOC_COLORS.muted,
                      },
                    },
                    {
                      content: tx.balance != null ? formatZARWithCR(tx.balance) : '-',
                      style: { fontWeight: 600, color: DOC_COLORS.text },
                    },
                  ]}
                />
              );
            })}
          </DocTable>
        )}

        <DocumentTotalsBlock rows={totals} />

        {data.banking && (
          <DocumentBankingSection
            banking={data.banking}
            paymentReference={paymentReference}
            showPaymentInstructions
            contactEmail={data.org.email}
          />
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            marginTop: 'auto',
            breakInside: 'avoid',
          }}
        >
          {data.ageing && (
            <DocumentAgeingSummary ageing={data.ageing} totalDue={ageingTotal} format={formatZAR} />
          )}
          <DocumentFooter />
        </div>
      </DocumentPage>
    </Document>
  );
}
