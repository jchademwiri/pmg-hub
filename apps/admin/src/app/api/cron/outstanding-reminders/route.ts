import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/cron-auth';
import { triggerAutomatedStatementsRun } from '@/actions/billing/automated-statements';

export const dynamic = 'force-dynamic'; // Ensure no caching
export const maxDuration = 300;

export async function GET(req: Request) {
  // 1. Verify cron authorization
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  try {
    // 2. Execute the 3-stage lifecycle statement / reminder dispatcher:
    // - 26th of Month: Retainer Monthly Statements
    // - Last Day of Month: Month-End Statements & Due Notice for all positive balances
    // - 15th of Month: Overdue-Only Reminders (past-due balances only)
    const result = await triggerAutomatedStatementsRun(undefined, {
      isInternal: true,
      runType: 'auto',
    });

    return NextResponse.json({
      success: result.success ?? true,
      runType: result.runType,
      generatedCount: result.generatedCount,
      skippedZeroBalance: result.skippedZeroBalance,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('Error in outstanding reminders auto cron:', err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : 'Failed to process automated billing notifications.',
      },
      { status: 500 },
    );
  }
}
