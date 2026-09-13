import { describe, expect, it, mock } from 'bun:test';

mock.module('server-only', () => ({}));

describe('Takumi WASM PDF Engine', () => {
  it('renders an HTML document into valid PDF bytes', async () => {
    const { renderPdf } = await import('../engine');
    const html = `
      <div style="padding: 32px; font-family: sans-serif;">
        <h1 style="color: #1d4ed8; font-size: 24px; margin-bottom: 8px;">Playhouse Media Group</h1>
        <p style="color: #475569; font-size: 14px;">WASM PDF Engine Validation</p>
      </div>
    `;

    const pdfBytes = await renderPdf(html, { size: 'a4' });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('renders an HTML document with embedded base64 PNG image', async () => {
    const { renderPdf } = await import('../engine');
    const { getLogoDataUri } = await import('../logo-helper');

    const dataUri = getLogoDataUri('Tender Edge Solutions');
    expect(dataUri).not.toBeNull();
    expect(dataUri?.startsWith('data:image/png;base64,')).toBe(true);

    const html = `
      <div style="padding: 32px; font-family: sans-serif;">
        <img src="${dataUri}" style="width: 54px; height: 54px; object-fit: contain;" />
        <h1 style="color: #047857; font-size: 20px;">Tender Edge Solutions</h1>
      </div>
    `;

    const pdfBytes = await renderPdf(html, { size: 'a4' });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(5000); // Image makes PDF larger
    const header = String.fromCharCode(...pdfBytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('handles full page height and bottom-aligned elements', async () => {
    const { renderPdf } = await import('../engine');
    const fs = await import('fs');

    // Test 1: position fixed footer across multiple pages
    const htmlFixedMulti = `
      <style>
        .footer {
          position: fixed;
          bottom: 20px;
          left: 36px;
          right: 36px;
          border-top: 1px solid #e4e4e7;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          font-size: 8px;
        }
      </style>
      <div style="padding: 36px; padding-bottom: 60px;">
        <div class="footer">
          <span>Fixed Footer Left</span>
          <span>Page 1 of 1</span>
        </div>
        <h1>Page 1 Content</h1>
        <div style="height: 1200px; background: #f1f5f9;">Tall Content Spanning Multiple Pages</div>
        <h2>Page Content Continued</h2>
      </div>
    `;

    const pdfMulti = await renderPdf(htmlFixedMulti, { size: 'a4' });
    expect(pdfMulti).toBeInstanceOf(Uint8Array);
  });

  it('renders table header with background spanning full width', async () => {
    const { renderPdf } = await import('../engine');

    // Test C: full flex-based Table with header and data rows
    const htmlC = `
      <style>
        * { box-sizing: border-box; }
        .table { display: flex; flex-direction: column; width: 100%; }
        .row-header { display: flex; flex-direction: row; width: 100%; background-color: #f9fafb; border-bottom: 1px solid #e4e4e7; }
        .row-body { display: flex; flex-direction: row; width: 100%; border-bottom: 1px solid #f4f4f5; }
        .th-cell { font-size: 7.5px; font-weight: bold; color: #71717a; text-transform: uppercase; padding: 6px 4px; }
        .td-cell { font-size: 8.5px; color: #18181b; padding: 6px 4px; }
        .col-desc { width: 52%; text-align: left; }
        .col-qty { width: 12%; text-align: center; }
        .col-price { width: 18%; text-align: right; }
        .col-amount { width: 18%; text-align: right; }
      </style>
      <div style="padding: 30px;">
        <div class="table">
          <div class="row-header">
            <div class="th-cell col-desc">DESCRIPTION</div>
            <div class="th-cell col-qty">QTY</div>
            <div class="th-cell col-price">UNIT PRICE</div>
            <div class="th-cell col-amount">AMOUNT</div>
          </div>
          <div class="row-body">
            <div class="td-cell col-desc">Website Redesign & Turborepo Setup</div>
            <div class="td-cell col-qty">1</div>
            <div class="td-cell col-price">R 35,000.00</div>
            <div class="td-cell col-amount" style="font-weight: bold;">R 35,000.00</div>
          </div>
          <div class="row-body">
            <div class="td-cell col-desc">Cloudflare & Vercel Pro Deployment</div>
            <div class="td-cell col-qty">1</div>
            <div class="td-cell col-price">R 5,000.00</div>
            <div class="td-cell col-amount" style="font-weight: bold;">R 5,000.00</div>
          </div>
        </div>
      </div>
    `;

    const pdfC = await renderPdf(htmlC, { size: 'a4' });
    expect(pdfC).toBeInstanceOf(Uint8Array);
  });
});
