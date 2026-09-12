import "server-only";

import React from "react";
import { renderDocumentToPdf, pmgTheme, getLogoDataUri } from "@pmg/billing/pdf";
import { type PdfOrgHeader } from "@pmg/billing/pdf-shell";

function resolveOrg(org: PdfOrgHeader): PdfOrgHeader {
  return {
    ...org,
    logoDataUri: org.logoDataUri || getLogoDataUri(org.name),
  };
}
import type {
  ProfitAndLossResult,
  ProfitAndLossByDivisionRow,
  TrialBalanceRow,
  GeneralLedgerRow,
  JournalEntry,
  JournalEntryLineRow,
  ChartAccount,
  AnnualFinancialStatementsResult,
} from "@pmg/db";
import {
  ProfitAndLossDocument,
  DivisionPerformanceDocument,
  BalanceSheetDocument,
  type BalanceSheetData,
  CashFlowDocument,
  type CashFlowData,
  TrialBalanceDocument,
  GeneralLedgerDocument,
  JournalEntriesDocument,
  ChartOfAccountsDocument,
  ClientPerformanceDocument,
  type ClientPerformanceRow,
  AnnualFinancialStatementsDocument,
} from "./index";

export async function renderDeclarativeProfitAndLoss(
  result: ProfitAndLossResult,
  byDivision: ProfitAndLossByDivisionRow[] | undefined,
  org: PdfOrgHeader,
  periodLabel: string,
  divisionLabel?: string,
  generatedAt?: string,
): Promise<Buffer> {
  const element = (
    <ProfitAndLossDocument
      result={result}
      byDivision={byDivision}
      org={resolveOrg(org)}
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt || new Date().toLocaleDateString("en-ZA")}
    />
  );
  const uint8 = await renderDocumentToPdf(element, { theme: pmgTheme });
  return Buffer.from(uint8);
}

export async function renderDeclarativeDivisionPerformance(
  rows: ProfitAndLossByDivisionRow[],
  org: PdfOrgHeader,
  periodLabel: string,
  divisionLabel?: string,
  generatedAt?: string,
): Promise<Buffer> {
  const element = (
    <DivisionPerformanceDocument
      rows={rows}
      org={resolveOrg(org)}
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt || new Date().toLocaleDateString("en-ZA")}
    />
  );
  const uint8 = await renderDocumentToPdf(element, { theme: pmgTheme });
  return Buffer.from(uint8);
}

export async function renderDeclarativeBalanceSheet(
  result: BalanceSheetData,
  org: PdfOrgHeader,
  periodLabel: string,
  divisionLabel?: string,
  generatedAt?: string,
): Promise<Buffer> {
  const element = (
    <BalanceSheetDocument
      result={result}
      org={resolveOrg(org)}
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt || new Date().toLocaleDateString("en-ZA")}
    />
  );
  const uint8 = await renderDocumentToPdf(element, { theme: pmgTheme });
  return Buffer.from(uint8);
}

export async function renderDeclarativeCashFlow(
  result: CashFlowData,
  org: PdfOrgHeader,
  periodLabel: string,
  divisionLabel?: string,
  generatedAt?: string,
): Promise<Buffer> {
  const element = (
    <CashFlowDocument
      result={result}
      org={resolveOrg(org)}
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt || new Date().toLocaleDateString("en-ZA")}
    />
  );
  const uint8 = await renderDocumentToPdf(element, { theme: pmgTheme });
  return Buffer.from(uint8);
}

export async function renderDeclarativeTrialBalance(
  rows: TrialBalanceRow[],
  org: PdfOrgHeader,
  periodLabel: string,
  divisionLabel?: string,
  generatedAt?: string,
): Promise<Buffer> {
  const element = (
    <TrialBalanceDocument
      rows={rows}
      org={resolveOrg(org)}
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt || new Date().toLocaleDateString("en-ZA")}
    />
  );
  const uint8 = await renderDocumentToPdf(element, { theme: pmgTheme });
  return Buffer.from(uint8);
}

export async function renderDeclarativeGeneralLedger(
  rows: GeneralLedgerRow[],
  totalCount: number,
  org: PdfOrgHeader,
  periodLabel: string,
  divisionLabel?: string,
  generatedAt?: string,
): Promise<Buffer> {
  const element = (
    <GeneralLedgerDocument
      rows={rows}
      totalCount={totalCount}
      org={resolveOrg(org)}
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt || new Date().toLocaleDateString("en-ZA")}
    />
  );
  const uint8 = await renderDocumentToPdf(element, { theme: pmgTheme });
  return Buffer.from(uint8);
}

export async function renderDeclarativeJournalEntries(
  entries: JournalEntry[],
  linesByEntry: Record<string, JournalEntryLineRow[]>,
  totalCount: number,
  org: PdfOrgHeader,
  periodLabel: string,
  divisionLabel?: string,
  generatedAt?: string,
): Promise<Buffer> {
  const element = (
    <JournalEntriesDocument
      entries={entries}
      linesByEntry={linesByEntry}
      totalCount={totalCount}
      org={resolveOrg(org)}
      periodLabel={periodLabel}
      divisionLabel={divisionLabel}
      generatedAt={generatedAt || new Date().toLocaleDateString("en-ZA")}
    />
  );
  const uint8 = await renderDocumentToPdf(element, { theme: pmgTheme });
  return Buffer.from(uint8);
}

export async function renderDeclarativeChartOfAccounts(
  grouped: Record<string, ChartAccount[]>,
  org: PdfOrgHeader,
  generatedAt?: string,
): Promise<Buffer> {
  const element = (
    <ChartOfAccountsDocument
      grouped={grouped}
      org={resolveOrg(org)}
      generatedAt={generatedAt || new Date().toLocaleDateString("en-ZA")}
    />
  );
  const uint8 = await renderDocumentToPdf(element, { theme: pmgTheme });
  return Buffer.from(uint8);
}

export async function renderDeclarativeClientPerformance(
  clients: ClientPerformanceRow[],
  org: PdfOrgHeader,
  periodLabel: string,
  generatedAt?: string,
): Promise<Buffer> {
  const element = (
    <ClientPerformanceDocument
      clients={clients}
      org={resolveOrg(org)}
      periodLabel={periodLabel}
      generatedAt={generatedAt || new Date().toLocaleDateString("en-ZA")}
    />
  );
  const uint8 = await renderDocumentToPdf(element, { theme: pmgTheme });
  return Buffer.from(uint8);
}

export async function renderDeclarativeAnnualFinancialStatements(
  result: AnnualFinancialStatementsResult,
  org: PdfOrgHeader,
  periodLabel: string,
  generatedAt?: string,
): Promise<Buffer> {
  const element = (
    <AnnualFinancialStatementsDocument
      result={result}
      org={resolveOrg(org)}
      periodLabel={periodLabel}
      generatedAt={generatedAt || new Date().toLocaleDateString("en-ZA")}
    />
  );
  const uint8 = await renderDocumentToPdf(element, { theme: pmgTheme });
  return Buffer.from(uint8);
}
