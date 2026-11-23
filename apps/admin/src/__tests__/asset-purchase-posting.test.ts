import { describe, it, expect } from 'vitest';
import {
  SARS_SMALL_ASSET_THRESHOLD,
  resolveAssetPurchaseAccountCode,
} from '@/lib/accounting/posting';

describe('SARS R7,000 Asset Purchase Classification', () => {
  it('uses R7,000 as the SARS small-asset threshold', () => {
    expect(SARS_SMALL_ASSET_THRESHOLD).toBe(7000);
  });

  it('routes assets under R7,000 (e.g. R4,295 printer) to 5030 Office & Small Equipment', () => {
    expect(resolveAssetPurchaseAccountCode(4295)).toBe('5030');
    expect(resolveAssetPurchaseAccountCode(6999.99)).toBe('5030');
  });

  it('routes assets R7,000 or more (e.g. R15,000 PC) to 1500 Property, Plant & Equipment', () => {
    expect(resolveAssetPurchaseAccountCode(7000)).toBe('1500');
    expect(resolveAssetPurchaseAccountCode(15000)).toBe('1500');
  });
});
