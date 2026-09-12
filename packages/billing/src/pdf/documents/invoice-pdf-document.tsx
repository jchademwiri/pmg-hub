import React from "react";
import { formatZAR, fmtDate } from "../../format";
import { Document, Page, View, Text, KeepTogether } from "../primitives";
import { PageHeader, type OrgDetails } from "../components/page-header";
import { PageFooter } from "../components/page-footer";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../components/table";
import { KeyValue } from "../components/key-value";
import { usePdfTheme } from "../theme-provider";

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
    balanceDue?: number;
  };
  banking?: InvoiceBankingDetails;
  notes?: string | null;
  terms?: string | null;
}

export function InvoicePdfDocument({ data }: { data: InvoicePdfData }) {
  const theme = usePdfTheme();

  const subtotal = data.totals.subtotal ?? 0;
  const vat = data.totals.vat ?? 0;
  const total = data.totals.total ?? subtotal + vat;
  const paid = data.totals.paid ?? 0;
  const balanceDue = data.totals.balanceDue ?? total - paid;

  return (
    <Document title={`Invoice ${data.invoiceNumber}`}>
      <Page size="a4">
        {/* Header */}
        <PageHeader
          org={data.org}
          title="Tax Invoice"
          number={data.invoiceNumber}
          status={data.status}
        />

        {/* Client & Metadata Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: theme.spacing.sectionGap,
            gap: 20,
          }}
        >
          {/* Bill To */}
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
              Bill To
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

          {/* Invoice Details */}
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
              Invoice Details
            </span>
            <KeyValue
              size="sm"
              items={[
                { key: "Issue Date", value: fmtDate(data.issueDate) },
                ...(data.dueDate
                  ? [{ key: data.dueDateLabel || "Due Date", value: fmtDate(data.dueDate) }]
                  : []),
                ...(data.reference ? [{ key: "Reference", value: data.reference }] : []),
                ...(data.org.salesRep ? [{ key: "Account Manager", value: data.org.salesRep }] : []),
              ]}
            />
          </div>
        </div>

        {/* Line Items Table */}
        <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
          <TableHeader>
            <TableRow header>
              <TableCell header width="52%">Description</TableCell>
              <TableCell header align="center" width="12%">Qty</TableCell>
              <TableCell header align="right" width="18%">Unit Price</TableCell>
              <TableCell header align="right" width="18%">Amount</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((item, idx) => (
              <TableRow key={idx} striped={idx % 2 === 1}>
                <TableCell>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {item.itemName && (
                      <span style={{ fontWeight: 600, color: theme.colors.foreground, fontSize: 8.5 }}>
                        {item.itemName}
                      </span>
                    )}
                    <span style={{ color: item.itemName ? theme.colors.mutedForeground : theme.colors.foreground, fontSize: 8 }}>
                      {item.description}
                    </span>
                  </div>
                </TableCell>
                <TableCell align="center" tabular>{item.qty}</TableCell>
                <TableCell align="right" tabular>{formatZAR(item.unitPrice)}</TableCell>
                <TableCell align="right" bold tabular>{formatZAR(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Bottom Section: Banking on Left, Totals on Right */}
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
            {/* Left: Banking Details & Notes */}
            <div style={{ display: "flex", flexDirection: "column", width: "50%" }}>
              {data.banking && (
                <div
                  style={{
                    backgroundColor: theme.colors.muted,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.primitives.borderRadius.sm,
                    padding: 10,
                    marginBottom: 12,
                  }}
                >
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
                    Banking Details
                  </span>
                  <KeyValue
                    size="sm"
                    items={[
                      { key: "Bank", value: data.banking.bankName },
                      { key: "Account Name", value: data.banking.accountName },
                      { key: "Account Number", value: data.banking.accountNumber },
                      { key: "Branch Code", value: data.banking.branchCode },
                      { key: "Reference", value: data.invoiceNumber },
                    ]}
                  />
                </div>
              )}

              {data.notes && (
                <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
                  <span style={{ fontSize: 7.5, fontWeight: 700, color: theme.colors.mutedForeground, textTransform: "uppercase" }}>
                    Notes
                  </span>
                  <span style={{ fontSize: 7.5, color: theme.colors.mutedForeground, marginTop: 2, lineHeight: 1.4 }}>
                    {data.notes}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Totals Card */}
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
                  { key: "Subtotal", value: formatZAR(subtotal) },
                  ...(data.totals.discount ? [{ key: "Discount", value: `-${formatZAR(data.totals.discount)}` }] : []),
                  ...(vat > 0 ? [{ key: "VAT (15%)", value: formatZAR(vat) }] : [{ key: "VAT", value: "Exempt / R 0.00" }]),
                  { key: "Total", value: formatZAR(total), keyStyle: { fontWeight: 700 }, valueStyle: { fontWeight: 700 } },
                  ...(paid > 0 ? [{ key: "Amount Paid", value: `-${formatZAR(paid)}` }] : []),
                  {
                    key: "Balance Due",
                    value: formatZAR(balanceDue),
                    keyStyle: { fontWeight: 700, fontSize: 10, color: theme.colors.foreground },
                    valueStyle: { fontWeight: 700, fontSize: 11, color: theme.colors.primary },
                  },
                ]}
              />
            </div>
          </div>
        </KeepTogether>

        {/* Footer */}
        <PageFooter
          leftText={data.terms || "Payment is due within agreed terms. Please use the invoice number as payment reference."}
        />
      </Page>
    </Document>
  );
}
