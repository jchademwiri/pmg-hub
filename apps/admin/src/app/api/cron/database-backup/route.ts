import { NextResponse } from 'next/server';

import { createDatabaseBackup, deleteOldDatabaseBackups } from '@/lib/data-export';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const backup = await createDatabaseBackup();
    const cleanup = await deleteOldDatabaseBackups();

    return NextResponse.json({
      success: true,
      backup,
      cleanup,
    });
  } catch (error) {
    console.error('Error in database-backup cron', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run database backup.',
      },
      { status: 500 },
    );
  }
}
