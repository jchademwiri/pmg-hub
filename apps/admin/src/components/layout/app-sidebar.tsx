'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home, Banknote, FileSpreadsheet, Network, LineChart, Cog,
  LayoutDashboard, TrendingUp, TrendingDown, Tags, BookOpen,
  FileText, Receipt, ScrollText, Users, UserPlus, Building2,
  Camera, BarChart3, Settings, ChevronDown, UserCog, PiggyBank,
  Package, Globe, Mail, Shield, Database,
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

// ── Types ─────────────────────────────────────────────────────────────────────

type NavItem = { title: string; url: string; icon: React.ElementType }
type GroupKey = 'finance' | 'billing' | 'relationships' | 'insights' | 'system'

// ── Nav data ──────────────────────────────────────────────────────────────────

const OVERVIEW: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
]

const GROUPS: { key: GroupKey; label: string; icon: React.ElementType; items: NavItem[] }[] = [
  {
    key: 'finance',
    label: 'Finance',
    icon: Banknote,
    items: [
      { title: 'Income',           url: '/income',             icon: TrendingUp },
      { title: 'Expenses',         url: '/expenses',           icon: TrendingDown },
      { title: 'Categories',       url: '/expense-categories', icon: Tags },
      { title: 'Corporate Ledger', url: '/ledger',             icon: BookOpen },
      { title: 'Accounts',         url: '/accounts',           icon: PiggyBank },
    ],
  },
  {
    key: 'billing',
    label: 'Billing',
    icon: FileSpreadsheet,
    items: [
      { title: 'Quotations', url: '/billing/quotes',     icon: FileText },
      { title: 'Invoices',   url: '/billing/invoices',   icon: Receipt },
      { title: 'Statements', url: '/billing/statements', icon: ScrollText },
      { title: 'Items',      url: '/billing/items',      icon: Package },
    ],
  },
  {
    key: 'relationships',
    label: 'Relationships',
    icon: Network,
    items: [
      { title: 'Clients',   url: '/clients',   icon: Users },
      { title: 'Leads',     url: '/leads',     icon: UserPlus },
      { title: 'Divisions', url: '/divisions', icon: Building2 },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    icon: LineChart,
    items: [
      { title: 'Snapshots', url: '/snapshots', icon: Camera },
      { title: 'Reports',   url: '/reports',   icon: BarChart3 },
    ],
  },
  {
    key: 'system',
    label: 'System',
    icon: Cog,
    items: [
      { title: 'Users',          url: '/settings/users',         icon: UserCog    },
      { title: 'Organisation',   url: '/settings/organisation',  icon: Building2  },
      { title: 'Billing',        url: '/settings/billing',       icon: Receipt    },
      { title: 'Localisation',   url: '/settings/localisation',  icon: Globe      },
      { title: 'Email',          url: '/settings/email',         icon: Mail       },
      { title: 'Security',       url: '/settings/security',      icon: Shield     },
      { title: 'Data & Exports', url: '/settings/data',          icon: Database   },
    ],
  },
]

const MAIN_GROUPS = GROUPS.filter((g) => g.key !== 'system')
const SYSTEM_GROUP = GROUPS.find((g) => g.key === 'system')!

// ── Helpers ───────────────────────────────────────────────────────────────────

function getActiveGroup(pathname: string): GroupKey | null {
  for (const group of GROUPS) {
    if (group.items.some((i) => pathname.startsWith(i.url))) return group.key
  }
  return null
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface NavMenuProps {
  items: NavItem[]
  pathname: string
  onNavigate: () => void
}

function NavMenu({ items, pathname, onNavigate }: NavMenuProps) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.url}>
          <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
            <Link href={item.url} onClick={onNavigate} className="flex items-center gap-2">
              <item.icon className="size-4 shrink-0" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}

interface CollapsibleGroupProps {
  groupKey: GroupKey
  label: string
  icon: React.ElementType
  items: NavItem[]
  isOpen: boolean
  pathname: string
  onToggle: (key: GroupKey, open: boolean) => void
  onNavigate: () => void
}

function CollapsibleGroup({
  groupKey,
  label,
  icon: GroupIcon,
  items,
  isOpen,
  pathname,
  onToggle,
  onNavigate,
}: CollapsibleGroupProps) {
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => onToggle(groupKey, open)}
      className="group/collapsible"
    >
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
          <SidebarGroupContent>
            <NavMenu items={items} pathname={pathname} onNavigate={onNavigate} />
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

// ── AppSidebar ────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  user: { name: string; email: string; role: string }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const [openGroup, setOpenGroup] = React.useState<GroupKey | null>(
    () => getActiveGroup(pathname),
  )

  // Keep the open group in sync when the route changes (e.g. browser back/forward)
  React.useEffect(() => {
    const active = getActiveGroup(pathname)
    if (active) setOpenGroup(active)
  }, [pathname])

  const handleToggle = (key: GroupKey, open: boolean) => {
    setOpenGroup(open ? key : null)
  }

  // Close the mobile sheet after tapping a link
  const handleNavigate = React.useCallback(() => {
    if (isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link
          href="/dashboard"
          onClick={handleNavigate}
          className="flex flex-col gap-0.5 px-2 py-3 hover:opacity-80 transition-opacity"
        >
          <span className="text-sidebar-foreground/50 text-xs uppercase tracking-widest">PMG</span>
          <span className="text-sidebar-foreground text-sm font-semibold">Control Center</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Overview — static, no toggle */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Home className="size-3.5" />
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMenu items={OVERVIEW} pathname={pathname} onNavigate={handleNavigate} />
          </SidebarGroupContent>
        </SidebarGroup>

        {MAIN_GROUPS.map((g) => (
          <CollapsibleGroup
            key={g.key}
            groupKey={g.key}
            label={g.label}
            icon={g.icon}
            items={g.items}
            isOpen={openGroup === g.key}
            pathname={pathname}
            onToggle={handleToggle}
            onNavigate={handleNavigate}
          />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col gap-1">
          <CollapsibleGroup
            groupKey={SYSTEM_GROUP.key}
            label={SYSTEM_GROUP.label}
            icon={SYSTEM_GROUP.icon}
            items={SYSTEM_GROUP.items}
            isOpen={openGroup === SYSTEM_GROUP.key}
            pathname={pathname}
            onToggle={handleToggle}
            onNavigate={handleNavigate}
          />
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
