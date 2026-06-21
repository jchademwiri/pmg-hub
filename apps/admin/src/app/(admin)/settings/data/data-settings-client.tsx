'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  CloudUpload,
  DatabaseBackup,
  Download,
  FileJson,
  FileSpreadsheet,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import {
  backupDatabaseToCloudflare,
  cleanupOldCloudflareBackups,
  restoreDatabaseFromCloudflare,
} from '@/app/actions/data-export';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const exportOptions = [
  {
    icon: FileSpreadsheet,
    label: 'Income & Expenses (CSV)',
    description: 'All income and expense records as a spreadsheet',
    href: '/api/settings/data/export/income-expenses',
  },
  {
    icon: FileSpreadsheet,
    label: 'Invoices (CSV)',
    description: 'Full invoice history with totals and status',
    href: '/api/settings/data/export/invoices',
  },
  {
    icon: FileSpreadsheet,
    label: 'Clients (CSV)',
    description: 'Client list with contact details and status',
    href: '/api/settings/data/export/clients',
  },
  {
    icon: FileJson,
    label: 'Full Data Export (JSON)',
    description: 'Complete database export for manual download',
    href: '/api/settings/data/export/full-json',
  },
];

interface DataSettingsClientProps {
  backupConfigured: boolean;
  backupBucket: string | null;
  backupPrefix: string;
  retentionDays: number;
  backups: BackupListItem[];
}

interface BackupListItem {
  key: string;
  lastModified: string;
  sizeBytes: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DataExportList() {
  return (
    <div className="flex flex-col divide-y divide-border">
      {exportOptions.map((opt) => (
        <div key={opt.label} className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <opt.icon className="shrink-0 text-muted-foreground" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.description}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={opt.href}>
              <Download data-icon="inline-start" />
              Export
            </Link>
          </Button>
        </div>
      ))}
    </div>
  );
}

export function DatabaseBackupPanel({
  backupConfigured,
  backupBucket,
  backupPrefix,
  retentionDays,
  backups,
}: DataSettingsClientProps) {
  const [isBackupPending, startBackupTransition] = useTransition();
  const [isCleanupPending, startCleanupTransition] = useTransition();
  const [isRestorePending, startRestoreTransition] = useTransition();
  const [selectedBackupKey, setSelectedBackupKey] = useState(backups[0]?.key ?? '');
  const [confirmation, setConfirmation] = useState('');
  const visibleBackups = backups.slice(0, 8);

  function handleBackup() {
    startBackupTransition(async () => {
      const result = await backupDatabaseToCloudflare();
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Database backup uploaded to Cloudflare R2.', {
        description: `${result.tableCount} tables, ${formatBytes(result.sizeBytes ?? 0)}`,
      });
    });
  }

  function handleCleanup() {
    startCleanupTransition(async () => {
      const result = await cleanupOldCloudflareBackups();
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Old database backups cleaned up.', {
        description: `${result.deletedCount ?? 0} files older than ${result.retentionDays} days deleted.`,
      });
    });
  }

  function handleRestore() {
    const formData = new FormData();
    formData.set('backupKey', selectedBackupKey);
    formData.set('confirmation', confirmation);

    startRestoreTransition(async () => {
      const result = await restoreDatabaseFromCloudflare(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setConfirmation('');
      toast.success('Database restored from Cloudflare R2.', {
        description: `${result.tableCount} tables, ${result.rowCount} rows restored.`,
      });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <DatabaseBackup className="mt-0.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Cloudflare R2 backup storage</span>
              <Badge variant={backupConfigured ? 'secondary' : 'outline'}>
                {backupConfigured ? 'Configured' : 'Needs env vars'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {backupConfigured
                ? `Backups upload to ${backupBucket}/${backupPrefix}.`
                : 'Add the Cloudflare R2 environment variables before uploading backups.'}
            </p>
            <p className="text-xs text-muted-foreground">
              Automatic cleanup deletes backups older than {retentionDays} days.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleBackup}
            disabled={!backupConfigured || isBackupPending}
          >
            <CloudUpload data-icon="inline-start" />
            {isBackupPending ? 'Uploading...' : 'Back Up Now'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCleanup}
            disabled={!backupConfigured || isCleanupPending}
          >
            <Trash2 data-icon="inline-start" />
            {isCleanupPending ? 'Cleaning...' : 'Clean Old Files'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-3">
          <div>
            <h4 className="text-sm font-medium">Available backups</h4>
            <p className="text-xs text-muted-foreground">
              Recent JSON backups found in Cloudflare R2.
            </p>
          </div>
          {visibleBackups.length > 0 ? (
            <div className="flex flex-col divide-y divide-border">
              {visibleBackups.map((backup) => (
                <button
                  key={backup.key}
                  type="button"
                  onClick={() => setSelectedBackupKey(backup.key)}
                  aria-pressed={selectedBackupKey === backup.key}
                  className="flex items-center justify-between gap-4 py-3 text-left text-sm transition-colors hover:text-foreground aria-pressed:font-medium"
                >
                  <span className="truncate">{backup.key.replace(`${backupPrefix}/`, '')}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(backup.lastModified).toLocaleString()} · {formatBytes(backup.sizeBytes)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              {backupConfigured
                ? 'No backup files found yet. Run a backup to create the first file.'
                : 'Configure Cloudflare R2 env vars to list backup files.'}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-md bg-muted/20 p-4">
          <div>
            <h4 className="text-sm font-medium">Restore database</h4>
            <p className="text-xs text-muted-foreground">
              This replaces current data with the selected backup.
            </p>
          </div>
          <Field>
            <FieldLabel>Backup file</FieldLabel>
            <Select
              value={selectedBackupKey}
              onValueChange={setSelectedBackupKey}
              disabled={!backupConfigured || visibleBackups.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose backup" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {visibleBackups.map((backup) => (
                    <SelectItem key={backup.key} value={backup.key}>
                      {backup.key.replace(`${backupPrefix}/`, '')}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Type RESTORE to confirm</FieldLabel>
            <Input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="RESTORE"
              disabled={!selectedBackupKey || isRestorePending}
            />
          </Field>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRestore}
            disabled={
              !backupConfigured ||
              !selectedBackupKey ||
              confirmation !== 'RESTORE' ||
              isRestorePending
            }
          >
            <RotateCcw data-icon="inline-start" />
            {isRestorePending ? 'Restoring...' : 'Restore Backup'}
          </Button>
        </div>
      </div>
    </div>
  );
}
