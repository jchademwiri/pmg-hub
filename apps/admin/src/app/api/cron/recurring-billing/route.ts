import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { triggerRecurringBillingRun } from '@/actions/billing/recurring';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  // 1. Verify cron authorization
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  try {
    // 2. Process active recurring invoice billing schedules
    const result = await triggerRecurringBillingRun(undefined, { isInternal: true });

    if (result.error) {
      console.error('[CRON:RECURRING_BILLING] Billing run error:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      generatedCount: result.generatedCount ?? 0,
      emailFailureCount: result.emailFailureCount ?? 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[CRON:RECURRING_BILLING] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to execute recurring billing run.',
      },
      { status: 500 },
    );
  }
}
