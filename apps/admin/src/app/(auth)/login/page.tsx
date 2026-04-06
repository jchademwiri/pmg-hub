'use client'

import { useState } from 'react'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn.magicLink({ email })

    setLoading(false)

    if (result?.error) {
      setError('Unable to sign in. Please check your email and try again.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm shadow-none">
        <CardContent className="p-8 space-y-4">
          <div className="space-y-1">
            <p className="text-foreground/50 text-xs uppercase tracking-widest">PMG</p>
            <p className="text-foreground text-sm font-semibold">Control Center</p>
          </div>

          {sent ? (
            <p className="text-sm text-muted-foreground">
              Check your email — a sign-in link is on its way.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send sign-in link'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
