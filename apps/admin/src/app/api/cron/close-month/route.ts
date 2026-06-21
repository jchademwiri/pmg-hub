import { NextResponse } from 'next/server';
import { autoClosePreviousMonthIfNeeded } from '@/app/actions/snapshots';
import { authorizeCronRequest } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET(req: Request) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  try {
    await autoClosePreviousMonthIfNeeded();
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error in close-month cron', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to close month.' },
      { status: 500 },
    );
  }
}
