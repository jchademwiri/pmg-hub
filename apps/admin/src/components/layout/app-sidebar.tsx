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
import { LayoutDashboard, TrendingUp, TrendingDown, UserCheck, Users, Layers, Camera, BarChart3, Wallet, PiggyBank } from 'lucide-react'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/income',      label: 'Income',      icon: TrendingUp },
  { href: '/expenses',    label: 'Expenses',    icon: TrendingDown },
  { href: '/withdrawals', label: 'Withdrawals', icon: Wallet },
  { href: '/accounts',    label: 'Accounts',    icon: PiggyBank },
  { href: '/clients',   label: 'Clients',   icon: UserCheck },
  { href: '/leads',     label: 'Leads',     icon: Users },
  { href: '/divisions', label: 'Divisions', icon: Layers },
  { href: '/snapshots', label: 'Snapshots', icon: Camera },
  { href: '/reports',   label: 'Reports',   icon: BarChart3 },
]

interface AppSidebarProps {
  user: { name: string; email: string; role: string }
}

export function AppSidebar({ user }: AppSidebarProps) {
  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex flex-col gap-0.5 px-2 py-3">
          <span className="text-sidebar-foreground/50 text-xs uppercase tracking-widest">PMG</span>
          <span className="text-sidebar-foreground text-sm font-semibold">Control Center</span>
        </div>
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
        <div className="px-2 py-3 flex flex-col gap-2">
          <div>
            <span className="text-sidebar-foreground text-sm font-medium">{user.name}</span>
            <span className="text-sidebar-foreground/50 text-xs block">{user.email}</span>
          </div>
          <SignOutButton />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
