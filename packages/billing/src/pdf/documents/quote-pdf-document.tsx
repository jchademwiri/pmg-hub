import React from "react";
import { formatZAR, fmtDate } from "../../format";
import { Document, Page, KeepTogether } from "../primitives";
import { PageHeader, type OrgDetails } from "../components/page-header";
import { PageFooter } from "../components/page-footer";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../components/table";
import { KeyValue } from "../components/key-value";
import { usePdfTheme } from "../theme-provider";
import type { InvoiceLineItem, InvoiceBankingDetails } from "./invoice-pdf-document";

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

export function QuotePdfDocument({ data }: { data: QuotePdfData }) {
  const theme = usePdfTheme();

  const subtotal = data.totals.subtotal ?? 0;
  const vat = data.totals.vat ?? 0;
  const total = data.totals.total ?? subtotal + vat;

  return (
    <Document title={`Quote ${data.quoteNumber}`}>
      <Page size="a4">
        <PageHeader
          org={data.org}
          title="Quotation"
          number={data.quoteNumber}
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
          {/* Quote For */}
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
              Quotation For
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

          {/* Quote Details */}
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
              Quote Details
            </span>
            <KeyValue
              size="sm"
              items={[
                { key: "Quote Date", value: fmtDate(data.issueDate) },
                ...(data.expiryDate ? [{ key: "Valid Until", value: fmtDate(data.expiryDate) }] : []),
                ...(data.reference ? [{ key: "Reference", value: data.reference }] : []),
                ...(data.org.salesRep ? [{ key: "Prepared By", value: data.org.salesRep }] : []),
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

        {/* Bottom Section: Acceptance on Left, Totals on Right */}
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
            {/* Left: Acceptance Placeholder & Notes */}
            <div style={{ display: "flex", flexDirection: "column", width: "50%" }}>
              <div
                style={{
                  border: `1px dashed ${theme.colors.border}`,
                  borderRadius: theme.primitives.borderRadius.sm,
                  padding: 10,
                  marginBottom: 10,
                  backgroundColor: "#fafafa",
                }}
              >
                <span
                  style={{
                    fontSize: 7.5,
                    fontWeight: 700,
                    color: theme.colors.foreground,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Customer Acceptance
                </span>
                <span style={{ fontSize: 7, color: theme.colors.mutedForeground, display: "block", marginBottom: 12 }}>
                  Sign below to accept this quotation and authorize commencement of work.
                </span>
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ width: "60%", borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: 2 }}>
                    <span style={{ fontSize: 6.5, color: theme.colors.mutedForeground }}>Signature</span>
                  </div>
                  <div style={{ width: "35%", borderBottom: `1px solid ${theme.colors.border}`, paddingBottom: 2 }}>
                    <span style={{ fontSize: 6.5, color: theme.colors.mutedForeground }}>Date</span>
                  </div>
                </div>
              </div>

              {data.notes && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 7.5, fontWeight: 700, color: theme.colors.mutedForeground, textTransform: "uppercase" }}>
                    Special Conditions
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
                  {
                    key: "Total Estimate",
                    value: formatZAR(total),
                    keyStyle: { fontWeight: 700, fontSize: 10, color: theme.colors.foreground },
                    valueStyle: { fontWeight: 700, fontSize: 11, color: theme.colors.primary },
                  },
                ]}
              />
            </div>
          </div>
        </KeepTogether>

        <PageFooter
          leftText={data.terms || "This quote is valid for 30 days from issue date. Subject to standard terms of service."}
        />
      </Page>
    </Document>
  );
}
