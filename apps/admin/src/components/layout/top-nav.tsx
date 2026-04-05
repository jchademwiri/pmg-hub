'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage
} from '@/components/ui/breadcrumb'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/income':      'Income',
  '/expenses':    'Expenses',
  '/withdrawals': 'Withdrawals',
  '/clients':     'Clients',
  '/leads':       'Leads',
  '/divisions':   'Divisions',
  '/snapshots':   'Snapshots',
  '/reports':     'Reports',
}

function getPageLabel(pathname: string): string {
  // Exact match first
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  // Match by prefix (e.g. /clients/[id] → Clients)
  for (const [route, label] of Object.entries(ROUTE_LABELS)) {
    if (pathname.startsWith(route + '/')) return label
  }
  return 'Dashboard'
}

export function TopNav() {
  const pathname = usePathname()
  const label = getPageLabel(pathname)

  return (
    <header className="h-12 flex items-center gap-2 px-4 border-b border-border bg-card">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
