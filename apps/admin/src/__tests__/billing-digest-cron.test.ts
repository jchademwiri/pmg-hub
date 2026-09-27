/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/billing-digest/route';
import * as digestActions from '@/actions/billing/digest';
import * as cronAuth from '@/lib/cron-auth';
import { PRIMARY_DIGEST_EMAIL, SECONDARY_DIGEST_CC } from '@pmg/emails';

vi.mock('server-only', () => ({}));

describe('Billing Digest Cron Route & Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has primary and secondary digest recipients configured correctly', () => {
    expect(PRIMARY_DIGEST_EMAIL).toBe('info@playhousemedia.co.za');
    expect(SECONDARY_DIGEST_CC).toBe('hello@jacobc.co.za');
  });

  it('rejects unauthorized cron requests', async () => {
    vi.spyOn(cronAuth, 'authorizeCronRequest').mockReturnValue(
      new Response('Unauthorized', { status: 401 }) as any,
    );

    const req = new Request('https://admin.playhousemedia.co.za/api/cron/billing-digest');
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it('passes isInternal: true to generateAndSendBillingDigest and returns 200 on success', async () => {
    vi.spyOn(cronAuth, 'authorizeCronRequest').mockReturnValue(null);
    const digestSpy = vi.spyOn(digestActions, 'generateAndSendBillingDigest').mockResolvedValue({
      success: true,
      dispatchesCount: 2,
      skippedCount: 1,
      errorsCount: 0,
      resendEmailId: 'test-email-id',
    });

    const req = new Request('https://admin.playhousemedia.co.za/api/cron/billing-digest');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.dispatchesCount).toBe(2);
    expect(body.skippedCount).toBe(1);
    expect(body.errorsCount).toBe(0);
    expect(digestSpy).toHaveBeenCalledWith(undefined, { isInternal: true });
  });

  it('returns HTTP 500 if generateAndSendBillingDigest reports an error', async () => {
    vi.spyOn(cronAuth, 'authorizeCronRequest').mockReturnValue(null);
    vi.spyOn(digestActions, 'generateAndSendBillingDigest').mockResolvedValue({
      success: false,
      error: 'Resend API key missing or invalid',
      dispatchesCount: 0,
      skippedCount: 0,
      errorsCount: 0,
    });

    const req = new Request('https://admin.playhousemedia.co.za/api/cron/billing-digest');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Resend API key missing or invalid');
  });

  it('handles unexpected exceptions gracefully with HTTP 500 and structured json', async () => {
    vi.spyOn(cronAuth, 'authorizeCronRequest').mockReturnValue(null);
    vi.spyOn(digestActions, 'generateAndSendBillingDigest').mockRejectedValue(
      new Error('Database connection failed'),
    );

    const req = new Request('https://admin.playhousemedia.co.za/api/cron/billing-digest');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Database connection failed');
  });
});
