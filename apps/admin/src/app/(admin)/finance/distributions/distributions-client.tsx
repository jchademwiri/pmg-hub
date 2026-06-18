'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Plus, Pencil, Calendar, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountCard } from '@/components/accounts/account-card'
import { LedgerTable } from '@/components/ledger/ledger-table'
import { LedgerAddForm } from '@/components/ledger/ledger-add-form'
import { EmptyState } from '@/components/ui/empty-state'
import { formatZAR } from '@/lib/format'
import { updateDistributionRate } from '@/app/actions/distribution-settings'
import { toast } from 'sonner'
import type { LedgerEntry } from '@/components/ledger/ledger-table'
import type { DistributionSettingRow } from '@/app/actions/distribution-settings'

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'pmg-share', label: 'PMG Share' },
  { key: 'owner-drawings', label: 'Owner Drawings' },
  { key: 'reinvestment', label: 'Reinvestment' },
  { key: 'activity', label: 'Activity' },
  { key: 'rules', label: 'Rules' },
] as const

type TabKey = (typeof TABS)[number]['key']

// ── Types ────────────────────────────────────────────────────────────────────

type DistributionBucket = {
  key: string
  label: string
  earned: number
  withdrawn: number
  balance: number
  historyCount: number
  withdrawalLocked: boolean
}

interface DistributionsClientProps {
  buckets: DistributionBucket[]
  ledgerEntries: LedgerEntry[]
  ledgerTotal: number
  ledgerSum: number
  currentPage: number
  pageSize: number
  minDate: string
  closedPeriods: string[]
  rules: {
    pmgShare: number
    profitPoolRates: Record<string, number>
    currentRates: { rateKey: string; rateValue: number; effectiveFrom: string; description: string | null }[]
  }
  settingsHistory: DistributionSettingRow[]
  activeTab?: string
  recordAction: (formData: FormData) => Promise<{ error?: string }>
  createLedgerAction: (formData: FormData) => Promise<{ error?: string }>
  updateLedgerAction: (id: string, formData: FormData) => Promise<{ error?: string }>
  deleteLedgerAction: (id: string) => Promise<{ error?: string }>
}

// ── Rate editor sub-component ─────────────────────────────────────────────────

const RATE_LABELS: Record<string, string> = {
  pmg_share: 'PMG Share',
  salary: 'Owner Drawings',
  reinvest: 'Reinvestment',
  reserve: 'Reserve',
  flex: 'Flex',
}

const RATE_DESCRIPTIONS: Record<string, string> = {
  pmg_share: 'Allocated directly from gross revenue before profit pool calculation.',
  salary: 'Portion of the profit pool allocated to owner drawings.',
  reinvest: 'Portion of the profit pool kept for business growth.',
  reserve: 'Portion of the profit pool held in reserve.',
  flex: 'Flexible portion of the profit pool for ad-hoc needs.',
}

const RATE_BASE: Record<string, string> = {
  pmg_share: 'of gross revenue',
  salary: 'of profit pool',
  reinvest: 'of profit pool',
  reserve: 'of profit pool',
  flex: 'of profit pool',
}

