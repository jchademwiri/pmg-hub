import { describe, expect, it } from 'vitest';

import { MAX_EMAIL_PDF_BYTES, validateEmailPdfAttachment } from './pdf-attachments';

describe('pdf attachment validation', () => {
  it('allows small PDFs', () => {
    expect(validateEmailPdfAttachment('TWFu', 'Invoice PDF')).toBeNull();
  });

  it('rejects PDFs larger than the email attachment limit', () => {
    const oversized = 'A'.repeat(Math.ceil(((MAX_EMAIL_PDF_BYTES + 1) * 4) / 3));

    expect(validateEmailPdfAttachment(oversized, 'Invoice PDF')).toContain('Invoice PDF is too large to email');
  });
});
