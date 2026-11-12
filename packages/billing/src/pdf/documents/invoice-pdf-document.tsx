import React from 'react';
import { formatZAR, fmtDateLong } from '../../format';
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
  DocumentNotesSection,
  DocumentFooter,
  type DocColumn,
  type MetaRowItem,
  type TotalsRow,
} from '../components/document-layout';

export interface InvoiceLineItem {
  itemName?: string | null;
  description: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceBankingDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchCode: string;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate?: string | null;
  dueDateLabel?: string;
  reference?: string | null;
  org: OrgDetails;
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  items: InvoiceLineItem[];
  totals: {
    subtotal?: number;
    discount?: number;
    vat?: number;
    total?: number;
    paid?: number;
    writtenOff?: number;
    balanceDue?: number;
  };
  banking?: InvoiceBankingDetails;
  notes?: string | null;
  terms?: string | null;
}

const COLUMNS: DocColumn[] = [
  { key: 'desc', label: 'Description', width: '52%' },
  { key: 'qty', label: 'Qty', width: '12%', align: 'right' },
  { key: 'unit', label: 'Unit Price', width: '18%', align: 'right' },
  { key: 'amount', label: 'Amount', width: '18%', align: 'right' },
];

/** Shared line-item description cell: item name on top, italic detail below. */
export function LineItemDescription({
  itemName,
  description,
}: {
  itemName?: string | null;
  description: string;
}) {
  const hasSecondary = !!itemName && !!description && itemName !== description;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 8.5, color: DOC_COLORS.text }}>{itemName || description}</span>
      {hasSecondary && (
        <span
          style={{ fontSize: 7.5, fontStyle: 'italic', color: DOC_COLORS.subtle, marginTop: 2 }}
        >
          {description}
        </span>
      )}
    </div>
  );
}

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  const subtotal = data.totals.subtotal ?? 0;
  const vat = data.totals.vat ?? 0;
  const discount = data.totals.discount ?? 0;
  const total = data.totals.total ?? subtotal - discount + vat;
  const paid = data.totals.paid ?? 0;
  const writtenOff = data.totals.writtenOff ?? 0;
  const balanceDue = data.totals.balanceDue ?? Math.max(0, total - paid - writtenOff);
  const showPaymentSummary = data.totals.balanceDue != null || paid > 0 || writtenOff > 0;
  const documentTitle = vat > 0 ? 'Tax Invoice' : 'Invoice';

  const metaRows: MetaRowItem[] = [{ label: 'Issue Date', value: fmtDateLong(data.issueDate) }];
  if (data.dueDate) {
    metaRows.push({ label: data.dueDateLabel || 'Due Date', value: fmtDateLong(data.dueDate) });
  }

  const totals: TotalsRow[] = [{ label: 'Subtotal', value: formatZAR(subtotal) }];
  if (discount > 0) {
    totals.push({ label: 'Discount', value: `-${formatZAR(discount)}`, color: DOC_COLORS.orange });
  }
  if (vat > 0) {
    totals.push({ label: 'VAT (15%)', value: formatZAR(vat) });
  }
  totals.push({
    label: showPaymentSummary ? 'Total Invoiced' : 'Total',
    value: formatZAR(total),
    color: DOC_COLORS.text,
    bold: true,
    divider: true,
  });
  if (showPaymentSummary) {
    if (paid > 0) {
      totals.push({
        label: 'Less Payments Received',
        value: `-${formatZAR(paid)}`,
        color: DOC_COLORS.emerald,
      });
    }
    if (writtenOff > 0) {
      totals.push({
        label: 'Less Write-Off / Bad Debt',
        value: `-${formatZAR(writtenOff)}`,
        color: DOC_COLORS.rose,
      });
    }
    totals.push({
      label: 'Balance Due',
      value: formatZAR(balanceDue),
      color: balanceDue === 0 ? DOC_COLORS.emerald : DOC_COLORS.amber,
      bold: true,
      divider: true,
    });
  }

  return (
    <Document title={`${documentTitle} ${data.invoiceNumber}`}>
      <DocumentPage>
        <DocumentHeader
          org={data.org}
          title={documentTitle}
          number={data.invoiceNumber}
          status={data.status}
        />

        <DocumentMetaRow
          partyLabel="Bill To"
          party={data.client}
          rows={metaRows}
          reference={data.reference}
        />

        <DocTable columns={COLUMNS}>
          {!data.items || data.items.length === 0 ? (
            <DocRow columns={COLUMNS} cells={[{ content: 'No items listed', span: 4 }]} />
          ) : (
            data.items.map((item, idx) => (
              <DocRow
                key={idx}
                columns={COLUMNS}
                cells={[
                  {
                    content: (
                      <LineItemDescription
                        itemName={item.itemName}
                        description={item.description}
                      />
                    ),
                  },
                  { content: String(item.qty), style: { fontSize: 8.5 } },
                  { content: formatZAR(item.unitPrice), style: { fontSize: 8.5 } },
                  {
                    content: formatZAR(item.amount),
                    style: { fontSize: 8.5, fontWeight: 600, color: DOC_COLORS.text },
                  },
                ]}
              />
            ))
          )}
        </DocTable>

        <DocumentTotalsBlock rows={totals} />

        {data.banking && (
          <DocumentBankingSection
            banking={data.banking}
            paymentReference={data.client.name.slice(0, 14).toUpperCase()}
          />
        )}

        <DocumentNotesSection notes={data.notes?.trim() || undefined} terms={data.terms} />

        <DocumentFooter reference={data.reference} />
      </DocumentPage>
    </Document>
  );
}
