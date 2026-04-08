import { NextResponse } from 'next/server'
import { autoClosePreviousMonthIfNeeded } from '@/app/actions/snapshots'

export const dynamic = 'force-dynamic' // Ensure it's not cached

export async function GET(req: Request) {
  // Optional: Add simple security check for Vercel Cron.
  // In production, you should verify the CRON_SECRET header
  // const authHeader = req.headers.get('authorization');
  // if (
  //   process.env.CRON_SECRET &&
  //   authHeader !== `Bearer ${process.env.CRON_SECRET}`
  // ) {
  //   return new NextResponse('Unauthorized', { status: 401 });
  // }

  try {
    await autoClosePreviousMonthIfNeeded()
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error in close-month cron', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
