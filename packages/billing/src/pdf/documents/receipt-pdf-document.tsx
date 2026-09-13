import React from 'react';
import { formatZAR, fmtDateLong } from '../../format';
import { Document, Page, KeepTogether } from '../primitives';
import { PageHeader, type OrgDetails } from '../components/page-header';
import { PageFooter } from '../components/page-footer';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../components/table';
import { KeyValue } from '../components/key-value';
import { usePdfTheme } from '../theme-provider';

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

export function ReceiptPdfDocument({ data }: { data: ReceiptPdfData }) {
  const theme = usePdfTheme();

  return (
    <Document title={`Receipt ${data.receiptNumber}`}>
      <Page size="a4">
        <PageHeader
          org={data.org}
          title="Payment Receipt"
          number={data.receiptNumber}
          status="Paid"
        />

        {/* Client & Receipt Metadata */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.sectionGap,
            gap: 20,
          }}
        >
          {/* Received From */}
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
              Received From
            </span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                color: theme.colors.foreground,
                marginBottom: 2,
              }}
            >
              {data.client.name}
            </span>
            {data.client.contactName && (
              <span style={{ fontSize: 8.5, color: theme.colors.foreground, marginBottom: 2 }}>
                {data.client.contactName}
              </span>
            )}
            {data.client.email && (
              <span style={{ fontSize: 8, color: theme.colors.mutedForeground, marginBottom: 1 }}>
                {data.client.email}
              </span>
            )}
            {data.client.phone && (
              <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                {data.client.phone}
              </span>
            )}
          </div>

          {/* Receipt Details */}
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
              Payment Details
            </span>
            <KeyValue
              size="sm"
              items={[
                { key: 'Payment Date', value: fmtDateLong(data.paymentDate) },
                {
                  key: 'Total Received',
                  value: formatZAR(data.amount),
                  keyStyle: { fontWeight: 700, color: theme.colors.foreground },
                  valueStyle: { fontWeight: 700, color: theme.colors.primary, fontSize: 10 },
                },
              ]}
            />
          </div>
        </div>

        {/* Payment Reference */}
        {data.reference && (
          <div style={{ marginBottom: theme.spacing.sectionGap }}>
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
              Payment Reference
            </span>
            <span style={{ fontSize: 8.5, color: theme.colors.foreground, lineHeight: '13px' }}>
              {data.reference}
            </span>
          </div>
        )}

        {/* Invoice Allocations Table */}
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
          Payment Allocations
        </span>
        <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
          <TableHeader>
            <TableRow header>
              <TableCell header width="38%">
                Invoice Number
              </TableCell>
              <TableCell header width="32%">
                Invoice Date
              </TableCell>
              <TableCell header align="right" width="30%">
                Allocated Amount
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.allocations.length === 0 ? (
              <TableRow>
                <TableCell width="38%">Unallocated Payment on Account</TableCell>
                <TableCell width="32%">-</TableCell>
                <TableCell width="30%" align="right" bold tabular>
                  {formatZAR(data.amount)}
                </TableCell>
              </TableRow>
            ) : (
              data.allocations.map((alloc, idx) => (
                <TableRow key={idx} striped={idx % 2 === 1}>
                  <TableCell width="38%" bold>
                    #{alloc.invoiceNumber}
                  </TableCell>
                  <TableCell width="32%">
                    {alloc.invoiceDate ? fmtDateLong(alloc.invoiceDate) : '-'}
                  </TableCell>
                  <TableCell width="30%" align="right" bold tabular>
                    {formatZAR(alloc.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Total Summary */}
        <KeepTogether>
          <div
            style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, marginBottom: 16 }}
          >
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
                  borderBottom: `2px solid ${theme.colors.primary}`,
                  paddingBottom: 6,
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, color: theme.colors.foreground }}>
                  Total Received
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: theme.colors.primary,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatZAR(data.amount)}
                </span>
              </div>
              {data.unallocated && data.unallocated > 0 ? (
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
                  <span style={{ fontSize: 8, color: theme.colors.mutedForeground }}>
                    Account Credit
                  </span>
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 600,
                      color: theme.colors.success,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatZAR(data.unallocated)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </KeepTogether>

        <PageFooter org={data.org} />
      </Page>
    </Document>
  );
}
