import { describe, it, expect } from 'vitest';
import { normalizeSAPhoneNumber, buildWhatsAppNudgeUrl } from '@/lib/billing/whatsapp';

describe('whatsapp AR nudge helper', () => {
  it('normalizes South African local and international phone formats', () => {
    expect(normalizeSAPhoneNumber('082 123 4567')).toBe('27821234567');
    expect(normalizeSAPhoneNumber('082-123-4567')).toBe('27821234567');
    expect(normalizeSAPhoneNumber('+27 82 123 4567')).toBe('27821234567');
    expect(normalizeSAPhoneNumber('0027821234567')).toBe('27821234567');
    expect(normalizeSAPhoneNumber('(011) 555-1234')).toBe('27115551234');
  });

  it('rejects empty or invalid numbers', () => {
    expect(normalizeSAPhoneNumber(null)).toBeNull();
    expect(normalizeSAPhoneNumber('')).toBeNull();
    expect(normalizeSAPhoneNumber('12345')).toBeNull();
  });

  it('builds a pre-filled wa.me link with client name, overdue amount, and bank details', () => {
    const url = buildWhatsAppNudgeUrl({
      phone: '082 555 0199',
      clientName: 'Acme Trading',
      overdueAmount: 4500,
      divisionName: 'TenderEdge Solutions',
      bankDetails: {
        bankName: 'FNB',
        accountName: 'Playhouse Media Group',
        accountNumber: '62812345678',
        branchCode: '250655',
      },
    });

    expect(url).not.toBeNull();
    expect(url).toMatch(/^https:\/\/wa\.me\/27825550199\?text=/);
    const decoded = decodeURIComponent(url!.split('?text=')[1]!);
    expect(decoded).toContain('Acme Trading');
    expect(decoded).toContain('TenderEdge Solutions');
    expect(decoded).toContain('FNB');
    expect(decoded).toContain('62812345678');
  });

  it('returns null when overdueAmount is zero or phone is invalid', () => {
    expect(
      buildWhatsAppNudgeUrl({ phone: '0825550199', clientName: 'Acme', overdueAmount: 0 }),
    ).toBeNull();
    expect(
      buildWhatsAppNudgeUrl({ phone: 'invalid', clientName: 'Acme', overdueAmount: 500 }),
    ).toBeNull();
  });
});
