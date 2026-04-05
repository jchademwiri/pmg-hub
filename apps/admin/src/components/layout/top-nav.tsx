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
  '/withdrawals': 'Withdrawals',
  '/clients':     'Clients',
  '/leads':       'Leads',
  '/divisions':   'Divisions',
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
  const { total } = usePageHeader()
  const label = getPageLabel(pathname)

  return (
    <header className="sticky top-0 z-30 h-13 flex items-center gap-2 px-4 border-b border-border bg-card">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <div className="flex flex-1 items-center justify-between">
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
          <span className="text-base font-semibold tabular-nums text-muted-foreground pr-1">
            {total}
          </span>
        )}
      </div>
    </header>
  )
}
