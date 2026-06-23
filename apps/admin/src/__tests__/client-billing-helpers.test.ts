import { describe, it, expect } from 'vitest';
import {
  determineStatementStatus,
  buildTransactionHistory,
  adjustOpeningBalance,
  buildIncomeInvoiceMap,
  resolveDivisionBranding,
  buildOrgProps,
  buildBankingProps,
} from '@/lib/client-billing-helpers';

// ---------------------------------------------------------------------------
// determineStatementStatus
// ---------------------------------------------------------------------------
describe('determineStatementStatus', () => {
  it('returns Paid when totalOutstanding is zero', () => {
    expect(determineStatementStatus(0, [{ status: 'issued' }])).toBe('Paid');
  });

  it('returns Paid when totalOutstanding is negative', () => {
    expect(determineStatementStatus(-500, [{ status: 'issued' }])).toBe('Paid');
  });

  it('returns Outstanding when positive balance with no overdue invoices', () => {
    expect(determineStatementStatus(1000, [
      { status: 'issued' },
      { status: 'paid' },
    ])).toBe('Outstanding');
  });

  it('returns Overdue when positive balance with at least one overdue invoice', () => {
    expect(determineStatementStatus(1000, [
      { status: 'issued' },
      { status: 'overdue' },
      { status: 'paid' },
    ])).toBe('Overdue');
  });

  it('returns Paid with empty invoices array when balance is zero', () => {
    expect(determineStatementStatus(0, [])).toBe('Paid');
  });
});

// ---------------------------------------------------------------------------
// buildTransactionHistory
// ---------------------------------------------------------------------------
describe('buildTransactionHistory', () => {
  it('returns empty array when given no items', () => {
    expect(buildTransactionHistory([], 1000)).toEqual([]);
  });

  it('returns single item with opening balance when no debit/credit', () => {
    const tx = buildTransactionHistory(
      [{ date: '2026-06-15', reference: 'tx-1' }],
      500,
    );
    expect(tx).toHaveLength(1);
    expect(tx[0]!.balance).toBe(500);
    expect(tx[0]!.reference).toBe('tx-1');
  });

  it('computes running balance with debits and credits sorted by date', () => {
    const items = [
      { date: '2026-06-10', debit: 200, credit: 0 },
      { date: '2026-06-05', debit: 0, credit: 100 },
      { date: '2026-06-15', debit: 0, credit: 50 },
    ];
    const result = buildTransactionHistory(items, 1000);
    // After sorting ASC: 06-05 (credit 100) => 900, 06-10 (debit 200) => 1100, 06-15 (credit 50) => 1050
    // Then reversed: newest first
    expect(result).toHaveLength(3);
    expect(result[0]!.date).toBe('2026-06-15');
    expect(result[0]!.balance).toBe(1050);
    expect(result[1]!.date).toBe('2026-06-10');
    expect(result[1]!.balance).toBe(1100);
    expect(result[2]!.date).toBe('2026-06-05');
    expect(result[2]!.balance).toBe(900);
  });

  it('treats undefined debit/credit as zero', () => {
    const result = buildTransactionHistory(
      [{ date: '2026-01-01', reference: 'no-amount' }],
      100,
    );
    expect(result[0]!.balance).toBe(100);
  });

  it('preserves extra fields on items via spread', () => {
    const items = [
      { date: '2026-01-01', debit: 500, invoiceId: 'inv-1', paymentId: undefined },
      { date: '2026-01-02', credit: 200, paymentId: 'pay-1', invoiceId: undefined },
    ];
    const result = buildTransactionHistory(items, 0);
    expect(result[0]!.invoiceId).toBeUndefined();
    expect(result[0]!.paymentId).toBe('pay-1');
    expect(result[1]!.invoiceId).toBe('inv-1');
    expect(result[1]!.paymentId).toBeUndefined();
  });

  it('handles negative opening balance', () => {
    const result = buildTransactionHistory(
      [{ date: '2026-01-01', debit: 300 }],
      -200,
    );
    expect(result[0]!.balance).toBe(100);
  });

  it('handles fractional amounts', () => {
    const result = buildTransactionHistory(
      [{ date: '2026-01-01', debit: 99.99 }, { date: '2026-01-02', credit: 0.01 }],
      0,
    );
    expect(result[0]!.balance).toBeCloseTo(99.98, 2);
  });
});

