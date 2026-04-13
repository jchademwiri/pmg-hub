'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage
} from '@/components/ui/breadcrumb'
import { usePageHeader } from '@/components/layout/page-header-context'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/income':      'Income',
  '/expenses':    'Expenses',
  '/ledger':      'Corporate Ledger',
  '/clients':     'Clients',
  '/leads':       'Leads',
  '/divisions':   'Divisions',
  '/accounts':    'Accounts',
  '/snapshots':   'Financial Snapshots',
  '/reports':     'Reports & Insights',
}

function getPageLabel(pathname: string): string {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  for (const [route, label] of Object.entries(ROUTE_LABELS)) {
    if (pathname.startsWith(route + '/')) return label
  }
  return 'Dashboard'
}

export function TopNav() {
  const pathname = usePathname()
  const { total, totalVariant } = usePageHeader()
  const label = getPageLabel(pathname)

  const totalColor = {
    green:   'text-green-500',
    amber:   'text-amber-500',
    red:     'text-red-500',
    default: 'text-muted-foreground',
  }[totalVariant]

  return (
    <header className="sticky top-0 z-30 h-13 flex items-center border-b border-border bg-card px-6 gap-2">
      <SidebarTrigger className="shrink-0" />
      <Separator orientation="vertical" className="h-4 shrink-0" />
      <div className="flex items-center gap-3">
        <Breadcrumb>
          <BreadcrumbList>
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
      </div>
    </header>
  )
}
