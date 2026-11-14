import React from 'react';
import { formatZAR, fmtDate, fmtDateLong } from '../../format';
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
  DocumentNotesSection,
  DocumentFooter,
  SectionLabel,
  type DocColumn,
  type MetaRowItem,
  type TotalsRow,
} from '../components/document-layout';

export interface CreditNoteApplication {
  invoiceNumber: string;
  appliedDate: string;
  amount: number;
}

export interface CreditNotePdfData {
  creditNoteNumber: string;
  status: string;
  issueDate: string;
  expiresDate?: string | null;
  type: string;
  reason?: string | null;
  originalInvoiceNumber?: string | null;
  amount: number;
  amountRemaining: number;
  amountApplied: number;
  amountRefunded?: number;
  org: OrgDetails;
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  applications?: CreditNoteApplication[];
  notes?: string | null;
}

const APPLICATION_COLUMNS: DocColumn[] = [
  { key: 'invoice', label: 'Invoice Number', width: '40%' },
  { key: 'date', label: 'Applied Date', width: '30%' },
  { key: 'amount', label: 'Amount Applied', width: '30%', align: 'right' },
];

const ADJUSTMENT_COLUMNS: DocColumn[] = [
  { key: 'desc', label: 'Description', width: '65%' },
  { key: 'amount', label: 'Credit Amount', width: '35%', align: 'right' },
];

export function CreditNotePdfDocument({ data }: { data: CreditNotePdfData }) {
  const hasApplications = !!data.applications && data.applications.length > 0;

  const metaRows: MetaRowItem[] = [
    { label: 'Issue Date', value: fmtDateLong(data.issueDate) },
    { label: 'Credit Type', value: data.type },
  ];
  if (data.originalInvoiceNumber) {
    metaRows.push({ label: 'Original Invoice', value: data.originalInvoiceNumber });
  }
  if (data.expiresDate) {
    metaRows.push({ label: 'Expiry Date', value: fmtDateLong(data.expiresDate) });
  }

  const totals: TotalsRow[] = [
    { label: 'Total Credit Issued', value: formatZAR(data.amount), color: DOC_COLORS.text },
  ];
  if (data.amountApplied > 0) {
    totals.push({ label: 'Amount Applied', value: `-${formatZAR(data.amountApplied)}` });
  }
  if (data.amountRefunded != null && data.amountRefunded > 0) {
    totals.push({ label: 'Amount Refunded', value: `-${formatZAR(data.amountRefunded)}` });
  }
  totals.push({
    label: 'Remaining Balance',
    value: formatZAR(data.amountRemaining),
    color: data.amountRemaining > 0 ? DOC_COLORS.emerald : DOC_COLORS.muted,
    bold: true,
    divider: true,
  });

  const notes =
    data.notes && data.notes !== data.reason
      ? data.notes
      : 'This credit note can be applied against current or future invoices. Please contact accounts for queries.';

  return (
    <Document title={`Credit Note ${data.creditNoteNumber}`}>
      <DocumentPage>
        <DocumentHeader
          org={data.org}
          title="Credit Note"
          number={data.creditNoteNumber}
          status={data.status}
        />

        <DocumentMetaRow
          partyLabel="Credit To"
          party={data.client}
          rows={metaRows}
          referenceLabel="Reason"
          reference={data.reason}
        />

        <SectionLabel style={{ marginBottom: 8 }}>
          {hasApplications ? 'Credit Applications' : 'Credit Adjustment'}
        </SectionLabel>
        {hasApplications ? (
          <DocTable columns={APPLICATION_COLUMNS}>
            {data.applications!.map((app, idx) => (
              <DocRow
                key={idx}
                columns={APPLICATION_COLUMNS}
                cells={[
                  {
                    content: app.invoiceNumber,
                    style: { fontWeight: 500, color: DOC_COLORS.blue },
                  },
                  { content: fmtDate(app.appliedDate) },
                  {
                    content: formatZAR(app.amount),
                    style: { fontWeight: 600, color: DOC_COLORS.text },
                  },
                ]}
              />
            ))}
          </DocTable>
        ) : (
          <DocTable columns={ADJUSTMENT_COLUMNS}>
            <DocRow
              columns={ADJUSTMENT_COLUMNS}
              cells={[
                {
                  content: (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 10.5, color: DOC_COLORS.text }}>{data.type}</span>
                      {data.reason && (
                        <span
                          style={{
                            fontSize: 9.5,
                            fontStyle: 'italic',
                            color: DOC_COLORS.subtle,
                            marginTop: 2,
                          }}
                        >
                          {data.reason}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  content: formatZAR(data.amount),
                  style: { fontWeight: 600, color: DOC_COLORS.text },
                },
              ]}
            />
          </DocTable>
        )}

        <DocumentTotalsBlock rows={totals} />

        <DocumentNotesSection notes={notes} />

        <DocumentFooter />
      </DocumentPage>
    </Document>
  );
}
