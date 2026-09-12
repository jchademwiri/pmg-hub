import React from "react";
import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

describe("Declarative Billing PDF Documents", () => {
  const sampleOrg = {
    name: "Playhouse Media Group",
    divisionOf: "Playhouse Media Group (Pty) Ltd",
    registrationNumber: "2017/123456/07",
    vatNumber: "4123456789",
    email: "billing@playhousemedia.co.za",
    phone: "+27 11 555 0100",
    website: "https://playhousemedia.co.za",
    address: "Sandton, Johannesburg, 2196",
    salesRep: "Jacob C.",
  };

  const sampleClient = {
    name: "Acme Enterprises SA",
    email: "finance@acme.co.za",
    phone: "+27 11 234 5678",
    address: "Rosebank, Johannesburg, 2196",
  };

  const sampleBanking = {
    bankName: "First National Bank",
    accountName: "Playhouse Media Group",
    accountNumber: "62812345678",
    branchCode: "250655",
  };

  it("renders a Tax Invoice document into a valid PDF", async () => {
    const { InvoicePdfDocument } = await import("../documents/invoice-pdf-document");
    const { renderDocumentToPdf } = await import("../render-document");

    const element = React.createElement(InvoicePdfDocument, {
      data: {
        invoiceNumber: "INV-2026-0089",
        status: "Paid",
        issueDate: "2026-03-01",
        dueDate: "2026-03-15",
        reference: "PO-ACME-99",
        org: sampleOrg,
        client: sampleClient,
        items: [
          { description: "Website Redesign & Turborepo Setup", qty: 1, unitPrice: 35000, amount: 35000 },
          { description: "Cloudflare & Vercel Pro Deployment", qty: 1, unitPrice: 5000, amount: 5000 },
        ],
        totals: {
          subtotal: 40000,
          vat: 6000,
          total: 46000,
          paid: 46000,
          balanceDue: 0,
        },
        banking: sampleBanking,
        notes: "Thank you for choosing Playhouse Media Group.",
      },
    });

    const pdfBytes = await renderDocumentToPdf(element);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(2000);
    expect(String.fromCharCode(...pdfBytes.slice(0, 5))).toBe("%PDF-");
  });

  it("renders a Quotation document into a valid PDF", async () => {
    const { QuotePdfDocument } = await import("../documents/quote-pdf-document");
    const { renderDocumentToPdf } = await import("../render-document");

    const element = React.createElement(QuotePdfDocument, {
      data: {
        quoteNumber: "QT-2026-0042",
        status: "Draft",
        issueDate: "2026-03-05",
        expiryDate: "2026-04-05",
        org: sampleOrg,
        client: sampleClient,
        items: [
          { description: "Custom Next.js App Development", qty: 80, unitPrice: 850, amount: 68000 },
        ],
        totals: {
          subtotal: 68000,
          vat: 10200,
          total: 78200,
        },
        banking: sampleBanking,
      },
    });

    const pdfBytes = await renderDocumentToPdf(element);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(2000);
    expect(String.fromCharCode(...pdfBytes.slice(0, 5))).toBe("%PDF-");
  });

  it("renders a Statement of Account with Ageing into a valid PDF", async () => {
    const { StatementPdfDocument } = await import("../documents/statement-pdf-document");
    const { renderDocumentToPdf } = await import("../render-document");

    const element = React.createElement(StatementPdfDocument, {
      data: {
        statementNumber: "STMT-2026-03",
        status: "Active",
        periodFrom: "2026-01-01",
        periodTo: "2026-03-31",
        org: sampleOrg,
        client: sampleClient,
        openingBalance: 12000,
        totalDue: 45000,
        transactions: [
          { date: "2026-01-15", reference: "INV-1001", description: "Design Retainer Jan", debit: 15000, balance: 27000 },
          { date: "2026-01-28", reference: "RCT-501", description: "EFT Payment Recd", credit: 15000, balance: 12000 },
          { date: "2026-02-15", reference: "INV-1015", description: "Design Retainer Feb", debit: 15000, balance: 27000 },
          { date: "2026-03-15", reference: "INV-1030", description: "Design Retainer Mar", debit: 18000, balance: 45000 },
        ],
        ageing: {
          current: 18000,
          days1_14: 15000,
          days15_30: 12000,
          days31_60: 0,
          days61plus: 0,
        },
        banking: sampleBanking,
      },
    });

    const pdfBytes = await renderDocumentToPdf(element);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(2500);
    expect(String.fromCharCode(...pdfBytes.slice(0, 5))).toBe("%PDF-");
  });

  it("renders a Payment Receipt into a valid PDF", async () => {
    const { ReceiptPdfDocument } = await import("../documents/receipt-pdf-document");
    const { renderDocumentToPdf } = await import("../render-document");

    const element = React.createElement(ReceiptPdfDocument, {
      data: {
        receiptNumber: "RCT-2026-098",
        paymentDate: "2026-03-12",
        paymentMethod: "Electronic Funds Transfer (EFT)",
        reference: "FNB-99238411",
        amount: 25000,
        org: sampleOrg,
        client: sampleClient,
        allocations: [
          { invoiceNumber: "INV-2026-0080", invoiceDate: "2026-02-01", amount: 20000 },
          { invoiceNumber: "INV-2026-0089", invoiceDate: "2026-03-01", amount: 5000 },
        ],
      },
    });

    const pdfBytes = await renderDocumentToPdf(element);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(2000);
    expect(String.fromCharCode(...pdfBytes.slice(0, 5))).toBe("%PDF-");
  });
});