// ---------------------------------------------------------------------------
// adjustOpeningBalance
// ---------------------------------------------------------------------------
describe('adjustOpeningBalance', () => {
  const periodFrom = '2026-06-01';

  it('returns 0 when baseBalance is null', () => {
    expect(adjustOpeningBalance(null, [], [], periodFrom)).toBe(0);
  });

  it('returns 0 when baseBalance is undefined', () => {
    expect(adjustOpeningBalance(undefined, [], [], periodFrom)).toBe(0);
  });

  it('returns baseBalance when there are no credit notes or refunds', () => {
    expect(adjustOpeningBalance(5000, [], [], periodFrom)).toBe(5000);
  });

  it('subtracts credit notes before periodFrom', () => {
    const notes = [
      { createdAt: { toISOString: () => '2026-05-15T00:00:00.000Z' }, type: 'standard', amount: 500 },
    ];
    expect(adjustOpeningBalance(5000, notes, [], periodFrom)).toBe(4500);
  });

  it('does not subtract credit notes on or after periodFrom', () => {
    const notes = [
      { createdAt: { toISOString: () => '2026-06-01T00:00:00.000Z' }, type: 'standard', amount: 500 },
      { createdAt: { toISOString: () => '2026-06-15T00:00:00.000Z' }, type: 'standard', amount: 300 },
    ];
    expect(adjustOpeningBalance(5000, notes, [], periodFrom)).toBe(5000);
  });

  it('does not subtract overpayment credit notes', () => {
    const notes = [
      { createdAt: { toISOString: () => '2026-05-01T00:00:00.000Z' }, type: 'overpayment', amount: 1000 },
    ];
    expect(adjustOpeningBalance(5000, notes, [], periodFrom)).toBe(5000);
  });

  it('adds refunds before periodFrom', () => {
    const refunds = [
      { refundDate: '2026-05-20', amount: 200 },
    ];
    expect(adjustOpeningBalance(5000, [], refunds, periodFrom)).toBe(5200);
  });

  it('does not add refunds on or after periodFrom', () => {
    const refunds = [
      { refundDate: '2026-06-01', amount: 200 },
      { refundDate: '2026-06-10', amount: 300 },
    ];
    expect(adjustOpeningBalance(5000, [], refunds, periodFrom)).toBe(5000);
  });

  it('handles combined credit notes and refunds', () => {
    const notes = [
      { createdAt: { toISOString: () => '2026-05-01T00:00:00.000Z' }, type: 'standard', amount: 400 },
      { createdAt: { toISOString: () => '2026-05-15T00:00:00.000Z' }, type: 'overpayment', amount: 200 },
    ];
    const refunds = [
      { refundDate: '2026-05-10', amount: 150 },
      { refundDate: '2026-07-01', amount: 999 },
    ];
    // 5000 - 400 + 150 = 4750
    expect(adjustOpeningBalance(5000, notes, refunds, periodFrom)).toBe(4750);
  });

  it('handles amount as string (from DB)', () => {
    const notes = [
      { createdAt: { toISOString: () => '2026-05-01T00:00:00.000Z' }, type: 'standard', amount: '250.50' },
    ];
    expect(adjustOpeningBalance(1000, notes, [], periodFrom)).toBe(749.5);
  });
});

