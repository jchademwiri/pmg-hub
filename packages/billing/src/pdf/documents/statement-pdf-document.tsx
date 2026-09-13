import React from "react";
import { formatZAR, fmtDate } from "../../format";
import { Document, Page, KeepTogether } from "../primitives";
import { PageHeader, type OrgDetails } from "../components/page-header";
import { PageFooter } from "../components/page-footer";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "../components/table";
import { KeyValue } from "../components/key-value";
import { usePdfTheme } from "../theme-provider";
import type { InvoiceBankingDetails } from "./invoice-pdf-document";

export interface StatementTransaction {
  date: string;
  reference: string;
  description: string;
  debit?: number;
  credit?: number;
  balance?: number;
}

export interface StatementAgeing {
  current: number;
  days1_14: number;
  days15_30: number;
  days31_60: number;
  days61plus: number;
}

export interface StatementPdfData {
  statementNumber: string;
  status: string;
  periodFrom?: string;
  periodTo?: string;
  org: OrgDetails;
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  openingBalance?: number;
  transactions: StatementTransaction[];
  ageing?: StatementAgeing;
  totalDue?: number;
  subtotal?: number;
  totalPaid?: number;
  banking?: InvoiceBankingDetails;
  terms?: string | null;
}

export function StatementPdfDocument({ data }: { data: StatementPdfData }) {
  const theme = usePdfTheme();

  const openingBalance = data.openingBalance ?? 0;
  const subtotal =
    data.subtotal ??
    ((data.transactions ?? []).reduce((sum, tx) => sum + (tx.debit || 0), 0) + openingBalance);
  const totalPaid =
    data.totalPaid ??
    (data.transactions ?? []).reduce((sum, tx) => sum + (tx.credit || 0), 0);
  const totalDue = data.totalDue ?? Math.max(0, subtotal - totalPaid);

  return (
    <Document title={`Statement ${data.statementNumber}`}>
      <Page size="a4">
        <PageHeader
          org={data.org}
          title="Statement of Account"
          number={data.statementNumber}
          status={data.status}
        />

        {/* Account & Period Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: theme.spacing.sectionGap,
            gap: 20,
          }}
        >
          {/* Account Details */}
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
              Account Details
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

          {/* Statement Period & Total Due */}
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
              Statement Period
            </span>
            <KeyValue
              size="sm"
              items={[
                ...(data.periodFrom ? [{ key: "Period From", value: fmtDate(data.periodFrom) }] : []),
                ...(data.periodTo ? [{ key: "Period To", value: fmtDate(data.periodTo) }] : []),
                { key: "Opening Balance", value: formatZAR(openingBalance) },
                {
                  key: "Total Amount Due",
                  value: formatZAR(totalDue),
                  keyStyle: { fontWeight: 700, color: theme.colors.foreground },
                  valueStyle: { fontWeight: 700, color: theme.colors.primary, fontSize: 10 },
                },
              ]}
            />
          </div>
        </div>

        {/* Transactions Table */}
        <Table variant="compact" style={{ marginBottom: theme.spacing.sectionGap }}>
          <TableHeader>
            <TableRow header>
              <TableCell header width="15%">Date</TableCell>
              <TableCell header width="18%">Reference</TableCell>
              <TableCell header width="28%">Description</TableCell>
              <TableCell header align="right" width="13%">Debit</TableCell>
              <TableCell header align="right" width="13%">Credit</TableCell>
              <TableCell header align="right" width="13%">Balance</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Opening Balance Row */}
            <TableRow striped={false}>
              <TableCell>{data.periodFrom ? fmtDate(data.periodFrom) : "-"}</TableCell>
              <TableCell bold>OPENING</TableCell>
              <TableCell>Opening Balance</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right" bold tabular>{formatZAR(openingBalance)}</TableCell>
            </TableRow>

            {/* Transaction Rows */}
            {(data.transactions ?? []).map((tx, idx) => (
              <TableRow key={idx} striped={idx % 2 === 1}>
                <TableCell>{fmtDate(tx.date)}</TableCell>
                <TableCell bold>{tx.reference}</TableCell>
                <TableCell>{tx.description}</TableCell>
                <TableCell align="right" tabular>{tx.debit ? formatZAR(tx.debit) : "-"}</TableCell>
                <TableCell align="right" tabular style={{ color: tx.credit ? theme.colors.success : undefined }}>
                  {tx.credit ? `(${formatZAR(tx.credit)})` : "-"}
                </TableCell>
                <TableCell align="right" bold tabular>{tx.balance != null ? formatZAR(tx.balance) : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Section Below Last Line Item: Banking on Left, Totals Breakdown on Right */}
        <KeepTogether>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 24,
              marginTop: 6,
              marginBottom: 12,
            }}
          >
            {/* Left: Banking Details */}
            <div style={{ display: "flex", flexDirection: "column", width: "52%" }}>
              {data.banking && (
                <div
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.primitives.borderRadius.sm,
                    padding: "10px 12px",
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
                      { key: "Reference", value: data.client.name.slice(0, 14).toUpperCase() },
                    ]}
                  />
                </div>
              )}
            </div>

            {/* Right: Breakdown Card (Subtotal, Less Payments, Balance Due) */}
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
                  {
                    key: "Subtotal",
                    value: formatZAR(subtotal),
                    keyStyle: { fontWeight: 700 },
                    valueStyle: { fontWeight: 700 },
                  },
                  {
                    key: "Less Payments",
                    value: totalPaid > 0 ? `-${formatZAR(totalPaid)}` : "-R 0,00",
                    valueStyle: { color: totalPaid > 0 ? theme.colors.success : theme.colors.mutedForeground },
                  },
                  {
                    key: "Balance Due",
                    value: formatZAR(totalDue),
                    keyStyle: { fontWeight: 700, fontSize: 10, color: theme.colors.foreground },
                    valueStyle: { fontWeight: 700, fontSize: 11, color: theme.colors.primary },
                  },
                ]}
              />
            </div>
          </div>
        </KeepTogether>

        {/* Bottom Fixed Section: Ageing Summary & Footer */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", breakInside: "avoid", pageBreakInside: "avoid" }}>
          {/* Ageing Summary Table */}
          {data.ageing && (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
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
                Ageing Summary
              </span>
              <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${theme.colors.border}` }}>
                <thead>
                  <tr style={{ backgroundColor: "#f9fafb" }}>
                    <th style={{ padding: "4px 6px", fontSize: 7, fontWeight: 700, textAlign: "center", borderRight: `1px solid ${theme.colors.border}` }}>Current</th>
                    <th style={{ padding: "4px 6px", fontSize: 7, fontWeight: 700, textAlign: "center", borderRight: `1px solid ${theme.colors.border}` }}>1–14 Days</th>
                    <th style={{ padding: "4px 6px", fontSize: 7, fontWeight: 700, textAlign: "center", borderRight: `1px solid ${theme.colors.border}` }}>15–30 Days</th>
                    <th style={{ padding: "4px 6px", fontSize: 7, fontWeight: 700, textAlign: "center", borderRight: `1px solid ${theme.colors.border}` }}>31–60 Days</th>
                    <th style={{ padding: "4px 6px", fontSize: 7, fontWeight: 700, textAlign: "center", borderRight: `1px solid ${theme.colors.border}` }}>61+ Days</th>
                    <th style={{ padding: "4px 6px", fontSize: 7, fontWeight: 700, textAlign: "center" }}>Total Due</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "6px", fontSize: 8, textAlign: "center", fontVariantNumeric: "tabular-nums", borderRight: `1px solid ${theme.colors.border}` }}>
                      {formatZAR(data.ageing.current)}
                    </td>
                    <td style={{ padding: "6px", fontSize: 8, textAlign: "center", fontVariantNumeric: "tabular-nums", borderRight: `1px solid ${theme.colors.border}` }}>
                      {formatZAR(data.ageing.days1_14)}
                    </td>
                    <td style={{ padding: "6px", fontSize: 8, textAlign: "center", fontVariantNumeric: "tabular-nums", borderRight: `1px solid ${theme.colors.border}` }}>
                      {formatZAR(data.ageing.days15_30)}
                    </td>
                    <td style={{ padding: "6px", fontSize: 8, textAlign: "center", fontWeight: data.ageing.days31_60 > 0 ? 700 : 400, color: data.ageing.days31_60 > 0 ? "#d97706" : "inherit", fontVariantNumeric: "tabular-nums", borderRight: `1px solid ${theme.colors.border}` }}>
                      {formatZAR(data.ageing.days31_60)}
                    </td>
                    <td style={{ padding: "6px", fontSize: 8, textAlign: "center", fontWeight: data.ageing.days61plus > 0 ? 700 : 400, color: data.ageing.days61plus > 0 ? "#dc2626" : "inherit", fontVariantNumeric: "tabular-nums", borderRight: `1px solid ${theme.colors.border}` }}>
                      {formatZAR(data.ageing.days61plus)}
                    </td>
                    <td style={{ padding: "6px", fontSize: 8.5, textAlign: "center", fontWeight: 700, color: theme.colors.primary, fontVariantNumeric: "tabular-nums" }}>
                      {formatZAR(totalDue)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <PageFooter org={data.org} style={{ marginTop: 0 }} />
        </div>
      </Page>
    </Document>
  );
}
