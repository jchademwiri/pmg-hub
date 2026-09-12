// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  extractPdfBase64,
  getBase64ByteSize,
  getPrintableElementById,
  sanitizePdfFileName,
} from './pdf-export';

describe('pdf-export helpers', () => {
  it('finds printable elements by explicit id', () => {
    document.body.innerHTML = '<div id="printable-area"></div><div class="print-document"></div>';

    expect(getPrintableElementById('printable-area')).toBe(
      document.getElementById('printable-area'),
    );
  });

  it('throws when the requested printable element is missing', () => {
    document.body.innerHTML = '<div class="print-document"></div>';

    expect(() => getPrintableElementById('missing-printable')).toThrow(
      "Printable element '#missing-printable' not found.",
    );
  });

  it('sanitizes PDF filenames', () => {
    expect(sanitizePdfFileName('Invoice INV/001: PMG.pdf')).toBe('Invoice-INV-001-PMG.pdf');
    expect(sanitizePdfFileName('')).toBe('document.pdf');
  });

  it('extracts base64 PDF data from data URIs', () => {
    expect(extractPdfBase64('data:application/pdf;base64,abc123')).toBe('abc123');
    expect(() => extractPdfBase64('data:application/pdf;base64')).toThrow(
      'PDF base64 conversion failed.',
    );
  });

  it('calculates base64 byte sizes', () => {
    expect(getBase64ByteSize('TWFu')).toBe(3);
    expect(getBase64ByteSize('TWE=')).toBe(2);
    expect(getBase64ByteSize('TQ==')).toBe(1);
  });

  it('validates email PDF attachment size quota (< 8MB)', async () => {
    const { assertEmailPdfSize, MAX_EMAIL_PDF_BYTES } = await import('./pdf-export');

    // Vector PDF simulated size ~15KB
    const smallBase64 = 'A'.repeat(20000);
    expect(() => assertEmailPdfSize(smallBase64, 'Invoice PDF')).not.toThrow();

    // Massive rasterized PDF exceeding 8MB quota
    const oversizedBase64 = 'A'.repeat(Math.ceil((MAX_EMAIL_PDF_BYTES + 1000) * 4 / 3));
    expect(() => assertEmailPdfSize(oversizedBase64, 'Rasterized PDF')).toThrow(
      'Rasterized PDF is too large to email',
    );
  });
});
