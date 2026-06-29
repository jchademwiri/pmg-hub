import * as React from 'react';
import Link from 'next/link';
import type { ProjectScheduleEntry } from '@pmg/db';
import { CalendarDays, ListOrdered, GripVertical, Loader2, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectRiskBadge } from '@/components/projects/project-risk-badge';
import { ProjectStatusBadge, getNextStatuses } from '@/components/projects/project-status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { reorderProjectsAction } from '@/app/actions/project-schedule';
import { toast } from 'sonner';

interface ClientSummary {
  id: string;
  name: string;
  businessName: string | null;
  email: string | null;
}

interface DraggableUpNextProps {
  tenders: ProjectScheduleEntry[];
  clients: ClientSummary[];
  onStatusChange: (id: string, status: string) => Promise<string | undefined>;
  progressMap?: Record<string, { total: number; completed: number }>;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function daysBetween(a: string, b: string): number {
  const start = new Date(a);
  const end = new Date(b);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function DraggableUpNext({ tenders, clients, onStatusChange, progressMap = {} }: DraggableUpNextProps) {
  const clientMap = new Map(clients.map((c) => [c.id, c]));
  const [items, setItems] = React.useState(tenders);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setItems(tenders);
  }, [tenders]);

  if (tenders.length === 0) {
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
            <p className="text-xs text-muted-foreground">
              Add a tender to build the automatic queue.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    if (draggedItem) {
      newItems.splice(dropIndex, 0, draggedItem);
    }

    setItems(newItems);
    setDraggedIndex(null);
    setDragOverIndex(null);

    startTransition(async () => {
      const ids = newItems.map((item) => item.id);
      const res = await reorderProjectsAction(ids);
      if (res.error) {
        toast.error(res.error);
        setItems(tenders); // revert on error
      } else {
        toast.success('Queue reordered');
      }
    });
  };

  return (
    <Card size="sm" className="relative">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded-lg">
          <div className="flex items-center gap-2 rounded-md border bg-popover px-3 py-2 shadow-md">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="text-xs font-medium">Saving queue order…</span>
          </div>
        </div>
      )}

      <CardHeader>
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 text-muted-foreground" />
          <CardTitle>Up Next ({tenders.length})</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-0 select-none">
        {items.map((tender, index) => {
          const client = clientMap.get(tender.clientId);
          const bufferGap = daysBetween(tender.targetCompletionDate, tender.closingDate);
          const daysToClose = daysBetween(
            new Date().toISOString().split('T')[0],
            tender.closingDate,
          );

          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={tender.id}
              draggable={!isPending}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex items-center justify-between border-b py-3 last:border-0 transition-all ${
                isDragging ? 'opacity-40 bg-muted/20' : ''
              } ${
                isDragOver ? 'border-t-2 border-t-primary/70 bg-primary/5 pt-4' : ''
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-2">
                {/* Drag Handle */}
                <div
                  className={`flex h-7 shrink-0 items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing ${
                    isPending ? 'pointer-events-none opacity-20' : ''
                  }`}
                  title="Drag to reorder"
                >
                  <GripVertical className="size-4" />
                </div>

                <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-medium tabular-nums">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link href={`/projects/${tender.id}`} className="hover:underline">
                      <p className="truncate text-sm font-medium">{tender.projectReference}</p>
                    </Link>
                    {tender.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-xs">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  {(() => {
                    const progress = progressMap[tender.id] || { total: 0, completed: 0 };
                    const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
                    return (
                      <div className="flex items-center gap-2 mt-1">
                        {client && (
                          <p className="truncate text-xs text-muted-foreground leading-tight flex-1">
                            {client.name}
                          </p>
                        )}
                        {progress.total > 0 && (
                          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                            {percent}% ({progress.completed}/{progress.total})
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {formatDate(tender.startDate)} → {formatDate(tender.targetCompletionDate)}
                    </span>
                    <span>{tender.effortDays}d effort</span>
                    <span className={bufferGap < tender.bufferDays ? 'text-amber-500' : ''}>
                      {Math.max(0, bufferGap)}d buffer
                    </span>
                    <span className={daysToClose <= 7 ? 'text-amber-500 font-medium' : ''}>
                      closes {formatDate(tender.closingDate)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="ml-3 flex shrink-0 items-center gap-2">
                <ProjectRiskBadge tender={tender} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-auto p-1 font-normal hover:bg-muted/50 gap-1"
                      disabled={isPending}
                    >
                      <ProjectStatusBadge status={tender.status} />
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {getNextStatuses(tender.status).map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => onStatusChange(tender.id, opt.value)}
                        className="text-xs"
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
