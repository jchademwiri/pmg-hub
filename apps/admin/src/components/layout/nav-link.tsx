'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavLinkProps = {
  href: string
  label: string
  icon?: React.ReactNode
}

export function NavLink({ href, label, icon }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={
        isActive
          ? 'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm bg-sidebar-accent text-sidebar-accent-foreground'
          : 'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
      }
    >
      {icon}
      {label}
    </Link>
  )
}
