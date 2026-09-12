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
import type { ProfitAndLossResult, ProfitAndLossByDivisionRow } from "@pmg/db";
import { type PdfOrgHeader } from "@pmg/billing/pdf-shell";
import { AccountingReportLayout } from "../components/report-layout";

export interface ProfitAndLossDocumentProps {
  result: ProfitAndLossResult;
  byDivision?: ProfitAndLossByDivisionRow[];
  org: PdfOrgHeader;
  periodLabel: string;
  divisionLabel?: string;
  generatedAt: string;
}

export function ProfitAndLossDocument({
  result,
  byDivision,
  org,
  periodLabel,
  divisionLabel,
  generatedAt,
}: ProfitAndLossDocumentProps) {
  const isProfit = result.netProfit >= 0;

  return (
    <AccountingReportLayout
      title="Profit & Loss Statement"
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt}
      org={org}
    >
      {/* Revenue Section */}
      <div style={{ marginBottom: 14 }}>
        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "75%", fontSize: 8, fontWeight: 700, color: "#64748b" }}>
                REVENUE ACCOUNTS
              </TableHead>
              <TableHead style={{ width: "25%", textAlign: "right", fontSize: 8, fontWeight: 700, color: "#64748b" }}>
                AMOUNT (ZAR)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.revenue.length === 0 ? (
              <TableRow>
                <TableCell style={{ width: "75%", color: "#a1a1aa", fontSize: 8.5 }}>
                  No revenue activity recorded in this period.
                </TableCell>
                <TableCell style={{ width: "25%", textAlign: "right", color: "#a1a1aa", fontSize: 8.5 }}>
                  {formatZAR(0)}
                </TableCell>
              </TableRow>
            ) : (
              result.revenue.map((row, idx) => (
                <TableRow key={`rev-${row.accountCode || idx}`}>
                  <TableCell style={{ width: "75%", fontSize: 8.5, color: "#18181b" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a", marginRight: 6 }}>
                      {row.accountCode}
                    </span>
                    {row.accountName}
                  </TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8.5, color: "#18181b", fontVariantNumeric: "tabular-nums" }}>
                    {formatZAR(row.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "1.5px solid #cbd5e1" }}>
              <TableCell style={{ width: "75%", fontWeight: 700, fontSize: 8.5, color: "#0f172a" }}>
                Total Revenue
              </TableCell>
              <TableCell style={{ width: "25%", textAlign: "right", fontWeight: 700, fontSize: 8.5, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {formatZAR(result.totalRevenue)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Expenses Section */}
      <div style={{ marginBottom: 14 }}>
        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "75%", fontSize: 8, fontWeight: 700, color: "#64748b" }}>
                EXPENSE ACCOUNTS
              </TableHead>
              <TableHead style={{ width: "25%", textAlign: "right", fontSize: 8, fontWeight: 700, color: "#64748b" }}>
                AMOUNT (ZAR)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.expenses.length === 0 ? (
              <TableRow>
                <TableCell style={{ width: "75%", color: "#a1a1aa", fontSize: 8.5 }}>
                  No expense activity recorded in this period.
                </TableCell>
                <TableCell style={{ width: "25%", textAlign: "right", color: "#a1a1aa", fontSize: 8.5 }}>
                  {formatZAR(0)}
                </TableCell>
              </TableRow>
            ) : (
              result.expenses.map((row, idx) => (
                <TableRow key={`exp-${row.accountCode || idx}`}>
                  <TableCell style={{ width: "75%", fontSize: 8.5, color: "#18181b" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a", marginRight: 6 }}>
                      {row.accountCode}
                    </span>
                    {row.accountName}
                  </TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8.5, color: "#18181b", fontVariantNumeric: "tabular-nums" }}>
                    {formatZAR(row.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
            <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "1.5px solid #cbd5e1" }}>
              <TableCell style={{ width: "75%", fontWeight: 700, fontSize: 8.5, color: "#0f172a" }}>
                Total Expenses
              </TableCell>
              <TableCell style={{ width: "25%", textAlign: "right", fontWeight: 700, fontSize: 8.5, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {formatZAR(result.totalExpenses)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Net Profit / Loss Banner */}
      <KeepTogether>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            backgroundColor: isProfit ? "#f0fdf4" : "#fef2f2",
            borderRadius: 6,
            border: `1.5px solid ${isProfit ? "#86efac" : "#fca5a5"}`,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isProfit ? "#166534" : "#991b1b" }}>
              {isProfit ? "NET PROFIT" : "NET LOSS"}
            </span>
            <span style={{ fontSize: 7.5, color: isProfit ? "#15803d" : "#b91c1c" }}>
              Total Revenue minus Total Operating Expenses
            </span>
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: isProfit ? "#15803d" : "#b91c1c",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatZAR(result.netProfit)}
          </span>
        </div>
      </KeepTogether>

      {/* Optional Division Performance Breakdown */}
      {byDivision && byDivision.length > 0 && (
        <KeepTogether>
          <div style={{ marginTop: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#1e3a8a", marginBottom: 6, display: "block" }}>
              Division Performance Breakdown
            </span>
            <Table>
              <TableHeader style={{ backgroundColor: "#f8fafc" }}>
                <TableRow>
                  <TableHead style={{ width: "28%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>DIVISION</TableHead>
                  <TableHead style={{ width: "15%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>REVENUE</TableHead>
                  <TableHead style={{ width: "15%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>CASH REC.</TableHead>
                  <TableHead style={{ width: "14%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>OUTST. AR</TableHead>
                  <TableHead style={{ width: "14%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>EXPENSES</TableHead>
                  <TableHead style={{ width: "14%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>NET PROFIT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDivision.map((div, idx) => (
                  <TableRow key={`div-${div.divisionId || idx}`}>
                    <TableCell style={{ width: "28%", fontSize: 7.5, fontWeight: 600, color: "#18181b" }}>
                      {div.divisionName}
                    </TableCell>
                    <TableCell style={{ width: "15%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>
                      {formatZAR(div.totalRevenue)}
                    </TableCell>
                    <TableCell style={{ width: "15%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>
                      {formatZAR(div.totalIncome)}
                    </TableCell>
                    <TableCell style={{ width: "14%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums", color: div.totalOutstandingAr > 0 ? "#dc2626" : "#71717a" }}>
                      {div.totalOutstandingAr > 0 ? formatZAR(div.totalOutstandingAr) : "—"}
                    </TableCell>
                    <TableCell style={{ width: "14%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>
                      {formatZAR(div.totalExpenses)}
                    </TableCell>
                    <TableCell
                      style={{
                        width: "14%",
                        textAlign: "right",
                        fontSize: 7.5,
                        fontWeight: 700,
                        color: div.netProfit >= 0 ? "#15803d" : "#b91c1c",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatZAR(div.netProfit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </KeepTogether>
      )}
    </AccountingReportLayout>
  );
}

export interface DivisionPerformanceDocumentProps {
  rows: ProfitAndLossByDivisionRow[];
  org: PdfOrgHeader;
  periodLabel: string;
  divisionLabel?: string;
  generatedAt: string;
}

export function DivisionPerformanceDocument({
  rows,
  org,
  periodLabel,
  divisionLabel,
  generatedAt,
}: DivisionPerformanceDocumentProps) {
  let totalRevenue = 0;
  let totalIncome = 0;
  let totalAr = 0;
  let totalExpenses = 0;
  let totalNet = 0;

  for (const r of rows) {
    totalRevenue += r.totalRevenue;
    totalIncome += r.totalIncome;
    totalAr += r.totalOutstandingAr;
    totalExpenses += r.totalExpenses;
    totalNet += r.netProfit;
  }

  return (
    <AccountingReportLayout
      title="Division Performance & Cash Flow Summary"
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt}
      org={org}
    >
      <Table>
        <TableHeader style={{ backgroundColor: "#f8fafc" }}>
          <TableRow>
            <TableHead style={{ width: "24%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>DIVISION</TableHead>
            <TableHead style={{ width: "13%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>REVENUE</TableHead>
            <TableHead style={{ width: "13%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>CASH REC.</TableHead>
            <TableHead style={{ width: "13%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>OUTST. AR</TableHead>
            <TableHead style={{ width: "13%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>EXPENSES</TableHead>
            <TableHead style={{ width: "13%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>NET PROFIT</TableHead>
            <TableHead style={{ width: "11%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>MARGIN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={`div-perf-${row.divisionId || idx}`}>
              <TableCell style={{ width: "24%", fontSize: 8, fontWeight: 600, color: "#18181b" }}>
                {row.divisionName}
              </TableCell>
              <TableCell style={{ width: "13%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
                {formatZAR(row.totalRevenue)}
              </TableCell>
              <TableCell style={{ width: "13%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
                {formatZAR(row.totalIncome)}
              </TableCell>
              <TableCell style={{ width: "13%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums", color: row.totalOutstandingAr > 0 ? "#dc2626" : "#71717a" }}>
                {row.totalOutstandingAr > 0 ? formatZAR(row.totalOutstandingAr) : "—"}
              </TableCell>
              <TableCell style={{ width: "13%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
                {formatZAR(row.totalExpenses)}
              </TableCell>
              <TableCell
                style={{
                  width: "13%",
                  textAlign: "right",
                  fontSize: 8,
                  fontWeight: 700,
                  color: row.netProfit >= 0 ? "#15803d" : "#b91c1c",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatZAR(row.netProfit)}
              </TableCell>
              <TableCell style={{ width: "11%", textAlign: "right", fontSize: 8, color: "#71717a", fontVariantNumeric: "tabular-nums" }}>
                {(row.marginPercent || 0).toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
          <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
            <TableCell style={{ width: "24%", fontWeight: 700, fontSize: 8, color: "#0f172a" }}>
              Total Group
            </TableCell>
            <TableCell style={{ width: "13%", textAlign: "right", fontWeight: 700, fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
              {formatZAR(totalRevenue)}
            </TableCell>
            <TableCell style={{ width: "13%", textAlign: "right", fontWeight: 700, fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
              {formatZAR(totalIncome)}
            </TableCell>
            <TableCell style={{ width: "13%", textAlign: "right", fontWeight: 700, fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
              {formatZAR(totalAr)}
            </TableCell>
            <TableCell style={{ width: "13%", textAlign: "right", fontWeight: 700, fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
              {formatZAR(totalExpenses)}
            </TableCell>
            <TableCell
              style={{
                width: "13%",
                textAlign: "right",
                fontWeight: 700,
                fontSize: 8,
                color: totalNet >= 0 ? "#15803d" : "#b91c1c",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatZAR(totalNet)}
            </TableCell>
            <TableCell style={{ width: "11%", textAlign: "right", fontWeight: 700, fontSize: 8, fontVariantNumeric: "tabular-nums" }}>
              {totalRevenue > 0 ? `${((totalNet / totalRevenue) * 100).toFixed(1)}%` : "0.0%"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </AccountingReportLayout>
  );
}
