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
import { formatZAR } from "@pmg/billing/format";
import { type PdfOrgHeader } from "@pmg/billing/pdf-shell";
import { AccountingReportLayout } from "../components/report-layout";

export interface CashFlowData {
  operatingActivities: Array<{ description: string; amount: number }>;
  netOperatingCashFlow: number;
  netCashIncrease: number;
}

export interface CashFlowDocumentProps {
  result: CashFlowData;
  org: PdfOrgHeader;
  periodLabel: string;
  divisionLabel?: string;
  generatedAt: string;
}

export function CashFlowDocument({
  result,
  org,
  periodLabel,
  divisionLabel,
  generatedAt,
}: CashFlowDocumentProps) {
  return (
    <AccountingReportLayout
      title="Cash Flow Statement"
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt}
      org={org}
    >
      <div style={{ marginBottom: 16 }}>
        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "75%", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>
                CASH FLOWS FROM OPERATING ACTIVITIES
              </TableHead>
              <TableHead style={{ width: "25%", textAlign: "right", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>
                AMOUNT (ZAR)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.operatingActivities.length === 0 ? (
              <TableRow>
                <TableCell style={{ width: "75%", color: "#a1a1aa", fontSize: 8.5 }}>
                  No operating cash flow items recorded.
                </TableCell>
                <TableCell style={{ width: "25%", textAlign: "right", color: "#a1a1aa", fontSize: 8.5 }}>
                  {formatZAR(0)}
                </TableCell>
              </TableRow>
            ) : (
              result.operatingActivities.map((row, idx) => (
                <TableRow key={`cf-${idx}`}>
                  <TableCell style={{ width: "75%", fontSize: 8.5, color: "#18181b" }}>
                    {row.description}
                  </TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8.5, color: "#18181b", fontVariantNumeric: "tabular-nums" }}>
                    {formatZAR(row.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "1.5px solid #cbd5e1" }}>
              <TableCell style={{ width: "75%", fontWeight: 700, fontSize: 8.5, color: "#0f172a" }}>
                Net Cash Flow from Operating Activities
              </TableCell>
              <TableCell style={{ width: "25%", textAlign: "right", fontWeight: 700, fontSize: 8.5, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {formatZAR(result.netOperatingCashFlow)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Net Increase Summary Card */}
      <KeepTogether>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            backgroundColor: "#f1f5f9",
            borderRadius: 6,
            border: "1.5px solid #cbd5e1",
            marginTop: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>
              NET INCREASE / (DECREASE) IN CASH
            </span>
            <span style={{ fontSize: 7.5, color: "#64748b" }}>
              Closing Cash and Cash Equivalents Movement
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: result.netCashIncrease >= 0 ? "#15803d" : "#b91c1c",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatZAR(result.netCashIncrease)}
          </span>
        </div>
      </KeepTogether>
    </AccountingReportLayout>
  );
}
