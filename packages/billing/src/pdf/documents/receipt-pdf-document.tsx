import React from 'react';
import { formatZAR, fmtDateLong } from '../../format';
import { Document } from '../primitives';
import type { OrgDetails } from '../components/page-header';
import {
  ACCENT_EMERALD,
  DOC_COLORS,
  DocumentPage,
  DocumentHeader,
  DocumentMetaRow,
  DocTable,
  DocRow,
  DocumentTotalsBlock,
  DocumentFooter,
  SectionLabel,
  type DocColumn,
  type MetaRowItem,
} from '../components/document-layout';

export interface ReceiptAllocation {
  invoiceNumber: string;
  invoiceDate?: string;
  amount: number;
}

export interface ReceiptPdfData {
  receiptNumber: string;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string | null;
  amount: number;
  unallocated?: number;
  org: OrgDetails;
  client: {
    name: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  allocations: ReceiptAllocation[];
  notes?: string | null;
}

const COLUMNS: DocColumn[] = [
  { key: 'invoice', label: 'Invoice Number', width: '38%' },
  { key: 'date', label: 'Invoice Date', width: '32%' },
  { key: 'amount', label: 'Allocated Amount', width: '30%', align: 'right' },
];

export function ReceiptPdfDocument({ data }: { data: ReceiptPdfData }) {
  const metaRows: MetaRowItem[] = [
    { label: 'Payment Date', value: fmtDateLong(data.paymentDate) },
    {
      label: 'Amount Paid',
      value: formatZAR(data.amount),
      valueStyle: { fontSize: 14, fontWeight: 700, color: DOC_COLORS.emerald },
    },
  ];

  return (
    <Document title={`Receipt ${data.receiptNumber}`}>
      <DocumentPage accent={ACCENT_EMERALD}>
        <DocumentHeader
          org={data.org}
          title="Receipt"
          number={data.receiptNumber}
          status="Paid"
          prefixHash={false}
        />

        <DocumentMetaRow
          partyLabel="Received From"
          party={data.client}
          rows={metaRows}
          referenceLabel="Payment Reference"
          reference={data.reference}
        />

        <SectionLabel style={{ marginBottom: 8 }}>Invoice Allocations</SectionLabel>
        {data.allocations.length === 0 ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '22px 0',
              border: `1px dashed ${DOC_COLORS.borderStrong}`,
            }}
          >
            <span style={{ fontSize: 9, color: DOC_COLORS.muted }}>
              This payment is currently unallocated, or recorded as a general retainer.
            </span>
          </div>
        ) : (
          <DocTable columns={COLUMNS}>
            {data.allocations.map((alloc, idx) => (
              <DocRow
                key={idx}
                columns={COLUMNS}
                cells={[
                  {
                    content: alloc.invoiceNumber,
                    style: { fontWeight: 500, color: DOC_COLORS.text },
                  },
                  {
                    content: alloc.invoiceDate ? fmtDateLong(alloc.invoiceDate) : '-',
                    style: { color: DOC_COLORS.subtle },
                  },
                  {
                    content: formatZAR(alloc.amount),
                    style: { fontWeight: 600, color: DOC_COLORS.emerald },
                  },
                ]}
              />
            ))}
          </DocTable>
        )}

        {data.unallocated && data.unallocated > 0 ? (
          <DocumentTotalsBlock
            rows={[
              { label: 'Total Received', value: formatZAR(data.amount), color: DOC_COLORS.text },
              {
                label: 'Account Credit',
                value: formatZAR(data.unallocated),
                color: DOC_COLORS.emerald,
              },
            ]}
          />
        ) : null}

        <DocumentFooter
          centerLines={[
            `This is an official payment receipt issued by ${data.org.name}.`,
            'Thank you for your valued business!',
          ]}
        />
      </DocumentPage>
    </Document>
  );
}
