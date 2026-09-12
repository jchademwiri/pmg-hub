import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  KeepTogether,
} from "@pmg/billing/pdf";
import { formatZAR, fmtDate } from "@pmg/billing/format";
import type { GeneralLedgerRow } from "@pmg/db";
import { type PdfOrgHeader } from "@pmg/billing/pdf-shell";
import { AccountingReportLayout } from "../components/report-layout";

export interface GeneralLedgerDocumentProps {
  rows: GeneralLedgerRow[];
  totalCount: number;
  org: PdfOrgHeader;
  periodLabel: string;
  divisionLabel?: string;
  generatedAt: string;
}

export function GeneralLedgerDocument({
  rows,
  totalCount,
  org,
  periodLabel,
  divisionLabel,
  generatedAt,
}: GeneralLedgerDocumentProps) {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const r of rows) {
    totalDebit += r.debit;
    totalCredit += r.credit;
  }

  const isTruncated = totalCount > rows.length;

  return (
    <AccountingReportLayout
      title="General Ledger"
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt}
      org={org}
    >
      {isTruncated && (
        <div
          style={{
            padding: "6px 10px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            borderRadius: 4,
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 7.5, color: "#b91c1c", fontWeight: 600 }}>
            Showing {rows.length} of {totalCount} ledger entries. Narrow your filters to inspect remaining records.
          </span>
        </div>
      )}

      <Table>
        <TableHeader style={{ backgroundColor: "#f8fafc" }}>
          <TableRow>
            <TableHead style={{ width: "12%", fontSize: 7, fontWeight: 700, color: "#64748b" }}>DATE</TableHead>
            <TableHead style={{ width: "12%", fontSize: 7, fontWeight: 700, color: "#64748b" }}>ENTRY #</TableHead>
            <TableHead style={{ width: "14%", fontSize: 7, fontWeight: 700, color: "#64748b" }}>ACCOUNT</TableHead>
            <TableHead style={{ width: "34%", fontSize: 7, fontWeight: 700, color: "#64748b" }}>DESCRIPTION</TableHead>
            <TableHead style={{ width: "14%", textAlign: "right", fontSize: 7, fontWeight: 700, color: "#64748b" }}>DEBIT (ZAR)</TableHead>
            <TableHead style={{ width: "14%", textAlign: "right", fontSize: 7, fontWeight: 700, color: "#64748b" }}>CREDIT (ZAR)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} style={{ width: "100%", color: "#a1a1aa", fontSize: 8, textAlign: "center", padding: 12 }}>
                No general ledger transactions found for the specified criteria.
              </TableCell>
            </TableRow>
          ) : (
            (rows ?? []).map((row, idx) => (
              <TableRow key={`gl-${idx}`}>
                <TableCell style={{ width: "12%", fontSize: 7.5, color: "#52525b" }}>
                  {fmtDate(row.entryDate)}
                </TableCell>
                <TableCell style={{ width: "12%", fontSize: 7.5, fontWeight: 600, color: "#0f172a" }}>
                  {row.entryNumber}
                </TableCell>
                <TableCell style={{ width: "14%", fontSize: 7.5, color: "#18181b" }}>
                  {row.accountCode}
                </TableCell>
                <TableCell style={{ width: "34%", fontSize: 7.5, color: "#27272a" }}>
                  {row.lineDescription || row.description}
                </TableCell>
                <TableCell style={{ width: "14%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>
                  {row.debit > 0 ? formatZAR(row.debit) : "—"}
                </TableCell>
                <TableCell style={{ width: "14%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>
                  {row.credit > 0 ? formatZAR(row.credit) : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
          <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
            <TableCell style={{ width: "12%", fontWeight: 700, fontSize: 8, color: "#0f172a" }}>
              Total
            </TableCell>
            <TableCell style={{ width: "12%", fontSize: 7.5, color: "#71717a" }}>
              {rows.length} lines
            </TableCell>
            <TableCell style={{ width: "14%" }} />
            <TableCell style={{ width: "34%" }} />
            <TableCell style={{ width: "14%", textAlign: "right", fontWeight: 700, fontSize: 8, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
              {formatZAR(totalDebit)}
            </TableCell>
            <TableCell style={{ width: "14%", textAlign: "right", fontWeight: 700, fontSize: 8, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
              {formatZAR(totalCredit)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </AccountingReportLayout>
  );
}
