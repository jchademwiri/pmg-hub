import type { Metadata } from 'next'
import { Database, Download, Trash2, FileJson, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Field, FieldLabel } from '@/components/ui/field'
import { SettingsPageHeader } from '@/components/settings/settings-page-header'
import { SettingsSection } from '@/components/settings/settings-section'

export const metadata: Metadata = { title: 'Data & Exports Settings' }

const exportOptions = [
  {
    icon: FileSpreadsheet,
    label: 'Income & Expenses (CSV)',
    description: 'All income and expense records as a spreadsheet',
  },
  {
    icon: FileSpreadsheet,
    label: 'Invoices (CSV)',
    description: 'Full invoice history with line items',
  },
  {
    icon: FileSpreadsheet,
    label: 'Clients (CSV)',
    description: 'Client list with contact details',
  },
  {
    icon: FileJson,
    label: 'Full Data Export (JSON)',
    description: 'Complete export of all data in JSON format',
  },
]

export default function DataSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsPageHeader
        title="Data & Exports"
        description="Export data, manage backups, and retention"
        icon={Database}
        badge="Soon"
      />
      <Alert>
        <Database />
        <AlertTitle>Exports are read-only for now</AlertTitle>
        <AlertDescription>
          This page shows the planned export and retention controls. Export actions are not enabled yet.
        </AlertDescription>
      </Alert>

      {/* Exports */}
      <SettingsSection title="Export Data" description="Download your data in various formats.">
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
              <Button variant="outline" size="sm" disabled title="Coming soon">
                <Download data-icon="inline-start" />
                Export
              </Button>
            </div>
          ))}
        </div>
      </SettingsSection>

      <Separator />

      {/* Retention */}
      <SettingsSection
        title="Data Retention"
        description="How long historical records are kept before archiving."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <Separator />

      {/* Danger zone */}
      <SettingsSection
        title="Danger Zone"
        description="Irreversible actions. Proceed with caution."
        className="border-destructive/30"
      >
        <div className="flex flex-col divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-4">
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
          <div className="flex items-center justify-between gap-4 py-4">
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
    </div>
  )
}
