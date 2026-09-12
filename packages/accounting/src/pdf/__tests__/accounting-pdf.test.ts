import React from "react";
import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

describe("Declarative Accounting PDF Documents", () => {
  const sampleOrg = {
    name: "Playhouse Media Group",
    divisionOf: "Playhouse Media Group (Pty) Ltd",
    registrationNumber: "2017/123456/07",
    vatNumber: "4123456789",
    email: "accounting@playhousemedia.co.za",
    phone: "+27 11 555 0100",
    website: "https://playhousemedia.co.za",
    address: "Sandton, Johannesburg, 2196",
  };

  it("renders Profit & Loss statement into a valid PDF", async () => {
    const { renderDeclarativeProfitAndLoss } = await import("../render-accounting-pdf");

    const samplePnl = {
      revenue: [
        { accountCode: "4000", accountName: "Web Development Income", amount: 150000 },
        { accountCode: "4010", accountName: "Cloud Infrastructure Retainer", amount: 45000 },
      ],
      totalRevenue: 195000,
      expenses: [
        { accountCode: "5000", accountName: "Contractor Fees", amount: 65000 },
        { accountCode: "5020", accountName: "Software Subscriptions", amount: 12000 },
      ],
      totalExpenses: 77000,
      netProfit: 118000,
    };

    const sampleDivisions = [
      {
        divisionId: "div-tes",
        divisionName: "TenderEdge Solutions",
        totalRevenue: 120000,
        totalIncome: 110000,
        totalOutstandingAr: 10000,
        totalExpenses: 45000,
        netProfit: 75000,
        marginPercent: 62.5,
      },
      {
        divisionId: "div-aws",
        divisionName: "Apex Web Solutions",
        totalRevenue: 75000,
        totalIncome: 65000,
        totalOutstandingAr: 10000,
        totalExpenses: 32000,
        netProfit: 43000,
        marginPercent: 57.3,
      },
    ];

    const buffer = await renderDeclarativeProfitAndLoss(
      samplePnl,
      sampleDivisions,
      sampleOrg,
      "Period: Q1 2026",
      undefined,
      "12 March 2026",
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("renders Balance Sheet into a valid PDF", async () => {
    const { renderDeclarativeBalanceSheet } = await import("../render-accounting-pdf");

    const sampleBalanceSheet = {
      assets: [
        { accountCode: "1000", accountName: "First National Bank Operating", amount: 450000 },
        { accountCode: "1100", accountName: "Accounts Receivable", amount: 120000 },
      ],
      totalAssets: 570000,
      liabilities: [
        { accountCode: "2000", accountName: "Accounts Payable", amount: 45000 },
        { accountCode: "2100", accountName: "VAT Output Payable", amount: 25000 },
      ],
      totalLiabilities: 70000,
      equity: [
        { accountCode: "3000", accountName: "Share Capital", amount: 100 },
      ],
      netIncome: 499900,
      totalEquity: 500000,
      totalLiabilitiesAndEquity: 570000,
    };

    const buffer = await renderDeclarativeBalanceSheet(
      sampleBalanceSheet,
      sampleOrg,
      "Period: Annual FY2025",
      undefined,
      "12 March 2026",
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("renders Trial Balance into a valid PDF", async () => {
    const { renderDeclarativeTrialBalance } = await import("../render-accounting-pdf");

    const sampleRows = [
      { accountCode: "1000", accountName: "Bank Account", accountType: "asset", totalDebits: 450000, totalCredits: 0 },
      { accountCode: "2000", accountName: "Accounts Payable", accountType: "liability", totalDebits: 0, totalCredits: 50000 },
      { accountCode: "4000", accountName: "Revenue", accountType: "revenue", totalDebits: 0, totalCredits: 400000 },
    ];

    const buffer = await renderDeclarativeTrialBalance(
      sampleRows,
      sampleOrg,
      "Period: March 2026",
      undefined,
      "12 March 2026",
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("renders General Ledger into a valid PDF", async () => {
    const { renderDeclarativeGeneralLedger } = await import("../render-accounting-pdf");

    const sampleRows = [
      {
        entryDate: new Date("2026-03-01"),
        entryNumber: "JE-2026-001",
        accountCode: "1000",
        description: "Customer invoice payment received",
        lineDescription: "EFT settlement",
        debit: 50000,
        credit: 0,
      },
      {
        entryDate: new Date("2026-03-01"),
        entryNumber: "JE-2026-001",
        accountCode: "1100",
        description: "Customer invoice payment received",
        lineDescription: "Accounts receivable cleared",
        debit: 0,
        credit: 50000,
      },
    ];

    const buffer = await renderDeclarativeGeneralLedger(
      sampleRows,
      2,
      sampleOrg,
      "Period: March 2026",
      undefined,
      "12 March 2026",
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("renders Journal Entries into a valid PDF", async () => {
    const { renderDeclarativeJournalEntries } = await import("../render-accounting-pdf");

    const sampleEntries = [
      {
        id: "je-1",
        entryNumber: "JE-2026-001",
        entryDate: new Date("2026-03-01"),
        description: "Client invoice settlement",
        status: "posted",
        createdAt: new Date(),
        updatedAt: new Date(),
        divisionId: null,
        period: "2026-03",
        reference: null,
        createdById: null,
      },
    ];

    const sampleLines = {
      "je-1": [
        {
          id: "line-1",
          journalEntryId: "je-1",
          accountCode: "1000",
          accountName: "Bank Account",
          debit: 25000,
          credit: 0,
          description: "Cash received",
          createdAt: new Date(),
          accountId: "acc-1",
        },
        {
          id: "line-2",
          journalEntryId: "je-1",
          accountCode: "1100",
          accountName: "Accounts Receivable",
          debit: 0,
          credit: 25000,
          description: "AR credit",
          createdAt: new Date(),
          accountId: "acc-2",
        },
      ],
    };

    const buffer = await renderDeclarativeJournalEntries(
      sampleEntries,
      sampleLines,
      1,
      sampleOrg,
      "Period: March 2026",
      undefined,
      "12 March 2026",
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(2000);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("renders 6-page Annual Financial Statements (AFS) into a valid multi-page PDF", async () => {
    const { renderDeclarativeAnnualFinancialStatements } = await import("../render-accounting-pdf");

    const sampleAfs = {
      generalInfo: {
        financialYearEnd: "28 February 2026",
        currentYearLabel: "2026",
        priorYearLabel: "2025",
        directorName: "Jacob C.",
      },
      directorsReport: {
        principalActivities: "Playhouse Media Group provides full-service digital consulting, web design, and systems engineering.",
        businessActivities: {
          revenue: { current: 1500000, prior: 980000 },
          operatingProfit: { current: 450000, prior: 280000 },
          netProfit: { current: 420000, prior: 260000 },
          totalAssets: { current: 850000, prior: 520000 },
          totalLiabilities: { current: 120000, prior: 90000 },
        },
        divisionBreakdown: [
          { divisionName: "TenderEdge Solutions", current: 850000, prior: 520000 },
          { divisionName: "Apex Web Solutions", current: 650000, prior: 460000 },
        ],
        goingConcernStatement: "The financial statements have been prepared on the going concern basis.",
        eventsAfterReportingPeriod: "No significant events occurred after the reporting period.",
      },
      statementOfProfitLoss: {
        revenue: { current: 1500000, prior: 980000 },
        divisionBreakdown: [
          { divisionName: "TenderEdge Solutions", current: 850000, prior: 520000 },
          { divisionName: "Apex Web Solutions", current: 650000, prior: 460000 },
        ],
        depreciation: { current: 15000, prior: 10000 },
        employeeBenefits: { current: 650000, prior: 420000 },
        totalExpenses: { current: 385000, prior: 270000 },
        operatingProfit: { current: 450000, prior: 280000 },
        netProfit: { current: 420000, prior: 260000 },
      },
      statementOfPosition: {
        assets: [
          { accountName: "Bank and cash equivalents", amount: 650000 },
          { accountName: "Trade and other receivables", amount: 200000 },
        ],
        totalAssets: { current: 850000, prior: 520000 },
        liabilities: [
          { accountName: "Trade and other payables", amount: 120000 },
        ],
        totalLiabilitiesAndEquity: { current: 850000, prior: 520000 },
      },
      statementOfChangesInEquity: {
        priorYearStartLabel: "1 March 2024",
        priorNetProfit: 260000,
        priorYearEndLabel: "28 February 2025",
        priorClosingRetained: 260000,
        currentOpeningRetained: 260000,
        currentNetProfit: 420000,
        currentYearEndLabel: "28 February 2026",
        currentClosingRetained: 680000,
      },
      statementOfCashFlows: {
        current: { netOperatingCashFlow: 435000, endingCashBalance: 650000 },
        prior: { netOperatingCashFlow: 270000, endingCashBalance: 320000 },
      },
      detailedIncomeStatement: {
        revenue: { current: 1500000, prior: 980000 },
        divisionBreakdown: [
          { divisionName: "TenderEdge Solutions", current: 850000, prior: 520000 },
          { divisionName: "Apex Web Solutions", current: 650000, prior: 460000 },
        ],
        expenses: [
          { accountCode: "5000", accountName: "Contractor Fees", amount: 350000 },
          { accountCode: "5020", accountName: "Cloud Hosting & Subscriptions", amount: 35000 },
        ],
        netProfit: { current: 420000, prior: 260000 },
      },
    };

    const buffer = await renderDeclarativeAnnualFinancialStatements(
      sampleAfs as any,
      sampleOrg,
      "Period: Annual FY2026 (Full Year)",
      "12 March 2026",
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(4000);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
