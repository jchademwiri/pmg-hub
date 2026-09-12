import React from "react";
import {
  Document,
  Page,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  PageBreak,
  KeepTogether,
} from "@pmg/billing/pdf";
import { formatZAR } from "@pmg/billing/format";
import type { AnnualFinancialStatementsResult } from "@pmg/db";
import { type PdfOrgHeader } from "@pmg/billing/pdf-shell";

export interface AnnualFinancialStatementsDocumentProps {
  result: AnnualFinancialStatementsResult;
  org: PdfOrgHeader;
  periodLabel: string;
  generatedAt: string;
}

function AfsPageHeader({
  title,
  periodLabel,
  generatedAt,
  org,
}: {
  title: string;
  periodLabel: string;
  generatedAt: string;
  org: PdfOrgHeader;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingBottom: 10,
        borderBottom: "1px solid #e4e4e7",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
          {org.name}
        </span>
        <span style={{ fontSize: 7.5, color: "#71717a" }}>
          Registration: 2023/123456/07 | VAT: 4123456789
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase" }}>
          {title}
        </span>
        <span style={{ fontSize: 7.5, color: "#71717a" }}>
          {periodLabel} | Generated {generatedAt}
        </span>
      </div>
    </div>
  );
}

function AfsPageFooter({ pageNo }: { pageNo: number }) {
  return (
    <div
      style={{
        marginTop: "auto",
        paddingTop: 8,
        borderTop: "1px solid #e4e4e7",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 7, color: "#71717a" }}>
        Playhouse Media Group (Pty) Ltd — Annual Financial Statements
      </span>
      <span style={{ fontSize: 7, color: "#71717a" }}>
        Page {pageNo} of 6
      </span>
    </div>
  );
}

