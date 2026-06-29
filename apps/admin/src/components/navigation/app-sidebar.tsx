'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ChevronDown, LogOut, Settings, UserCog } from 'lucide-react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
      {items.map((item) => {
        // Exact match for group-root "Overview" items (e.g. /billing, /finance,
        // /accounting, /settings) to avoid them showing active on every sub-route
        // (e.g. /billing matching /billing/invoices). Sub-routes always have a
        // path segment after the group root, so segment count is the reliable check.
        const isGroupRoot = item.url.split('/').filter(Boolean).length === 1
        const isActive = isGroupRoot
          ? pathname === item.url
          : pathname.startsWith(item.url)
        return (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={item.url} onClick={onNavigate} className="flex items-center gap-2">
                <item.icon className="size-4 shrink-0" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
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
          className="flex items-center gap-3 px-2 py-3 hover:opacity-80 transition-opacity"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/pmg-logo.svg" alt="PMG" width={28} height={28} className="shrink-0" />
          <div className="flex flex-col gap-0">
            <span className="text-sidebar-foreground text-sm font-semibold leading-tight">Control Center</span>
            <span className="text-sidebar-foreground/50 text-[10px] tracking-widest uppercase">Playhouse Media Group</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Overview - static, no toggle */}
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
          <div className="px-2 py-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent w-full transition-colors">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</span>
                    <span className="text-[10px] text-sidebar-foreground/50 truncate">{user.role}</span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings/organisation">
                    <Settings className="size-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <SignOutButton />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