// ---------------------------------------------------------------------------
// buildIncomeInvoiceMap
// ---------------------------------------------------------------------------
describe('buildIncomeInvoiceMap', () => {
  it('returns empty map for empty invoices', () => {
    const map = buildIncomeInvoiceMap([]);
    expect(map.size).toBe(0);
  });

  it('maps incomeId to documentNumber', () => {
    const invoices = [
      { incomeId: 'inc-1', documentNumber: 'INV-001' },
      { incomeId: 'inc-2', documentNumber: 'INV-002' },
    ];
    const map = buildIncomeInvoiceMap(invoices);
    expect(map.get('inc-1')).toBe('INV-001');
    expect(map.get('inc-2')).toBe('INV-002');
    expect(map.size).toBe(2);
  });

  it('skips invoices without an incomeId', () => {
    const invoices = [
      { incomeId: 'inc-1', documentNumber: 'INV-001' },
      { incomeId: null, documentNumber: 'INV-002' },
      { incomeId: undefined, documentNumber: 'INV-003' },
    ];
    const map = buildIncomeInvoiceMap(invoices);
    expect(map.size).toBe(1);
    expect(map.get('inc-1')).toBe('INV-001');
  });

  it('last incomeId wins for duplicates', () => {
    const invoices = [
      { incomeId: 'inc-1', documentNumber: 'INV-001' },
      { incomeId: 'inc-1', documentNumber: 'INV-999' },
    ];
    const map = buildIncomeInvoiceMap(invoices);
    expect(map.get('inc-1')).toBe('INV-999');
  });
});

// ---------------------------------------------------------------------------
// resolveDivisionBranding
// ---------------------------------------------------------------------------
describe('resolveDivisionBranding', () => {
  const allDivs = [
    { id: 'div-1', name: 'Tender Edge Solutions' },
    { id: 'div-2', name: 'Playhouse Media Group' },
  ];

  it('uses linked invoice divisionName when its divisionId matches', () => {
    const invoices = [
      { divisionId: 'div-1', divisionName: 'Tender Edge Solutions' },
      { divisionId: 'div-2', divisionName: 'Playhouse Media Group' },
    ];
    const result = resolveDivisionBranding('div-1', invoices, allDivs);
    expect(result.divisionName).toBe('Tender Edge Solutions');
    expect(result.effectiveDivisionId).toBe('div-1');
  });

  it('falls back to linked division name from divisions list when no linked invoice', () => {
    const invoices = [
      { divisionId: 'div-2', divisionName: 'Playhouse Media Group' },
    ];
    const result = resolveDivisionBranding('div-1', invoices, allDivs);
    expect(result.divisionName).toBe('Tender Edge Solutions');
    expect(result.effectiveDivisionId).toBe('div-1');
  });

  it('falls back to first invoice divisionName when no linked division match', () => {
    const invoices = [
      { divisionId: 'div-3', divisionName: 'Custom Division' },
    ];
    const result = resolveDivisionBranding('div-999', invoices, allDivs);
    expect(result.divisionName).toBe('Custom Division');
    // effectiveDivisionId is the linked division (even if unknown) — it takes
    // priority over firstInvoiceDivId for loading billing settings
    expect(result.effectiveDivisionId).toBe('div-999');
  });

  it('falls back to defaultName when no invoices and no linked division', () => {
    const result = resolveDivisionBranding(null, [], []);
    expect(result.divisionName).toBe('Playhouse Media Group');
    expect(result.effectiveDivisionId).toBeNull();
  });

  it('uses custom defaultName when provided', () => {
    const result = resolveDivisionBranding(null, [], [], 'My Org');
    expect(result.divisionName).toBe('My Org');
  });

  it('sets effectiveDivisionId to linkedId even when division name comes from elsewhere', () => {
    const invoices = [{ divisionId: 'div-2', divisionName: 'Other Name' }];
    const result = resolveDivisionBranding('div-1', invoices, allDivs);
    expect(result.effectiveDivisionId).toBe('div-1');
    expect(result.divisionName).toBe('Tender Edge Solutions');
  });

  it('handles undefined linkedDivisionId same as null', () => {
    const invoices = [
      { divisionId: 'div-2', divisionName: 'PMG' },
    ];
    const result = resolveDivisionBranding(undefined, invoices, allDivs);
    expect(result.divisionName).toBe('PMG');
    expect(result.effectiveDivisionId).toBe('div-2');
  });
});

