import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Login' }

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="rounded-xl border border-border bg-card p-8 shadow-none w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <p className="text-foreground/50 text-xs uppercase tracking-widest">PMG</p>
          <p className="text-foreground text-sm font-semibold">Control Center</p>
        </div>
        <p className="text-muted-foreground text-sm">
          Authentication coming in a future phase.
        </p>
      </div>
    </div>
  )
}
