import Link from 'next/link'
import { Construction } from 'lucide-react'

interface ComingSoonPageProps {
  title: string
  purpose: string
  description: string
  backHref?: string
  backLabel?: string
}

export function ComingSoonPage({
  title,
  purpose,
  description,
  backHref = '/dashboard',
  backLabel = 'Back to Dashboard',
}: ComingSoonPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="flex flex-col items-center gap-6 max-w-md">
        <div className="rounded-2xl bg-muted p-4">
          <Construction className="size-10 text-muted-foreground" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
            Coming Soon
          </span>
        </div>

        <p className="text-sm text-muted-foreground">{purpose}</p>

        <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          {description}
        </div>

        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {backLabel}
        </Link>
      </div>
    </div>
  )
}
