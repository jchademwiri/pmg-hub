import { NextResponse } from 'next/server';

import { deleteOldDatabaseBackups } from '@/lib/data-export';
import { authorizeCronRequest } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  try {
    const cleanup = await deleteOldDatabaseBackups();
    return NextResponse.json({ success: true, cleanup });
  } catch (error) {
    console.error('Error in backup-retention cron', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clean up old backups.',
      },
      { status: 500 },
    );
  }
}
