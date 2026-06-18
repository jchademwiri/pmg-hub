'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Check, X, BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import type { ChartAccount } from '@pmg/db'

// ── Types ────────────────────────────────────────────────────────────────────

type FilterValue = 'all' | 'active' | 'inactive'

interface ChartOfAccountsClientProps {
  accountsByType: Record<string, ChartAccount[]>
  createAction: (formData: FormData) => Promise<{ error?: string; accountId?: string }>
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  asset: 'Resources owned by the business (bank, receivables, equipment)',
  liability: 'Obligations owed by the business (payables, loans)',
  equity: 'Owner\'s claim on business assets (capital, retained earnings)',
  revenue: 'Income earned from business operations',
  expense: 'Costs incurred to generate revenue',
}

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense']

// ── Account Form ─────────────────────────────────────────────────────────────

function AccountForm({
  type,
  onSuccess,
  onCancel,
  createAction,
}: {
  type: string
  onSuccess: () => void
  onCancel: () => void
  createAction: (formData: FormData) => Promise<{ error?: string; accountId?: string }>
}) {
  const [saving, setSaving] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('type', type)
      const result = await createAction(formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Account created')
        onSuccess()
      }
    } catch {
      toast.error('Failed to create account')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Account Code</label>
          <input
            name="code"
            type="text"
            placeholder="Auto-generated"
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">Account Name *</label>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Main Bank Account"
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Description</label>
        <input
          name="description"
          type="text"
          placeholder="Optional description"
          className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {saving ? 'Creating...' : 'Create Account'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ── Account Row ──────────────────────────────────────────────────────────────

function AccountRow({
  account,
  updateAction,
}: {
  account: ChartAccount
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
}) {
  const [editing, setEditing] = React.useState(false)
  const [active, setActive] = React.useState(account.isActive)
  const router = useRouter()

  async function handleToggle(checked: boolean) {
    const formData = new FormData()
    formData.set('isActive', checked ? 'on' : 'off')
    const result = await updateAction(account.id, formData)
    if (result.error) {
      toast.error(result.error)
    } else {
      setActive(checked)
      toast.success(checked ? 'Account activated' : 'Account deactivated')
      router.refresh()
    }
  }

  if (editing) {
    return (
      <EditRow
        account={account}
        updateAction={updateAction}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false)
          router.refresh()
        }}
      />
    )
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b last:border-b-0 transition-colors ${
      active ? 'hover:bg-muted/30' : 'bg-muted/20 opacity-60'
    }`}>
      <span className={`text-xs font-mono w-16 shrink-0 ${active ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}>{account.code}</span>
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${!active ? 'line-through decoration-muted-foreground/40' : ''}`}>{account.name}</span>
        {account.description && (
          <span className="text-xs text-muted-foreground ml-2 truncate">— {account.description}</span>
        )}
      </div>
      {!account.isPostingAccount && (
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Header</span>
      )}
      {!active && (
        <span className="text-xs text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded font-medium">Inactive</span>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setEditing(true)}
        className="shrink-0"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Switch
        size="sm"
        checked={active}
        onCheckedChange={handleToggle}
        aria-label={`Toggle ${account.name} active status`}
      />
    </div>
  )
}

// ── Edit Row ─────────────────────────────────────────────────────────────────

function EditRow({
  account,
  updateAction,
  onCancel,
  onSaved,
}: {
  account: ChartAccount
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
  onCancel: () => void
  onSaved: () => void
}) {
  const [saving, setSaving] = React.useState(false)
  const [name, setName] = React.useState(account.name)
  const [description, setDescription] = React.useState(account.description ?? '')

  async function handleSave() {
    setSaving(true)
    const formData = new FormData()
    formData.set('name', name)
    formData.set('description', description)
    const result = await updateAction(account.id, formData)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Account updated')
      onSaved()
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
      <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{account.code}</span>
      <div className="flex-1 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="h-8 rounded-md border bg-background px-2 text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving}>
        <Check className="h-3.5 w-3.5 mr-1" />
        {saving ? 'Saving...' : 'Save'}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}

// ── Type Section ─────────────────────────────────────────────────────────────

function TypeSection({
  type,
  accounts,
  createAction,
  updateAction,
}: {
  type: string
  accounts: ChartAccount[]
  createAction: (formData: FormData) => Promise<{ error?: string; accountId?: string }>
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
}) {
  const [expanded, setExpanded] = React.useState(true)
  const [adding, setAdding] = React.useState(false)
  const router = useRouter()

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">{TYPE_LABELS[type]}</h3>
          <p className="text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[type]}</p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
          {accounts.length} account{accounts.length !== 1 ? 's' : ''}
        </span>
      </button>

      {expanded && (
        <div className="border-t">
          {accounts.length === 0 && !adding ? (
            <div className="px-5 py-4 text-xs text-muted-foreground">
              No accounts in this category yet.
            </div>
          ) : (
            <div>
              {accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  updateAction={updateAction}
                />
              ))}
            </div>
          )}

          {adding ? (
            <div className="px-4 py-3 border-t">
              <AccountForm
                type={type}
                createAction={createAction}
                onCancel={() => setAdding(false)}
                onSuccess={() => {
                  setAdding(false)
                  router.refresh()
                }}
              />
            </div>
          ) : (
            <div className="px-4 py-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdding(true)}
                className="text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add {TYPE_LABELS[type]?.replace(/s$/, '')} Account
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
]

function filterAccounts(accounts: ChartAccount[], filter: FilterValue): ChartAccount[] {
  if (filter === 'active') return accounts.filter((a) => a.isActive)
  if (filter === 'inactive') return accounts.filter((a) => !a.isActive)
  return accounts
}

export function ChartOfAccountsClient({
  accountsByType,
  createAction,
  updateAction,
}: ChartOfAccountsClientProps) {
  const [filter, setFilter] = React.useState<FilterValue>('all')

  // Filter accounts within each type
  const filteredByType = React.useMemo(() => {
    const result: Record<string, ChartAccount[]> = {}
    for (const type of TYPE_ORDER) {
      result[type] = filterAccounts(accountsByType[type] || [], filter)
    }
    return result
  }, [accountsByType, filter])

  const totalAll = Object.values(accountsByType).reduce((s, a) => s + a.length, 0)
  const totalActive = Object.values(accountsByType).reduce((s, a) => s + a.filter((x) => x.isActive).length, 0)
  const totalInactive = totalAll - totalActive
  const hasAccounts = totalAll > 0

  if (!hasAccounts) {
    return (
      <EmptyState message="No accounts configured yet. Add your first account to get started." />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {filter === 'all' && `${totalActive} active, ${totalInactive} inactive`}
          {filter === 'active' && `${totalActive} active accounts`}
          {filter === 'inactive' && `${totalInactive} inactive accounts`}
        </span>
      </div>

      {TYPE_ORDER.map((type) => {
        const filtered = filteredByType[type] || []
        // Hide type sections with no accounts when a filter is active
        if (filter !== 'all' && filtered.length === 0) return null
        return (
          <TypeSection
            key={type}
            type={type}
            accounts={filtered}
            createAction={createAction}
            updateAction={updateAction}
          />
        )
      })}
    </div>
  )
}
