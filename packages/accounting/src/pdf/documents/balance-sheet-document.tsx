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

export interface BalanceSheetData {
  assets: Array<{ accountCode: string; accountName: string; amount: number }>;
  totalAssets: number;
  liabilities: Array<{ accountCode: string; accountName: string; amount: number }>;
  totalLiabilities: number;
  equity: Array<{ accountCode: string; accountName: string; amount: number }>;
  netIncome: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
}

export interface BalanceSheetDocumentProps {
  result: BalanceSheetData;
  org: PdfOrgHeader;
  periodLabel: string;
  divisionLabel?: string;
  generatedAt: string;
}

export function BalanceSheetDocument({
  result,
  org,
  periodLabel,
  divisionLabel,
  generatedAt,
}: BalanceSheetDocumentProps) {
  const equityRows = [
    ...result.equity,
    {
      accountCode: "—",
      accountName: "Retained Earnings / Current Period Net Income",
      amount: result.netIncome,
    },
  ];

  return (
    <AccountingReportLayout
      title="Balance Sheet (Statement of Financial Position)"
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt}
      org={org}
    >
      {/* Assets Section */}
      <div style={{ marginBottom: 14 }}>
        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "75%", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>
                ASSETS
              </TableHead>
              <TableHead style={{ width: "25%", textAlign: "right", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>
                AMOUNT (ZAR)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.assets.length === 0 ? (
              <TableRow>
                <TableCell style={{ width: "75%", color: "#a1a1aa", fontSize: 8.5 }}>
                  No asset accounts found.
                </TableCell>
                <TableCell style={{ width: "25%", textAlign: "right", color: "#a1a1aa", fontSize: 8.5 }}>
                  {formatZAR(0)}
                </TableCell>
              </TableRow>
            ) : (
              result.assets.map((row, idx) => (
                <TableRow key={`asset-${row.accountCode || idx}`}>
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
                Total Assets
              </TableCell>
              <TableCell style={{ width: "25%", textAlign: "right", fontWeight: 700, fontSize: 8.5, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {formatZAR(result.totalAssets)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Liabilities Section */}
      <div style={{ marginBottom: 14 }}>
        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "75%", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>
                LIABILITIES
              </TableHead>
              <TableHead style={{ width: "25%", textAlign: "right", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>
                AMOUNT (ZAR)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.liabilities.length === 0 ? (
              <TableRow>
                <TableCell style={{ width: "75%", color: "#a1a1aa", fontSize: 8.5 }}>
                  No liability accounts found.
                </TableCell>
                <TableCell style={{ width: "25%", textAlign: "right", color: "#a1a1aa", fontSize: 8.5 }}>
                  {formatZAR(0)}
                </TableCell>
              </TableRow>
            ) : (
              result.liabilities.map((row, idx) => (
                <TableRow key={`liab-${row.accountCode || idx}`}>
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
                Total Liabilities
              </TableCell>
              <TableCell style={{ width: "25%", textAlign: "right", fontWeight: 700, fontSize: 8.5, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {formatZAR(result.totalLiabilities)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Equity Section */}
      <div style={{ marginBottom: 14 }}>
        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "75%", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>
                EQUITY
              </TableHead>
              <TableHead style={{ width: "25%", textAlign: "right", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>
                AMOUNT (ZAR)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equityRows.map((row, idx) => (
              <TableRow key={`equity-${row.accountCode || idx}`}>
                <TableCell style={{ width: "75%", fontSize: 8.5, color: "#18181b" }}>
                  {row.accountCode !== "—" && (
                    <span style={{ fontWeight: 600, color: "#0f172a", marginRight: 6 }}>
                      {row.accountCode}
                    </span>
                  )}
                  {row.accountName}
                </TableCell>
                <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8.5, color: "#18181b", fontVariantNumeric: "tabular-nums" }}>
                  {formatZAR(row.amount)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "1.5px solid #cbd5e1" }}>
              <TableCell style={{ width: "75%", fontWeight: 700, fontSize: 8.5, color: "#0f172a" }}>
                Total Equity
              </TableCell>
              <TableCell style={{ width: "25%", textAlign: "right", fontWeight: 700, fontSize: 8.5, color: "#0f172a", fontVariantNumeric: "tabular-nums" }}>
                {formatZAR(result.totalEquity)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Total Liabilities & Equity Summary Card */}
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
            marginTop: 6,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#0f172a" }}>
              TOTAL LIABILITIES & EQUITY
            </span>
            <span style={{ fontSize: 7.5, color: "#64748b" }}>
              Balanced Accounting Equation (Assets = Liabilities + Equity)
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#0f172a",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatZAR(result.totalLiabilitiesAndEquity)}
          </span>
        </div>
      </KeepTogether>
    </AccountingReportLayout>
  );
}
