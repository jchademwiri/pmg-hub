'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Banknote, FileSpreadsheet, Network, LineChart, Cog,
  LayoutDashboard, TrendingUp, TrendingDown, Tags, BookOpen,
  FileText, Receipt, ScrollText, Users, UserPlus, Building2,
  Camera, BarChart3, Settings, ChevronDown, UserCog, PiggyBank,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { SignOutButton } from '@/components/layout/sign-out-button'

type NavItem = { title: string; url: string; icon: React.ElementType }

const overview: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
]

const finance: NavItem[] = [
  { title: 'Income',           url: '/income',             icon: TrendingUp },
  { title: 'Expenses',         url: '/expenses',           icon: TrendingDown },
  { title: 'Categories',       url: '/expense-categories', icon: Tags },
  { title: 'Corporate Ledger', url: '/ledger',             icon: BookOpen },
  { title: 'Accounts',         url: '/accounts',           icon: PiggyBank },
]

const billing: NavItem[] = [
  { title: 'Quotations', url: '/billing/quotes',     icon: FileText },
  { title: 'Invoices',   url: '/billing/invoices',   icon: Receipt },
  { title: 'Statements', url: '/billing/statements', icon: ScrollText },
]

const relationships: NavItem[] = [
  { title: 'Clients',   url: '/clients',   icon: Users },
  { title: 'Leads',     url: '/leads',     icon: UserPlus },
  { title: 'Divisions', url: '/divisions', icon: Building2 },
]

const insights: NavItem[] = [
  { title: 'Snapshots', url: '/snapshots', icon: Camera },
  { title: 'Reports',   url: '/reports',   icon: BarChart3 },
]

const system: NavItem[] = [
  { title: 'Users',    url: '/users',    icon: UserCog },
  { title: 'Settings', url: '/settings', icon: Settings },
]

interface AppSidebarProps {
  user: { name: string; email: string; role: string }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  const isActive = (url: string) => pathname.startsWith(url)

  const renderMenu = (items: NavItem[]) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <Link href={item.url} className="flex items-center gap-2">
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )

  // Static (non-collapsible) group — used for Overview
  const renderStaticGroup = (
    label: string,
    GroupIcon: React.ElementType,
    items: NavItem[],
  ) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="flex items-center gap-2">
          <GroupIcon className="size-3.5" />
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>{renderMenu(items)}</SidebarGroupContent>
    </SidebarGroup>
  )

  // Collapsible group — auto-opens when a child is active
  const renderCollapsibleGroup = (
    label: string,
    GroupIcon: React.ElementType,
    items: NavItem[],
  ) => {
    const hasActive = items.some((i) => isActive(i.url))

    if (collapsed) {
      return (
        <SidebarGroup>
          <SidebarGroupContent>{renderMenu(items)}</SidebarGroupContent>
        </SidebarGroup>
      )
    }

    return (
      <Collapsible defaultOpen={hasActive} className="group/collapsible">
        <SidebarGroup>
          <CollapsibleTrigger asChild>
            <SidebarGroupLabel className="cursor-pointer flex items-center justify-between hover:text-foreground">
              <span className="flex items-center gap-2">
                <GroupIcon className="size-3.5" />
                {label}
              </span>
              <ChevronDown className="size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
            </SidebarGroupLabel>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarGroupContent>{renderMenu(items)}</SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    )
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="flex flex-col gap-0.5 px-2 py-3 hover:opacity-80 transition-opacity"
        >
          <span className="text-sidebar-foreground/50 text-xs uppercase tracking-widest">PMG</span>
          <span className="text-sidebar-foreground text-sm font-semibold">Control Center</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {renderStaticGroup('Overview', Home, overview)}
        {renderCollapsibleGroup('Finance', Banknote, finance)}
        {renderCollapsibleGroup('Billing', FileSpreadsheet, billing)}
        {renderCollapsibleGroup('Relationships', Network, relationships)}
        {renderCollapsibleGroup('Insights', LineChart, insights)}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col gap-1">
          {renderCollapsibleGroup('System', Cog, system)}
          <div className="mx-2 h-px bg-sidebar-border" />
          <div className="px-2 py-2 flex flex-col gap-2">
            <div>
              <span className="text-sidebar-foreground text-sm font-medium">{user.name}</span>
              <span className="text-sidebar-foreground/50 text-xs block">{user.email}</span>
            </div>
            <SignOutButton />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
