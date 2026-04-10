'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { WithdrawalRow } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface WithdrawalEditFormProps {
  entry: WithdrawalRow
  updateAction: (formData: FormData) => Promise<{ error?: string }>
}

const today = new Date().toISOString().split('T')[0]!

function formatDefaultDescription(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return `Salary withdrawal — ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

export function WithdrawalEditForm({ entry, updateAction }: WithdrawalEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [selectedDate, setSelectedDate] = React.useState(entry.date)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      const fd = new FormData(e.currentTarget)
      const result = await updateAction(fd)
      if (result.error) {
        toast.error(result.error)
        setErrorMessage(result.error)
      } else {
        router.push('/withdrawals')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="withdrawal-date" className="text-sm font-medium">Date</label>
        <Input
          id="withdrawal-date"
          name="date"
          type="date"
          defaultValue={entry.date}
          max={today}
          required
          disabled={isPending}
          className="w-40"
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="withdrawal-amount" className="text-sm font-medium">Amount</label>
        <Input
          id="withdrawal-amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={entry.amount}
          required
          disabled={isPending}
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="withdrawal-description" className="text-sm font-medium">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          id="withdrawal-description"
          name="description"
          type="text"
          placeholder={formatDefaultDescription(selectedDate)}
          defaultValue={entry.description ?? ''}
          disabled={isPending}
          className="w-72"
        />
        <p className="text-xs text-muted-foreground">Leave blank to use default description</p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Changes'}
      </Button>

      {errorMessage && (
        <p className="w-full text-sm text-destructive">{errorMessage}</p>
      )}
    </form>
  )
}
