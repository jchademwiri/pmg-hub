'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RouteErrorProps {
  routeName: string
  error: Error & { digest?: string }
  reset: () => void
}

export function RouteError({ routeName, error, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error(`${routeName} error:`, error)
  }, [error, routeName])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <AlertTriangle className="size-10 text-destructive" />
      <div>
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          Failed to load {routeName}. Please try again.
        </p>
      </div>
      <Button variant="outline" onClick={reset}>
        Try Again
      </Button>
    </div>
  )
}