function RateEditor({
  rateKey,
  currentRate,
  settingsHistory,
  onSave,
}: {
  rateKey: string
  currentRate: number
  settingsHistory: DistributionSettingRow[]
  onSave: (rateKey: string, rateValue: number, effectiveFrom: string, description: string) => Promise<void>
}) {
  const [editing, setEditing] = React.useState(false)
  const [value, setValue] = React.useState((currentRate * 100).toFixed(1))
  const [effectiveFrom, setEffectiveFrom] = React.useState(
    new Date().toISOString().slice(0, 10)
  )
  const [description, setDescription] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const history = settingsHistory
    .filter((s) => s.rateKey === rateKey)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))

  function handleCancel() {
    setEditing(false)
    setValue((currentRate * 100).toFixed(1))
    setEffectiveFrom(new Date().toISOString().slice(0, 10))
    setDescription('')
  }

  async function handleSave() {
    const numValue = parseFloat(value) / 100
    if (isNaN(numValue) || numValue < 0 || numValue > 1) {
      toast.error('Rate must be between 0% and 100%')
      return
    }
    setSaving(true)
    try {
      await onSave(rateKey, numValue, effectiveFrom, description || `Updated to ${value}%`)
      setEditing(false)
      toast.success(`${RATE_LABELS[rateKey]} rate updated`)
    } catch {
      toast.error('Failed to update rate')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">{RATE_LABELS[rateKey]}</h3>
          <span className="text-xs text-muted-foreground">{RATE_DESCRIPTIONS[rateKey]}</span>
        </div>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="shrink-0"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rate (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                <Calendar className="inline h-3 w-3 mr-1" />
                Effective From
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`Why is this rate being changed?`}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              {saving ? 'Saving...' : 'Save Rate'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            The new rate takes effect from the date above. Previous rates are preserved for historical accuracy.
          </p>
        </div>
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {(currentRate * 100).toFixed(1)}%
          </span>
          <span className="text-sm text-muted-foreground">{RATE_BASE[rateKey]}</span>
        </div>
      )}

      {/* Rate history */}
      {history.length > 0 && (
        <div className="border-t pt-3 mt-1">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Rate History</h4>
          <div className="flex flex-col gap-1.5">
            {history.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${entry.isActive ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
                  <span className="font-medium tabular-nums">{(entry.rateValue * 100).toFixed(1)}%</span>
                  {entry.description && (
                    <span className="text-muted-foreground truncate max-w-[200px]">— {entry.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>From {entry.effectiveFrom}</span>
                  {entry.effectiveTo && <span>to {entry.effectiveTo}</span>}
                  {entry.isActive && <span className="text-green-600 font-medium">Active</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function DistributionsClient({
  buckets,
  ledgerEntries,
  ledgerTotal,
  ledgerSum,
  currentPage,
  pageSize,
  minDate,
  closedPeriods,
  rules,
  settingsHistory,
  activeTab: initialTab,
  recordAction,
  createLedgerAction,
  updateLedgerAction,
  deleteLedgerAction,
}: DistributionsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = React.useState<TabKey>(
    (initialTab as TabKey) || 'overview'
  )
  const [isAdding, setIsAdding] = React.useState(false)

  function switchTab(tab: TabKey) {
    setActiveTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  async function handleRateSave(rateKey: string, rateValue: number, effectiveFrom: string, description: string) {
    const formData = new FormData()
    formData.set('rateKey', rateKey)
    formData.set('rateValue', String(rateValue))
    formData.set('effectiveFrom', effectiveFrom)
    formData.set('description', description)

    const result = await updateDistributionRate(formData)
    if (result.error) {
      throw new Error(result.error)
    }
    // Refresh the page data
    router.refresh()
  }

  // Bucket lookup
  const pmgShareBucket = buckets.find((b) => b.key === 'pmg_share')
  const salaryBucket = buckets.find((b) => b.key === 'salary')
  const reinvestBucket = buckets.find((b) => b.key === 'reinvest')
  const reserveBucket = buckets.find((b) => b.key === 'reserve')
  const flexBucket = buckets.find((b) => b.key === 'flex')

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {buckets.map((bucket) => (
              <AccountCard
                key={bucket.key}
                accountKey={bucket.key}
                label={bucket.label}
                earned={bucket.earned}
                withdrawn={bucket.withdrawn}
                balance={bucket.balance}
                historyCount={bucket.historyCount}
                recordAction={recordAction}
                withdrawalLocked={bucket.withdrawalLocked}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'pmg-share' && pmgShareBucket && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            PMG Share is allocated at {(rules.pmgShare * 100).toFixed(1)}% of gross revenue. This is automatically calculated from your income.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <AccountCard
              accountKey={pmgShareBucket.key}
              label={pmgShareBucket.label}
              earned={pmgShareBucket.earned}
              withdrawn={pmgShareBucket.withdrawn}
              balance={pmgShareBucket.balance}
              historyCount={pmgShareBucket.historyCount}
              recordAction={recordAction}
              withdrawalLocked={pmgShareBucket.withdrawalLocked}
            />
          </div>
        </div>
      )}

      {activeTab === 'owner-drawings' && salaryBucket && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            Owner Drawings represent money taken personally by the owner. This is allocated from the profit pool.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <AccountCard
              accountKey={salaryBucket.key}
              label={salaryBucket.label}
              earned={salaryBucket.earned}
              withdrawn={salaryBucket.withdrawn}
              balance={salaryBucket.balance}
              historyCount={salaryBucket.historyCount}
              recordAction={recordAction}
              withdrawalLocked={salaryBucket.withdrawalLocked}
            />
          </div>
        </div>
      )}

      {activeTab === 'reinvestment' && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            Reinvestment covers money kept for business growth, tools, development, marketing, and systems.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {reinvestBucket && (
              <AccountCard
                accountKey={reinvestBucket.key}
                label={reinvestBucket.label}
                earned={reinvestBucket.earned}
                withdrawn={reinvestBucket.withdrawn}
                balance={reinvestBucket.balance}
                historyCount={reinvestBucket.historyCount}
                recordAction={recordAction}
                withdrawalLocked={reinvestBucket.withdrawalLocked}
              />
            )}
            {reserveBucket && (
              <AccountCard
                accountKey={reserveBucket.key}
                label={reserveBucket.label}
                earned={reserveBucket.earned}
                withdrawn={reserveBucket.withdrawn}
                balance={reserveBucket.balance}
                historyCount={reserveBucket.historyCount}
                recordAction={recordAction}
                withdrawalLocked={reserveBucket.withdrawalLocked}
              />
            )}
            {flexBucket && (
              <AccountCard
                accountKey={flexBucket.key}
                label={flexBucket.label}
                earned={flexBucket.earned}
                withdrawn={flexBucket.withdrawn}
                balance={flexBucket.balance}
                historyCount={flexBucket.historyCount}
                recordAction={recordAction}
                withdrawalLocked={flexBucket.withdrawalLocked}
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Distribution Activity</h3>
              <p className="text-xs text-muted-foreground">
                All ledger entries across distribution buckets
              </p>
            </div>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Add Entry
            </Button>
          </div>

          {isAdding && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-foreground">Add Distribution Entry</h3>
                <p className="text-xs text-muted-foreground">
                  Record bucket spends, transfers, or balance adjustments
                </p>
              </div>
              <LedgerAddForm
                createAction={createLedgerAction}
                minDate={minDate}
                onCancel={() => setIsAdding(false)}
              />
            </div>
          )}

          {ledgerEntries.length === 0 && !isAdding ? (
            <EmptyState message="No distribution entries yet." />
          ) : (
            <>
              <LedgerTable
                entries={ledgerEntries}
                deleteAction={deleteLedgerAction}
                updateAction={updateLedgerAction}
                closedPeriods={closedPeriods}
              />

              {ledgerTotal > pageSize && (
                <div className="flex justify-between items-center px-2 py-4">
                  <span className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to{' '}
                    {Math.min(currentPage * pageSize, ledgerTotal)} of {ledgerTotal} entries
                  </span>
                  <div className="flex gap-2">
                    {currentPage > 1 && (
                      <a
                        href={`?tab=activity&page=${currentPage - 1}`}
                        className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                      >
                        Previous
                      </a>
                    )}
                    {currentPage * pageSize < ledgerTotal && (
                      <a
                        href={`?tab=activity&page=${currentPage + 1}`}
                        className="px-3 py-1 text-sm border rounded-md hover:bg-muted transition-colors"
                      >
                        Next
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">Distribution Rules</h3>
            <p className="text-xs text-muted-foreground">
              Configure how revenue and profit are allocated across categories. Changes take effect from the specified date.
            </p>
          </div>

          {/* PMG Share — revenue-based rate */}
          <RateEditor
            rateKey="pmg_share"
            currentRate={rules.pmgShare}
            settingsHistory={settingsHistory}
            onSave={handleRateSave}
          />

          {/* Profit Pool rates */}
          <div className="rounded-xl border bg-card p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">Profit Pool Split</h3>
              <p className="text-xs text-muted-foreground">
                After PMG Share and expenses, the remaining profit pool is split across these categories.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(rules.profitPoolRates).map(([key, rate]) => (
                <RateEditor
                  key={key}
                  rateKey={key}
                  currentRate={rate}
                  settingsHistory={settingsHistory}
                  onSave={handleRateSave}
                />
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="rounded-xl border bg-muted/30 p-5">
            <h3 className="text-sm font-semibold mb-3">How It Works</h3>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                <strong>1.</strong> Total revenue is collected from all income entries.
              </p>
              <p>
                <strong>2.</strong> PMG Share ({(rules.pmgShare * 100).toFixed(1)}%) is allocated from gross revenue.
              </p>
              <p>
                <strong>3.</strong> Business expenses are subtracted.
              </p>
              <p>
                <strong>4.</strong> The remaining amount is the Profit Pool.
              </p>
              <p>
                <strong>5.</strong> Profit Pool is split across Owner Drawings ({(rules.profitPoolRates.salary * 100).toFixed(1)}%), Reinvestment ({(rules.profitPoolRates.reinvest * 100).toFixed(1)}%), Reserve ({(rules.profitPoolRates.reserve * 100).toFixed(1)}%), and Flex ({(rules.profitPoolRates.flex * 100).toFixed(1)}%).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