// ---------------------------------------------------------------------------
// buildOrgProps
// ---------------------------------------------------------------------------
describe('buildOrgProps', () => {
  it('builds org props with all fields', () => {
    const result = buildOrgProps(
      'Tender Edge Solutions',
      {
        salesRepEmail: 'rep@tes.com',
        salesRepPhone: '123-456',
        divisionWebsite: 'tes.com',
        salesRepName: 'John Doe',
      },
      {
        registrationNumber: 'REG-001',
        vatNumber: 'VAT-001',
        email: 'info@tes.com',
        phone: '000-000',
        website: 'org.com',
        addressStreet: '123 Main',
        addressCity: 'Centurion',
        addressPostal: '0157',
      },
      'Playhouse Media Group',
    );
    expect(result.name).toBe('Tender Edge Solutions');
    expect(result.logoUrl).toBe('/logo/tes-logo.png');
    expect(result.divisionOf).toBe('Playhouse Media Group');
    expect(result.registrationNumber).toBe('REG-001');
    expect(result.vatNumber).toBe('VAT-001');
    expect(result.email).toBe('rep@tes.com');
    expect(result.phone).toBe('123-456');
    expect(result.website).toBe('tes.com');
    expect(result.address).toBe('123 Main, Centurion, 0157');
    expect(result.salesRep).toBe('John Doe');
  });

  it('falls back from divSettings to orgSettings for email/phone/website', () => {
    const result = buildOrgProps(
      'Test Division',
      { salesRepEmail: undefined, salesRepPhone: null, divisionWebsite: null, salesRepName: null },
      { email: 'org@test.com', phone: '555-000', website: 'org.test' },
    );
    expect(result.email).toBe('org@test.com');
    expect(result.phone).toBe('555-000');
    expect(result.website).toBe('org.test');
    expect(result.salesRep).toBeUndefined();
  });

  it('sets divisionOf to undefined when sentinel null is passed', () => {
    const result = buildOrgProps('Test', {}, {}, null);
    expect(result.divisionOf).toBeUndefined();
  });

  it('uses default divisionOf when omitted', () => {
    const result = buildOrgProps('Test', {});
    expect(result.divisionOf).toBe('Playhouse Media Group');
  });

  it('uses custom divisionOf when provided', () => {
    const result = buildOrgProps('Test', {}, {}, 'Parent Org');
    expect(result.divisionOf).toBe('Parent Org');
  });

  it('handles null orgSettings gracefully', () => {
    const result = buildOrgProps('Test', {}, null);
    expect(result.registrationNumber).toBeUndefined();
    expect(result.vatNumber).toBeUndefined();
    expect(result.address).toBeUndefined();
  });

  it('handles null divSettings gracefully', () => {
    const result = buildOrgProps('Test', null, { email: 'org@test.com' });
    expect(result.email).toBe('org@test.com');
    expect(result.salesRep).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildBankingProps
// ---------------------------------------------------------------------------
describe('buildBankingProps', () => {
  it('returns undefined when settings is null', () => {
    expect(buildBankingProps(null)).toBeUndefined();
  });

  it('returns undefined when settings is undefined', () => {
    expect(buildBankingProps(undefined)).toBeUndefined();
  });

  it('returns undefined when bankName is null', () => {
    expect(buildBankingProps({ bankName: null })).toBeUndefined();
  });

  it('returns undefined when bankName is empty string', () => {
    expect(buildBankingProps({ bankName: '' })).toBeUndefined();
  });

  it('returns banking object with all fields when fully provided', () => {
    const result = buildBankingProps({
      bankName: 'First National Bank',
      bankAccountName: 'Playhouse Media Group',
      bankAccountNumber: '62891234567',
      bankBranchCode: '255005',
    });
    expect(result).toEqual({
      bankName: 'First National Bank',
      accountName: 'Playhouse Media Group',
      accountNumber: '62891234567',
      branchCode: '255005',
    });
  });

  it('falls back to empty string for missing account fields', () => {
    const result = buildBankingProps({
      bankName: 'Test Bank',
    });
    expect(result).toEqual({
      bankName: 'Test Bank',
      accountName: '',
      accountNumber: '',
      branchCode: '',
    });
  });

  it('handles null account fields gracefully', () => {
    const result = buildBankingProps({
      bankName: 'Test Bank',
      bankAccountName: null,
      bankAccountNumber: null,
      bankBranchCode: null,
    });
    expect(result).toEqual({
      bankName: 'Test Bank',
      accountName: '',
      accountNumber: '',
      branchCode: '',
    });
  });
});
