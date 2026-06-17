'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountCard } from '@/components/accounts/account-card'
import { LedgerTable } from '@/components/ledger/ledger-table'
import { LedgerAddForm } from '@/components/ledger/ledger-add-form'
import { EmptyState } from '@/components/ui/empty-state'
import { formatZAR } from '@/lib/format'
import type { LedgerEntry } from '@/components/ledger/ledger-table'

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
  }
  activeTab?: string
  recordAction: (formData: FormData) => Promise<{ error?: string }>
  createLedgerAction: (formData: FormData) => Promise<{ error?: string }>
  updateLedgerAction: (id: string, formData: FormData) => Promise<{ error?: string }>
  deleteLedgerAction: (id: string) => Promise<{ error?: string }>
}

// ── Component ────────────────────────────────────────────────────────────────

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
            PMG Share is allocated at 25% of gross revenue. This is automatically calculated from your income.
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
          <p className="text-sm text-muted-foreground">
            Distribution rules define how revenue and profit are allocated across categories.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PMG Share */}
            <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
              <h3 className="text-sm font-semibold">PMG Share</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums">
                  {(rules.pmgShare * 100).toFixed(0)}%
                </span>
                <span className="text-sm text-muted-foreground">of gross revenue</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Allocated directly from total revenue before profit pool calculation.
              </p>
            </div>

            {/* Profit Pool */}
            <div className="rounded-xl border bg-card p-5 flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Profit Pool Split</h3>
              <p className="text-xs text-muted-foreground mb-2">
                After PMG Share and expenses, the remaining profit pool is split:
              </p>
              <div className="flex flex-col gap-2">
                {Object.entries(rules.profitPoolRates).map(([key, rate]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {key === 'salary' ? 'Owner Drawings' : key === 'reinvest' ? 'Reinvestment' : key}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {(rate * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Calculation example */}
          <div className="rounded-xl border bg-muted/30 p-5">
            <h3 className="text-sm font-semibold mb-3">How It Works</h3>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>
                <strong>1.</strong> Total revenue is collected from all income entries.
              </p>
              <p>
                <strong>2.</strong> PMG Share (25%) is allocated from gross revenue.
              </p>
              <p>
                <strong>3.</strong> Business expenses are subtracted.
              </p>
              <p>
                <strong>4.</strong> The remaining amount is the Profit Pool.
              </p>
              <p>
                <strong>5.</strong> Profit Pool is split across Owner Drawings (35%), Reinvestment (30%), Reserve (30%), and Flex (5%).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
