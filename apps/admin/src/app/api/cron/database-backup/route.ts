import { NextResponse } from 'next/server';

import { createDatabaseBackup, deleteOldDatabaseBackups } from '@/lib/data-export';
import { authorizeCronRequest } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  let backup: Awaited<ReturnType<typeof createDatabaseBackup>>;

  try {
    backup = await createDatabaseBackup();
  } catch (error) {
    console.error('Error creating database backup from cron', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run database backup.',
      },
      { status: 500 },
    );
  }

  try {
    const cleanup = await deleteOldDatabaseBackups();
    return NextResponse.json({
      success: true,
      backup,
      cleanup,
    });
  } catch (error) {
    console.error('Error cleaning up old database backups after successful cron backup', error);
    return NextResponse.json(
      {
        success: false,
        backupSucceeded: true,
        backup,
        error:
          error instanceof Error
            ? `Database backup completed, but cleanup failed: ${error.message}`
            : 'Database backup completed, but cleanup failed.',
      },
      { status: 500 },
    );
  }
}
