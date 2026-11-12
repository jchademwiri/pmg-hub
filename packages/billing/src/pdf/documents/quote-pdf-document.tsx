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
import { LineItemDescription } from './invoice-pdf-document';
import type { InvoiceLineItem, InvoiceBankingDetails } from './invoice-pdf-document';

export interface QuotePdfData {
  quoteNumber: string;
  status: string;
  issueDate: string;
  expiryDate?: string | null;
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

export function QuotePdfDocument({ data }: { data: QuotePdfData }) {
  const subtotal = data.totals.subtotal ?? 0;
  const vat = data.totals.vat ?? 0;
  const discount = data.totals.discount ?? 0;
  const total = data.totals.total ?? subtotal - discount + vat;

  const metaRows: MetaRowItem[] = [{ label: 'Issue Date', value: fmtDateLong(data.issueDate) }];
  if (data.expiryDate) {
    metaRows.push({ label: 'Expiry Date', value: fmtDateLong(data.expiryDate) });
  }

  const totals: TotalsRow[] = [{ label: 'Subtotal', value: formatZAR(subtotal) }];
  if (discount > 0) {
    totals.push({ label: 'Discount', value: `-${formatZAR(discount)}`, color: DOC_COLORS.orange });
  }
  if (vat > 0) {
    totals.push({ label: 'VAT (15%)', value: formatZAR(vat) });
  }
  totals.push({
    label: 'Total',
    value: formatZAR(total),
    color: DOC_COLORS.text,
    bold: true,
    divider: true,
  });

  return (
    <Document title={`Quote ${data.quoteNumber}`}>
      <DocumentPage>
        <DocumentHeader
          org={data.org}
          title="Quotation"
          number={data.quoteNumber}
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
