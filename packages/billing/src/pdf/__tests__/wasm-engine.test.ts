import { describe, expect, it, mock } from "bun:test";

mock.module("server-only", () => ({}));

describe("Takumi WASM PDF Engine", () => {
  it("renders an HTML document into valid PDF bytes", async () => {
    const { renderPdf } = await import("../engine");
    const html = `
      <div style="padding: 32px; font-family: sans-serif;">
        <h1 style="color: #1d4ed8; font-size: 24px; margin-bottom: 8px;">Playhouse Media Group</h1>
        <p style="color: #475569; font-size: 14px;">WASM PDF Engine Validation</p>
      </div>
    `;

    const pdfBytes = await renderPdf(html, { size: "a4" });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});
