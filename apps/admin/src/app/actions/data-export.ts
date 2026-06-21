'use server';

import {
  createDatabaseBackup,
  deleteOldDatabaseBackups,
  restoreDatabaseBackup,
} from '@/lib/data-export';
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

export async function cleanupOldCloudflareBackups(): Promise<{
  error?: string;
  retentionDays?: number;
  deletedCount?: number;
}> {
  const session = await getSessionOrRedirect();
  if (!requireRole(session, 'super_admin')) {
    return { error: 'Forbidden' };
  }

  try {
    return await deleteOldDatabaseBackups();
  } catch (error) {
    console.error('[Database Backup Cleanup Error]', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to clean up old backups.',
    };
  }
}

export async function restoreDatabaseFromCloudflare(
  formData: FormData,
): Promise<{
  error?: string;
  key?: string;
  restoredAt?: string;
  backupExportedAt?: string;
  tableCount?: number;
  rowCount?: number;
}> {
  const session = await getSessionOrRedirect();
  if (!requireRole(session, 'super_admin')) {
    return { error: 'Forbidden' };
  }

  const key = String(formData.get('backupKey') ?? '');
  const confirmation = String(formData.get('confirmation') ?? '');

  if (!key) return { error: 'Choose a backup to restore.' };
  if (confirmation !== 'RESTORE') {
    return { error: 'Type RESTORE to confirm this destructive restore.' };
  }

  try {
    return await restoreDatabaseBackup(key);
  } catch (error) {
    console.error('[Database Restore Error]', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to restore database backup.',
    };
  }
}
