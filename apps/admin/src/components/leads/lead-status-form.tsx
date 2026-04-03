'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface LeadStatusFormProps {
  id: string
  currentStatus: string
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
}

export function LeadStatusForm({ id, currentStatus, updateAction }: LeadStatusFormProps) {
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(() => {
      updateAction(id, formData).then((result) => {
        if (result.error) setError(result.error)
      })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="lead-status" className="text-sm font-medium">
          Status
        </label>
        <Select name="status" defaultValue={currentStatus} disabled={isPending}>
          <SelectTrigger id="lead-status" className="w-40">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Update Status'}
      </Button>

      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </form>
  )
}
