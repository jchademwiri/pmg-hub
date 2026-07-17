'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarClock, Receipt, Menu } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { useIsMobile } from '@/hooks/use-mobile'

export function BottomNav() {
  const pathname = usePathname()
  const { setOpenMobile, openMobile } = useSidebar()
  const isMobile = useIsMobile()

  if (!isMobile) return null

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md print:hidden"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      <div className="grid grid-cols-4 h-16 px-2 w-full overflow-hidden">
        <Link href="/dashboard" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <LayoutDashboard className="size-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>
        <Link href="/projects" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname.startsWith('/projects') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <CalendarClock className="size-5" />
          <span className="text-[10px] font-medium">Projects</span>
        </Link>
        <Link href="/billing" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname.startsWith('/billing') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <Receipt className="size-5" />
          <span className="text-[10px] font-medium">Billing</span>
        </Link>
        <button onClick={() => setOpenMobile(!openMobile)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${openMobile ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <Menu className="size-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </div>
  )
}
