import { describe, it, expect } from 'vitest';
import { resolveDivisionSenderName, resolveBrandEmailConfig } from '../src';

describe('resolveDivisionSenderName', () => {
  it('appends Team to Tender Edge Solutions', () => {
    expect(resolveDivisionSenderName('Tender Edge Solutions')).toBe('Tender Edge Solutions Team');
  });

  it('appends Team to Apex Web Solutions', () => {
    expect(resolveDivisionSenderName('Apex Web Solutions')).toBe('Apex Web Solutions Team');
  });

  it('appends Team to Playhouse Media Group', () => {
    expect(resolveDivisionSenderName('Playhouse Media Group')).toBe('Playhouse Media Group Team');
  });

  it('does not duplicate Team if already present', () => {
    expect(resolveDivisionSenderName('Tender Edge Solutions Team')).toBe(
      'Tender Edge Solutions Team',
    );
    expect(resolveDivisionSenderName('Apex Web Solutions TEAM')).toBe('Apex Web Solutions TEAM');
  });

  it('falls back to Playhouse Media Group Team when null, undefined or empty', () => {
    expect(resolveDivisionSenderName(null)).toBe('Playhouse Media Group Team');
    expect(resolveDivisionSenderName(undefined)).toBe('Playhouse Media Group Team');
    expect(resolveDivisionSenderName('')).toBe('Playhouse Media Group Team');
    expect(resolveDivisionSenderName('   ')).toBe('Playhouse Media Group Team');
  });
});

describe('resolveBrandEmailConfig', () => {
  it('formats sender name with <BrandName> Team prefix', () => {
    const config = resolveBrandEmailConfig('tes', {
      TES_RESEND_API_KEY: 'test_key',
    });
    expect(config.from).toBe('Tender Edge Solutions Team <noreply@info.tenderedgesolutions.co.za>');
  });

  it('formats sender name for aws with Apex Web Solutions Team prefix', () => {
    const config = resolveBrandEmailConfig('aws', {
      AWS_RESEND_API_KEY: 'test_key',
    });
    expect(config.from).toBe('Apex Web Solutions Team <noreply@info.apexwebsolutions.co.za>');
  });

  it('preserves existing formatted from if already contains angle brackets', () => {
    const config = resolveBrandEmailConfig('pmg', {
      PMG_RESEND_API_KEY: 'test_key',
      PMG_FROM_EMAIL: 'Custom Sender <custom@playhousemedia.co.za>',
    });
    expect(config.from).toBe('Custom Sender <custom@playhousemedia.co.za>');
  });
});
