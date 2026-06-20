'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CloudUpload, DatabaseBackup, Download, FileJson, FileSpreadsheet } from 'lucide-react';

import { backupDatabaseToCloudflare } from '@/app/actions/data-export';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
}: DataSettingsClientProps) {
  const [isPending, startTransition] = useTransition();

  function handleBackup() {
    startTransition(async () => {
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
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleBackup}
          disabled={!backupConfigured || isPending}
        >
          <CloudUpload data-icon="inline-start" />
          {isPending ? 'Uploading...' : 'Back Up Now'}
        </Button>
      </div>
    </div>
  );
}
