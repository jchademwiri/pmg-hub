'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { closeMonth, runPreCloseChecks } from '@/app/actions/snapshots'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatZAR } from '@/lib/format'
import {
  Calculator,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Lock,
} from 'lucide-react'

interface PreCloseChecks {
  uncategorizedExpenses: number
  draftInvoices: number
  incomeTotal: number
  expenseTotal: number
}

interface CloseMonthWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  period: string
  summary: {
    revenue: number
    expenses: number
    pmgShare: number
    profitPool: number
    salary: number
    reinvest: number
    reserve: number
    flex: number
  }
}

const STEPS = [
  { label: 'Summary', icon: Calculator },
  { label: 'Checks', icon: ShieldCheck },
  { label: 'Confirm', icon: Lock },
]

export function CloseMonthWizard({
  open,
  onOpenChange,
  period,
  summary,
}: CloseMonthWizardProps) {
  const [step, setStep] = useState(0)
  const [checks, setChecks] = useState<PreCloseChecks | null>(null)
  const [checksLoading, setChecksLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const hasWarnings = checks
    ? checks.uncategorizedExpenses > 0 || checks.draftInvoices > 0
    : false

  const isProfitable = summary.profitPool > 0

  // Load integrity checks when entering step 1
  const handleNext = () => {
    if (step === 0 && !checks) {
      setChecksLoading(true)
      runPreCloseChecks(period)
        .then(setChecks)
        .finally(() => setChecksLoading(false))
    }
    setStep((s) => Math.min(s + 1, 2))
  }

  const handleBack = () => setStep((s) => Math.max(s - 1, 0))

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeMonth(period, { notes: notes || undefined })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`Period ${period} has been locked`)
        onOpenChange(false)
        setStep(0)
        setChecks(null)
        setNotes('')
        router.refresh()
      }
    })
  }

  const handleReset = () => {
    onOpenChange(false)
    setStep(0)
    setChecks(null)
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={handleReset}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="size-4 text-blue-600" />
            Close Month — {period}
          </DialogTitle>
          <DialogDescription>
            Lock this period to create a permanent financial snapshot.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={s.label} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'flex items-center justify-center size-7 rounded-full text-xs font-bold shrink-0 transition-colors',
                    isDone
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isDone ? <CheckCircle2 className="size-3.5" /> : <Icon className="size-3.5" />}
                </div>
                <span className={cn('text-xs font-medium', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn('flex-1 h-px', isDone ? 'bg-emerald-300' : 'bg-border')} />
                )}
              </div>
            )
          })}
        </div>

        {/* Step content */}
        <div className="min-h-[200px]">
          {step === 0 && (
            <StepSummary summary={summary} isProfitable={isProfitable} period={period} />
          )}
          {step === 1 && (
            <StepChecks checks={checks} loading={checksLoading} hasWarnings={hasWarnings} />
          )}
          {step === 2 && (
            <StepConfirm
              summary={summary}
              isProfitable={isProfitable}
              notes={notes}
              onNotesChange={setNotes}
              hasWarnings={hasWarnings}
            />
          )}
        </div>

        <DialogFooter>
          {step > 0 && (
            <Button variant="ghost" onClick={handleBack} disabled={isPending}>
              <ArrowLeft className="size-3.5 mr-1" />
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={handleNext} disabled={checksLoading || isPending}>
              {checksLoading ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <ArrowRight className="size-3.5 mr-1" />
              )}
              {checksLoading ? 'Checking…' : 'Next'}
            </Button>
          ) : (
            <Button onClick={handleClose} disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
              {isPending ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <Lock className="size-3.5 mr-1" />
              )}
              {isPending ? 'Locking…' : 'Lock Period'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Step 1: Summary ──────────────────────────────────────────────────────────

function StepSummary({
  summary,
  isProfitable,
  period,
}: {
  summary: CloseMonthWizardProps['summary']
  isProfitable: boolean
  period: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Financial summary for <span className="font-semibold text-foreground">{period}</span>:
      </p>

      <div className="grid grid-cols-2 gap-3">
        <SummaryRow label="Gross Revenue" value={summary.revenue} color="text-emerald-600" />
        <SummaryRow label="Operating Expenses" value={summary.expenses} color="text-amber-600" />
        <SummaryRow label="PMG Share (25%)" value={summary.pmgShare} color="text-blue-600" />
        <SummaryRow
          label={isProfitable ? 'Profit Pool' : 'Net Loss'}
          value={summary.profitPool}
          color={isProfitable ? 'text-emerald-600' : 'text-red-600'}
        />
      </div>

      <div className="border-t border-border/50 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Level 2 — Profit Pool Allocation
        </p>
        <div className="grid grid-cols-4 gap-2">
          <AllocationMini label="Salary" value={summary.salary} color="text-violet-600" />
          <AllocationMini label="Reinvest" value={summary.reinvest} color="text-cyan-600" />
          <AllocationMini label="Reserve" value={summary.reserve} color="text-sky-600" />
          <AllocationMini label="Flex" value={summary.flex} color="text-rose-500" />
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-xs text-blue-700 dark:text-blue-300">
        <strong>What happens:</strong> A permanent snapshot of these figures will be created. This period
        cannot be modified after locking.
      </div>
    </div>
  )
}

function SummaryRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-bold tabular-nums', color)}>{formatZAR(value)}</span>
    </div>
  )
}

function AllocationMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-0.5 text-center">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-semibold tabular-nums', color)}>{formatZAR(value)}</span>
    </div>
  )
}

// ── Step 2: Integrity Checks ─────────────────────────────────────────────────

function StepChecks({
  checks,
  loading,
  hasWarnings,
}: {
  checks: PreCloseChecks | null
  loading: boolean
  hasWarnings: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Running integrity checks…</span>
      </div>
    )
  }

  if (!checks) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Failed to load checks.
      </div>
    )
  }

  const checksList = [
    {
      label: 'Uncategorized expenses',
      detail: checks.uncategorizedExpenses > 0
        ? `${checks.uncategorizedExpenses} expense(s) have no category`
        : 'All expenses are categorized',
      passed: checks.uncategorizedExpenses === 0,
    },
    {
      label: 'Draft invoices',
      detail: checks.draftInvoices > 0
        ? `${checks.draftInvoices} invoice(s) still in draft status`
        : 'No draft invoices',
      passed: checks.draftInvoices === 0,
    },
    {
      label: 'Period has data',
      detail: `R${(checks.incomeTotal + checks.expenseTotal).toLocaleString()} total activity`,
      passed: checks.incomeTotal > 0 || checks.expenseTotal > 0,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Pre-close integrity checks for this period:
      </p>

      <div className="flex flex-col gap-2">
        {checksList.map((check) => (
          <div
            key={check.label}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3',
              check.passed
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10'
                : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10'
            )}
          >
            {check.passed ? (
              <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">{check.label}</span>
              <span className="text-[11px] text-muted-foreground">{check.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {hasWarnings && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-700 dark:text-amber-300">
          <strong>Warning:</strong> Some checks have warnings. You can still lock the period, but
          consider resolving these issues first.
        </div>
      )}
    </div>
  )
}

// ── Step 3: Confirm ──────────────────────────────────────────────────────────

function StepConfirm({
  summary,
  isProfitable,
  notes,
  onNotesChange,
  hasWarnings,
}: {
  summary: CloseMonthWizardProps['summary']
  isProfitable: boolean
  notes: string
  onNotesChange: (n: string) => void
  hasWarnings: boolean
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className={cn(
        'flex items-center gap-3 rounded-lg border p-3',
        hasWarnings
          ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10'
          : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10'
      )}>
        {hasWarnings ? (
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
        ) : (
          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
        )}
        <span className="text-xs font-medium text-foreground">
          {hasWarnings
            ? 'Proceeding with warnings — some issues may need follow-up'
            : 'All checks passed — ready to lock'}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes" className="text-xs font-medium">
          Notes (optional)
        </Label>
        <Textarea
          id="notes"
          placeholder="Add any notes about this period before locking…"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          className="text-sm resize-none"
        />
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <strong>Summary:</strong> Revenue {formatZAR(summary.revenue)}, Expenses{' '}
        {formatZAR(summary.expenses)}, {isProfitable ? 'Profit' : 'Loss'}{' '}
        {formatZAR(Math.abs(summary.profitPool))}
        {isProfitable ? '' : ' (CR)'}
      </div>
    </div>
  )
}
