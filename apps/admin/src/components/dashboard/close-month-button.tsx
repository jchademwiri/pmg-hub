'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CloseMonthWizard } from '@/components/dashboard/close-month-wizard'
import { getPeriodSummary } from '@/app/actions/snapshots'
import { fmtMonthYear } from '@/lib/format'
import { Lock } from 'lucide-react'

interface CloseMonthButtonProps {
  period: string
}

export default function CloseMonthButton({ period }: CloseMonthButtonProps) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [summary, setSummary] = useState<{
    revenue: number; expenses: number; pmgShare: number; profitPool: number;
    salary: number; reinvest: number; reserve: number; flex: number;
  } | null>(null)
  const periodLabel = fmtMonthYear(period)

  async function handleClick() {
    const result = await getPeriodSummary(period)
    if ('error' in result) return
    setSummary(result)
    setWizardOpen(true)
  }

  return (
    <>
      <Button onClick={handleClick} variant="outline" size="sm" className="gap-1.5">
        <Lock data-icon="inline-start" />
        Close {periodLabel}
      </Button>
      {summary && (
        <CloseMonthWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          period={period}
          summary={summary}
        />
      )}
    </>
  )
}
