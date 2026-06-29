'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage, BreadcrumbLink, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { usePageHeader } from '@/components/navigation/page-header-context'
import { ROUTE_LABELS, GROUPS } from '@/components/navigation/nav-data'

/** Find the exact match label, or null if no exact match */
function getExactLabel(pathname: string): string | null {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  return null
}

/** Derive the parent group label from the longest matching group URL */
function getParentGroup(pathname: string): { label: string; href: string } | null {
  // Skip top-level routes — they have no parent group
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 1) return null

  // Check OVERVIEW routes first (they don't have children that need breadcrumbs)
  // Find the group whose items contain the longest matching prefix
  for (const group of GROUPS) {
    // Check if any child item matches or is a prefix of the current path
    const matchingItem = group.items
      .filter((item) => item.url !== '/' + segments[0]) // exclude the group root itself
      .filter((item) => pathname.startsWith(item.url))
      .sort((a, b) => b.url.length - a.url.length)[0]

    if (matchingItem) {
      return { label: group.label, href: group.items[0].url }
    }
  }
  return null
}

/** Derive a readable label from the last path segment */
function deriveLabel(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean).pop() ?? ''
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function TopNav() {
  const pathname = usePathname()
  const { total, totalVariant } = usePageHeader()
  // Two-level breadcrumb: parent > child
  const parent = getParentGroup(pathname)
  const label = getExactLabel(pathname) ?? deriveLabel(pathname)

  const totalColor = {
    green:   'text-green-500',
    amber:   'text-amber-500',
    red:     'text-red-500',
    default: 'text-muted-foreground',
  }[totalVariant]

  return (
    <header className="sticky top-0 z-40 h-13 flex items-center border-b border-border bg-card px-6 gap-2">
      <SidebarTrigger className="shrink-0" />
      <Separator orientation="vertical" className="h-4 shrink-0" />
      <div className="flex items-center gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            {parent && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={parent.href} className="text-muted-foreground hover:text-foreground transition-colors">
                    {parent.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage className="text-base font-semibold text-foreground">
                {label}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        {total && (
          <span className={`text-base font-semibold tabular-nums ${totalColor}`}>
            {total}
          </span>
        )}
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
