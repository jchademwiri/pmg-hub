'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatZAR } from '@/lib/financial'

type AllocationItem = {
  key: string
  label: string
  pct: number
  color: string
  amount: number
}

type AllocationTooltipBarProps = { allocations: AllocationItem[] }

export function AllocationTooltipBar({ allocations }: AllocationTooltipBarProps) {
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
      {allocations.map(item => (
        <TooltipProvider key={item.key}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={item.color}
                style={{ width: `${item.pct}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {item.label}: {formatZAR(item.amount)} ({item.pct}%)
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  )
}
