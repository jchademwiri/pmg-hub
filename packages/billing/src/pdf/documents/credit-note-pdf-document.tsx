import React from 'react';
import { formatZAR, fmtDate, fmtDateLong } from '../../format';
import { Document, Page, KeepTogether } from '../primitives';
import { PageHeader, type OrgDetails } from '../components/page-header';
import { PageFooter } from '../components/page-footer';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../components/table';
import { KeyValue } from '../components/key-value';
import { usePdfTheme } from '../theme-provider';

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

export function CreditNotePdfDocument({ data }: { data: CreditNotePdfData }) {
  const theme = usePdfTheme();

  return (
    <Document title={`Credit Note ${data.creditNoteNumber}`}>
      <Page size="a4">
        {/* Header */}
        <PageHeader
          org={data.org}
          title="Credit Note"
          number={data.creditNoteNumber}
          status={data.status}
        />

        {/* Client & Credit Details */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sectionGap,
            gap: 20,
          }}
        >
          {/* Credit To */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
            <span
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                color: theme.colors.primary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 4,
              }}
            >
              Credit To
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: theme.colors.foreground,
                marginBottom: 2,
              }}
            >
              {data.client.name}
            </span>
            {data.client.email && (
              <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                {data.client.email}
              </span>
            )}
            {data.client.phone && (
              <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                {data.client.phone}
              </span>
            )}
            {data.client.address && (
              <span style={{ fontSize: 8, color: theme.colors.mutedForeground, marginTop: 2 }}>
                {data.client.address}
              </span>
            )}
          </div>

          {/* Credit Note Details */}
          <div style={{ display: 'flex', flexDirection: 'column', width: '45%' }}>
            <span
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                color: theme.colors.primary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: 4,
              }}
            >
              Credit Note Details
            </span>
            <KeyValue
              size="sm"
              items={[
                { key: 'Issue Date', value: fmtDateLong(data.issueDate) },
                { key: 'Credit Type', value: data.type },
                ...(data.originalInvoiceNumber
                  ? [{ key: 'Original Invoice', value: data.originalInvoiceNumber }]
                  : []),
                ...(data.expiresDate
                  ? [{ key: 'Expiry Date', value: fmtDateLong(data.expiresDate) }]
                  : []),
              ]}
            />
          </div>
        </div>

        {/* Reason */}
        {data.reason && (
          <div style={{ marginBottom: 12 }}>
            <span
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                color: theme.colors.primary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                marginBottom: 3,
              }}
            >
              Reason
            </span>
            <span style={{ fontSize: 8.5, color: theme.colors.foreground, lineHeight: '13px' }}>
              {data.reason}
            </span>
          </div>
        )}

        {/* Applications / Line Items Table */}
        <span
          style={{
            fontSize: 7.5,
            fontWeight: 700,
            color: theme.colors.primary,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            marginBottom: 6,
          }}
        >
          {data.applications && data.applications.length > 0
            ? 'Credit Applications'
            : 'Credit Adjustment'}
        </span>

        {data.applications && data.applications.length > 0 ? (
          <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
            <TableHeader>
              <TableRow header>
                <TableCell header width="40%">
                  Invoice Number
                </TableCell>
                <TableCell header width="30%">
                  Applied Date
                </TableCell>
                <TableCell header align="right" width="30%">
                  Amount Applied
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.applications.map((app, idx) => (
                <TableRow key={idx} striped={idx % 2 === 1}>
                  <TableCell width="40%" bold>
                    #{app.invoiceNumber}
                  </TableCell>
                  <TableCell width="30%">{fmtDate(app.appliedDate)}</TableCell>
                  <TableCell width="30%" align="right" bold tabular>
                    {formatZAR(app.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
            <TableHeader>
              <TableRow header>
                <TableCell header width="65%">
                  Description
                </TableCell>
                <TableCell header align="right" width="35%">
                  Credit Amount
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell width="65%">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{ fontWeight: 600, color: theme.colors.foreground, fontSize: 8.5 }}
                    >
                      {data.type}
                    </span>
                    {data.reason && (
                      <span
                        style={{ color: theme.colors.mutedForeground, fontSize: 8, marginTop: 2 }}
                      >
                        {data.reason}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell width="35%" align="right" bold tabular>
                  {formatZAR(data.amount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        {/* Bottom Section: Notes & Totals */}
        <KeepTogether>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 24,
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            {/* Left: Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
              <span
                style={{
                  fontSize: 7.5,
                  fontWeight: 700,
                  color: theme.colors.mutedForeground,
                  textTransform: 'uppercase',
                }}
              >
                Notes
              </span>
              <span
                style={{
                  fontSize: 7.5,
                  color: theme.colors.mutedForeground,
                  marginTop: 2,
                  lineHeight: 1.4,
                }}
              >
                {data.notes && data.notes !== data.reason
                  ? data.notes
                  : 'This credit note can be applied against current or future invoices. Please contact accounts for queries.'}
              </span>
            </div>

            {/* Right: Totals Summary */}
            <div
              style={{
                width: '42%',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${theme.colors.border}`,
                  paddingBottom: 4,
                }}
              >
                <span style={{ fontSize: 8.5, fontWeight: 600, color: theme.colors.foreground }}>
                  Total Credit Issued
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: theme.colors.foreground,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatZAR(data.amount)}
                </span>
              </div>

              {data.amountApplied > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid #f4f4f5`,
                    paddingBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                    Amount Applied
                  </span>
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 600,
                      color: theme.colors.foreground,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    -{formatZAR(data.amountApplied)}
                  </span>
                </div>
              )}

              {data.amountRefunded != null && data.amountRefunded > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: `1px solid #f4f4f5`,
                    paddingBottom: 4,
                  }}
                >
                  <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                    Amount Refunded
                  </span>
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 600,
                      color: theme.colors.foreground,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    -{formatZAR(data.amountRefunded)}
                  </span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `2px solid ${theme.colors.primary}`,
                  paddingBottom: 6,
                  paddingTop: 2,
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, color: theme.colors.foreground }}>
                  Remaining Balance
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: theme.colors.primary,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatZAR(data.amountRemaining)}
                </span>
              </div>
            </div>
          </div>
        </KeepTogether>

        {/* Footer */}
        <PageFooter org={data.org} />
      </Page>
    </Document>
  );
}
