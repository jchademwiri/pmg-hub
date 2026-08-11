import type { Metadata } from 'next'
import { Database, Download, CloudUpload, Clock, AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { SettingsSection } from '@/components/settings/settings-section'
import { getBackupStorageStatus, listDatabaseBackups } from '@/lib/data-export'
import { DataExportList, DatabaseBackupPanel } from './data-settings-client'

export const metadata: Metadata = { title: 'Data & Exports Settings' }

export default async function DataSettingsPage() {
  const backupStorage = getBackupStorageStatus()
  const backups = backupStorage.configured ? await listDatabaseBackups().catch(() => []) : []

  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Data & Exports"
        description="Export data, manage backups, and retention"
        icon={Database}
      />
      <Alert>
        <Database />
        <AlertTitle>Exports are live</AlertTitle>
        <AlertDescription>
          CSV exports download immediately. Full JSON exports and Cloudflare backups include all public database tables.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="export-data" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-lg bg-muted/40 p-1">
          <TabsTrigger value="export-data" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </TabsTrigger>
          <TabsTrigger value="database-backup" className="flex items-center gap-2">
            <CloudUpload className="h-4 w-4" />
            Database Backup
          </TabsTrigger>
          <TabsTrigger value="data-retention" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Data Retention
          </TabsTrigger>
          <TabsTrigger value="danger-zone" className="flex items-center gap-2 text-destructive data-[state=active]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        {/* Exports Tab */}
        <TabsContent value="export-data" className="mt-4">
          <SettingsSection title="Export Data" description="Download your data in various formats.">
            <DataExportList />
          </SettingsSection>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="database-backup" className="mt-4">
          <SettingsSection
            title="Database Backup"
            description="Upload a complete JSON backup to Cloudflare R2 storage."
          >
            <DatabaseBackupPanel
              backupConfigured={backupStorage.configured}
              backupBucket={backupStorage.bucket}
              backupPrefix={backupStorage.prefix}
              retentionDays={backupStorage.retentionDays}
              backups={backups}
            />
          </SettingsSection>
        </TabsContent>

        {/* Retention Tab */}
        <TabsContent value="data-retention" className="mt-4">
          <SettingsSection
            title="Data Retention"
            description="How long historical records are kept before archiving."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>Financial Records</FieldLabel>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  Keep indefinitely
                </div>
              </Field>
              <Field>
                <FieldLabel>Audit Log</FieldLabel>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  12 months
                </div>
              </Field>
              <Field>
                <FieldLabel>Deleted Records</FieldLabel>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  30 days (soft delete)
                </div>
              </Field>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* Danger zone Tab */}
        <TabsContent value="danger-zone" className="mt-4">
          <SettingsSection
            title="Danger Zone"
            description="Irreversible actions. Proceed with caution."
            className="border-destructive/30"
          >
            <div className="flex flex-col divide-y divide-border">
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Clear all snapshots</span>
                  <span className="text-xs text-muted-foreground">
                    Permanently delete all financial snapshots. This cannot be undone.
                  </span>
                </div>
                <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled title="Coming soon">
                  <Trash2 data-icon="inline-start" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Reset all settings</span>
                  <span className="text-xs text-muted-foreground">
                    Restore all settings to their factory defaults.
                  </span>
                </div>
                <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled title="Coming soon">
                  <Trash2 data-icon="inline-start" />
                  Reset
                </Button>
              </div>
            </div>
          </SettingsSection>
        </TabsContent>
      </Tabs>
    </div>
  )
}


