import * as React from 'react'
import { cn } from '@/lib/utils'

interface DataListProps {
  className?: string
  desktop: React.ReactNode
  mobile: React.ReactNode
}

export function DataList({ className, desktop, mobile }: DataListProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="hidden md:block w-full">
        {desktop}
      </div>
      <div className="flex flex-col gap-3 md:hidden w-full">
        {mobile}
      </div>
    </div>
  )
}
