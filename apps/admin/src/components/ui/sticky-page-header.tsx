import * as React from 'react'
import { cn } from '@/lib/utils'

interface StickyPageHeaderProps {
  title: string
  description?: string
  /** Optional total value displayed next to the title */
  total?: string
  totalVariant?: 'green' | 'amber' | 'red' | 'default'
  /** Right-aligned actions (buttons, filters, etc.) */
  actions?: React.ReactNode
  /** Additional CSS classes */
  className?: string
}

const variantClasses: Record<string, string> = {
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-destructive',
  default: '',
}

export function StickyPageHeader({
  title,
  description,
  total,
  totalVariant = 'default',
  actions,
  className,
}: StickyPageHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-[3.25rem] z-20 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-6 px-6 py-4 -mt-6',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">
            {title}
            {total && (
              <span className={cn('ml-2 text-base font-normal tabular-nums', variantClasses[totalVariant])}>
                {total}
              </span>
            )}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
