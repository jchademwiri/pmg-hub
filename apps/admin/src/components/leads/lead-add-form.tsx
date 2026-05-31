'use client'

import * as React from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface LeadAddFormProps {
  divisions: { id: string; name: string }[]
  createAction: (formData: FormData) => Promise<{ error?: string }>
}

export function LeadAddForm({ divisions, createAction }: LeadAddFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [divisionId, setDivisionId] = React.useState<string>('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      const fd = new FormData(formRef.current!)
      if (divisionId) {
        fd.set('divisionId', divisionId)
      }
      const result = await createAction(fd)
      if (result.error) {
        setErrorMessage(result.error)
      } else {
        formRef.current?.reset()
        setDivisionId('')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        <Field>
          <FieldLabel htmlFor="lead-name">
            Name <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id="lead-name"
            name="name"
            type="text"
            required
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="lead-email">Email</FieldLabel>
          <Input
            id="lead-email"
            name="email"
            type="email"
            placeholder="Optional"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="lead-phone">Phone</FieldLabel>
          <Input
            id="lead-phone"
            name="phone"
            type="text"
            placeholder="Optional"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="lead-source">Source</FieldLabel>
          <Input
            id="lead-source"
            name="source"
            type="text"
            placeholder="Optional"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="lead-service-interest">Service Interest</FieldLabel>
          <Input
            id="lead-service-interest"
            name="serviceInterest"
            type="text"
            placeholder="Optional"
            disabled={isPending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="lead-division">Division</FieldLabel>
          <Select value={divisionId} onValueChange={setDivisionId} disabled={isPending}>
            <SelectTrigger id="lead-division">
              <SelectValue placeholder="Select division" />
            </SelectTrigger>
            <SelectContent>
              {divisions.map((division) => (
                <SelectItem key={division.id} value={division.id}>
                  {division.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="md:col-span-2 lg:col-span-3">
          <Field>
            <FieldLabel htmlFor="lead-message">Message</FieldLabel>
            <Textarea
              id="lead-message"
              name="message"
              placeholder="Optional"
              disabled={isPending}
              rows={2}
              className="resize-none"
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto px-6">
          {isPending ? 'Adding…' : 'Add Lead'}
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </form>
  )
}
