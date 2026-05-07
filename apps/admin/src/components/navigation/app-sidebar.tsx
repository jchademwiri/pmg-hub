'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ChevronDown } from 'lucide-react'
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
import { SignOutButton } from '@/components/navigation/sign-out-button'
import { OVERVIEW, GROUPS } from '@/components/navigation/nav-data'
import type { NavItem, NavGroup, GroupKey } from '@/components/navigation/nav-data'

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
  group: NavGroup
  isOpen: boolean
  pathname: string
  onToggle: (key: GroupKey, open: boolean) => void
  onNavigate: () => void
}

function CollapsibleGroup({ group, isOpen, pathname, onToggle, onNavigate }: CollapsibleGroupProps) {
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={(open) => onToggle(group.key, open)}
      className="group/collapsible"
    >
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer flex items-center justify-between hover:text-foreground">
            <span className="flex items-center gap-2">
              <group.icon className="size-3.5" />
              {group.label}
            </span>
            <ChevronDown className="size-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <NavMenu items={group.items} pathname={pathname} onNavigate={onNavigate} />
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

const MAIN_GROUPS = GROUPS.filter((g) => g.key !== 'system')
const SYSTEM_GROUP = GROUPS.find((g) => g.key === 'system')!

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const [openGroup, setOpenGroup] = React.useState<GroupKey | null>(
    () => getActiveGroup(pathname),
  )

  React.useEffect(() => {
    const active = getActiveGroup(pathname)
    if (active) setOpenGroup(active)
  }, [pathname])

  const handleToggle = (key: GroupKey, open: boolean) => {
    setOpenGroup(open ? key : null)
  }

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
            group={g}
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
            group={SYSTEM_GROUP}
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
