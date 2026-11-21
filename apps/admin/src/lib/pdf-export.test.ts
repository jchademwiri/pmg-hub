// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  assertEmailPdfSize,
  fetchServerPdfBytes,
  getBase64ByteSize,
  MAX_EMAIL_PDF_BYTES,
  sanitizePdfFileName,
  serverPdfUrlToBase64,
} from './pdf-export';

describe('pdf-export helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitizes PDF filenames', () => {
    expect(sanitizePdfFileName('Invoice INV/001: PMG.pdf')).toBe('Invoice-INV-001-PMG.pdf');
    expect(sanitizePdfFileName('')).toBe('document.pdf');
  });

  it('calculates base64 byte sizes', () => {
    expect(getBase64ByteSize('TWFu')).toBe(3);
    expect(getBase64ByteSize('TWE=')).toBe(2);
    expect(getBase64ByteSize('TQ==')).toBe(1);
  });

  it('validates email PDF attachment size quota (< 8MB)', () => {
    const smallBase64 = 'A'.repeat(20000);
    expect(() => assertEmailPdfSize(smallBase64, 'Invoice PDF')).not.toThrow();

    const oversizedBase64 = 'A'.repeat(Math.ceil(((MAX_EMAIL_PDF_BYTES + 1000) * 4) / 3));
    expect(() => assertEmailPdfSize(oversizedBase64, 'Oversized PDF')).toThrow(
      'Oversized PDF is too large to email',
    );
  });

  it('fetches server PDF bytes and throws on HTTP error', async () => {
    const payload = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => payload.buffer,
    } as Response);

    const bytes = await fetchServerPdfBytes('/api/billing/pdf/invoice/123');
    expect(Array.from(bytes)).toEqual([0x25, 0x50, 0x44, 0x46]);

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(fetchServerPdfBytes('/api/billing/pdf/invoice/bad')).rejects.toThrow(
      'PDF generation failed (500).',
    );
  });

  it('converts a server PDF response to base64', async () => {
    const payload = new TextEncoder().encode('%PDF');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      arrayBuffer: async () => payload.buffer,
    } as Response);

    const base64 = await serverPdfUrlToBase64('/api/billing/pdf/invoice/123', 'Invoice PDF');
    expect(base64).toBe(window.btoa('%PDF'));
  });
});
