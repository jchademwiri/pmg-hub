'use client'

import * as React from 'react'
import { Download, FileText, Scale, TrendingUp, BookOpen, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fmtMonthYear } from '@/lib/format'
import type { ChartAccount } from '@pmg/db'

interface ExportsClientProps {
  periods: string[]
  accounts: ChartAccount[]
  selectedPeriod: string
}

const EXPORT_TYPES = [
  {
    id: 'chart-of-accounts',
    label: 'Chart of Accounts',
    description: 'Complete list of all account categories and codes',
    icon: BookOpen,
    needsPeriod: false,
    needsAccount: false,
  },
  {
    id: 'journal-entries',
    label: 'Journal Entries',
    description: 'All journal entries with debits, credits, and descriptions',
    icon: FileText,
    needsPeriod: true,
    needsAccount: false,
  },
  {
    id: 'general-ledger',
    label: 'General Ledger',
    description: 'Detailed transaction lines organised by date and account',
    icon: Table2,
    needsPeriod: false,
    needsAccount: true,
  },
  {
    id: 'trial-balance',
    label: 'Trial Balance',
    description: 'Account balances summary showing debits vs credits',
    icon: Scale,
    needsPeriod: true,
    needsAccount: false,
  },
  {
    id: 'profit-and-loss',
    label: 'Profit & Loss',
    description: 'Revenue and expenses with net profit calculation',
    icon: TrendingUp,
    needsPeriod: true,
    needsAccount: false,
  },
]

export function ExportsClient({ periods, accounts, selectedPeriod }: ExportsClientProps) {
  const [selectedExport, setSelectedExport] = React.useState<string>('')
  const [period, setPeriod] = React.useState(selectedPeriod || 'all')
  const [accountId, setAccountId] = React.useState('all')

  const exportConfig = EXPORT_TYPES.find((e) => e.id === selectedExport)

  function handleExport() {
    if (!selectedExport) return

    const params = new URLSearchParams()
    if (exportConfig?.needsPeriod && period !== 'all') params.set('period', period)
    if (exportConfig?.needsAccount && accountId !== 'all') params.set('accountId', accountId)

    // Build export URL — in a real implementation, this would trigger a download
    const url = `/api/accounting/export/${selectedExport}?${params.toString()}`
    window.open(url, '_blank')
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Export Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {EXPORT_TYPES.map((exportType) => {
          const Icon = exportType.icon
          const isSelected = selectedExport === exportType.id
          return (
            <button
              key={exportType.id}
              onClick={() => setSelectedExport(exportType.id)}
              className={`group flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'bg-card hover:bg-muted/30 hover:border-muted-foreground/20'
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isSelected ? 'bg-primary/10' : 'bg-muted'
              }`}>
                <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>
                  {exportType.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {exportType.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters & Export Button */}
      {selectedExport && exportConfig && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-end gap-4">
            {/* Period Filter */}
            {exportConfig.needsPeriod && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Period</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    {periods.map((p) => (
                      <SelectItem key={p} value={p}>{fmtMonthYear(p)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Account Filter */}
            {exportConfig.needsAccount && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Account</label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.code} — {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex-1" />

            <Button onClick={handleExport} size="sm">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>

          {/* Export Summary */}
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            {exportConfig.needsPeriod && period !== 'all' && (
              <span>Period: {fmtMonthYear(period)} · </span>
            )}
            {exportConfig.needsPeriod && period === 'all' && (
              <span>Period: All Time · </span>
            )}
            {exportConfig.needsAccount && accountId !== 'all' && (
              <span>Account: {accounts.find((a) => a.id === accountId)?.name ?? '—'} · </span>
            )}
            {exportConfig.needsAccount && accountId === 'all' && (
              <span>Account: All Accounts · </span>
            )}
            Format: CSV (opens in Excel, Google Sheets, Numbers)
          </div>
        </div>
      )}

      {/* Help Text */}
      {!selectedExport && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Select an export type above to preview and download your accounting data.
            All exports are in CSV format and can be opened in Excel, Google Sheets, or any spreadsheet application.
          </p>
        </div>
      )}
    </div>
  )
}
