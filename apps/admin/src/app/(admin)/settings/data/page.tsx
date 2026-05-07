import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, Database, Download, Trash2, FileJson, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

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
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ChevronLeft className="size-4" />
            Settings
          </Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <Database className="size-4 text-muted-foreground" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Data & Exports</h2>
              <Badge variant="secondary" className="text-xs">Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Export data, manage backups, and retention</p>
          </div>
        </div>
      </div>

      {/* Exports */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Export Data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Download your data in various formats.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col divide-y divide-border pt-2 pb-2">
            {exportOptions.map((opt) => (
              <div key={opt.label} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <opt.icon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Download className="size-4" />
                  Export
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Retention */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold">Data Retention</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            How long historical records are kept before archiving.
          </p>
        </div>
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Financial Records</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  Keep indefinitely
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Audit Log</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  12 months
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Deleted Records</label>
                <div className="h-9 rounded-md border border-input bg-muted/40 px-3 flex items-center text-sm text-muted-foreground">
                  30 days (soft delete)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Danger zone */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Irreversible actions. Proceed with caution.
          </p>
        </div>
        <Card className="lg:col-span-2 border-destructive/30">
          <CardContent className="flex flex-col divide-y divide-border pt-2 pb-2">
            <div className="flex items-center justify-between gap-4 py-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">Clear all snapshots</span>
                <span className="text-xs text-muted-foreground">
                  Permanently delete all financial snapshots. This cannot be undone.
                </span>
              </div>
              <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled>
                <Trash2 className="size-4" />
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
              <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled>
                <Trash2 className="size-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
