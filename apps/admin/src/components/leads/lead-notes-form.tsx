'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="lead-notes">Notes</FieldLabel>
          <Textarea
            id="lead-notes"
            name="notes"
            defaultValue={currentNotes ?? ''}
            disabled={isPending}
            rows={5}
            placeholder="Add internal notes…"
          />
        </Field>
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Notes'}
          </Button>
        </Field>
      </FieldGroup>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}
