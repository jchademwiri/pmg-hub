'use server';

import { createDatabaseBackup } from '@/lib/data-export';
import { getSessionOrRedirect, requireRole } from '@/lib/auth';

export async function backupDatabaseToCloudflare(): Promise<{
  error?: string;
  key?: string;
  sizeBytes?: number;
  tableCount?: number;
  exportedAt?: string;
}> {
  const session = await getSessionOrRedirect();
  if (!requireRole(session, 'super_admin')) {
    return { error: 'Forbidden' };
  }

  try {
    return await createDatabaseBackup();
  } catch (error) {
    console.error('[Database Backup Error]', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create database backup.',
    };
  }
}
