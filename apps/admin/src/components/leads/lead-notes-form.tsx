'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'

interface LeadNotesFormProps {
  id: string
  currentNotes: string | null
  updateAction: (id: string, formData: FormData) => Promise<{ error?: string }>
}

export function LeadNotesForm({ id, currentNotes, updateAction }: LeadNotesFormProps) {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="lead-notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="lead-notes"
          name="notes"
          defaultValue={currentNotes ?? ''}
          disabled={isPending}
          rows={5}
          placeholder="Add internal notes…"
          className="w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
        />
      </div>

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save Notes'}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  )
}
