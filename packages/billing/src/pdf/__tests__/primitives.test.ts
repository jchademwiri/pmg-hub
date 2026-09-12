import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

describe("PDF Design System Primitives & Themes", () => {
  it("resolves division branding themes accurately", async () => {
    const { resolveDivisionTheme, pmgTheme, tesTheme, awsTheme } = await import("../themes");

    expect(resolveDivisionTheme("Playhouse Media Group")).toEqual(pmgTheme);
    expect(resolveDivisionTheme("TenderEdge Solutions")).toEqual(tesTheme);
    expect(resolveDivisionTheme("TES")).toEqual(tesTheme);
    expect(resolveDivisionTheme("Apex Web Solutions")).toEqual(awsTheme);
    expect(resolveDivisionTheme("AWS")).toEqual(awsTheme);
    expect(resolveDivisionTheme(undefined)).toEqual(pmgTheme);
  });

  it("resolves color tokens correctly", async () => {
    const { resolveColor } = await import("../resolve-color");
    const { pmgTheme } = await import("../themes");

    expect(resolveColor("primary", pmgTheme.colors)).toBe(pmgTheme.colors.primary);
    expect(resolveColor("destructive", pmgTheme.colors)).toBe(pmgTheme.colors.destructive);
    expect(resolveColor("#ff00ff", pmgTheme.colors)).toBe("#ff00ff");
  });

  it("renders a full declarative PDF document using Takumi WASM", async () => {
    const { renderPdf } = await import("../engine");

    const html = `
      <div style="padding: 40px; font-family: Helvetica, sans-serif;">
        <div style="height: 3px; background-color: #1d4ed8; width: 100%; margin-bottom: 20px;"></div>
        <div style="display: flex; justify-content: space-between;">
          <div>
            <h1 style="font-size: 16px; margin: 0; color: #0f172a;">Playhouse Media Group</h1>
            <p style="font-size: 8px; color: #475569; margin: 2px 0;">Reg: 2017/123456/07</p>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 14px; font-weight: bold; color: #1d4ed8;">TAX INVOICE</span>
            <div style="font-size: 10px; font-weight: bold; color: #0f172a;">#INV-2026-001</div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 6px; text-align: left; font-size: 8px;">Description</th>
              <th style="padding: 6px; text-align: center; font-size: 8px;">Qty</th>
              <th style="padding: 6px; text-align: right; font-size: 8px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px; font-size: 8.5px;">Cloud Hosting & Maintenance</td>
              <td style="padding: 6px; font-size: 8.5px; text-align: center;">1</td>
              <td style="padding: 6px; font-size: 8.5px; text-align: right;">R 3,500.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const pdfBytes = await renderPdf(html, { size: "a4" });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1500);

    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});
