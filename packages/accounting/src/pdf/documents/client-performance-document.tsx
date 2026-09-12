import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@pmg/billing/pdf";
import { formatZAR } from "@pmg/billing/format";
import { type PdfOrgHeader } from "@pmg/billing/pdf-shell";
import { AccountingReportLayout } from "../components/report-layout";

export interface ClientPerformanceRow {
  clientName: string;
  totalRevenue: number;
  totalCashCollected: number;
  totalOutstandingAr: number;
  marginPercent?: number;
}

export interface ClientPerformanceDocumentProps {
  clients: ClientPerformanceRow[];
  org: PdfOrgHeader;
  periodLabel: string;
  generatedAt: string;
}

export function ClientPerformanceDocument({
  clients,
  org,
  periodLabel,
  generatedAt,
}: ClientPerformanceDocumentProps) {
  let totalRev = 0;
  let totalCol = 0;
  let totalAr = 0;

  for (const c of clients) {
    totalRev += c.totalRevenue;
    totalCol += c.totalCashCollected;
    totalAr += c.totalOutstandingAr;
  }

  const avgRate = totalRev > 0 ? (totalCol / totalRev) * 100 : 0;

  return (
    <AccountingReportLayout
      title="Client Performance & Collection Report"
      periodLabel={periodLabel}
      generatedAt={generatedAt}
      org={org}
    >
      <Table>
        <TableHeader style={{ backgroundColor: "#f8fafc" }}>
          <TableRow>
            <TableHead style={{ width: "32%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
              CLIENT NAME
            </TableHead>
            <TableHead style={{ width: "17%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
              INVOICED (ZAR)
            </TableHead>
            <TableHead style={{ width: "17%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
              COLLECTED (ZAR)
            </TableHead>
            <TableHead style={{ width: "18%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
              OUTSTANDING AR
            </TableHead>
            <TableHead style={{ width: "16%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
              COLLECTION RATE
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell style={{ width: "100%", color: "#a1a1aa", fontSize: 8 }}>
                No client billing transactions recorded for this period.
              </TableCell>
            </TableRow>
          ) : (
            clients.map((cli, idx) => (
              <TableRow key={`cli-${idx}`}>
                <TableCell style={{ width: "32%", fontSize: 8, fontWeight: 600, color: "#18181b" }}>
                  {cli.clientName}
                </TableCell>
                <TableCell style={{ width: "17%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
                  {formatZAR(cli.totalRevenue)}
                </TableCell>
                <TableCell style={{ width: "17%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
                  {formatZAR(cli.totalCashCollected)}
                </TableCell>
                <TableCell
                  style={{
                    width: "18%",
                    textAlign: "right",
                    fontSize: 8,
                    fontVariantNumeric: "tabular-nums",
                    color: cli.totalOutstandingAr > 0 ? "#dc2626" : "#71717a",
                  }}
                >
                  {cli.totalOutstandingAr > 0 ? formatZAR(cli.totalOutstandingAr) : "—"}
                </TableCell>
                <TableCell style={{ width: "16%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
                  {`${(cli.marginPercent || 0).toFixed(1)}%`}
                </TableCell>
              </TableRow>
            ))
          )}
          <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
            <TableCell style={{ width: "32%", fontWeight: 700, fontSize: 8, color: "#0f172a" }}>
              Total Portfolio Summary
            </TableCell>
            <TableCell style={{ width: "17%", textAlign: "right", fontWeight: 700, fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
              {formatZAR(totalRev)}
            </TableCell>
            <TableCell style={{ width: "17%", textAlign: "right", fontWeight: 700, fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
              {formatZAR(totalCol)}
            </TableCell>
            <TableCell style={{ width: "18%", textAlign: "right", fontWeight: 700, fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
              {totalAr > 0 ? formatZAR(totalAr) : "—"}
            </TableCell>
            <TableCell style={{ width: "16%", textAlign: "right", fontWeight: 700, fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
              {`${avgRate.toFixed(1)}%`}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </AccountingReportLayout>
  );
}
