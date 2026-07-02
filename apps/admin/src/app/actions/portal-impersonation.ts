'use server';

import { headers as getHeaders } from 'next/headers';
import { auth, requireRole } from '@/lib/auth';
import { createHmac } from 'node:crypto';
import { getPortalBaseUrl } from '@/lib/portal-url';

export async function generateImpersonationLink(clientId: string): Promise<{ url?: string; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await getHeaders() });
    if (!session?.user) return { error: 'Not authenticated' };

    // Verify the caller has admin or super_admin role
    if (!requireRole(session as any, 'admin')) return { error: 'Unauthorized' };

    const secret = process.env.IMPERSONATION_SHARED_SECRET;
    if (!secret) return { error: 'IMPERSONATION_SHARED_SECRET not configured' };

    const adminUserId = session.user.id;
    const timestamp = Date.now();

    // HMAC-SHA256(clientId:adminUserId:timestamp, secret)
    const hmac = createHmac('sha256', secret)
      .update(`${clientId}:${adminUserId}:${timestamp}`)
      .digest('hex');

    const portalBase = getPortalBaseUrl();
    const url = `${portalBase}/impersonate?token=${hmac}&cid=${clientId}&uid=${adminUserId}&ts=${timestamp}`;

    return { url };
  } catch (error) {
    console.error('[generateImpersonationLink]', error);
    return { error: 'Failed to generate impersonation link' };
  }
}
