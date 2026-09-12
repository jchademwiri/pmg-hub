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
  banking?: InvoiceBankingDetails;
  terms?: string | null;
}

export function StatementPdfDocument({ data }: { data: StatementPdfData }) {
  const theme = usePdfTheme();

  const totalDue = data.totalDue ?? 0;
  const openingBalance = data.openingBalance ?? 0;

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
            <TableRow striped={false} style={{ backgroundColor: "#fafafa" }}>
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

        {/* Ageing Analysis Table */}
        {data.ageing && (
          <KeepTogether>
            <div style={{ marginTop: 12, marginBottom: 16 }}>
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
                Ageing Analysis (Due Dates)
              </span>
              <table style={{ width: "100%", borderCollapse: "collapse", border: `1px solid ${theme.colors.border}` }}>
                <thead>
                  <tr style={{ backgroundColor: theme.colors.muted }}>
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
          </KeepTogether>
        )}

        {/* Banking Notice */}
        {data.banking && (
          <KeepTogether>
            <div
              style={{
                backgroundColor: theme.colors.muted,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.primitives.borderRadius.sm,
                padding: "8px 12px",
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 7, fontWeight: 700, color: theme.colors.primary, textTransform: "uppercase" }}>
                  Remittance / Banking Details
                </span>
                <span style={{ fontSize: 7.5, color: theme.colors.foreground, marginTop: 2 }}>
                  {data.banking.bankName} · Acc: {data.banking.accountNumber} · Branch: {data.banking.branchCode} · Acc Name: {data.banking.accountName}
                </span>
              </div>
              <span style={{ fontSize: 7.5, fontWeight: 600, color: theme.colors.mutedForeground }}>
                Ref: {data.client.name.slice(0, 12).toUpperCase()}
              </span>
            </div>
          </KeepTogether>
        )}

        <PageFooter
          leftText={data.terms || "Please contact accounts@playhousemedia.co.za if you have queries regarding this statement."}
        />
      </Page>
    </Document>
  );
}
