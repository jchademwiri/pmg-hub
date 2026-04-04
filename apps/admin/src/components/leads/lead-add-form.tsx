'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <Label htmlFor="lead-name">Name *</Label>
        <Input
          id="lead-name"
          name="name"
          type="text"
          required
          disabled={isPending}
          className="w-44"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="lead-email">Email</Label>
        <Input
          id="lead-email"
          name="email"
          type="email"
          placeholder="Optional"
          disabled={isPending}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="lead-phone">Phone</Label>
        <Input
          id="lead-phone"
          name="phone"
          type="text"
          placeholder="Optional"
          disabled={isPending}
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="lead-source">Source</Label>
        <Input
          id="lead-source"
          name="source"
          type="text"
          placeholder="Optional"
          disabled={isPending}
          className="w-36"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="lead-service-interest">Service Interest</Label>
        <Input
          id="lead-service-interest"
          name="serviceInterest"
          type="text"
          placeholder="Optional"
          disabled={isPending}
          className="w-44"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="lead-division">Division</Label>
        <Select value={divisionId} onValueChange={setDivisionId} disabled={isPending}>
          <SelectTrigger id="lead-division" className="w-44">
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
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="lead-message">Message</Label>
        <Textarea
          id="lead-message"
          name="message"
          placeholder="Optional"
          disabled={isPending}
          className="w-64 min-h-[60px]"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add Lead'}
      </Button>

      {errorMessage && (
        <p className="w-full text-sm text-destructive">{errorMessage}</p>
      )}
    </form>
  )
}
