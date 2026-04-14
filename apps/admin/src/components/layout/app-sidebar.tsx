import Link from 'next/link'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { NavLink } from '@/components/layout/nav-link'
import { SignOutButton } from '@/components/layout/sign-out-button'
import { LayoutDashboard, TrendingUp, TrendingDown, UserCheck, Users, Layers, Camera, BarChart3, Wallet, PiggyBank, UserCog, Tags } from 'lucide-react'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/income',      label: 'Income',      icon: TrendingUp },
  { href: '/expenses',    label: 'Expenses',    icon: TrendingDown },
  { href: '/expense-categories', label: 'Categories', icon: Tags },
  { href: '/ledger',      label: 'Corporate Ledger', icon: Wallet },
  { href: '/accounts',    label: 'Accounts',    icon: PiggyBank },
  { href: '/clients',     label: 'Clients',     icon: UserCheck },
  { href: '/leads',       label: 'Leads',       icon: Users },
  { href: '/divisions',   label: 'Divisions',   icon: Layers },
  { href: '/snapshots',   label: 'Snapshots',   icon: Camera },
  { href: '/reports',     label: 'Reports',     icon: BarChart3 },
]

const adminItems = [
  { href: '/users', label: 'Users', icon: UserCog },
]

interface AppSidebarProps {
  user: { name: string; email: string; role: string }
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <Link href="/dashboard" className="flex flex-col gap-0.5 px-2 py-3 hover:opacity-80 transition-opacity">
          <span className="text-sidebar-foreground/50 text-xs uppercase tracking-widest">PMG</span>
          <span className="text-sidebar-foreground text-sm font-semibold">Control Center</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map(item => (
            <SidebarMenuItem key={item.href}>
              <NavLink
                href={item.href}
                label={item.label}
                icon={<item.icon className="size-4" />}
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col gap-1">
          {user.role === 'super_admin' && (
            <>
              <SidebarMenu>
                {adminItems.map(item => (
                  <SidebarMenuItem key={item.href}>
                    <NavLink
                      href={item.href}
                      label={item.label}
                      icon={<item.icon className="size-4" />}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
              <div className="mx-2 h-px bg-sidebar-border" />
            </>
          )}
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
