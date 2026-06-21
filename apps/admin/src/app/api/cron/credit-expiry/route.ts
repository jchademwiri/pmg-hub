import { NextResponse } from 'next/server';
import { expireCreditNotes } from '@/app/actions/credit-management';
import { authorizeCronRequest } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET(req: Request) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  try {
    const result = await expireCreditNotes();
    return NextResponse.json({ success: true, expiredCount: result.expired });
  } catch (err: unknown) {
    console.error('Error in credit-expiry cron', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to expire credits.' },
      { status: 500 },
    );
  }
}
