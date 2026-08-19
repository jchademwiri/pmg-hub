import { describe, expect, it } from 'vitest';

import { mapAccountRow } from '../luno';

describe('mapAccountRow', () => {
  it('includes name when a non-empty name is present in the entry', () => {
    const row = mapAccountRow({
      account_id: 'acc-1',
      asset: 'XBT',
      balance: '0.00500000',
      reserved: '0.00000000',
      unconfirmed: '0.00000000',
      name: 'My Bitcoin Wallet',
    });

    expect(row.name).toBe('My Bitcoin Wallet');
  });

  it('omits name entirely when the entry has no name field', () => {
    const row = mapAccountRow({
      account_id: 'acc-2',
      asset: 'ETH',
      balance: '1.00000000',
      reserved: '0.00000000',
      unconfirmed: '0.00000000',
    });

    // Must not be present at all — not null, not undefined
    expect(Object.prototype.hasOwnProperty.call(row, 'name')).toBe(false);
  });

  it('omits name entirely when the entry has an empty string name', () => {
    const row = mapAccountRow({
      account_id: 'acc-3',
      asset: 'ETH',
      balance: '2.00000000',
      reserved: '0.00000000',
      unconfirmed: '0.00000000',
      name: '',
    });

    // Must not be present at all — not null, not undefined
    expect(Object.prototype.hasOwnProperty.call(row, 'name')).toBe(false);
  });
});
