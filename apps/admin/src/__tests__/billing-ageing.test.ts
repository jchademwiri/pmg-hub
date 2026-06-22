import { describe, it, expect } from 'vitest';
import { calculateAgeing, totalAgeingDue } from '@/lib/billing-ageing';
import type { AgeingInvoice } from '@/lib/billing-ageing';

const today = '2026-06-22';

function inv(overrides: Partial<AgeingInvoice> & { dueDate?: string | null }): AgeingInvoice {
  return {
    invoiceDate: '2026-06-01',
    status: 'issued',
    total: 1000,
    allocatedAmount: 0,
    ...overrides,
  };
}

describe('calculateAgeing', () => {
  it('places invoice due today in Current', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-06-22' })], today);
    expect(result.current).toBe(1000);
    expect(result.days1_14).toBe(0);
    expect(result.days15_30).toBe(0);
    expect(result.days31_60).toBe(0);
    expect(result.days61_90).toBe(0);
    expect(result.days91_120).toBe(0);
  });

  it('places invoice not yet due in Current', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-06-30' })], today);
    expect(result.current).toBe(1000);
  });

  it('places 1-day overdue in 1-14 Days', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-06-21' })], today);
    expect(result.days1_14).toBe(1000);
    expect(result.current).toBe(0);
  });

  it('places 14-day overdue in 1-14 Days', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-06-08' })], today);
    expect(result.days1_14).toBe(1000);
  });

  it('places 15-day overdue in 15-30 Days', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-06-07' })], today);
    expect(result.days15_30).toBe(1000);
    expect(result.days1_14).toBe(0);
  });

  it('places 30-day overdue in 15-30 Days', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-05-23' })], today);
    expect(result.days15_30).toBe(1000);
  });

  it('places 31-day overdue in 31-60 Days', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-05-22' })], today);
    expect(result.days31_60).toBe(1000);
    expect(result.days15_30).toBe(0);
  });

  it('places 60-day overdue in 31-60 Days', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-04-23' })], today);
    expect(result.days31_60).toBe(1000);
  });

  it('places 61-day overdue in 61-90 Days', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-04-22' })], today);
    expect(result.days61_90).toBe(1000);
    expect(result.days31_60).toBe(0);
  });

  it('places 90-day overdue in 61-90 Days', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-03-24' })], today);
    expect(result.days61_90).toBe(1000);
  });

  it('places 91-day overdue in 91+ Days', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-03-23' })], today);
    expect(result.days91_120).toBe(1000);
    expect(result.days61_90).toBe(0);
  });

  it('excludes paid invoice', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-06-01', status: 'paid' })], today);
    expect(totalAgeingDue(result)).toBe(0);
  });

  it('excludes void invoice', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-06-01', status: 'void' })], today);
    expect(totalAgeingDue(result)).toBe(0);
  });

  it('excludes draft invoice', () => {
    const result = calculateAgeing([inv({ dueDate: '2026-06-01', status: 'draft' })], today);
    expect(totalAgeingDue(result)).toBe(0);
  });

  it('partially paid invoice contributes only remaining balance', () => {
    const result = calculateAgeing(
      [inv({ dueDate: '2026-06-01', total: 1000, allocatedAmount: 600, status: 'partially_paid' })],
      today,
    );
    expect(result.current).toBe(0);
    expect(result.days1_14).toBe(400);
  });

  it('fully allocated invoice is excluded', () => {
    const result = calculateAgeing(
      [inv({ dueDate: '2026-06-01', total: 1000, allocatedAmount: 1000 })],
      today,
    );
    expect(totalAgeingDue(result)).toBe(0);
  });

  it('falls back to invoiceDate when dueDate is missing', () => {
    const result = calculateAgeing([inv({ dueDate: null, invoiceDate: '2026-06-21' })], today);
    expect(result.days1_14).toBe(1000);
  });

  it('handles multiple invoices across different buckets', () => {
    const result = calculateAgeing(
      [
        inv({ dueDate: '2026-06-22', total: 500 }),           // Current
        inv({ dueDate: '2026-06-10', total: 300 }),           // 1-14
        inv({ dueDate: '2026-05-25', total: 200, status: 'overdue' }), // 15-30
        inv({ dueDate: '2026-04-25', total: 400 }),           // 31-60
        inv({ dueDate: '2026-03-25', total: 100 }),           // 61-90
        inv({ dueDate: '2026-01-01', total: 600 }),           // 91+
        inv({ dueDate: '2026-06-01', total: 999, status: 'paid' }), // excluded
      ],
      today,
    );
    expect(result.current).toBe(500);
    expect(result.days1_14).toBe(300);
    expect(result.days15_30).toBe(200);
    expect(result.days31_60).toBe(400);
    expect(result.days61_90).toBe(100);
    expect(result.days91_120).toBe(600);
    expect(totalAgeingDue(result)).toBe(500 + 300 + 200 + 400 + 100 + 600);
  });

  it('returns all zeros for empty invoice list', () => {
    const result = calculateAgeing([], today);
    expect(totalAgeingDue(result)).toBe(0);
    expect(result.current).toBe(0);
    expect(result.days1_14).toBe(0);
    expect(result.days15_30).toBe(0);
    expect(result.days31_60).toBe(0);
    expect(result.days61_90).toBe(0);
    expect(result.days91_120).toBe(0);
  });
});

describe('totalAgeingDue', () => {
  it('sums all six buckets correctly', () => {
    const result = totalAgeingDue({
      current: 100,
      days1_14: 200,
      days15_30: 300,
      days31_60: 400,
      days61_90: 500,
      days91_120: 600,
    });
    expect(result).toBe(2100);
  });

  it('returns 0 for all-zero buckets', () => {
    const result = totalAgeingDue({
      current: 0,
      days1_14: 0,
      days15_30: 0,
      days31_60: 0,
      days61_90: 0,
      days91_120: 0,
    });
    expect(result).toBe(0);
  });

  it('handles fractional values', () => {
    const result = totalAgeingDue({
      current: 99.99,
      days1_14: 0.01,
      days15_30: 0,
      days31_60: 0,
      days61_90: 0,
      days91_120: 0,
    });
    expect(result).toBeCloseTo(100, 2);
  });
});
