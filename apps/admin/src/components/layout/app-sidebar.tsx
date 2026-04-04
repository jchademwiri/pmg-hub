import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { NavLink } from '@/components/layout/nav-link'
import { LayoutDashboard, TrendingUp, TrendingDown, Users, Layers, Camera, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/income',    label: 'Income',    icon: TrendingUp },
  { href: '/expenses',  label: 'Expenses',  icon: TrendingDown },
  { href: '/leads',     label: 'Leads',     icon: Users },
  { href: '/divisions', label: 'Divisions', icon: Layers },
  { href: '/snapshots', label: 'Snapshots', icon: Camera },
  { href: '/reports',   label: 'Reports',   icon: BarChart3 },
]

export function AppSidebar() {
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
        <div className="px-2 py-3">
          <span className="text-sidebar-foreground/50 text-xs">PMG Admin</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
