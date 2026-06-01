import { FolderOpen, SearchX } from "lucide-react"
import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  message: string
  title?: string
  ctaLabel?: string
  ctaHref?: string
  filtered?: boolean
}

export function EmptyState({ message, title, ctaLabel, ctaHref, filtered }: EmptyStateProps) {
  const Icon = filtered ? SearchX : FolderOpen
  const defaultTitle = filtered ? "No matches found" : "No records yet"
  const resolvedTitle = title ?? defaultTitle

  return (
    <div className="flex items-center justify-center py-12 w-full animate-in fade-in duration-300">
      <Card className="w-full text-center border-dashed border-2 border-border/50 bg-gradient-to-tr from-card to-card/40 backdrop-blur-md shadow-none hover:border-border/80 transition-all duration-300">
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted/30 border border-border/50 shadow-inner transition-transform duration-300 hover:scale-105 group">
            <Icon className="size-8 text-muted-foreground/80 group-hover:text-foreground transition-colors duration-200" />
          </div>
          <div className="flex flex-col gap-1.5 max-w-sm">
            <h3 className="text-sm font-semibold tracking-tight text-foreground/90">{resolvedTitle}</h3>
            <p className="text-xs text-muted-foreground leading-normal">{message}</p>
          </div>
          {ctaLabel && ctaHref && (
            <Link
              href={ctaHref}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "mt-2 hover:scale-[1.03] active:scale-[0.98] transition-transform duration-100 font-medium"
              )}
            >
              {ctaLabel}
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
