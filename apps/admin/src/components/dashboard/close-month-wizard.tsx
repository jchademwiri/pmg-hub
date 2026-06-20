'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { closeMonth, runPreCloseChecks } from '@/app/actions/snapshots'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { fmtMonthYear, formatZAR } from '@/lib/format'

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

type AmountTone = 'default' | 'revenue' | 'expense' | 'positive' | 'negative' | 'share' | 'allocation'

function amountToneClass(tone: AmountTone) {
  return cn(
    tone === 'revenue' && 'text-emerald-600',
    tone === 'expense' && 'text-destructive',
    tone === 'positive' && 'text-emerald-600',
    tone === 'negative' && 'text-destructive',
    tone === 'share' && 'text-[color:var(--chart-3)]',
    tone === 'allocation' && 'text-[color:var(--chart-4)]',
  )
}

export function CloseMonthWizard({
  open,
  onOpenChange,
  period,
  summary,
}: CloseMonthWizardProps) {
  const [step, setStep] = useState<0 | 1>(0)
  const [checks, setChecks] = useState<PreCloseChecks | null>(null)
  const [checksLoading, setChecksLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const periodLabel = fmtMonthYear(period)
  const isProfitable = summary.profitPool >= 0

  const hasWarnings = checks
    ? checks.uncategorizedExpenses > 0 || checks.draftInvoices > 0 || (checks.incomeTotal === 0 && checks.expenseTotal === 0)
    : false

  const loadChecks = async () => {
    if (checks) {
      setStep(1)
      return
    }

    setChecksLoading(true)
    try {
      const result = await runPreCloseChecks(period)
      setChecks(result)
      setStep(1)
    } finally {
      setChecksLoading(false)
    }
  }

  const handleClose = () => {
    startTransition(async () => {
      const result = await closeMonth(period, { notes: notes || undefined })
      if ('error' in result) {
        toast.error(result.error)
        return
      }

      toast.success(`${periodLabel} has been closed`)
      resetWizard(false)
      router.refresh()
    })
  }

  const resetWizard = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    setStep(0)
    setChecks(null)
    setNotes('')
    setChecksLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={resetWizard}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            <DialogTitle>Close {periodLabel}</DialogTitle>
          </div>
          <DialogDescription>
            This will lock {periodLabel} and create a permanent monthly financial snapshot.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-sm">
          <StepBadge active={step === 0} done={step > 0} label="Review figures" />
          <div className="h-px flex-1 bg-border" />
          <StepBadge active={step === 1} label="Checks & confirm" />
        </div>

        {step === 0 ? (
          <ReviewFigures summary={summary} isProfitable={isProfitable} periodLabel={periodLabel} />
        ) : (
          <ChecksAndConfirm
            checks={checks}
            hasWarnings={hasWarnings}
            notes={notes}
            onNotesChange={setNotes}
            periodLabel={periodLabel}
          />
        )}

        <DialogFooter>
          {step === 1 && (
            <Button variant="ghost" onClick={() => setStep(0)} disabled={isPending}>
              <ArrowLeft data-icon="inline-start" />
              Back
            </Button>
          )}
          {step === 0 ? (
            <Button onClick={loadChecks} disabled={checksLoading || isPending}>
              {checksLoading ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <ArrowRight data-icon="inline-start" />
              )}
              {checksLoading ? 'Checking' : 'Continue'}
            </Button>
          ) : (
            <Button onClick={handleClose} disabled={isPending}>
              {isPending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Lock data-icon="inline-start" />
              )}
              {isPending ? 'Closing' : `Close ${periodLabel}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StepBadge({ active, done, label }: { active: boolean; done?: boolean; label: string }) {
  return (
    <Badge variant={active || done ? 'secondary' : 'outline'} className="rounded-md">
      {done && <CheckCircle2 data-icon="inline-start" />}
      {label}
    </Badge>
  )
}

function ReviewFigures({
  summary,
  isProfitable,
  periodLabel,
}: {
  summary: CloseMonthWizardProps['summary']
  isProfitable: boolean
  periodLabel: string
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FigureTile label="Revenue" value={summary.revenue} tone="revenue" />
        <FigureTile label="Expenses" value={summary.expenses} tone="expense" />
        <FigureTile label="PMG Share" value={summary.pmgShare} tone="share" />
        <FigureTile
          label={isProfitable ? 'Profit Pool' : 'Net Loss'}
          value={summary.profitPool}
          tone={isProfitable ? 'positive' : 'negative'}
        />
      </div>

      <div className="rounded-md border border-border p-3">
        <p className="mb-3 text-sm font-medium">Profit pool allocation</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FigureTile label="Salary" value={summary.salary} tone="allocation" compact />
          <FigureTile label="Reinvest" value={summary.reinvest} tone="allocation" compact />
          <FigureTile label="Reserve" value={summary.reserve} tone="allocation" compact />
          <FigureTile label="Flex" value={summary.flex} tone="allocation" compact />
        </div>
      </div>

      <Alert>
        <Lock className="size-4" />
        <AlertTitle>This creates the locked record for {periodLabel}</AlertTitle>
        <AlertDescription>
          After closing, entries dated in this period are treated as closed by the finance workflow.
        </AlertDescription>
      </Alert>
    </div>
  )
}

function ChecksAndConfirm({
  checks,
  hasWarnings,
  notes,
  onNotesChange,
  periodLabel,
}: {
  checks: PreCloseChecks | null
  hasWarnings: boolean
  notes: string
  onNotesChange: (value: string) => void
  periodLabel: string
}) {
  const checkItems = checks
    ? [
        {
          label: 'Expenses are categorized',
          detail: checks.uncategorizedExpenses > 0
            ? `${checks.uncategorizedExpenses} expense(s) still need a category.`
            : 'All expenses have categories.',
          passed: checks.uncategorizedExpenses === 0,
        },
        {
          label: 'Invoices are finalized',
          detail: checks.draftInvoices > 0
            ? `${checks.draftInvoices} draft invoice(s) remain.`
            : 'No draft invoices found.',
          passed: checks.draftInvoices === 0,
        },
        {
          label: 'Period has activity',
          detail: checks.incomeTotal > 0 || checks.expenseTotal > 0
            ? `${formatZAR(checks.incomeTotal + checks.expenseTotal)} total activity.`
            : 'No income or expenses were found for this period.',
          passed: checks.incomeTotal > 0 || checks.expenseTotal > 0,
        },
      ]
    : []

  return (
    <div className="flex flex-col gap-4">
      <Alert variant={hasWarnings ? 'default' : 'default'}>
        {hasWarnings ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
        <AlertTitle>{hasWarnings ? 'Review warnings before closing' : `${periodLabel} is ready to close`}</AlertTitle>
        <AlertDescription>
          {hasWarnings
            ? 'You can still close the month, but these items may need follow-up.'
            : 'The checks passed and the period can be locked.'}
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-2">
        {checkItems.map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-md border border-border p-3">
            {item.passed ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            ) : (
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-sm text-muted-foreground">{item.detail}</span>
            </div>
          </div>
        ))}
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="close-month-notes">Notes</FieldLabel>
          <Textarea
            id="close-month-notes"
            placeholder="Optional notes about this closed month"
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            rows={3}
            className="resize-none"
          />
          <FieldDescription>Notes are saved with the snapshot for future review.</FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  )
}

function FigureTile({
  label,
  value,
  tone = 'default',
  compact = false,
}: {
  label: string
  value: number
  tone?: AmountTone
  compact?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'font-semibold tabular-nums',
          compact ? 'text-sm' : 'text-lg',
          amountToneClass(tone),
        )}
      >
        {formatZAR(value)}
      </span>
    </div>
  )
}
