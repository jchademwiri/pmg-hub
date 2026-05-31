'use client'

import * as React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface ClientAddFormProps {
  createAction: (formData: FormData) => Promise<{ error?: string }>
  onCancel?: () => void
}

export function ClientAddForm({ createAction, onCancel }: ClientAddFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      const fd = new FormData(formRef.current!)
      const result = await createAction(fd)
      if (result.error) {
        setErrorMessage(result.error)
      } else {
        formRef.current?.reset()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field>
          <FieldLabel htmlFor="client-name">
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="client-name"
            name="name"
            type="text"
            placeholder="e.g. Acme Corp"
            required
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-business-name">Business Name</FieldLabel>
          <Input
            id="client-business-name"
            name="businessName"
            type="text"
            placeholder="e.g. Acme Pty Ltd"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-email">Email Address</FieldLabel>
          <Input
            id="client-email"
            name="email"
            type="email"
            placeholder="e.g. billing@acme.com"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="client-phone">Phone Number</FieldLabel>
          <Input
            id="client-phone"
            name="phone"
            type="text"
            placeholder="e.g. +27 82 123 4567"
            disabled={isPending}
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4 mt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            size="sm"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isPending} size="sm">
          {isPending ? 'Adding…' : 'Add Client'}
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}
