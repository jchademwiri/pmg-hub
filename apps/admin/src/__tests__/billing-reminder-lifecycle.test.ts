/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEndOfMonth } from '@/lib/format';

describe('End-of-Month Due Date Engine', () => {
  it('correctly calculates the last day for 31-day months', () => {
    expect(getEndOfMonth('2026-01-15')).toBe('2026-01-31');
    expect(getEndOfMonth('2026-03-01')).toBe('2026-03-31');
    expect(getEndOfMonth('2026-05-25')).toBe('2026-05-31');
    expect(getEndOfMonth('2026-07-20')).toBe('2026-07-31');
    expect(getEndOfMonth('2026-08-31')).toBe('2026-08-31');
    expect(getEndOfMonth('2026-10-10')).toBe('2026-10-31');
    expect(getEndOfMonth('2026-12-05')).toBe('2026-12-31');
  });

  it('correctly calculates the last day for 30-day months', () => {
    expect(getEndOfMonth('2026-04-10')).toBe('2026-04-30');
    expect(getEndOfMonth('2026-06-25')).toBe('2026-06-30');
    expect(getEndOfMonth('2026-09-01')).toBe('2026-09-30');
    expect(getEndOfMonth('2026-11-18')).toBe('2026-11-30');
  });

  it('correctly calculates the last day for standard 28-day February', () => {
    expect(getEndOfMonth('2025-02-14')).toBe('2025-02-28');
    expect(getEndOfMonth('2026-02-25')).toBe('2026-02-28');
    expect(getEndOfMonth('2027-02-01')).toBe('2027-02-28');
  });

  it('correctly calculates the last day for leap-year 29-day February', () => {
    expect(getEndOfMonth('2024-02-10')).toBe('2024-02-29');
    expect(getEndOfMonth('2028-02-25')).toBe('2028-02-29');
  });

  it('handles empty/null by returning the end of the current month', () => {
    const currentEnd = getEndOfMonth();
    expect(currentEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const [y, m, d] = currentEnd.split('-').map(Number);
    expect(m).toBeGreaterThanOrEqual(1);
    expect(m).toBeLessThanOrEqual(12);
    expect(d).toBeGreaterThanOrEqual(28);
    expect(d).toBeLessThanOrEqual(31);
  });
});

describe('Strategic Billing Lifecycle Rules', () => {
  it('identifies 26th as retainer cycle, 15th as overdue sweep, and month-end as all-client sweep', () => {
    // Helper replicating the lifecycle day matching logic
    function getLifecycleRunType(
      dateStr: string,
    ): 'retainer_cycle' | 'month_end' | 'overdue_only' | 'none' {
      const todayDay = parseInt(dateStr.slice(8, 10), 10);
      const d = new Date(dateStr);
      const tomorrow = new Date(d);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isLastDayOfMonth = tomorrow.getMonth() !== d.getMonth();

      if (todayDay === 26) return 'retainer_cycle';
      if (isLastDayOfMonth) return 'month_end';
      if (todayDay === 15) return 'overdue_only';
      return 'none';
    }

    expect(getLifecycleRunType('2026-08-26')).toBe('retainer_cycle');
    expect(getLifecycleRunType('2026-08-15')).toBe('overdue_only');
    expect(getLifecycleRunType('2026-08-31')).toBe('month_end');
    expect(getLifecycleRunType('2026-02-28')).toBe('month_end');
    expect(getLifecycleRunType('2024-02-29')).toBe('month_end');
    expect(getLifecycleRunType('2026-04-30')).toBe('month_end');
    expect(getLifecycleRunType('2026-08-10')).toBe('none');
    expect(getLifecycleRunType('2026-08-25')).toBe('none');
  });

  it('correctly filters overdue invoices strictly before today for the 15th reminder', () => {
    const todayStr = '2026-08-15';
    const mockInvoices = [
      { id: 'inv-1', documentNumber: 'INV-001', dueDate: '2026-07-31', outstanding: 5000 }, // Overdue from July
      { id: 'inv-2', documentNumber: 'INV-002', dueDate: '2026-06-30', outstanding: 2500 }, // Overdue from June
      { id: 'inv-3', documentNumber: 'INV-003', dueDate: '2026-08-31', outstanding: 10000 }, // Current month (NOT overdue)
      { id: 'inv-4', documentNumber: 'INV-004', dueDate: '2026-07-31', outstanding: 0 }, // Fully paid
    ];

    const overdueOnly = mockInvoices.filter(
      (inv) => inv.dueDate && inv.dueDate < todayStr && inv.outstanding > 0,
    );

    expect(overdueOnly).toHaveLength(2);
    expect(overdueOnly.map((i) => i.id)).toEqual(['inv-1', 'inv-2']);
    const totalOverdue = overdueOnly.reduce((sum, inv) => sum + inv.outstanding, 0);
    expect(totalOverdue).toBe(7500);
  });

  it('correctly separates carried forward balance from current period charges for the 26th retainer statement', () => {
    const todayStr = '2026-08-26';
    const currentMonthStart = '2026-08-01';

    const mockInvoices = [
      {
        id: 'inv-prior',
        documentNumber: 'INV-JUL-01',
        invoiceDate: '2026-07-25',
        outstanding: 3000,
      },
      {
        id: 'inv-curr',
        documentNumber: 'INV-AUG-01',
        invoiceDate: '2026-08-25',
        outstanding: 12000,
      },
    ];

    const carriedForward = mockInvoices
      .filter((inv) => inv.invoiceDate < currentMonthStart)
      .reduce((sum, inv) => sum + inv.outstanding, 0);

    const currentPeriodCharges = mockInvoices
      .filter((inv) => inv.invoiceDate >= currentMonthStart)
      .reduce((sum, inv) => sum + inv.outstanding, 0);

    const totalOutstanding = mockInvoices.reduce((sum, inv) => sum + inv.outstanding, 0);

    expect(carriedForward).toBe(3000);
    expect(currentPeriodCharges).toBe(12000);
    expect(totalOutstanding).toBe(15000);
  });
});
