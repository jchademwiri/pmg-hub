import { FolderOpen, SearchX } from "lucide-react"
import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  message: string
  ctaLabel?: string
  ctaHref?: string
  filtered?: boolean
}

export function EmptyState({ message, ctaLabel, ctaHref, filtered }: EmptyStateProps) {
  const Icon = filtered ? SearchX : FolderOpen

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="flex flex-col items-center gap-4 py-10">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Icon className="size-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
          {ctaLabel && ctaHref && (
            <Link
              href={ctaHref}
              className={cn(buttonVariants({ variant: "default", size: "sm" }))}
            >
              {ctaLabel}
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
