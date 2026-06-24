'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical, ListOrdered } from 'lucide-react'
import { toast } from 'sonner'
import type { TenderScheduleEntry } from '@pmg/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TenderRiskBadge } from '@/components/scheduling/tender-risk-badge'
import { reorderTenderQueue } from '@/app/actions/tender-schedule-reorder'

interface DraggableUpNextProps {
  tenders: TenderScheduleEntry[]
  onStatusChange: (id: string, status: string) => Promise<string | undefined>
}

export function DraggableUpNext({ tenders, onStatusChange }: DraggableUpNextProps) {
  const router = useRouter()
  const [items, setItems] = React.useState(tenders)
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const [isReordering, setIsReordering] = React.useState(false)
  const dragOverIndexRef = React.useRef<number | null>(null)

  // Keep items in sync when props change
  React.useEffect(() => {
    setItems(tenders)
  }, [tenders])

  if (items.length === 0) {
    return (
      <Card size="sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ListOrdered className="size-4 text-muted-foreground" />
            <CardTitle>Up Next</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-muted-foreground">No upcoming tenders</p>
            <p className="text-xs text-muted-foreground">Add a new tender to build your queue.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  async function handleDragEnd() {
    if (dragIndex === null || dragOverIndexRef.current === null) return
    if (dragIndex === dragOverIndexRef.current) {
      setDragIndex(null)
      return
    }

    const newItems = [...items]
    const [moved] = newItems.splice(dragIndex, 1)
    newItems.splice(dragOverIndexRef.current, 0, moved)
    setItems(newItems)
    setDragIndex(null)

    // Persist the new order
    setIsReordering(true)
    try {
      const result = await reorderTenderQueue(newItems.map((i) => i.id))
      if (result.error) {
        toast.error(result.error)
        setItems(tenders) // revert on error
      } else {
        router.refresh()
      }
    } finally {
      setIsReordering(false)
    }
  }

  return (
    <Card size="sm" className={isReordering ? 'opacity-70' : ''}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 text-muted-foreground" />
          <CardTitle>Up Next ({items.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {items.map((tender, index) => {
          const startOverdue =
            tender.status === 'planned' && new Date(tender.startDate) < new Date()
          const isDragging = dragIndex === index

          return (
            <div
              key={tender.id}
              draggable
              onDragStart={(e) => {
                setDragIndex(index)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', tender.id)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                dragOverIndexRef.current = index
              }}
              onDragEnd={handleDragEnd}
              onDragLeave={() => {
                // no-op
              }}
              className={`flex items-center justify-between border-b py-2.5 last:border-0 transition-all ${
                isDragging
                  ? 'opacity-40 scale-[1.02] bg-muted/30 rounded-sm'
                  : dragOverIndexRef.current === index && dragIndex !== null && dragIndex !== index
                    ? 'border-t-2 border-t-blue-500/50'
                    : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  className="cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  aria-label={`Drag to reorder ${tender.tenderReference}`}
                  title="Drag to reorder"
                >
                  <GripVertical className="size-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{tender.tenderReference}</p>
                  <p className="text-xs text-muted-foreground">
                    Closes: {new Date(tender.closingDate).toLocaleDateString()} · Effort:{' '}
                    {tender.effortDays}d
                    {startOverdue && (
                      <span className="ml-1 text-amber-500">· Start overdue</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="ml-3 flex items-center gap-2 shrink-0">
                <TenderRiskBadge tender={tender} />
                {tender.status === 'planned' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(tender.id, 'in_progress')}
                  >
                    Start
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