export function AnnualFinancialStatementsDocument({
  result,
  org,
  periodLabel,
  generatedAt,
}: AnnualFinancialStatementsDocumentProps) {
  const info = result.generalInfo;
  const curYear = info.currentYearLabel;
  const priYear = info.priorYearLabel;
  const dr = result.directorsReport;
  const pnl = result.statementOfProfitLoss;
  const bs = result.statementOfPosition;
  const eq = result.statementOfChangesInEquity;
  const cf = result.statementOfCashFlows;
  const det = result.detailedIncomeStatement;

  return (
    <Document>
      {/* PAGE 1: DIRECTORS' REPORT */}
      <Page size="A4" style={{ padding: 28, backgroundColor: "#ffffff" }}>
        <div style={{ width: "100%", height: 3, backgroundColor: "#0f172a", marginBottom: 12 }} />
        <AfsPageHeader
          title="Directors' Report"
          periodLabel={periodLabel}
          generatedAt={generatedAt}
          org={org}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#1e3a8a", display: "block", marginBottom: 4 }}>
              1. Nature of Business
            </span>
            <span style={{ fontSize: 8, color: "#27272a", lineHeight: "1.4" }}>
              {dr.principalActivities}
            </span>
          </div>

          <div>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#1e3a8a", display: "block", marginBottom: 6 }}>
              2. Business Activities & Financial Results Summary
            </span>
            <Table>
              <TableHeader style={{ backgroundColor: "#f8fafc" }}>
                <TableRow>
                  <TableHead style={{ width: "50%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
                    FINANCIAL INDICATOR
                  </TableHead>
                  <TableHead style={{ width: "25%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
                    {curYear} (ZAR)
                  </TableHead>
                  <TableHead style={{ width: "25%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>
                    {priYear} (ZAR)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell style={{ width: "50%", fontSize: 8, fontWeight: 600 }}>Sales Revenue (Group Total)</TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(dr.businessActivities.revenue.current)}</TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(dr.businessActivities.revenue.prior)}</TableCell>
                </TableRow>
                {dr.divisionBreakdown.map((div, idx) => (
                  <TableRow key={`dr-div-${idx}`}>
                    <TableCell style={{ width: "50%", fontSize: 7.5, color: "#52525b", paddingLeft: 14 }}>• {div.divisionName}</TableCell>
                    <TableCell style={{ width: "25%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(div.current)}</TableCell>
                    <TableCell style={{ width: "25%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(div.prior)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell style={{ width: "50%", fontSize: 8 }}>Operating Profit / (Loss)</TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(dr.businessActivities.operatingProfit.current)}</TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(dr.businessActivities.operatingProfit.prior)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ width: "50%", fontSize: 8, fontWeight: 600 }}>Profit / (Loss) for the Year</TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatZAR(dr.businessActivities.netProfit.current)}</TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatZAR(dr.businessActivities.netProfit.prior)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ width: "50%", fontSize: 8 }}>Total Assets</TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(dr.businessActivities.totalAssets.current)}</TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(dr.businessActivities.totalAssets.prior)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ width: "50%", fontSize: 8 }}>Total Liabilities</TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(dr.businessActivities.totalLiabilities.current)}</TableCell>
                  <TableCell style={{ width: "25%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(dr.businessActivities.totalLiabilities.prior)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: "#1e3a8a", display: "block", marginBottom: 4 }}>
              3. Going Concern & Subsequent Events
            </span>
            <span style={{ fontSize: 8, color: "#27272a", lineHeight: "1.4", display: "block", marginBottom: 4 }}>
              {dr.goingConcernStatement}
            </span>
            <span style={{ fontSize: 8, color: "#27272a", lineHeight: "1.4" }}>
              {dr.eventsAfterReportingPeriod}
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "#0f172a", display: "block" }}>
              {info.directorName}
            </span>
            <span style={{ fontSize: 7.5, color: "#71717a" }}>
              Managing Director
            </span>
          </div>
        </div>

        <AfsPageFooter pageNo={1} />
      </Page>

      <PageBreak />

      {/* PAGE 2: STATEMENT OF COMPREHENSIVE INCOME */}
      <Page size="A4" style={{ padding: 28, backgroundColor: "#ffffff" }}>
        <div style={{ width: "100%", height: 3, backgroundColor: "#0f172a", marginBottom: 12 }} />
        <AfsPageHeader
          title="Statement of Comprehensive Income"
          periodLabel={periodLabel}
          generatedAt={generatedAt}
          org={org}
        />

        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "45%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>ACCOUNT DESCRIPTION</TableHead>
              <TableHead style={{ width: "15%", textAlign: "center", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>NOTES</TableHead>
              <TableHead style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>{curYear} (ZAR)</TableHead>
              <TableHead style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>{priYear} (ZAR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell style={{ width: "45%", fontSize: 8, fontWeight: 700 }}>Revenue (Group Total)</TableCell>
              <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 2</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.revenue.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.revenue.prior)}</TableCell>
            </TableRow>
            {pnl.divisionBreakdown.map((div, idx) => (
              <TableRow key={`pnl-div-${idx}`}>
                <TableCell style={{ width: "45%", fontSize: 7.5, color: "#52525b", paddingLeft: 14 }}>• {div.divisionName}</TableCell>
                <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 2</TableCell>
                <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(div.current)}</TableCell>
                <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(div.prior)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell style={{ width: "45%", fontSize: 8 }}>Less: Depreciation Expense</TableCell>
              <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 5</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.depreciation.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.depreciation.prior)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={{ width: "45%", fontSize: 8 }}>Employee Benefits Expense</TableCell>
              <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 1</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.employeeBenefits.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.employeeBenefits.prior)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={{ width: "45%", fontSize: 8 }}>Other Operating Expenses</TableCell>
              <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 3</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.totalExpenses.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.totalExpenses.prior)}</TableCell>
            </TableRow>
            <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "1.5px solid #cbd5e1" }}>
              <TableCell style={{ width: "45%", fontSize: 8.5, fontWeight: 700 }}>Operating Profit / (Loss)</TableCell>
              <TableCell style={{ width: "15%" }} />
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.operatingProfit.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.operatingProfit.prior)}</TableCell>
            </TableRow>
            <TableRow style={{ backgroundColor: "#f1f5f9", borderTop: "2px solid #0f172a" }}>
              <TableCell style={{ width: "45%", fontSize: 9, fontWeight: 800 }}>Profit / (Loss) for the Year</TableCell>
              <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 4</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 9, fontWeight: 800, color: pnl.netProfit.current >= 0 ? "#15803d" : "#b91c1c", fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.netProfit.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 9, fontWeight: 800, color: pnl.netProfit.prior >= 0 ? "#15803d" : "#b91c1c", fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.netProfit.prior)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <AfsPageFooter pageNo={2} />
      </Page>

      <PageBreak />

      {/* PAGE 3: STATEMENT OF FINANCIAL POSITION */}
      <Page size="A4" style={{ padding: 28, backgroundColor: "#ffffff" }}>
        <div style={{ width: "100%", height: 3, backgroundColor: "#0f172a", marginBottom: 12 }} />
        <AfsPageHeader
          title="Statement of Financial Position"
          periodLabel={periodLabel}
          generatedAt={generatedAt}
          org={org}
        />

        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "45%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>ACCOUNT DESCRIPTION</TableHead>
              <TableHead style={{ width: "15%", textAlign: "center", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>NOTES</TableHead>
              <TableHead style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>{curYear} (ZAR)</TableHead>
              <TableHead style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>{priYear} (ZAR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow style={{ backgroundColor: "#f8fafc" }}>
              <TableCell style={{ width: "100%", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>ASSETS</TableCell>
            </TableRow>
            {bs.assets.map((a, idx) => (
              <TableRow key={`bs-asset-${idx}`}>
                <TableCell style={{ width: "45%", fontSize: 7.5, color: "#18181b", paddingLeft: 10 }}>{a.accountName}</TableCell>
                <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 5</TableCell>
                <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(a.amount)}</TableCell>
                <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(0)}</TableCell>
              </TableRow>
            ))}
            <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "1.5px solid #cbd5e1" }}>
              <TableCell style={{ width: "45%", fontSize: 8, fontWeight: 700 }}>Total Assets</TableCell>
              <TableCell style={{ width: "15%" }} />
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatZAR(bs.totalAssets.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatZAR(bs.totalAssets.prior)}</TableCell>
            </TableRow>

            <TableRow style={{ backgroundColor: "#f8fafc" }}>
              <TableCell style={{ width: "100%", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>EQUITY AND LIABILITIES</TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={{ width: "45%", fontSize: 7.5, paddingLeft: 10 }}>Shareholders Contribution</TableCell>
              <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 10</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>R 100,00</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>R 100,00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={{ width: "45%", fontSize: 7.5, paddingLeft: 10 }}>Retained Earnings</TableCell>
              <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 4</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.netProfit.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.netProfit.prior)}</TableCell>
            </TableRow>
            {bs.liabilities.map((l, idx) => (
              <TableRow key={`bs-liab-${idx}`}>
                <TableCell style={{ width: "45%", fontSize: 7.5, paddingLeft: 10 }}>{l.accountName}</TableCell>
                <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 11</TableCell>
                <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(l.amount)}</TableCell>
                <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(0)}</TableCell>
              </TableRow>
            ))}
            <TableRow style={{ backgroundColor: "#f1f5f9", borderTop: "2px solid #0f172a" }}>
              <TableCell style={{ width: "45%", fontSize: 8.5, fontWeight: 800 }}>Total Equity and Liabilities</TableCell>
              <TableCell style={{ width: "15%" }} />
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatZAR(bs.totalLiabilitiesAndEquity.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatZAR(bs.totalLiabilitiesAndEquity.prior)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <AfsPageFooter pageNo={3} />
      </Page>

      <PageBreak />

      {/* PAGE 4: STATEMENT OF CHANGES IN EQUITY */}
      <Page size="A4" style={{ padding: 28, backgroundColor: "#ffffff" }}>
        <div style={{ width: "100%", height: 3, backgroundColor: "#0f172a", marginBottom: 12 }} />
        <AfsPageHeader
          title="Statement of Changes in Equity"
          periodLabel={periodLabel}
          generatedAt={generatedAt}
          org={org}
        />

        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "40%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>PERIOD / MOVEMENT</TableHead>
              <TableHead style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>SHARE CAPITAL</TableHead>
              <TableHead style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>RETAINED EARNINGS</TableHead>
              <TableHead style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>TOTAL EQUITY</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell style={{ width: "40%", fontSize: 7.5 }}>Balance at {eq.priorYearStartLabel}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>R 100,00</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>R 0,00</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>R 100,00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={{ width: "40%", fontSize: 7.5 }}>Net Profit / (Loss) for FY{priYear}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>—</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(eq.priorNetProfit)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(eq.priorNetProfit)}</TableCell>
            </TableRow>
            <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "1px solid #cbd5e1" }}>
              <TableCell style={{ width: "40%", fontSize: 8, fontWeight: 600 }}>Balance at {eq.priorYearEndLabel}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>R 100,00</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(eq.priorClosingRetained)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatZAR(100 + eq.priorClosingRetained)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={{ width: "40%", fontSize: 7.5 }}>Net Profit / (Loss) for FY{curYear} (to date)</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>—</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(eq.currentNetProfit)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(eq.currentNetProfit)}</TableCell>
            </TableRow>
            <TableRow style={{ backgroundColor: "#f1f5f9", borderTop: "2px solid #0f172a" }}>
              <TableCell style={{ width: "40%", fontSize: 8.5, fontWeight: 800 }}>Balance at {eq.currentYearEndLabel}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>R 100,00</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatZAR(eq.currentClosingRetained)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatZAR(100 + eq.currentClosingRetained)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <AfsPageFooter pageNo={4} />
      </Page>

      <PageBreak />

      {/* PAGE 5: STATEMENT OF CASH FLOWS */}
      <Page size="A4" style={{ padding: 28, backgroundColor: "#ffffff" }}>
        <div style={{ width: "100%", height: 3, backgroundColor: "#0f172a", marginBottom: 12 }} />
        <AfsPageHeader
          title="Statement of Cash Flows"
          periodLabel={periodLabel}
          generatedAt={generatedAt}
          org={org}
        />

        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "45%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>CASH FLOW CATEGORY</TableHead>
              <TableHead style={{ width: "15%", textAlign: "center", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>NOTES</TableHead>
              <TableHead style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>{curYear} (ZAR)</TableHead>
              <TableHead style={{ width: "20%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>{priYear} (ZAR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell style={{ width: "45%", fontSize: 8, fontWeight: 600 }}>Profit for the Year</TableCell>
              <TableCell style={{ width: "15%" }} />
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.netProfit.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.netProfit.prior)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={{ width: "45%", fontSize: 8 }}>Depreciation of Property, Plant & Equipment</TableCell>
              <TableCell style={{ width: "15%", textAlign: "center", fontSize: 7.5, color: "#71717a" }}>Note 5</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(pnl.depreciation.current)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(0)}</TableCell>
            </TableRow>
            <TableRow style={{ backgroundColor: "#f8fafc", borderTop: "1.5px solid #cbd5e1" }}>
              <TableCell style={{ width: "45%", fontSize: 8, fontWeight: 700 }}>Net Cash from Operating Activities</TableCell>
              <TableCell style={{ width: "15%" }} />
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatZAR(cf.current.netOperatingCashFlow)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatZAR(cf.prior.netOperatingCashFlow)}</TableCell>
            </TableRow>
            <TableRow style={{ backgroundColor: "#f1f5f9", borderTop: "2px solid #0f172a" }}>
              <TableCell style={{ width: "45%", fontSize: 8.5, fontWeight: 800 }}>Net Increase in Cash & Cash Equivalents</TableCell>
              <TableCell style={{ width: "15%" }} />
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatZAR(cf.current.endingCashBalance)}</TableCell>
              <TableCell style={{ width: "20%", textAlign: "right", fontSize: 8.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatZAR(cf.prior.endingCashBalance)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <AfsPageFooter pageNo={5} />
      </Page>

      <PageBreak />

      {/* PAGE 6: DETAILED INCOME STATEMENT */}
      <Page size="A4" style={{ padding: 28, backgroundColor: "#ffffff" }}>
        <div style={{ width: "100%", height: 3, backgroundColor: "#0f172a", marginBottom: 12 }} />
        <AfsPageHeader
          title="Detailed Income Statement"
          periodLabel={periodLabel}
          generatedAt={generatedAt}
          org={org}
        />

        <Table>
          <TableHeader style={{ backgroundColor: "#f8fafc" }}>
            <TableRow>
              <TableHead style={{ width: "55%", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>REVENUE & EXPENSE SCHEDULE</TableHead>
              <TableHead style={{ width: "22.5%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>{curYear} (ZAR)</TableHead>
              <TableHead style={{ width: "22.5%", textAlign: "right", fontSize: 7.5, fontWeight: 700, color: "#64748b" }}>{priYear} (ZAR)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow style={{ backgroundColor: "#f8fafc" }}>
              <TableCell style={{ width: "100%", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>INCOME</TableCell>
            </TableRow>
            <TableRow>
              <TableCell style={{ width: "55%", fontSize: 8 }}>Sales Revenue (excluding VAT)</TableCell>
              <TableCell style={{ width: "22.5%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(det.revenue.current)}</TableCell>
              <TableCell style={{ width: "22.5%", textAlign: "right", fontSize: 8, fontVariantNumeric: "tabular-nums" }}>{formatZAR(det.revenue.prior)}</TableCell>
            </TableRow>
            {det.divisionBreakdown.map((div, idx) => (
              <TableRow key={`det-div-${idx}`}>
                <TableCell style={{ width: "55%", fontSize: 7.5, color: "#52525b", paddingLeft: 14 }}>• {div.divisionName}</TableCell>
                <TableCell style={{ width: "22.5%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(div.current)}</TableCell>
                <TableCell style={{ width: "22.5%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(div.prior)}</TableCell>
              </TableRow>
            ))}

            <TableRow style={{ backgroundColor: "#f8fafc" }}>
              <TableCell style={{ width: "100%", fontSize: 8, fontWeight: 700, color: "#1e3a8a" }}>OPERATING EXPENSES</TableCell>
            </TableRow>
            {det.expenses.map((exp, idx) => (
              <TableRow key={`det-exp-${idx}`}>
                <TableCell style={{ width: "55%", fontSize: 7.5, color: "#18181b", paddingLeft: 10 }}>{exp.accountCode} — {exp.accountName}</TableCell>
                <TableCell style={{ width: "22.5%", textAlign: "right", fontSize: 7.5, fontVariantNumeric: "tabular-nums" }}>{formatZAR(exp.amount)}</TableCell>
                <TableCell style={{ width: "22.5%", textAlign: "right", fontSize: 7.5, color: "#a1a1aa" }}>—</TableCell>
              </TableRow>
            ))}

            <TableRow style={{ backgroundColor: "#f1f5f9", borderTop: "2px solid #0f172a" }}>
              <TableCell style={{ width: "55%", fontSize: 8.5, fontWeight: 800 }}>Profit / (Loss) for the Year</TableCell>
              <TableCell style={{ width: "22.5%", textAlign: "right", fontSize: 8.5, fontWeight: 800, color: det.netProfit.current >= 0 ? "#15803d" : "#b91c1c", fontVariantNumeric: "tabular-nums" }}>{formatZAR(det.netProfit.current)}</TableCell>
              <TableCell style={{ width: "22.5%", textAlign: "right", fontSize: 8.5, fontWeight: 800, color: det.netProfit.prior >= 0 ? "#15803d" : "#b91c1c", fontVariantNumeric: "tabular-nums" }}>{formatZAR(det.netProfit.prior)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <AfsPageFooter pageNo={6} />
      </Page>
    </Document>
  );
}
