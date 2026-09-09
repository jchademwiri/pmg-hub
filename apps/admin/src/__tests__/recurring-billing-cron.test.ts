/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/recurring-billing/route';
import * as recurringActions from '@/actions/billing/recurring';
import * as cronAuth from '@/lib/cron-auth';

vi.mock('server-only', () => ({}));

describe('Recurring Billing Cron Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized cron requests', async () => {
    vi.spyOn(cronAuth, 'authorizeCronRequest').mockReturnValue(
      new Response('Unauthorized', { status: 401 }) as any,
    );

    const req = new Request('https://admin.playhousemedia.co.za/api/cron/recurring-billing');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('passes isInternal: true to triggerRecurringBillingRun and returns 200 on success', async () => {
    vi.spyOn(cronAuth, 'authorizeCronRequest').mockReturnValue(null);
    const triggerSpy = vi
      .spyOn(recurringActions, 'triggerRecurringBillingRun')
      .mockResolvedValue({ generatedCount: 3, emailFailureCount: 0 });

    const req = new Request('https://admin.playhousemedia.co.za/api/cron/recurring-billing');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.generatedCount).toBe(3);
    expect(triggerSpy).toHaveBeenCalledWith(undefined, { isInternal: true });
  });

  it('returns HTTP 500 if triggerRecurringBillingRun reports an error', async () => {
    vi.spyOn(cronAuth, 'authorizeCronRequest').mockReturnValue(null);
    vi.spyOn(recurringActions, 'triggerRecurringBillingRun').mockResolvedValue({
      error: 'Failed to process recurring invoices.',
    });

    const req = new Request('https://admin.playhousemedia.co.za/api/cron/recurring-billing');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to process recurring invoices.');
  });
});
