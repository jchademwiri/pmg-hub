import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
} from "@pmg/billing/pdf";
import { formatZAR } from "@pmg/billing/format";
import type { TrialBalanceRow } from "@pmg/db";
import { type PdfOrgHeader } from "@pmg/billing/pdf-shell";
import { AccountingReportLayout } from "../components/report-layout";

export interface TrialBalanceDocumentProps {
  rows: TrialBalanceRow[];
  org: PdfOrgHeader;
  periodLabel: string;
  divisionLabel?: string;
  generatedAt: string;
}

export function TrialBalanceDocument({
  rows,
  org,
  periodLabel,
  divisionLabel,
  generatedAt,
}: TrialBalanceDocumentProps) {
  const activeRows = rows.filter((r) => r.totalDebits > 0 || r.totalCredits > 0);

  let totalDebits = 0;
  let totalCredits = 0;
  for (const r of activeRows) {
    totalDebits += r.totalDebits;
    totalCredits += r.totalCredits;
  }

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <AccountingReportLayout
      title="Trial Balance"
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt}
      org={org}
    >
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
        <Badge variant={isBalanced ? "success" : "destructive"}>
          {isBalanced ? "BALANCED" : "OUT OF BALANCE"}
        </Badge>
      </div>

      <Table>
        <TableHeader style={{ backgroundColor: "#f8fafc" }}>
          <TableRow>
            <TableHead style={{ width: "15%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>CODE</TableHead>
            <TableHead style={{ width: "40%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>ACCOUNT NAME</TableHead>
            <TableHead style={{ width: "15%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>TYPE</TableHead>
            <TableHead style={{ width: "15%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>DEBIT (ZAR)</TableHead>
            <TableHead style={{ width: "15%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>CREDIT (ZAR)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeRows.length === 0 ? (
            <TableRow>
              <TableCell style={{ width: "100%", color: "#a1a1aa", fontSize: 8 }}>
                No active account balances found in this period.
              </TableCell>
            </TableRow>
          ) : (
            activeRows.map((row) => (
              <TableRow key={`tb-${row.accountCode}`}>
                <TableCell style={{ width: "15%", fontSize: 8, fontWeight: 600, color: "#0f172a" }}>
                  {row.accountCode}
                </TableCell>
                <TableCell style={{ width: "40%", fontSize: 8, color: "#18181b" }}>
                  {row.accountName}
                </TableCell>
                <TableCell style={{ width: "15%", fontSize: 7.5, color: "#71717a", textTransform: "capitalize" }}>
                  {row.accountType}
                </TableCell>
                <TableCell style={{ width: "15%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
                  {row.totalDebits > 0 ? formatZAR(row.totalDebits) : "—"}
                </TableCell>
                <TableCell style={{ width: "15%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
                  {row.totalCredits > 0 ? formatZAR(row.totalCredits) : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
          <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
            <TableCell style={{ width: "15%", fontWeight: 700, fontSize: 8, color: "#0f172a" }}>
              Total
            </TableCell>
            <TableCell style={{ width: "40%", fontWeight: 700, fontSize: 8, color: "#0f172a" }}>
              {activeRows.length} active accounts
            </TableCell>
            <TableCell style={{ width: "15%", fontSize: 7.5, color: "#71717a" }}>
              {isBalanced ? "Balanced" : "Variance"}
            </TableCell>
            <TableCell
              style={{
                width: "15%",
                textAlign: "right",
                fontWeight: 700,
                fontSize: 8,
                color: isBalanced ? "#0f172a" : "#dc2626",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatZAR(totalDebits)}
            </TableCell>
            <TableCell
              style={{
                width: "15%",
                textAlign: "right",
                fontWeight: 700,
                fontSize: 8,
                color: isBalanced ? "#0f172a" : "#dc2626",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatZAR(totalCredits)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </AccountingReportLayout>
  );
}
