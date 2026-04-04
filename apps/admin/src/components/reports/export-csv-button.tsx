'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { exportFinancialsCsv } from '@/app/actions/reports'

interface ExportCsvButtonProps {
  year: number
}

export function ExportCsvButton({ year }: ExportCsvButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await exportFinancialsCsv(year)

      if (typeof result === 'object' && 'error' in result) {
        toast.error(result.error)
        return
      }

      const blob = new Blob([result], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pmg-financials-${year}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <Button onClick={handleClick} disabled={isPending} variant="outline">
      {isPending ? 'Exporting…' : 'Export CSV'}
    </Button>
  )
}
