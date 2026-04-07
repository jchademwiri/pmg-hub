'use client'

import { useState } from 'react'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

interface InviteAcceptClientProps {
  email: string
}

export function InviteAcceptClient({ email }: InviteAcceptClientProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleAccept() {
    setStatus('loading')
    setErrorMessage('')

    try {
      const { error } = await signIn.magicLink({ email, callbackURL: '/dashboard' })
      if (error) {
        setStatus('error')
        setErrorMessage(error.message ?? 'Failed to send sign-in link')
      } else {
        setStatus('sent')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <h2 className="text-lg font-medium text-primary">Check your email</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a sign-in link to <strong>{email}</strong>. Click the link in the email to complete
          your account setup.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        id="accept-invite-btn"
        onClick={handleAccept}
        disabled={status === 'loading'}
        className="w-full"
      >
        {status === 'loading' ? 'Sending sign-in link…' : 'Accept Invitation & Sign In'}
      </Button>
      {status === 'error' && (
        <p className="text-center text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
