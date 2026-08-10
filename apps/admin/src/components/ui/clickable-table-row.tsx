'use client'

import { useRouter } from 'next/navigation'
import { TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

/** A <TableRow> that navigates to `href` when clicked anywhere in the row. */
export function ClickableTableRow({
  href,
  className,
  ...props
}: { href: string } & Omit<ComponentProps<typeof TableRow>, 'onClick'>) {
  const router = useRouter()
  return (
    <TableRow
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') router.push(href)
      }}
      className={cn('cursor-pointer', className)}
      {...props}
    />
  )
}
