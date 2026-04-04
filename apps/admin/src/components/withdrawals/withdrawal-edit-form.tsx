'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { WithdrawalRow } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface WithdrawalEditFormProps {
  entry: WithdrawalRow
  updateAction: (formData: FormData) => Promise<{ error?: string }>
}

export function WithdrawalEditForm({ entry, updateAction }: WithdrawalEditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

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
        <Label htmlFor="withdrawal-date">Date</Label>
        <Input
          id="withdrawal-date"
          name="date"
          type="date"
          defaultValue={entry.date}
          required
          disabled={isPending}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="withdrawal-amount">Amount</Label>
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
        <Label htmlFor="withdrawal-description">Description</Label>
        <Input
          id="withdrawal-description"
          name="description"
          type="text"
          placeholder="Optional"
          defaultValue={entry.description ?? ''}
          disabled={isPending}
          className="w-48"
        />
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
