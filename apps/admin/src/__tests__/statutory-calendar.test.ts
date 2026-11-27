import { describe, it, expect } from 'vitest';
import { getStatutoryDeadlines } from '@/lib/compliance/statutory-calendar';

describe('statutory-calendar', () => {
  it('returns all 4 SA (Pty) Ltd statutory deadlines sorted by daysLeft', () => {
    const deadlines = getStatutoryDeadlines('2026-11-24');
    expect(deadlines).toHaveLength(4);
    for (let i = 1; i < deadlines.length; i++) {
      expect(deadlines[i]!.daysLeft).toBeGreaterThanOrEqual(deadlines[i - 1]!.daysLeft);
    }

    // Feb 28, 2027 is a Sunday -> SARS IRP6 shifts to preceding Friday (2027-02-26)
    const irp6Second = deadlines.find((d) => d.id === 'sars-irp6-2');
    expect(irp6Second?.dueDate).toBe('2027-02-26');
    expect(irp6Second?.actionHref).toBe('/finance/projections?tab=tax');

    const irp6First = deadlines.find((d) => d.id === 'sars-irp6-1');
    expect(irp6First?.dueDate).toBe('2027-08-31');
  });

  it('handles leap-year February (2028-02-29) and critical <= 14 days threshold', () => {
    const deadlines = getStatutoryDeadlines('2028-02-20');
    const irp6Second = deadlines.find((d) => d.id === 'sars-irp6-2');
    expect(irp6Second?.dueDate).toBe('2028-02-29');
    expect(irp6Second?.daysLeft).toBe(9);
    expect(irp6Second?.severity).toBe('critical');
  });

  it('flags deadlines within 60 days as upcoming', () => {
    const deadlines = getStatutoryDeadlines('2026-07-15');
    const irp6First = deadlines.find((d) => d.id === 'sars-irp6-1');
    expect(irp6First?.dueDate).toBe('2026-08-31');
    expect(irp6First?.daysLeft).toBe(47);
    expect(irp6First?.severity).toBe('upcoming');
  });
});
