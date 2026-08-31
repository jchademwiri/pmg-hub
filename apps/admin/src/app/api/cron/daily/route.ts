import { NextResponse } from 'next/server';
import { triggerRecurringBillingRun } from '@/app/actions/recurring-actions';
import { triggerAutomatedStatementsRun } from '@/app/actions/automated-statements';
import { authorizeCronRequest } from '@/lib/cron-auth';

export const maxDuration = 300; // Allow Vercel up to 5 minutes to run this cron

export async function GET(request: Request) {
  try {
    // Vercel cron authorization check
    const authError = authorizeCronRequest(request);
    if (authError) {
      return authError;
    }

    console.log('[CRON:DAILY] Starting daily maintenance run...');

    // 1. Process recurring hosting/retainer invoices
    const recurringRes = await triggerRecurringBillingRun();
    console.log(`[CRON:DAILY] Recurring invoices: ${recurringRes.generatedCount} generated.`);
    
    // 2. Process automated statement sweeps
    const statementRes = await triggerAutomatedStatementsRun();
    console.log(`[CRON:DAILY] Automated statements: ${statementRes.generatedCount} sent, ${statementRes.skippedZeroBalance} zero-balance skipped.`);

    return NextResponse.json({
      success: true,
      recurring: recurringRes,
      statements: statementRes,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON:DAILY] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
