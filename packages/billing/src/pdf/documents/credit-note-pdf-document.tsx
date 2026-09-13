import React from "react";
import { formatZAR, fmtDate } from "../../format";
import { Document, Page, KeepTogether } from "../primitives";
import { PageHeader, type OrgDetails } from "../components/page-header";
import { PageFooter } from "../components/page-footer";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../components/table";
import { KeyValue } from "../components/key-value";
import { usePdfTheme } from "../theme-provider";

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
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: theme.spacing.sectionGap,
            gap: 20,
          }}
        >
          {/* Credit To */}
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
              Credit To
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
            {data.client.address && (
              <span style={{ fontSize: 8, color: theme.colors.mutedForeground, marginTop: 2 }}>
                {data.client.address}
              </span>
            )}
          </div>

          {/* Credit Note Details */}
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
              Credit Note Details
            </span>
            <KeyValue
              size="sm"
              items={[
                { key: "Issue Date", value: fmtDate(data.issueDate) },
                { key: "Credit Type", value: data.type },
                ...(data.originalInvoiceNumber ? [{ key: "Original Invoice", value: data.originalInvoiceNumber }] : []),
                ...(data.expiresDate ? [{ key: "Expiry Date", value: fmtDate(data.expiresDate) }] : []),
                ...(data.reason ? [{ key: "Reason", value: data.reason }] : []),
              ]}
            />
          </div>
        </div>

        {/* Applications / Line Items Table */}
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
          {data.applications && data.applications.length > 0 ? "Credit Applications" : "Credit Adjustment"}
        </span>

        {data.applications && data.applications.length > 0 ? (
          <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
            <TableHeader>
              <TableRow header>
                <TableCell header width="40%">Invoice Number</TableCell>
                <TableCell header width="30%">Applied Date</TableCell>
                <TableCell header align="right" width="30%">Amount Applied</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.applications.map((app, idx) => (
                <TableRow key={idx} striped={idx % 2 === 1}>
                  <TableCell bold>#{app.invoiceNumber}</TableCell>
                  <TableCell>{fmtDate(app.appliedDate)}</TableCell>
                  <TableCell align="right" bold tabular>{formatZAR(app.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
            <TableHeader>
              <TableRow header>
                <TableCell header width="70%">Description</TableCell>
                <TableCell header align="right" width="30%">Credit Amount</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600, color: theme.colors.foreground, fontSize: 8.5 }}>
                      {data.type}
                    </span>
                    <span style={{ color: theme.colors.mutedForeground, fontSize: 8 }}>
                      {data.reason || "Credit adjustment issued to client account"}
                    </span>
                  </div>
                </TableCell>
                <TableCell align="right" bold tabular>{formatZAR(data.amount)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}

        {/* Bottom Section: Notes & Totals */}
        <KeepTogether>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 24,
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            {/* Left: Notes */}
            <div style={{ display: "flex", flexDirection: "column", width: "50%" }}>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: theme.colors.mutedForeground, textTransform: "uppercase" }}>
                Notes
              </span>
              <span style={{ fontSize: 7.5, color: theme.colors.mutedForeground, marginTop: 2, lineHeight: 1.4 }}>
                {data.notes || "This credit note can be applied against current or future invoices. Please contact accounts for queries."}
              </span>
            </div>

            {/* Right: Totals Card */}
            <div
              style={{
                width: "42%",
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.primitives.borderRadius.sm,
                padding: "10px 12px",
              }}
            >
              <KeyValue
                size="sm"
                divided
                items={[
                  { key: "Total Credit Issued", value: formatZAR(data.amount), keyStyle: { fontWeight: 700 }, valueStyle: { fontWeight: 700 } },
                  ...(data.amountApplied > 0 ? [{ key: "Amount Applied", value: `-${formatZAR(data.amountApplied)}` }] : []),
                  ...(data.amountRefunded && data.amountRefunded > 0 ? [{ key: "Amount Refunded", value: `-${formatZAR(data.amountRefunded)}` }] : []),
                  {
                    key: "Remaining Balance",
                    value: formatZAR(data.amountRemaining),
                    keyStyle: { fontWeight: 700, fontSize: 10, color: theme.colors.foreground },
                    valueStyle: { fontWeight: 700, fontSize: 11, color: theme.colors.primary },
                  },
                ]}
              />
            </div>
          </div>
        </KeepTogether>

        {/* Footer */}
        <PageFooter org={data.org} />
      </Page>
    </Document>
  );
}
