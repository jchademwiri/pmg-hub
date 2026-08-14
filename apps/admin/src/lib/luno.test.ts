import { describe, expect, it } from 'vitest';

import { buildAuthHeader, mapAccountRow } from './luno';

describe('buildAuthHeader', () => {
  it('encodes keyId and keySecret as Basic base64(keyId:keySecret)', () => {
    // "id:secret" in base64 is "aWQ6c2VjcmV0"
    expect(buildAuthHeader('id', 'secret')).toBe('Basic aWQ6c2VjcmV0');
  });

  it('encodes empty string components correctly', () => {
    // ":" in base64 is "Og=="
    expect(buildAuthHeader('', '')).toBe('Basic Og==');
  });

  it('encodes strings containing colons correctly', () => {
    // "a:b:c" in base64 is "YTpiOmM="
    const expected = 'Basic ' + Buffer.from('a:b' + ':' + 'c').toString('base64');
    expect(buildAuthHeader('a:b', 'c')).toBe(expected);
  });

  it('always produces a string starting with "Basic "', () => {
    expect(buildAuthHeader('anyId', 'anySecret')).toMatch(/^Basic /);
  });

  it('round-trips: decoding the base64 portion yields keyId:keySecret', () => {
    const keyId = 'myKey';
    const keySecret = 'mySecret';
    const header = buildAuthHeader(keyId, keySecret);
    const encoded = header.slice('Basic '.length);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    expect(decoded).toBe(`${keyId}:${keySecret}`);
  });
});

describe('mapAccountRow', () => {
  const baseEntry = {
    account_id: 'abc123',
    asset: 'XBT',
    balance: '0.12345678',
    reserved: '0.00000000',
    unconfirmed: '0.00000000',
  };

  it('includes name when the upstream entry has a non-empty name', () => {
    const row = mapAccountRow({ ...baseEntry, name: 'My Bitcoin Wallet' });
    expect(row.name).toBe('My Bitcoin Wallet');
    expect(Object.prototype.hasOwnProperty.call(row, 'name')).toBe(true);
  });

  it('omits name entirely (not null or undefined) when the upstream entry has no name field', () => {
    const row = mapAccountRow({ ...baseEntry });
    expect(Object.prototype.hasOwnProperty.call(row, 'name')).toBe(false);
  });

  it('omits name entirely (not null or undefined) when the upstream entry has an empty string name', () => {
    const row = mapAccountRow({ ...baseEntry, name: '' });
    expect(Object.prototype.hasOwnProperty.call(row, 'name')).toBe(false);
  });

  it('maps the core fields correctly', () => {
    const row = mapAccountRow(baseEntry);
    expect(row.account_id).toBe('abc123');
    expect(row.asset).toBe('XBT');
    expect(row.balance).toBe('0.12345678');
    expect(row.reserved).toBe('0.00000000');
    expect(row.unconfirmed).toBe('0.00000000');
  });
});
