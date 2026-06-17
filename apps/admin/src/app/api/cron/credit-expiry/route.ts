import { NextResponse } from 'next/server';
import { expireCreditNotes } from '@/app/actions/credit-management';

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const result = await expireCreditNotes();
    return NextResponse.json({ success: true, expiredCount: result.expired });
  } catch (err: any) {
    console.error('Error in credit-expiry cron', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
