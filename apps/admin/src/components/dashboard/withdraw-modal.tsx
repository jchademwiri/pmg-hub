'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface WithdrawModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  withdrawAction: (amount: number) => Promise<{ error?: string }>
}

export function WithdrawModal({
  open,
  onClose,
  onSuccess,
  withdrawAction,
}: WithdrawModalProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = React.useState<string | null>(null)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [isPending, setIsPending] = React.useState(false)

  function resetState() {
    setValidationError(null)
    setServerError(null)
    setIsPending(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleClose() {
    resetState()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setValidationError(null)
    setServerError(null)

    const raw = inputRef.current?.value ?? ''
    const amount = parseFloat(raw)

    if (!raw || isNaN(amount) || amount <= 0) {
      setValidationError('Please enter a valid positive amount.')
      return
    }

    setIsPending(true)
    try {
      const result = await withdrawAction(amount)
      if (result.error) {
        setServerError(result.error)
      } else {
        resetState()
        onSuccess()
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Record Withdrawal</DialogTitle>
          <DialogDescription>
            Enter the withdrawal amount to record against this month&apos;s salary.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-2 py-2">
            <Input
              ref={inputRef}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Amount"
              aria-invalid={validationError != null || undefined}
              disabled={isPending}
            />
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Submitting…' : 'Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
