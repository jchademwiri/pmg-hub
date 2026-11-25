import { describe, it, expect } from 'vitest';
import {
  toMonthlyAmount,
  getDueState,
  computeRecurringKpis,
  computeClientHostingMargins,
  advanceDueDatePreview,
  formatFrequencyLabel,
} from '@/app/(admin)/finance/recurring/recurring-utils';

describe('recurring-utils', () => {
  it('normalizes amounts across all recurring frequencies', () => {
    expect(toMonthlyAmount(1200, 'monthly')).toBe(1200);
    expect(toMonthlyAmount(1200, 'quarterly')).toBe(400);
    expect(toMonthlyAmount(1200, 'semi_annually')).toBe(200);
    expect(toMonthlyAmount(1200, 'annually')).toBe(100);
    expect(toMonthlyAmount(0, 'monthly')).toBe(0);
    expect(toMonthlyAmount(-50, 'monthly')).toBe(0);
  });

  it('classifies due states relative to todayStr', () => {
    const today = '2026-11-10';
    expect(getDueState('2026-11-05', 'active', today)).toBe('overdue');
    expect(getDueState('2026-11-10', 'active', today)).toBe('due_soon');
    expect(getDueState('2026-11-24', 'active', today)).toBe('due_soon');
    expect(getDueState('2026-11-28', 'active', today)).toBe('this_month');
    expect(getDueState('2026-12-05', 'active', today)).toBe('upcoming');
    expect(getDueState('2026-11-01', 'paused', today)).toBe('inactive');
  });

  it('computes normalized KPIs with Own vs Client-Linked and overdue breakdown', () => {
    const kpis = computeRecurringKpis(
      [
        { status: 'active', frequency: 'monthly', total: '2000.00', nextRunDate: '2026-11-26' },
        { status: 'active', frequency: 'annually', total: '2400.00', nextRunDate: '2027-03-01' },
        { status: 'paused', frequency: 'monthly', total: '5000.00', nextRunDate: '2026-11-26' },
      ],
      [
        {
          status: 'active',
          frequency: 'monthly',
          amount: '500.00',
          nextDueDate: '2026-11-01',
          clientId: null,
        },
        {
          status: 'active',
          frequency: 'monthly',
          amount: '379.00',
          nextDueDate: '2026-11-18',
          clientId: 'client-oel',
        },
        {
          status: 'active',
          frequency: 'annually',
          amount: '1200.00',
          nextDueDate: '2027-05-01',
          clientId: null,
        },
      ],
      '2026-11-10',
    );

    expect(kpis.monthlyIn).toBe(2200);
    expect(kpis.activeInCount).toBe(2);
    expect(kpis.periodicInCount).toBe(1);
    expect(kpis.monthlyOut).toBe(979);
    expect(kpis.ownOutCount).toBe(2);
    expect(kpis.clientOutCount).toBe(1);
    expect(kpis.netMonthly).toBe(1221);
    expect(kpis.overdueOutCount).toBe(1);
    expect(kpis.overdueOutTotal).toBe(500);
    expect(kpis.dueSoonOutCount).toBe(1);
    expect(kpis.dueSoonOutTotal).toBe(379);
    expect(kpis.dueThisMonthOutCount).toBe(2);
    expect(kpis.dueThisMonthInCount).toBe(1);
  });

  it('flags unbilled client-linked hosting costs first in hosting margin breakdown', () => {
    const margins = computeClientHostingMargins(
      [
        {
          status: 'active',
          frequency: 'monthly',
          total: '1000.00',
          clientId: 'client-billed',
          clientName: 'Billed Co',
        },
      ],
      [
        {
          status: 'active',
          frequency: 'monthly',
          amount: '250.00',
          clientId: 'client-billed',
          clientName: 'Billed Co',
          vendorName: 'Hetzner',
        },
        {
          status: 'active',
          frequency: 'monthly',
          amount: '379.00',
          clientId: 'client-oel',
          clientName: 'OEL Global Services',
          vendorName: 'HostAfrica',
          notes: 'oelglobalservices.com',
        },
        {
          status: 'active',
          frequency: 'monthly',
          amount: '400.00',
          clientId: null,
          vendorName: 'Claude',
        },
      ],
    );

    expect(margins).toHaveLength(2);
    expect(margins[0]).toMatchObject({
      clientId: 'client-oel',
      unbilled: true,
      monthlyRevenue: 0,
      monthlyCost: 379,
      netMonthly: -379,
      marginPercent: null,
      vendors: ['HostAfrica (oelglobalservices.com)'],
    });
    expect(margins[1]).toMatchObject({
      clientId: 'client-billed',
      unbilled: false,
      monthlyRevenue: 1000,
      monthlyCost: 250,
      netMonthly: 750,
      marginPercent: 75,
    });
  });

  it('advances preview due dates cleanly and formats frequency labels', () => {
    expect(advanceDueDatePreview('2026-01-31', 31, 'monthly')).toBe('2026-02-28');
    expect(advanceDueDatePreview('2026-11-15', 15, 'annually')).toBe('2027-11-15');
    expect(formatFrequencyLabel('semi_annually')).toBe('Bi-Annually (6 Mo)');
  });
});
