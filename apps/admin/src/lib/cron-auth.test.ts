import { afterEach, describe, expect, it } from 'vitest';

import { authorizeCronRequest } from './cron-auth';

const originalCronSecret = process.env.CRON_SECRET;

function requestWithAuth(authorization?: string) {
  return new Request('https://example.com/api/cron/test', {
    headers: authorization ? { authorization } : undefined,
  });
}

describe('authorizeCronRequest', () => {
  afterEach(() => {
    process.env.CRON_SECRET = originalCronSecret;
  });

  it('rejects cron requests when CRON_SECRET is missing', () => {
    delete process.env.CRON_SECRET;

    const response = authorizeCronRequest(requestWithAuth('Bearer anything'));

    expect(response?.status).toBe(401);
  });

  it('rejects cron requests without the matching bearer token', () => {
    process.env.CRON_SECRET = 'secret';

    expect(authorizeCronRequest(requestWithAuth())?.status).toBe(401);
    expect(authorizeCronRequest(requestWithAuth('Bearer wrong'))?.status).toBe(401);
  });

  it('allows cron requests with the matching bearer token', () => {
    process.env.CRON_SECRET = 'secret';

    expect(authorizeCronRequest(requestWithAuth('Bearer secret'))).toBeNull();
  });
});
