'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface IncomeAddFormProps {
  divisions: { id: string; name: string }[]
  clients: { id: string; name: string; businessName: string | null }[]
  createAction: (formData: FormData) => Promise<{ error?: string }>
}

export function IncomeAddForm({ divisions, clients, createAction }: IncomeAddFormProps) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = React.useTransition()
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [clientId, setClientId] = React.useState<string>('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    if (!clientId) {
      setErrorMessage('Please select a client.')
      return
    }

    startTransition(async () => {
      const fd = new FormData(formRef.current!)
      fd.set('clientId', clientId)
      const result = await createAction(fd)
      if (result.error) {
        setErrorMessage(result.error)
      } else {
        formRef.current?.reset()
        setClientId('')
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label htmlFor="income-date" className="text-sm font-medium">
          Date
        </label>
        <Input
          id="income-date"
          name="date"
          type="date"
          required
          disabled={isPending}
          className="w-40"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="income-division" className="text-sm font-medium">
          Division
        </label>
        <Select name="divisionId" required disabled={isPending}>
          <SelectTrigger id="income-division" className="w-44">
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
        <label htmlFor="income-client" className="text-sm font-medium">
          Client
        </label>
        <Select value={clientId} onValueChange={setClientId} disabled={isPending}>
          <SelectTrigger id="income-client" className="w-44">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.businessName ?? client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="income-description" className="text-sm font-medium">
          Description
        </label>
        <Input
          id="income-description"
          name="description"
          type="text"
          placeholder="Optional"
          disabled={isPending}
          className="w-48"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="income-amount" className="text-sm font-medium">
          Amount
        </label>
        <Input
          id="income-amount"
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          disabled={isPending}
          className="w-36"
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Adding…' : 'Add Income'}
      </Button>

      {errorMessage && (
        <p className="w-full text-sm text-destructive">{errorMessage}</p>
      )}
    </form>
  )
}
