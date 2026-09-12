import React from "react";
import { formatZAR, fmtDate } from "../../format";
import { Document, Page, KeepTogether } from "../primitives";
import { PageHeader, type OrgDetails } from "../components/page-header";
import { PageFooter } from "../components/page-footer";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../components/table";
import { KeyValue } from "../components/key-value";
import { usePdfTheme } from "../theme-provider";

export interface ReceiptAllocation {
  invoiceNumber: string;
  invoiceDate?: string;
  amount: number;
}

export interface ReceiptPdfData {
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  reference?: string | null;
  amount: number;
  unallocated?: number;
  org: OrgDetails;
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
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
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: theme.spacing.sectionGap,
            gap: 20,
          }}
        >
          {/* Received From */}
          <div style={{ display: "flex", flexDirection: "column", width: "50%" }}>
            <span
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                color: theme.colors.primary,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 4,
              }}
            >
              Received From
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: theme.colors.foreground, marginBottom: 2 }}>
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
          </div>

          {/* Receipt Details */}
          <div style={{ display: "flex", flexDirection: "column", width: "45%" }}>
            <span
              style={{
                fontSize: 7.5,
                fontWeight: 700,
                color: theme.colors.primary,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 4,
              }}
            >
              Payment Details
            </span>
            <KeyValue
              size="sm"
              items={[
                { key: "Payment Date", value: fmtDate(data.paymentDate) },
                { key: "Payment Method", value: data.paymentMethod },
                ...(data.reference ? [{ key: "Payment Reference", value: data.reference }] : []),
                {
                  key: "Total Received",
                  value: formatZAR(data.amount),
                  keyStyle: { fontWeight: 700, color: theme.colors.foreground },
                  valueStyle: { fontWeight: 700, color: theme.colors.primary, fontSize: 10 },
                },
              ]}
            />
          </div>
        </div>

        {/* Invoice Allocations Table */}
        <span
          style={{
            fontSize: 7.5,
            fontWeight: 700,
            color: theme.colors.primary,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            display: "block",
            marginBottom: 6,
          }}
        >
          Payment Allocations
        </span>
        <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
          <TableHeader>
            <TableRow header>
              <TableCell header width="40%">Invoice Number</TableCell>
              <TableCell header width="30%">Invoice Date</TableCell>
              <TableCell header align="right" width="30%">Allocated Amount</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.allocations.length === 0 ? (
              <TableRow>
                <TableCell>Unallocated Payment on Account</TableCell>
                <TableCell>-</TableCell>
                <TableCell align="right" bold tabular>{formatZAR(data.amount)}</TableCell>
              </TableRow>
            ) : (
              data.allocations.map((alloc, idx) => (
                <TableRow key={idx} striped={idx % 2 === 1}>
                  <TableCell bold>#{alloc.invoiceNumber}</TableCell>
                  <TableCell>{alloc.invoiceDate ? fmtDate(alloc.invoiceDate) : "-"}</TableCell>
                  <TableCell align="right" bold tabular>{formatZAR(alloc.amount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Total Summary */}
        <KeepTogether>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, marginBottom: 16 }}>
            <div
              style={{
                width: "42%",
                backgroundColor: theme.colors.muted,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.primitives.borderRadius.sm,
                padding: "10px 12px",
              }}
            >
              <KeyValue
                size="sm"
                divided
                items={[
                  { key: "Total Received", value: formatZAR(data.amount), keyStyle: { fontWeight: 700 }, valueStyle: { fontWeight: 700 } },
                  ...(data.unallocated && data.unallocated > 0
                    ? [{ key: "Account Credit", value: formatZAR(data.unallocated), valueStyle: { color: theme.colors.success, fontWeight: 700 } }]
                    : []),
                ]}
              />
            </div>
          </div>
        </KeepTogether>

        <PageFooter leftText="This is an official receipt confirming payment received. Retain for your accounting records." />
      </Page>
    </Document>
  );
}
