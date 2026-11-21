import { describe, it, expect } from 'vitest';
import * as schema from '../src/schema';
import { DEFAULT_LEAVE_SETTINGS } from '../src/queries/leave';

describe('leave tracker schema', () => {
  it('exports leaveSettings and leaveEntries tables', () => {
    expect(schema.leaveSettings).toBeDefined();
    expect(schema.leaveEntries).toBeDefined();
  });

  it('exports leaveTypeEnum with exact values', () => {
    expect(schema.leaveTypeEnum).toBeDefined();
    expect(schema.leaveTypeEnum.enumValues).toEqual(['ANNUAL', 'SICK', 'FAMILY_RESPONSIBILITY']);
  });

  it('exports leaveStatusEnum with exact values', () => {
    expect(schema.leaveStatusEnum).toBeDefined();
    expect(schema.leaveStatusEnum.enumValues).toEqual(['PLANNED', 'TAKEN', 'CANCELLED']);
  });

  it('defines October 31, 2026 baseline defaults', () => {
    expect(DEFAULT_LEAVE_SETTINGS.employmentStartDate).toBe('2022-01-01');
    expect(DEFAULT_LEAVE_SETTINGS.anchorDate).toBe('2026-10-31');
    expect(DEFAULT_LEAVE_SETTINGS.annualOpeningBalance).toBe('16.50');
    expect(DEFAULT_LEAVE_SETTINGS.annualMonthlyAccrual).toBe('1.75');
    expect(DEFAULT_LEAVE_SETTINGS.annualMaxCarryOver).toBe(5);
    expect(DEFAULT_LEAVE_SETTINGS.sickCycleStartDate).toBe('2025-01-01');
    expect(DEFAULT_LEAVE_SETTINGS.sickCycleEntitlement).toBe(30);
    expect(DEFAULT_LEAVE_SETTINGS.sickOpeningBalance).toBe(25);
    expect(DEFAULT_LEAVE_SETTINGS.familyOpeningBalance).toBe(0);
    expect(DEFAULT_LEAVE_SETTINGS.familyAnnualEntitlement).toBe(3);
    expect(DEFAULT_LEAVE_SETTINGS.familyResetMonth).toBe(1);
  });
});
