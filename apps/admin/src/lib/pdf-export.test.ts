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

    expect(getPrintableElementById('printable-area')).toBe(document.getElementById('printable-area'));
  });

  it('throws when the requested printable element is missing', () => {
    document.body.innerHTML = '<div class="print-document"></div>';

    expect(() => getPrintableElementById('missing-printable')).toThrow("Printable element '#missing-printable' not found.");
  });

  it('sanitizes PDF filenames', () => {
    expect(sanitizePdfFileName('Invoice INV/001: PMG.pdf')).toBe('Invoice-INV-001-PMG.pdf');
    expect(sanitizePdfFileName('')).toBe('document.pdf');
  });

  it('extracts base64 PDF data from data URIs', () => {
    expect(extractPdfBase64('data:application/pdf;base64,abc123')).toBe('abc123');
    expect(() => extractPdfBase64('data:application/pdf;base64')).toThrow('PDF base64 conversion failed.');
  });

  it('calculates base64 byte sizes', () => {
    expect(getBase64ByteSize('TWFu')).toBe(3);
    expect(getBase64ByteSize('TWE=')).toBe(2);
    expect(getBase64ByteSize('TQ==')).toBe(1);
  });
});
