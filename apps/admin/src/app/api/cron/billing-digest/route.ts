import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { generateAndSendBillingDigest } from '@/actions/billing/digest';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: Request) {
  // 1. Verify cron authorization
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  try {
    // 2. Execute daily 5:00 PM SAST billing digest aggregation and delivery
    const result = await generateAndSendBillingDigest(undefined, {
      isInternal: true,
    });

    if (!result.success) {
      console.error('[CRON:BILLING_DIGEST] Digest failed:', result.error);
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
      message: result.message,
      resendEmailId: result.resendEmailId,
      dispatchesCount: result.dispatchesCount,
      skippedCount: result.skippedCount,
      errorsCount: result.errorsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[CRON:BILLING_DIGEST] Error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to execute billing digest cron.',
      },
      { status: 500 },
    );
  }
}
