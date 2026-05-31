'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

interface LeadNotesFormProps {
  currentNotes: string | null
  updateAction: (formData: FormData) => Promise<{ error?: string }>
}

export function LeadNotesForm({ currentNotes, updateAction }: LeadNotesFormProps) {
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(() => {
      updateAction(formData).then((result) => {
        if (result.error) setError(result.error)
        else toast.success('Notes saved')
      })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="lead-notes">Notes</FieldLabel>
        <Textarea
          id="lead-notes"
          name="notes"
          defaultValue={currentNotes ?? ''}
          disabled={isPending}
          rows={5}
          placeholder="e.g. Discussed proposal, client will decide by next week..."
        />
      </Field>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? 'Saving…' : 'Save Notes'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}
