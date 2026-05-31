'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface DivisionAddFormProps {
  createAction: (formData: FormData) => Promise<{ error?: string }>
  onCancel?: () => void
}

export function DivisionAddForm({ createAction, onCancel }: DivisionAddFormProps) {
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
        toast.success('Division created')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 max-w-xl">
        <Field>
          <FieldLabel htmlFor="division-name">
            Division Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="division-name"
            name="name"
            type="text"
            placeholder="e.g. Software Development"
            required
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
          {isPending ? 'Adding…' : 'Add Division'}
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
